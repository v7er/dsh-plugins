/**
 * Linear Host half: workspace↔project links, a local SQLite task board, and one
 * agent session per task.
 *
 * Settings live in `config.json` beside this module; tasks live in `linear.db`.
 * The Linear API key is never written to either: it is read from the credential
 * store under `apiKeyEnv`, falling back to the process environment.
 *
 * @module @local/dsh-linear
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

export const name = 'dsh-linear'

/** The board is served over HTTP; the rest is looked up lazily. */
export const inject = ['webServer']

const here = dirname(fileURLToPath(import.meta.url))
const configPath = join(here, 'config.json')
const databasePath = join(here, 'linear.db')
const MAX_BODY_BYTES = 1_000_000
const MIN_POLL_MS = 15_000

const DEFAULT_PROMPT = `Work on Linear issue {identifier}: {title}

{url}

{description}
{comments}

Repository: {path}

Implement the change, run the relevant checks, and summarize what you did.`

const DEFAULTS = {
  apiKeyEnv: 'LINEAR_API_KEY',
  pollIntervalMs: 60_000,
  autoStart: true,
  maxParallel: 3,
  promptTemplate: '',
  workspaces: [],
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '[]',
  url TEXT NOT NULL DEFAULT '',
  state_id TEXT NOT NULL DEFAULT '',
  state_name TEXT NOT NULL DEFAULT '',
  state_type TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  team_id TEXT NOT NULL DEFAULT '',
  workspace_id TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  session_id TEXT,
  source TEXT NOT NULL DEFAULT 'linear',
  source_id TEXT NOT NULL DEFAULT '',
  cycle_id TEXT NOT NULL DEFAULT '',
  cycle_name TEXT NOT NULL DEFAULT '',
  cycle_number TEXT NOT NULL DEFAULT '',
  cycle_starts_at TEXT NOT NULL DEFAULT '',
  cycle_ends_at TEXT NOT NULL DEFAULT '',
  milestone_id TEXT NOT NULL DEFAULT '',
  milestone_name TEXT NOT NULL DEFAULT '',
  milestone_target_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`

// shortcut: first 250 comments per issue; paginate if a task needs more.
const ISSUES_QUERY = `query Issues($projectId: ID!, $after: String, $since: DateTime) {
  issues(filter: { project: { id: { eq: $projectId } }, updatedAt: { gt: $since } }, first: 25, after: $after, orderBy: updatedAt) {
    nodes {
      id identifier title description url createdAt updatedAt
      state { id name type }
      project { id name }
      team { id key }
      cycle { id name number startsAt endsAt completedAt }
      projectMilestone { id name targetDate }
      comments(first: 250) { nodes { id body createdAt user { name } } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`

const TEAM_STATES_QUERY = `query States($teamId: ID!) {
  team(id: $teamId) { states { nodes { id name type } } }
}`

const ISSUE_UPDATE = `mutation Update($id: String!, $stateId: String!) {
  issueUpdate(id: $id, input: { stateId: $stateId }) { success }
}`

const VIEWER_QUERY = `query Viewer { viewer { id name email } }`

const PROJECTS_QUERY = `query Projects {
  projects(first: 100) {
    nodes { id name state teams { nodes { id key name } } }
  }
}`

const message = error => (error instanceof Error ? error.message : String(error))

function sendJson(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
  })
  res.end(data)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > MAX_BODY_BYTES) {
        req.destroy()
        reject(new Error('request body too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(raw === '' ? {} : JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

/** Linear comments as the JSON stored on a task. */
function commentsOf(issue) {
  const nodes = Array.isArray(issue?.comments?.nodes) ? issue.comments.nodes : []
  return JSON.stringify(nodes.map(comment => ({
    id: text(comment.id),
    body: text(comment.body),
    createdAt: text(comment.createdAt),
    author: text(comment.user?.name),
  })))
}

function parseComments(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Cycle columns for one Linear issue; empty strings when the issue has none. */
function cycleOf(issue) {
  const cycle = issue?.cycle
  return {
    id: text(cycle?.id),
    name: text(cycle?.name),
    number: cycle?.number === undefined || cycle?.number === null ? '' : String(cycle.number),
    startsAt: text(cycle?.startsAt),
    endsAt: text(cycle?.endsAt),
  }
}

/** Milestone columns for one Linear issue; empty strings when the issue has none. */
function milestoneOf(issue) {
  const milestone = issue?.projectMilestone
  return {
    id: text(milestone?.id),
    name: text(milestone?.name),
    targetDate: text(milestone?.targetDate),
  }
}

/** Validate one settings object; a bad value throws instead of being stored. */
export function normalizeConfig(input) {
  const workspaces = Array.isArray(input.workspaces) ? input.workspaces : []
  const seen = new Set()
  const normalizedWorkspaces = workspaces.map((workspace, index) => {
    const id = text(workspace?.id) === '' ? `ws-${index + 1}` : text(workspace.id)
    if (seen.has(id)) throw new Error(`workspace id "${id}" is used twice`)
    seen.add(id)
    const projectId = text(workspace?.projectId).trim()
    if (projectId === '') throw new Error(`workspace "${id}" needs a Linear project id`)
    return {
      id,
      name: text(workspace?.name).trim() === '' ? projectId : text(workspace.name).trim(),
      path: text(workspace?.path).trim(),
      projectId,
    }
  })
  const maxParallel = Number(input.maxParallel)
  if (!Number.isSafeInteger(maxParallel) || maxParallel < 1 || maxParallel > 20) {
    throw new Error('maxParallel must be an integer from 1 to 20')
  }
  const pollIntervalMs = Number(input.pollIntervalMs)
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < MIN_POLL_MS) {
    throw new Error(`pollIntervalMs must be an integer of at least ${MIN_POLL_MS}`)
  }
  const apiKeyEnv = text(input.apiKeyEnv).trim()
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(apiKeyEnv)) throw new Error('apiKeyEnv must be an environment variable name')
  return {
    apiKeyEnv,
    pollIntervalMs,
    autoStart: input.autoStart !== false,
    maxParallel,
    promptTemplate: text(input.promptTemplate),
    workspaces: normalizedWorkspaces,
  }
}

function loadConfig(rowConfig) {
  let stored = {}
  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'))
    if (parsed !== null && typeof parsed === 'object') stored = parsed
  } catch {
    stored = {}
  }
  try {
    return { config: normalizeConfig({ ...DEFAULTS, ...rowConfig, ...stored }), error: '' }
  } catch (error) {
    // A hand-edited file must not stop the plugin from loading: run on defaults and say why.
    return { config: normalizeConfig({ ...DEFAULTS, ...rowConfig }), error: `config.json was ignored: ${message(error)}` }
  }
}

/**
 * @param ctx - host context with `webServer`.
 * @param rowConfig - optional defaults from the bundle patch row.
 */
export function apply(ctx, rowConfig = {}) {
  const loaded = loadConfig(rowConfig)
  let cfg = loaded.config
  let databasePromise
  let timer = null
  let syncing = false
  let lastSync = ''
  let lastError = loaded.error
  const stateCache = new Map()

  const db = () => {
    databasePromise ??= (async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const database = new DatabaseSync(databasePath)
      database.exec(SCHEMA)
      // Existing boards predate later columns; add each in place.
      const columns = database.prepare('PRAGMA table_info(tasks)').all()
      const present = new Set(columns.map(column => column.name))
      const added = {
        comments: "TEXT NOT NULL DEFAULT '[]'",
        source: "TEXT NOT NULL DEFAULT 'linear'",
        source_id: "TEXT NOT NULL DEFAULT ''",
        cycle_id: "TEXT NOT NULL DEFAULT ''",
        cycle_name: "TEXT NOT NULL DEFAULT ''",
        cycle_number: "TEXT NOT NULL DEFAULT ''",
        cycle_starts_at: "TEXT NOT NULL DEFAULT ''",
        cycle_ends_at: "TEXT NOT NULL DEFAULT ''",
        milestone_id: "TEXT NOT NULL DEFAULT ''",
        milestone_name: "TEXT NOT NULL DEFAULT ''",
        milestone_target_date: "TEXT NOT NULL DEFAULT ''",
      }
      for (const [name, definition] of Object.entries(added)) {
        if (!present.has(name)) database.exec(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`)
      }
      // Old rows were all Linear issues keyed by issue id.
      database.exec("UPDATE tasks SET source_id = id WHERE source_id = '' AND source = 'linear'")
      return database
    })()
    return databasePromise
  }

  const setMeta = async (key, value) => {
    const database = await db()
    database.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
  }

  const getMeta = async (key) => {
    const database = await db()
    return database.prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value
  }

  /** Cycle ids the user closed locally; sync skips their issues. */
  const closedCycles = async () => {
    const raw = await getMeta('closedCycles')
    try {
      const parsed = JSON.parse(raw ?? '[]')
      return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []
    } catch {
      return []
    }
  }

  const resolveKey = async () => {
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) {
      try {
        const hit = await credentials.resolve(cfg.apiKeyEnv)
        if (hit !== undefined && typeof hit.value === 'string' && hit.value !== '') return hit.value
      } catch {
        // A missing credential store falls through to the environment.
      }
    }
    return process.env[cfg.apiKeyEnv] ?? ''
  }

  const gql = async (key, query, variables) => {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: key },
      body: JSON.stringify({ query, variables }),
    })
    if (!response.ok) throw new Error(`Linear API returned HTTP ${response.status}`)
    const payload = await response.json()
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      throw new Error(payload.errors.map(error => text(error?.message, 'unknown error')).join('; '))
    }
    return payload.data
  }

  const stateIdFor = async (key, teamId, type) => {
    let states = stateCache.get(teamId)
    if (states === undefined) {
      const data = await gql(key, TEAM_STATES_QUERY, { teamId })
      states = Array.isArray(data?.team?.states?.nodes) ? data.team.states.nodes : []
      stateCache.set(teamId, states)
    }
    return states.find(state => state.type === type)?.id
  }

  const pushState = async (task, type) => {
    const key = await resolveKey()
    if (key === '' || task.team_id === '') return
    const stateId = await stateIdFor(key, task.team_id, type)
    if (stateId === undefined) return
    await gql(key, ISSUE_UPDATE, { id: task.id, stateId })
  }

  const workspaceOf = task => cfg.workspaces.find(workspace => workspace.id === task.workspace_id)

  const buildPrompt = (task, workspace) => {
    const template = cfg.promptTemplate.trim() === '' ? DEFAULT_PROMPT : cfg.promptTemplate
    const comments = parseComments(task.comments)
    const commentText = comments.length === 0
      ? ''
      : `Comments:\n${comments.map(comment =>
        `- ${comment.author || 'Linear'}${comment.createdAt === '' ? '' : ` (${comment.createdAt})`}:\n${comment.body}`,
      ).join('\n\n')}`
    return template
      .replaceAll('{identifier}', task.identifier)
      .replaceAll('{title}', task.title)
      .replaceAll('{description}', task.description)
      .replaceAll('{comments}', commentText)
      .replaceAll('{url}', task.url)
      .replaceAll('{path}', workspace.path)
  }

  const notify = (input) => {
    const notifications = ctx.get('notifications')
    if (notifications === undefined) return undefined
    return notifications.push(input)
  }

  const offerChoice = (task, candidates) => {
    const notifications = ctx.get('notifications')
    if (notifications === undefined) return
    const id = `linear-choose-${task.id}`
    const handler = async (actionId, value) => {
      if (actionId !== 'choose') return
      await assign(task.id, String(value))
    }
    // A restart re-registers the handler without resetting a choice already read.
    if (notifications.list().items.some(item => item.id === id)) {
      notifications.onAction(id, handler)
      return
    }
    notifications.push({
      id,
      title: `${task.identifier} · ${task.title}`,
      body: `This issue matches ${candidates.length} workspaces. Choose where it belongs.`,
      kind: 'linear',
      source: 'dsh-linear',
      options: candidates.map(workspace => ({ value: workspace.id, label: workspace.name })),
      confirmLabel: 'Assign',
    })
    notifications.onAction(id, handler)
  }

  const notifyAdded = (task, workspace) => {
    const notifications = ctx.get('notifications')
    if (notifications === undefined) return
    const id = `linear-added-${task.id}`
    notifications.push({
      id,
      title: `${task.identifier} · ${task.title}`,
      body: `Added to ${workspace.name}.`,
      kind: 'linear',
      source: 'dsh-linear',
      actions: [{ id: 'open-board', label: 'Open board' }],
    })
    notifications.onAction(id, async (actionId) => {
      if (actionId === 'open-board') return { panel: 'linear' }
    })
  }

  const startTask = async (task, workspace) => {
    if (workspace === undefined) throw new Error('this task has no workspace')
    if (workspace.path === '') throw new Error(`workspace "${workspace.name}" has no directory`)
    const controller = ctx.get('sessionController')
    if (controller === undefined) throw new Error('Session creation is unavailable in this profile')
    const database = await db()
    // Create through the Workspace registry when the path is registered, so the
    // session appears under that workspace instead of only in history.
    const registry = ctx.get('workspaceRegistry')
    const registered = registry?.list().find(candidate => candidate.path === workspace.path)
    const { sessionId } = await controller.create(registered === undefined
      ? { cwd: workspace.path }
      : { workspaceId: registered.id })
    await controller.prompt({
      requestId: randomUUID(),
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: buildPrompt(task, workspace) }],
    }, new AbortController().signal)
    database.prepare("UPDATE tasks SET status = 'doing', session_id = ?, updated_at = ? WHERE id = ?")
      .run(sessionId, new Date().toISOString(), task.id)
    await pushState(task, 'started')
    return sessionId
  }

  const pump = async () => {
    if (!cfg.autoStart) return
    const database = await db()
    // A task that already has a session is never started twice; the cap only
    // bounds how many sessions one tick opens, so a large project cannot spawn
    // every session at once.
    let slots = cfg.maxParallel
    const todo = database.prepare("SELECT * FROM tasks WHERE status = 'todo' AND session_id IS NULL ORDER BY created_at ASC").all()
    for (const task of todo) {
      if (slots === 0) break
      const workspace = workspaceOf(task)
      if (workspace === undefined || workspace.path === '') continue
      try {
        await startTask(task, workspace)
        slots -= 1
      } catch (error) {
        lastError = message(error)
      }
    }
  }

  const assign = async (taskId, workspaceId) => {
    const database = await db()
    const workspace = cfg.workspaces.find(candidate => candidate.id === workspaceId)
    if (workspace === undefined) throw new Error('unknown workspace')
    database.prepare("UPDATE tasks SET workspace_id = ?, status = 'todo', updated_at = ? WHERE id = ?")
      .run(workspaceId, new Date().toISOString(), taskId)
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
    if (task !== undefined) notifyAdded(task, workspace)
    await pump()
  }

  const sync = async () => {
    const key = await resolveKey()
    if (key === '') throw new Error(`No Linear API key. Set ${cfg.apiKeyEnv} or save one in the Linear settings.`)
    const database = await db()
    const now = new Date().toISOString()
    const closed = new Set(await closedCycles())
    const seen = new Set()
    for (const workspace of cfg.workspaces) {
      // The first read of a project imports its backlog without starting
      // anything: only issues that appear afterwards are treated as new work.
      const bootstrapped = (await getMeta(`bootstrapped:${workspace.projectId}`)) !== undefined
      // Only issues touched since the last successful read are fetched; the
      // epoch makes the first read a full import.
      const since = (await getMeta(`lastSync:${workspace.projectId}`))
        ?? (await getMeta('lastSync'))
        ?? '1970-01-01T00:00:00.000Z'
      // 25 issues per page keeps 25 × 250 comments under Linear's query
      // complexity limit; four pages preserve the old 100-issue window.
      const nodes = []
      let after = null
      for (let page = 0; page < 4; page += 1) {
        const data = await gql(key, ISSUES_QUERY, { projectId: workspace.projectId, after, since })
        const connection = data?.issues
        if (Array.isArray(connection?.nodes)) nodes.push(...connection.nodes)
        after = connection?.pageInfo?.hasNextPage === true ? connection.pageInfo.endCursor : null
        if (after === null) break
      }
      for (const issue of nodes) {
        if (seen.has(issue.id)) continue
        seen.add(issue.id)
        const stateType = text(issue.state?.type)
        // Done work is not synced: the board only tracks open tasks.
        if (stateType === 'completed' || stateType === 'canceled') continue
        const cycle = cycleOf(issue)
        if (cycle.id !== '' && closed.has(cycle.id)) continue
        const milestone = milestoneOf(issue)
        const existing = database.prepare('SELECT id, status FROM tasks WHERE source_id = ? OR id = ?').get(issue.id, issue.id)
        if (existing === undefined) {
          const candidates = cfg.workspaces.filter(candidate => candidate.projectId === issue.project?.id)
          const workspaceId = candidates.length === 1 ? candidates[0].id : null
          const status = !bootstrapped ? 'backlog'
            : workspaceId === null ? 'unassigned'
              : stateType === 'started' ? 'doing' : 'todo'
          database.prepare(`INSERT INTO tasks
            (id, identifier, title, description, comments, url, state_id, state_name, state_type, project_id, team_id, workspace_id, status, session_id, source, source_id, cycle_id, cycle_name, cycle_number, cycle_starts_at, cycle_ends_at, milestone_id, milestone_name, milestone_target_date, created_at, updated_at, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            issue.id,
            text(issue.identifier),
            text(issue.title),
            text(issue.description),
            commentsOf(issue),
            text(issue.url),
            text(issue.state?.id),
            text(issue.state?.name),
            stateType,
            text(issue.project?.id),
            text(issue.team?.id),
            workspaceId,
            status,
            null,
            'linear',
            issue.id,
            cycle.id,
            cycle.name,
            cycle.number,
            cycle.startsAt,
            cycle.endsAt,
            milestone.id,
            milestone.name,
            milestone.targetDate,
            text(issue.createdAt, now),
            text(issue.updatedAt, now),
            now,
          )
          if (bootstrapped) {
            const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(issue.id)
            if (workspaceId === null) offerChoice(task, candidates)
            else notifyAdded(task, candidates[0])
          }
        } else {
          database.prepare(`UPDATE tasks SET identifier = ?, title = ?, description = ?, comments = ?, url = ?, state_id = ?, state_name = ?, state_type = ?, project_id = ?, team_id = ?, source = 'linear', source_id = ?, cycle_id = ?, cycle_name = ?, cycle_number = ?, cycle_starts_at = ?, cycle_ends_at = ?, milestone_id = ?, milestone_name = ?, milestone_target_date = ?, updated_at = ?, synced_at = ? WHERE id = ?`).run(
            text(issue.identifier),
            text(issue.title),
            text(issue.description),
            commentsOf(issue),
            text(issue.url),
            text(issue.state?.id),
            text(issue.state?.name),
            stateType,
            text(issue.project?.id),
            text(issue.team?.id),
            issue.id,
            cycle.id,
            cycle.name,
            cycle.number,
            cycle.startsAt,
            cycle.endsAt,
            milestone.id,
            milestone.name,
            milestone.targetDate,
            text(issue.updatedAt, now),
            now,
            existing.id,
          )
        }
      }
      await setMeta(`bootstrapped:${workspace.projectId}`, now)
      await setMeta(`lastSync:${workspace.projectId}`, now)
    }
    lastSync = now
    await setMeta('lastSync', now)
  }

  const tick = async () => {
    if (syncing) return
    syncing = true
    try {
      await restorePending()
      await sync()
      lastError = ''
    } catch (error) {
      lastError = message(error)
    } finally {
      syncing = false
    }
    try {
      await pump()
    } catch (error) {
      lastError = message(error)
    }
  }

  const startLoop = () => {
    if (timer !== null) clearInterval(timer)
    timer = setInterval(() => { void tick() }, Math.max(MIN_POLL_MS, cfg.pollIntervalMs))
  }

  const restorePending = async () => {
    const database = await db()
    const rows = database.prepare("SELECT * FROM tasks WHERE status = 'unassigned'").all()
    for (const task of rows) {
      const candidates = cfg.workspaces.filter(workspace => workspace.projectId === task.project_id)
      if (candidates.length > 1) offerChoice(task, candidates)
    }
  }

  const projectsWith = async (key) => {
    const data = await gql(key, PROJECTS_QUERY, {})
    const nodes = Array.isArray(data?.projects?.nodes) ? data.projects.nodes : []
    return nodes.map(project => ({
      id: project.id,
      name: text(project.name),
      state: text(project.state),
      teams: Array.isArray(project.teams?.nodes)
        ? project.teams.nodes.map(team => ({ id: team.id, key: text(team.key), name: text(team.name) }))
        : [],
    }))
  }

  const connectState = async () => {
    const key = await resolveKey()
    if (key === '') return { keyConfigured: false, viewer: null, projects: [], error: '' }
    try {
      const data = await gql(key, VIEWER_QUERY, {})
      return {
        keyConfigured: true,
        viewer: { name: text(data?.viewer?.name), email: text(data?.viewer?.email) },
        projects: await projectsWith(key),
        error: '',
      }
    } catch (error) {
      return { keyConfigured: true, viewer: null, projects: [], error: message(error) }
    }
  }

  const connect = async (value) => {
    const key = String(value ?? '').trim()
    if (key === '') throw new Error('Enter a Linear API key')
    const data = await gql(key, VIEWER_QUERY, {})
    if (data?.viewer === undefined) throw new Error('Linear did not accept this key')
    const credentials = ctx.get('credentials')
    if (credentials === undefined) throw new Error('Credential storage is unavailable in this profile')
    await credentials.set(cfg.apiKeyEnv, key)
    const projects = await projectsWith(key)
    void tick()
    return {
      keyConfigured: true,
      viewer: { name: text(data.viewer.name), email: text(data.viewer.email) },
      projects,
      error: '',
    }
  }

  const disconnect = async () => {
    const credentials = ctx.get('credentials')
    if (credentials === undefined) throw new Error('Credential storage is unavailable in this profile')
    await credentials.unset(cfg.apiKeyEnv)
  }

  const addWorkspace = (input) => {
    const projectId = text(input?.projectId).trim()
    if (projectId === '') throw new Error('Choose a Linear project')
    const path = text(input?.path).trim()
    if (path === '') throw new Error('Choose a directory')
    if (cfg.workspaces.some(workspace => workspace.projectId === projectId && workspace.path === path)) {
      throw new Error('That project is already linked to this directory')
    }
    return saveConfig({
      workspaces: [...cfg.workspaces, {
        id: `ws-${randomUUID().slice(0, 8)}`,
        name: text(input?.name).trim() || projectId,
        path,
        projectId,
      }],
    })
  }

  const removeWorkspace = id => saveConfig({ workspaces: cfg.workspaces.filter(workspace => workspace.id !== id) })

  const board = async () => {
    const database = await db()
    const tasks = database.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
    const cycles = new Map()
    for (const task of tasks) {
      if (task.cycle_id === '' || cycles.has(task.cycle_id)) continue
      cycles.set(task.cycle_id, {
        id: task.cycle_id,
        name: task.cycle_name,
        number: task.cycle_number,
        startsAt: task.cycle_starts_at,
        endsAt: task.cycle_ends_at,
      })
    }
    return {
      tasks: tasks.map(task => ({ ...task, comments: parseComments(task.comments), workspaceName: workspaceOf(task)?.name ?? '' })),
      cycles: [...cycles.values()].sort((left, right) => String(right.startsAt).localeCompare(String(left.startsAt))),
      closedCycles: await closedCycles(),
      workspaces: cfg.workspaces,
      config: {
        apiKeyEnv: cfg.apiKeyEnv,
        pollIntervalMs: cfg.pollIntervalMs,
        autoStart: cfg.autoStart,
        maxParallel: cfg.maxParallel,
        promptTemplate: cfg.promptTemplate,
      },
      keyConfigured: (await resolveKey()) !== '',
      lastSync,
      lastError,
      syncing,
    }
  }

  const move = async (id, status) => {
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (task === undefined) throw new Error('task not found')
    if (status === 'doing') {
      await startTask(task, workspaceOf(task))
      return
    }
    database.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), id)
    if (status === 'done') await pushState(task, 'completed')
    if (status === 'todo') await pump()
  }

  /** Create a task that lives only in the plugin; its source is `local`. */
  const createTask = async (input) => {
    const title = text(input?.title).trim()
    if (title === '') throw new Error('Enter a task title')
    const workspaceId = text(input?.workspaceId)
    const workspace = cfg.workspaces.find(candidate => candidate.id === workspaceId)
    if (workspace === undefined) throw new Error('Choose a workspace')
    const database = await db()
    const now = new Date().toISOString()
    const cycle = input?.cycle ?? {}
    const milestone = input?.milestone ?? {}
    const id = randomUUID()
    database.prepare(`INSERT INTO tasks
      (id, identifier, title, description, comments, url, state_id, state_name, state_type, project_id, team_id, workspace_id, status, session_id, source, source_id, cycle_id, cycle_name, cycle_number, cycle_starts_at, cycle_ends_at, milestone_id, milestone_name, milestone_target_date, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id,
      '',
      title,
      text(input?.description),
      '[]',
      '',
      '',
      '',
      '',
      workspace.projectId,
      '',
      workspace.id,
      'todo',
      null,
      'local',
      '',
      text(cycle.id),
      text(cycle.name),
      text(cycle.number),
      text(cycle.startsAt),
      text(cycle.endsAt),
      text(milestone.id),
      text(milestone.name),
      text(milestone.targetDate),
      now,
      now,
      now,
    )
    await pump()
    return id
  }

  /** Remove every local task in a cycle and remember it so sync never re-adds it. */
  const closeCycle = async (cycleId) => {
    const id = text(cycleId)
    if (id === '') throw new Error('Choose a cycle')
    const database = await db()
    const result = database.prepare('DELETE FROM tasks WHERE cycle_id = ?').run(id)
    const closed = await closedCycles()
    if (!closed.includes(id)) {
      closed.push(id)
      await setMeta('closedCycles', JSON.stringify(closed))
    }
    return { removed: Number(result.changes) }
  }

  const saveConfig = (input) => {
    const next = normalizeConfig({ ...cfg, ...input })
    writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`)
    cfg = next
    startLoop()
    return next
  }

  const setKey = async (value) => {
    const credentials = ctx.get('credentials')
    if (credentials === undefined) throw new Error('Credential storage is unavailable in this profile')
    if (value === '') await credentials.unset(cfg.apiKeyEnv)
    else await credentials.set(cfg.apiKeyEnv, value)
  }

  ctx.effect(() => () => {
    if (timer !== null) clearInterval(timer)
    timer = null
  }, 'dsh-linear: poll timer')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-linear/board',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'method not allowed' })
        return
      }
      try {
        sendJson(res, 200, await board())
      } catch (error) {
        sendJson(res, 500, { error: message(error) })
      }
    },
  }), 'dsh-linear: board route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-linear/connect',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'method not allowed' })
        return
      }
      try {
        sendJson(res, 200, await connectState())
      } catch (error) {
        sendJson(res, 500, { error: message(error) })
      }
    },
  }), 'dsh-linear: connect route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-linear/act',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' })
        return
      }
      try {
        const body = await readJson(req)
        if (body.op === 'sync') {
          void tick()
          sendJson(res, 200, { ok: true })
          return
        }
        if (body.op === 'move') {
          await move(String(body.id), String(body.status))
          sendJson(res, 200, { ok: true })
          return
        }
        if (body.op === 'createTask') {
          sendJson(res, 200, { ok: true, id: await createTask(body.task ?? {}) })
          return
        }
        if (body.op === 'closeCycle') {
          sendJson(res, 200, { ok: true, ...(await closeCycle(body.cycleId)) })
          return
        }
        if (body.op === 'start') {
          const database = await db()
          const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(String(body.id))
          if (task === undefined) throw new Error('task not found')
          await startTask(task, workspaceOf(task))
          sendJson(res, 200, { ok: true })
          return
        }
        if (body.op === 'assign') {
          await assign(String(body.id), String(body.workspaceId))
          sendJson(res, 200, { ok: true })
          return
        }
        if (body.op === 'saveConfig') {
          sendJson(res, 200, { ok: true, config: saveConfig(body.config ?? {}) })
          return
        }
        if (body.op === 'setKey') {
          await setKey(String(body.value ?? ''))
          sendJson(res, 200, { ok: true })
          return
        }
        if (body.op === 'connect') {
          sendJson(res, 200, { ok: true, connect: await connect(body.key) })
          return
        }
        if (body.op === 'disconnect') {
          await disconnect()
          sendJson(res, 200, { ok: true })
          return
        }
        if (body.op === 'addWorkspace') {
          sendJson(res, 200, { ok: true, config: addWorkspace(body.workspace ?? {}) })
          return
        }
        if (body.op === 'removeWorkspace') {
          sendJson(res, 200, { ok: true, config: removeWorkspace(String(body.id)) })
          return
        }
        sendJson(res, 400, { ok: false, error: `unknown op "${String(body.op)}"` })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: message(error) })
      }
    },
  }), 'dsh-linear: act route')

  void (async () => {
    try {
      await db()
      await restorePending()
      startLoop()
      await tick()
    } catch (error) {
      lastError = message(error)
    }
  })()
}
