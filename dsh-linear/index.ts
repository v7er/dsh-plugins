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
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'

export const name = 'dsh-linear'

/** The board is served over HTTP; the rest is looked up lazily. */
export const inject = ['webServer', 'tools']

const here = dirname(fileURLToPath(import.meta.url))
const configPath = join(here, 'config.json')
const databasePath = join(here, 'linear.db')
const MAX_BODY_BYTES = 1_000_000
const MIN_POLL_MS = 15_000
const GIT_MAX_BUFFER = 20 * 1024 * 1024
const DIFF_LIMIT = 1_000_000
const execFileAsync = promisify(execFile)

/** The narrow `ctx.commands` face this plugin registers into. */
interface CommandScope {
  effect(fn: () => () => void, label?: string): () => void
  commands: {
    register(definition: {
      name: string
      description: string
      input?: { hint: string }
      handler(invocation: { rawInput: string }): Promise<{ kind: 'success' | 'error'; text: string }>
    }): () => void
  }
}

const DEFAULT_PROMPT = `Work on Linear issue {identifier}: {title}

{url}

{description}
{comments}

Repository: {path}

Implement the change, run the relevant checks, and summarize what you did.`

const DEFAULTS = {
  pollIntervalMs: 60_000,
  promptTemplate: '',
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
  board_id TEXT NOT NULL DEFAULT '',
  workspace_id TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  session_id TEXT,
  source TEXT NOT NULL DEFAULT 'linear',
  source_id TEXT NOT NULL DEFAULT '',
  cycle_id TEXT NOT NULL DEFAULT '',
  turn_id TEXT NOT NULL DEFAULT '',
  cycle_name TEXT NOT NULL DEFAULT '',
  cycle_number TEXT NOT NULL DEFAULT '',
  cycle_starts_at TEXT NOT NULL DEFAULT '',
  cycle_ends_at TEXT NOT NULL DEFAULT '',
  milestone_id TEXT NOT NULL DEFAULT '',
  milestone_name TEXT NOT NULL DEFAULT '',
  milestone_target_date TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0,
  estimate REAL NOT NULL DEFAULT 0,
  sequence INTEGER NOT NULL DEFAULT 0,
  branch TEXT NOT NULL DEFAULT '',
  base_sha TEXT NOT NULL DEFAULT '',
  commit_hash TEXT NOT NULL DEFAULT '',
  diff_stat TEXT NOT NULL DEFAULT '',
  submit_summary TEXT NOT NULL DEFAULT '',
  review_state TEXT NOT NULL DEFAULT 'none',
  review_reason TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT NOT NULL DEFAULT '',
  archived_at TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL DEFAULT '',
  ends_at TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'idle',
  branch TEXT NOT NULL DEFAULT '',
  worktree_path TEXT NOT NULL DEFAULT '',
  dsh_workspace_id TEXT NOT NULL DEFAULT '',
  base_branch TEXT NOT NULL DEFAULT '',
  base_sha TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL DEFAULT '',
  closed_at TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL DEFAULT '',
  cycle_id TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL DEFAULT '',
  number INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  worktree_path TEXT NOT NULL DEFAULT '',
  dsh_workspace_id TEXT NOT NULL DEFAULT '',
  base_branch TEXT NOT NULL DEFAULT '',
  base_sha TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'working',
  started_at TEXT NOT NULL DEFAULT '',
  finished_at TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  target_date TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`

// shortcut: first 250 comments per issue; paginate if a task needs more.
const ISSUES_QUERY = `query Issues($projectId: ID!, $after: String, $since: DateTimeOrDuration) {
  issues(filter: { project: { id: { eq: $projectId } }, updatedAt: { gt: $since } }, first: 25, after: $after, orderBy: updatedAt) {
    nodes {
      id identifier title description url createdAt updatedAt priority estimate
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

const PROJECT_META_QUERY = `query ProjectMeta($projectId: String!) {
  project(id: $projectId) {
    projectMilestones(first: 100) { nodes { id name targetDate } }
    teams { nodes { id cycles(first: 100) { nodes { id name number startsAt endsAt completedAt } } } }
  }
}`

const ISSUE_UPDATE = `mutation Update($id: String!, $stateId: String!) {
  issueUpdate(id: $id, input: { stateId: $stateId }) { success }
}`

const ISSUE_FIELDS_UPDATE = `mutation Update($id: String!, $estimate: Int, $projectMilestoneId: String) {
  issueUpdate(id: $id, input: { estimate: $estimate, projectMilestoneId: $projectMilestoneId }) { success }
}`

const ISSUE_CYCLE_UPDATE = `mutation Update($id: String!, $cycleId: String) {
  issueUpdate(id: $id, input: { cycleId: $cycleId }) { success }
}`

const CYCLE_UPDATE = `mutation Update($id: String!, $name: String, $startsAt: DateTime, $endsAt: DateTime) {
  cycleUpdate(id: $id, input: { name: $name, startsAt: $startsAt, endsAt: $endsAt }) { success }
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

function readJson(req): Promise<any> {
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

/** Run git in one directory without a shell; throws with git's own stderr. */
async function git(cwd, args) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], { maxBuffer: GIT_MAX_BUFFER })
    return stdout.trim()
  } catch (error) {
    const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : ''
    throw new Error(`git ${args.join(' ')} failed${stderr === '' ? '' : `: ${stderr}`}`)
  }
}

/** Run git when failure is an acceptable answer (missing ref, no remote). */
async function gitSafe(cwd, args) {
  try {
    return await git(cwd, args)
  } catch {
    return ''
  }
}

/** Branch-safe slug for a cycle number or name. */
function branchSlug(value) {
  const slug = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return slug === '' ? 'cycle' : slug
}

/** `cycles-12` for a numbered cycle, `cycles-<slug>` otherwise. */
function cycleBranchName(cycle) {
  return `cycles-${branchSlug(cycle.number === '' ? cycle.name || cycle.id : cycle.number)}`
}

/** One turn is one bundle of queued tasks: `cycles-12-turn-3`. */
function turnBranchName(cycle, number) {
  // Git cannot hold both `cycles-12` and `cycles-12/3`: the slash makes the
  // first ref a directory. Keep the real cycle branch exact and suffix turns.
  return `${cycleBranchName(cycle)}-turn-${number}`
}

/** Worktree lives outside the repo so the human checkout stays clean. */
function worktreePathFor(workspaceId, branch) {
  return join(homedir(), '.dsh', 'linear-worktrees', branchSlug(workspaceId), branch.replace(/[\\/]/g, '-'))
}

/** Base branch: configured, then origin/HEAD, then main/master, then current. */
async function detectBaseBranch(repo) {
  const remoteHead = await gitSafe(repo, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  if (remoteHead !== '') return remoteHead.replace(/^origin\//, '')
  for (const candidate of ['main', 'master']) {
    if ((await gitSafe(repo, ['rev-parse', '--verify', candidate])) !== '') return candidate
  }
  return (await gitSafe(repo, ['rev-parse', '--abbrev-ref', 'HEAD'])) || 'main'
}

/** Prefer the remote base ref when it exists, else the local branch. */
async function resolveBaseRef(repo, baseBranch) {
  const remote = await gitSafe(repo, ['rev-parse', '--verify', `origin/${baseBranch}`])
  return remote === '' ? baseBranch : `origin/${baseBranch}`
}

/** Validate one settings object; a bad value throws instead of being stored. */
export function normalizeConfig(input) {
  const legacyApiKeyEnv = text(input.apiKeyEnv).trim() || 'LINEAR_API_KEY'
  const hasLegacy = input.apiKeyEnv !== undefined || input.workspaces !== undefined
  const rawConnections = Array.isArray(input.connections) ? input.connections : undefined
  const connections = (rawConnections ?? (hasLegacy
    ? [{ id: 'default', name: 'Linear', apiKeyEnv: legacyApiKeyEnv }]
    : [])).map((connection, index) => {
    const id = text(connection?.id).trim() || `conn-${index + 1}`
    const apiKeyEnv = text(connection?.apiKeyEnv).trim()
      || `LINEAR_API_KEY_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(apiKeyEnv)) {
      throw new Error(`connection "${id}" has an invalid apiKeyEnv`)
    }
    return { id, name: text(connection?.name).trim() || id, apiKeyEnv }
  })
  const connectionIds = new Set()
  for (const connection of connections) {
    if (connectionIds.has(connection.id)) throw new Error(`connection id "${connection.id}" is used twice`)
    connectionIds.add(connection.id)
  }
  const rawBoards = Array.isArray(input.boards) ? input.boards : undefined
  const legacyWorkspaces = Array.isArray(input.workspaces) ? input.workspaces : []
  const boards = (rawBoards ?? (hasLegacy
    ? [{ id: 'default', name: 'Board', connectionId: connections[0]?.id ?? '', workspaces: legacyWorkspaces }]
    : [])).map((board, index) => {
    const id = text(board?.id).trim() || `board-${index + 1}`
    const connectionId = text(board?.connectionId).trim() || connections[0]?.id || ''
    if (connectionId !== '' && !connectionIds.has(connectionId)) {
      throw new Error(`board "${id}" uses an unknown connection`)
    }
    const workspaces = Array.isArray(board?.workspaces) ? board.workspaces : []
    return {
      id,
      name: text(board?.name).trim() || id,
      connectionId,
      workspaces: workspaces.map((workspace, workspaceIndex) => {
        const workspaceId = text(workspace?.id).trim() || `ws-${workspaceIndex + 1}`
        const projectId = text(workspace?.projectId).trim()
        if (projectId === '') throw new Error(`workspace "${workspaceId}" needs a Linear project id`)
        return {
          id: workspaceId,
          name: text(workspace?.name).trim() || basename(text(workspace?.path).trim()) || projectId,
          path: text(workspace?.path).trim(),
          projectId,
          baseBranch: text(workspace?.baseBranch).trim(),
        }
      }),
    }
  })
  const boardIds = new Set()
  const workspaceIds = new Set()
  const projectIds = new Set()
  for (const board of boards) {
    if (boardIds.has(board.id)) throw new Error(`board id "${board.id}" is used twice`)
    boardIds.add(board.id)
    if (board.connectionId === '') throw new Error(`board "${board.id}" needs a connection`)
    for (const workspace of board.workspaces) {
      if (workspaceIds.has(workspace.id)) throw new Error(`workspace id "${workspace.id}" is used twice`)
      workspaceIds.add(workspace.id)
      if (projectIds.has(workspace.projectId)) {
        throw new Error(`project "${workspace.projectId}" is linked to more than one board`)
      }
      projectIds.add(workspace.projectId)
    }
  }
  const pollIntervalMs = Number(input.pollIntervalMs)
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < MIN_POLL_MS) {
    throw new Error(`pollIntervalMs must be an integer of at least ${MIN_POLL_MS}`)
  }
  return {
    connections,
    boards,
    pollIntervalMs,
    promptTemplate: text(input.promptTemplate),
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

  // Realtime board push. Every write through the shared connection wakes the
  // SSE clients, so the UI never waits for its fallback poll.
  const subscribers = new Set<any>()
  let notifyTimer: ReturnType<typeof setTimeout> | null = null
  const notifyBoard = () => {
    if (notifyTimer !== null) return
    notifyTimer = setTimeout(() => {
      notifyTimer = null
      for (const res of subscribers) {
        try {
          res.write('data: changed\n\n')
        } catch {
          subscribers.delete(res)
        }
      }
    }, 50)
  }

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
        turn_id: "TEXT NOT NULL DEFAULT ''",
        cycle_name: "TEXT NOT NULL DEFAULT ''",
        cycle_number: "TEXT NOT NULL DEFAULT ''",
        cycle_starts_at: "TEXT NOT NULL DEFAULT ''",
        cycle_ends_at: "TEXT NOT NULL DEFAULT ''",
        milestone_id: "TEXT NOT NULL DEFAULT ''",
        milestone_name: "TEXT NOT NULL DEFAULT ''",
        milestone_target_date: "TEXT NOT NULL DEFAULT ''",
        board_id: "TEXT NOT NULL DEFAULT ''",
        priority: 'INTEGER NOT NULL DEFAULT 0',
        estimate: 'REAL NOT NULL DEFAULT 0',
        sequence: 'INTEGER NOT NULL DEFAULT 0',
        branch: "TEXT NOT NULL DEFAULT ''",
        base_sha: "TEXT NOT NULL DEFAULT ''",
        commit_hash: "TEXT NOT NULL DEFAULT ''",
        diff_stat: "TEXT NOT NULL DEFAULT ''",
        submit_summary: "TEXT NOT NULL DEFAULT ''",
        review_state: "TEXT NOT NULL DEFAULT 'none'",
        review_reason: "TEXT NOT NULL DEFAULT ''",
        reviewed_at: "TEXT NOT NULL DEFAULT ''",
        archived_at: "TEXT NOT NULL DEFAULT ''",
        submitted_at: "TEXT NOT NULL DEFAULT ''",
        last_error: "TEXT NOT NULL DEFAULT ''",
      }
      for (const [name, definition] of Object.entries(added)) {
        if (!present.has(name)) database.exec(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`)
      }
      // Old rows were all Linear issues keyed by issue id.
      database.exec("UPDATE tasks SET source_id = id WHERE source_id = '' AND source = 'linear'")
      // The cycles table predates board scoping; add the column in place.
      const cycleColumns = database.prepare('PRAGMA table_info(cycles)').all()
      if (!cycleColumns.some(column => column.name === 'board_id')) {
        database.exec("ALTER TABLE cycles ADD COLUMN board_id TEXT NOT NULL DEFAULT ''")
      }
      // Existing rows belong to the migrated default board.
      database.exec("UPDATE tasks SET board_id = 'default' WHERE board_id = ''")
      database.exec("UPDATE cycles SET board_id = 'default' WHERE board_id = ''")
      // One full read after this migration fills cycle and milestone on rows
      // that were synced before those columns existed.
      const migrated = database.prepare("SELECT value FROM meta WHERE key = 'migrated:cycleMilestone'").get()
      if (migrated === undefined) {
        database.exec("DELETE FROM meta WHERE key = 'lastSync' OR key LIKE 'lastSync:%'")
        database.prepare("INSERT INTO meta (key, value) VALUES ('migrated:cycleMilestone', '1')").run()
      }
      // Old close-cycle ids lived in one meta list; move them into the cycles table.
      try {
        const raw = database.prepare("SELECT value FROM meta WHERE key = 'closedCycles'").get()?.value
        if (typeof raw === 'string' && raw !== '') {
          const ids = JSON.parse(raw)
          if (Array.isArray(ids)) {
            for (const id of ids) {
              if (typeof id !== 'string' || id === '') continue
              const task = database.prepare('SELECT * FROM tasks WHERE cycle_id = ? LIMIT 1').get(id)
              database.prepare(`INSERT INTO cycles
                (id, workspace_id, project_id, name, number, starts_at, ends_at, state, closed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'closed', ?)
                ON CONFLICT(id) DO UPDATE SET state = 'closed'`).run(
                id,
                task?.workspace_id ?? '',
                task?.project_id ?? '',
                task?.cycle_name ?? '',
                task?.cycle_number ?? '',
                task?.cycle_starts_at ?? '',
                task?.cycle_ends_at ?? '',
                new Date().toISOString(),
              )
            }
            database.prepare("DELETE FROM meta WHERE key = 'closedCycles'").run()
          }
        }
      } catch {
        // A malformed old list must not stop the board from loading.
      }
      // Backfill cycles from tasks synced before the cycles table existed.
      database.exec(`INSERT INTO cycles
        (id, workspace_id, project_id, name, number, starts_at, ends_at, state)
        SELECT cycle_id, COALESCE(workspace_id, ''), project_id, cycle_name, cycle_number,
          cycle_starts_at, cycle_ends_at, 'idle'
        FROM tasks WHERE cycle_id <> ''
        GROUP BY cycle_id
        ON CONFLICT(id) DO NOTHING`)
      // node:sqlite exposes no update hook; wrap run() so every write wakes the
      // SSE clients. Reads (get/all) pass through untouched.
      // shortcut: only prepare().run() writes notify; a runtime exec() write
      // would not, so call notifyBoard() there if one appears.
      const prepare = database.prepare.bind(database)
      database.prepare = ((sql: string) => {
        const statement = prepare(sql)
        const run = statement.run.bind(statement)
        statement.run = ((...args: unknown[]) => {
          const result = run(...(args as Parameters<typeof run>))
          notifyBoard()
          return result
        }) as typeof statement.run
        return statement
      }) as typeof database.prepare
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
    const database = await db()
    return database.prepare("SELECT id FROM cycles WHERE state = 'closed'").all().map(row => row.id)
  }

  const boardById = id => cfg.boards.find(board => board.id === id)

  const connectionById = id => cfg.connections.find(connection => connection.id === id)

  const connectionForBoard = board => connectionById(board?.connectionId)

  const cycleById = async (id) => {
    const database = await db()
    return database.prepare('SELECT * FROM cycles WHERE id = ?').get(id)
  }

  const workspaceForCycle = (cycle) => {
    const board = boardById(cycle.board_id)
    if (board === undefined) return undefined
    return board.workspaces.find(workspace => workspace.id === cycle.workspace_id)
      ?? board.workspaces.find(workspace => workspace.projectId === cycle.project_id)
  }

  const cycleForTask = async (task) => task.cycle_id === '' ? undefined : cycleById(task.cycle_id)

  const turnById = async (id) => {
    if (id === '') return undefined
    const database = await db()
    return database.prepare('SELECT * FROM turns WHERE id = ?').get(id)
  }

  const latestTurnForCycle = async (cycleId) => {
    const database = await db()
    return database.prepare('SELECT * FROM turns WHERE cycle_id = ? ORDER BY number DESC LIMIT 1').get(cycleId)
  }

  /** Keep the queue order stable: active work first, then priority, then age. */
  const resequenceCycle = (database, cycleId) => {
    const rows = database.prepare(`SELECT id FROM tasks
      WHERE cycle_id = ? AND status IN ('doing', 'in_review', 'blocked', 'todo')
      ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'in_review' THEN 1 WHEN 'blocked' THEN 2 ELSE 3 END,
        priority DESC, created_at ASC`).all(cycleId)
    rows.forEach((row, index) => {
      database.prepare('UPDATE tasks SET sequence = ? WHERE id = ?').run(index + 1, row.id)
    })
  }

  /** Mirror one Linear cycle into the local cycles table without touching its git state. */
  const upsertCycle = (database, issue, board, workspace) => {
    const cycle = cycleOf(issue)
    if (cycle.id === '') return
    database.prepare(`INSERT INTO cycles
      (id, board_id, workspace_id, project_id, name, number, starts_at, ends_at, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idle')
      ON CONFLICT(id) DO UPDATE SET
        board_id = excluded.board_id,
        workspace_id = excluded.workspace_id,
        project_id = excluded.project_id,
        name = excluded.name,
        number = excluded.number,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at`).run(
      cycle.id,
      board.id,
      workspace.id,
      text(issue.project?.id),
      cycle.name,
      cycle.number,
      cycle.startsAt,
      cycle.endsAt,
    )
  }

  const resolveConnectionKey = async (connection) => {
    if (connection === undefined) return ''
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) {
      try {
        const hit = await credentials.resolve(connection.apiKeyEnv)
        if (hit !== undefined && typeof hit.value === 'string' && hit.value !== '') return hit.value
      } catch {
        // A missing credential store falls through to the environment.
      }
    }
    return process.env[connection.apiKeyEnv] ?? ''
  }

  const resolveKey = async () => resolveConnectionKey(cfg.connections[0])

  const gql = async (key, query, variables) => {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: key },
      body: JSON.stringify({ query, variables }),
    })
    const raw = await response.text()
    let payload = null
    try {
      payload = raw === '' ? null : JSON.parse(raw)
    } catch {
      payload = null
    }
    if (!response.ok) {
      const detail = Array.isArray(payload?.errors)
        ? payload.errors.map(error => text(error?.message, 'unknown error')).join('; ')
        : raw.slice(0, 500)
      throw new Error(`Linear API returned HTTP ${response.status}${detail === '' ? '' : `: ${detail}`}`)
    }
    if (payload === null) throw new Error('Linear API returned an empty or invalid JSON response')
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
    const board = boardById(task.board_id)
    const key = await resolveConnectionKey(connectionForBoard(board))
    if (key === '' || task.team_id === '') return
    const stateId = await stateIdFor(key, task.team_id, type)
    if (stateId === undefined) return
    await gql(key, ISSUE_UPDATE, { id: task.id, stateId })
  }

  /** Push the locally edited points and milestone; both values are sent so neither is cleared. */
  const pushIssueFields = async (task, estimate, milestoneId) => {
    const board = boardById(task.board_id)
    const key = await resolveConnectionKey(connectionForBoard(board))
    if (key === '' || task.team_id === '') return
    await gql(key, ISSUE_FIELDS_UPDATE, {
      id: task.id,
      // Linear rejects 0; no estimate is null.
      estimate: estimate > 0 ? Math.round(estimate) : null,
      projectMilestoneId: milestoneId === '' ? null : milestoneId,
    })
  }

  /** Move the Linear issue to another cycle, or out of its cycle when `cycleId` is empty. */
  const pushIssueCycle = async (task, cycleId) => {
    const board = boardById(task.board_id)
    const key = await resolveConnectionKey(connectionForBoard(board))
    if (key === '' || task.team_id === '') return
    await gql(key, ISSUE_CYCLE_UPDATE, { id: task.id, cycleId: cycleId === '' ? null : cycleId })
  }

  const pushCycleFields = async (cycle, name, startsAt, endsAt) => {
    const board = boardById(cycle.board_id)
    const key = await resolveConnectionKey(connectionForBoard(board))
    if (key === '') return
    // Linear takes DateTime for cycle bounds; a date-only value means midnight UTC.
    const dateTime = value => value === '' ? null : (value.length === 10 ? `${value}T00:00:00.000Z` : value)
    await gql(key, CYCLE_UPDATE, {
      id: cycle.id,
      name,
      startsAt: dateTime(startsAt),
      endsAt: dateTime(endsAt),
    })
  }

  const workspaceOf = (task) => {
    const board = boardById(task.board_id)
    return board?.workspaces.find(workspace => workspace.id === task.workspace_id)
  }

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

  const taskLabel = task => task.identifier || task.id.slice(0, 8)

  const buildTaskPrompt = (task, turn, cycle, workspace) => {
    const base = buildPrompt(task, { ...workspace, path: turn.worktree_path })
    const note = turn.note.trim() === '' ? '(none yet)' : turn.note.trim()
    return `${base}

Turn ${turn.number} of cycle ${cycle.name || cycle.number || cycle.id}.
Turn branch: ${turn.branch}
Integration branch: ${cycle.branch}
Base branch: ${cycle.base_branch}

Turn note (post-merge steps):
${note}

Git workflow:
- Work only on this task in the turn worktree above.
- Commit your changes with a message starting "${taskLabel(task)}: ".
- Do not push.
- When done, call the linear_task tool with action "submit" and a short summary.
- Before submitting, update the turn note with anything that must run after this branch merges (migrations, version bumps, generated files) using linear_task action "note". Keep it short.
- If blocked, call linear_task with action "blocked" and the reason.`
  }

  const rejectionPrompt = (task, turn, cycle, reason) => {
    const base = cycle.base_branch === '' ? 'main' : cycle.base_branch
    const upstream = cycle.branch === '' ? `origin/${base}` : cycle.branch
    return `Review rejected for ${taskLabel(task)}: ${task.title}

Reason: ${reason}

Before editing, refresh the turn branch:
  git fetch || true
  git rebase ${upstream} || git merge ${upstream}

Resolve any conflicts. Then fix the reason, commit with a message starting "${taskLabel(task)}: ", update the turn note if the post-merge steps changed, and call linear_task with action "submit".`
  }

  const startTask = async (task, workspace, options: any = {}) => {
    if (task.status === 'pending_approval') throw new Error('Approve this task before starting it')
    if (workspace === undefined) throw new Error('this task has no workspace')
    if (workspace.path === '') throw new Error(`workspace "${workspace.name}" has no directory`)
    const database = await db()
    const turn = await turnById(task.turn_id)
    if (turn === undefined) throw new Error('Start working to create a turn first')
    const cycle = await cycleForTask(task)
    if (cycle === undefined) throw new Error('Start the cycle first')
    if (cycle.state !== 'active') throw new Error('Start the cycle first')
    if (turn.worktree_path === '' || !existsSync(turn.worktree_path)) {
      throw new Error('The turn worktree is missing; start working again')
    }
    const busy = database.prepare("SELECT id FROM tasks WHERE turn_id = ? AND status = 'doing' AND id <> ? LIMIT 1")
      .get(turn.id, task.id)
    if (busy !== undefined) throw new Error('Another task is already in progress in this turn')
    const dirty = await git(turn.worktree_path, ['status', '--porcelain'])
    if (dirty !== '') throw new Error('The turn worktree has uncommitted changes; commit or stash them first')
    const taskBase = await git(turn.worktree_path, ['rev-parse', 'HEAD'])
    const controller = ctx.get('sessionController')
    if (controller === undefined) throw new Error('Session creation is unavailable in this profile')
    const prompt = options.promptOverride ?? buildTaskPrompt(task, turn, cycle, workspace)
    const send = sessionId => controller.prompt({
      requestId: randomUUID(),
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: prompt }],
    }, new AbortController().signal)
    let sessionId = options.reuseSession === true ? task.session_id : undefined
    if (typeof sessionId === 'string' && sessionId !== '') {
      try {
        await send(sessionId)
      } catch {
        sessionId = undefined
      }
    }
    if (typeof sessionId !== 'string' || sessionId === '') {
      let created
      try {
        created = await controller.create(turn.dsh_workspace_id === ''
          ? { cwd: turn.worktree_path }
          : { workspaceId: turn.dsh_workspace_id })
      } catch {
        created = await controller.create({ cwd: turn.worktree_path })
      }
      sessionId = created.sessionId
      await send(sessionId)
    }
    database.prepare("UPDATE tasks SET status = 'doing', session_id = ?, branch = ?, base_sha = ?, last_error = '', updated_at = ? WHERE id = ?")
      .run(sessionId, turn.branch, taskBase, new Date().toISOString(), task.id)
    database.prepare("UPDATE turns SET state = 'working', last_error = '' WHERE id = ? AND state <> 'working'").run(turn.id)
    if (task.cycle_id !== '') resequenceCycle(database, task.cycle_id)
    await pushState(task, 'started')
    return sessionId
  }

  const assign = async (taskId, workspaceId) => {
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
    if (task === undefined) throw new Error('task not found')
    const board = boardById(task.board_id)
    const workspace = board?.workspaces.find(candidate => candidate.id === workspaceId)
    if (workspace === undefined) throw new Error('unknown workspace')
    database.prepare("UPDATE tasks SET workspace_id = ?, status = 'pending_approval', updated_at = ? WHERE id = ?")
      .run(workspaceId, new Date().toISOString(), taskId)
    notifyAdded(task, workspace)
  }

  const sync = async (force = false) => {
    const database = await db()
    const now = new Date().toISOString()
    const closed = new Set(await closedCycles())
    const seen = new Set()
    const cycleIds = new Set()
    const errors = []
    for (const board of cfg.boards) {
      const key = await resolveConnectionKey(connectionForBoard(board))
      if (key === '') {
        errors.push(`${board.name}: no Linear API key`)
        continue
      }
      for (const workspace of board.workspaces) {
        // The first read of a project imports its backlog without starting
        // anything: only issues that appear afterwards are treated as new work.
        const bootstrapped = (await getMeta(`bootstrapped:${board.id}:${workspace.projectId}`)) !== undefined
          || (board.id === 'default' && (await getMeta(`bootstrapped:${workspace.projectId}`)) !== undefined)
        // Only issues touched since the last successful read are fetched; the
        // epoch makes the first read a full import.
        const since = force
          ? '1970-01-01T00:00:00.000Z'
          : (await getMeta(`lastSync:${board.id}:${workspace.projectId}`))
            ?? (board.id === 'default' ? await getMeta(`lastSync:${workspace.projectId}`) : undefined)
            ?? '1970-01-01T00:00:00.000Z'
        // 25 issues per page keeps 25 × 250 comments under Linear's query
        // complexity limit; a force sync walks further back.
        const pageLimit = force ? 20 : 4
        // Milestones and cycles are project/team metadata, not issue fields:
        // read them whole so the board can offer every option, not only the
        // ones already used by a synced issue.
        try {
          const meta = await gql(key, PROJECT_META_QUERY, { projectId: workspace.projectId })
          for (const milestone of meta?.project?.projectMilestones?.nodes ?? []) {
            database.prepare(`INSERT INTO milestones (id, board_id, project_id, name, target_date)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET board_id = excluded.board_id, project_id = excluded.project_id,
                name = excluded.name, target_date = excluded.target_date`).run(
              text(milestone.id),
              board.id,
              workspace.projectId,
              text(milestone.name),
              text(milestone.targetDate),
            )
          }
          for (const team of meta?.project?.teams?.nodes ?? []) {
            for (const cycle of team?.cycles?.nodes ?? []) {
              database.prepare(`INSERT INTO cycles
                (id, board_id, workspace_id, project_id, name, number, starts_at, ends_at, state)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET board_id = excluded.board_id, name = excluded.name,
                  number = excluded.number, starts_at = excluded.starts_at, ends_at = excluded.ends_at`).run(
                text(cycle.id),
                board.id,
                workspace.id,
                workspace.projectId,
                text(cycle.name),
                cycle.number === undefined || cycle.number === null ? '' : String(cycle.number),
                text(cycle.startsAt),
                text(cycle.endsAt),
                cycle.completedAt ? 'closed' : 'idle',
              )
            }
          }
        } catch {
          // Metadata is optional; issue sync still works without it.
        }
        const nodes = []
        let after = null
        for (let page = 0; page < pageLimit; page += 1) {
          const data = await gql(key, ISSUES_QUERY, { projectId: workspace.projectId, after, since })
          const connection = data?.issues
          if (Array.isArray(connection?.nodes)) nodes.push(...connection.nodes)
          after = connection?.pageInfo?.hasNextPage === true ? connection.pageInfo.endCursor : null
          if (after === null) break
        }
        for (const issue of nodes) {
          const seenKey = `${board.id}:${issue.id}`
          if (seen.has(seenKey)) continue
          seen.add(seenKey)
          const stateType = text(issue.state?.type)
          const existing = database.prepare('SELECT id, status, source, archived_at FROM tasks WHERE board_id = ? AND (source_id = ? OR id = ?)')
            .get(board.id, issue.id, issue.id)
          // Done work is not synced: a Linear task that finishes leaves the board.
          // A closed task stays archived instead of being deleted, so the next
          // sync cannot import it again as new work.
          if (stateType === 'completed' || stateType === 'canceled') {
            if (existing !== undefined && existing.source === 'linear' && existing.archived_at === '') {
              database.prepare('DELETE FROM tasks WHERE id = ? AND board_id = ?').run(existing.id, board.id)
            }
            continue
          }
          if (existing !== undefined && existing.archived_at !== '') continue
          const cycle = cycleOf(issue)
          if (cycle.id !== '') {
            upsertCycle(database, issue, board, workspace)
            cycleIds.add(cycle.id)
          }
          if (cycle.id !== '' && closed.has(cycle.id)) continue
          const milestone = milestoneOf(issue)
          if (existing === undefined) {
            const candidates = board.workspaces.filter(candidate => candidate.projectId === issue.project?.id)
            const workspaceId = candidates.length === 1 ? candidates[0].id : null
            const status = workspaceId === null ? 'unassigned' : 'pending_approval'
            database.prepare(`INSERT INTO tasks
              (id, board_id, identifier, title, description, comments, url, state_id, state_name, state_type, project_id, team_id, workspace_id, status, session_id, source, source_id, cycle_id, cycle_name, cycle_number, cycle_starts_at, cycle_ends_at, milestone_id, milestone_name, milestone_target_date, priority, estimate, created_at, updated_at, synced_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
              issue.id,
              board.id,
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
              Number(issue.priority) || 0,
              Number(issue.estimate) || 0,
              text(issue.createdAt, now),
              text(issue.updatedAt, now),
              now,
            )
            if (bootstrapped && !force) {
              const task = database.prepare('SELECT * FROM tasks WHERE id = ? AND board_id = ?').get(issue.id, board.id)
              if (workspaceId === null) offerChoice(task, candidates)
              else notifyAdded(task, candidates[0])
            }
          } else {
            database.prepare(`UPDATE tasks SET identifier = ?, title = ?, description = ?, comments = ?, url = ?, state_id = ?, state_name = ?, state_type = ?, project_id = ?, team_id = ?, source = 'linear', source_id = ?, cycle_id = ?, cycle_name = ?, cycle_number = ?, cycle_starts_at = ?, cycle_ends_at = ?, milestone_id = ?, milestone_name = ?, milestone_target_date = ?, priority = ?, estimate = ?, updated_at = ?, synced_at = ? WHERE id = ? AND board_id = ?`).run(
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
              Number(issue.priority) || 0,
              Number(issue.estimate) || 0,
              text(issue.updatedAt, now),
              now,
              existing.id,
              board.id,
            )
            // Legacy first-read rows used `backlog`; the approval gate replaces it.
            if (existing.status === 'backlog') {
              database.prepare("UPDATE tasks SET status = 'pending_approval', updated_at = ? WHERE id = ? AND board_id = ?")
                .run(now, existing.id, board.id)
            }
          }
        }
        await setMeta(`bootstrapped:${board.id}:${workspace.projectId}`, now)
        await setMeta(`lastSync:${board.id}:${workspace.projectId}`, now)
      }
    }
    for (const cycleId of cycleIds) resequenceCycle(database, cycleId)
    lastSync = now
    await setMeta('lastSync', now)
    if (errors.length > 0) throw new Error(errors.join('; '))
  }

  const tick = async (force = false) => {
    if (syncing) return
    syncing = true
    notifyBoard()
    try {
      await restorePending()
      await sync(force)
      lastError = ''
    } catch (error) {
      lastError = message(error)
    } finally {
      syncing = false
    }
    notifyBoard()
  }

  const startLoop = () => {
    if (timer !== null) clearInterval(timer)
    timer = setInterval(() => { void tick() }, Math.max(MIN_POLL_MS, cfg.pollIntervalMs))
  }

  const restorePending = async () => {
    const database = await db()
    const rows = database.prepare("SELECT * FROM tasks WHERE status = 'unassigned'").all()
    for (const task of rows) {
      const board = boardById(task.board_id)
      const candidates = board?.workspaces.filter(workspace => workspace.projectId === task.project_id) ?? []
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

  const connectionState = async (connection) => {
    const key = await resolveConnectionKey(connection)
    if (key === '') {
      return { id: connection.id, name: connection.name, keyConfigured: false, viewer: null, projects: [], error: '' }
    }
    try {
      const data = await gql(key, VIEWER_QUERY, {})
      return {
        id: connection.id,
        name: connection.name,
        keyConfigured: true,
        viewer: { name: text(data?.viewer?.name), email: text(data?.viewer?.email) },
        projects: await projectsWith(key),
        error: '',
      }
    } catch (error) {
      return { id: connection.id, name: connection.name, keyConfigured: true, viewer: null, projects: [], error: message(error) }
    }
  }

  const connectState = async () => {
    const connections = []
    for (const connection of cfg.connections) connections.push(await connectionState(connection))
    const first = connections[0]
    return {
      connections,
      keyConfigured: first?.keyConfigured ?? false,
      viewer: first?.viewer ?? null,
      projects: first?.projects ?? [],
      error: first?.error ?? '',
    }
  }

  const connect = async (connectionId, value) => {
    const connection = text(connectionId) === '' ? cfg.connections[0] : connectionById(text(connectionId))
    if (connection === undefined) throw new Error('Connection not found')
    const key = String(value ?? '').trim()
    if (key === '') throw new Error('Enter a Linear API key')
    const data = await gql(key, VIEWER_QUERY, {})
    if (data?.viewer === undefined) throw new Error('Linear did not accept this key')
    const credentials = ctx.get('credentials')
    if (credentials === undefined) throw new Error('Credential storage is unavailable in this profile')
    await credentials.set(connection.apiKeyEnv, key)
    const projects = await projectsWith(key)
    void tick()
    return {
      connectionId: connection.id,
      keyConfigured: true,
      viewer: { name: text(data.viewer.name), email: text(data.viewer.email) },
      projects,
      error: '',
    }
  }

  const disconnect = async (connectionId) => {
    const connection = text(connectionId) === '' ? cfg.connections[0] : connectionById(text(connectionId))
    if (connection === undefined) throw new Error('Connection not found')
    const credentials = ctx.get('credentials')
    if (credentials === undefined) throw new Error('Credential storage is unavailable in this profile')
    await credentials.unset(connection.apiKeyEnv)
  }

  const addConnection = async (input) => {
    const name = text(input?.name).trim() || 'Linear'
    const id = `conn-${randomUUID().slice(0, 8)}`
    const apiKeyEnv = `LINEAR_API_KEY_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
    const next = saveConfig({ connections: [...cfg.connections, { id, name, apiKeyEnv }] })
    const key = text(input?.key).trim()
    if (key !== '') await connect(id, key)
    return next
  }

  const saveConnection = (input) => {
    const id = text(input?.id)
    const connection = connectionById(id)
    if (connection === undefined) throw new Error('Connection not found')
    const name = text(input?.name).trim()
    if (name === '') throw new Error('Enter a connection name')
    return saveConfig({
      connections: cfg.connections.map(candidate => candidate.id === id
        ? { ...candidate, name }
        : candidate),
    })
  }

  const removeConnection = async (id) => {
    const connectionId = text(id)
    if (cfg.boards.some(board => board.connectionId === connectionId)) {
      throw new Error('Remove the boards that use this connection first')
    }
    const connection = connectionById(connectionId)
    if (connection !== undefined) {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) {
        try {
          await credentials.unset(connection.apiKeyEnv)
        } catch {
          // A missing credential is already disconnected.
        }
      }
    }
    return saveConfig({ connections: cfg.connections.filter(connection => connection.id !== connectionId) })
  }

  const addBoard = (input) => {
    const name = text(input?.name).trim() || 'Board'
    const connectionId = text(input?.connectionId).trim() || cfg.connections[0]?.id || ''
    if (connectionById(connectionId) === undefined) throw new Error('Choose a connection')
    const id = `board-${randomUUID().slice(0, 8)}`
    return saveConfig({ boards: [...cfg.boards, { id, name, connectionId, workspaces: [] }] })
  }

  const saveBoard = (input) => {
    const id = text(input?.id)
    const board = boardById(id)
    if (board === undefined) throw new Error('Board not found')
    const connectionId = text(input?.connectionId).trim() || board.connectionId
    if (connectionById(connectionId) === undefined) throw new Error('Choose a connection')
    const next = {
      ...board,
      name: text(input?.name).trim() || board.name,
      connectionId,
      workspaces: Array.isArray(input?.workspaces) ? input.workspaces : board.workspaces,
    }
    return saveConfig({ boards: cfg.boards.map(candidate => candidate.id === id ? next : candidate) })
  }

  const removeBoard = async (id) => {
    const boardId = text(id)
    const board = boardById(boardId)
    if (board === undefined) throw new Error('Board not found')
    const database = await db()
    database.prepare('DELETE FROM tasks WHERE board_id = ?').run(boardId)
    database.prepare('DELETE FROM cycles WHERE board_id = ?').run(boardId)
    database.prepare('DELETE FROM milestones WHERE board_id = ?').run(boardId)
    return saveConfig({ boards: cfg.boards.filter(candidate => candidate.id !== boardId) })
  }

  const addWorkspace = async (input) => {
    const boardId = text(input?.boardId).trim() || cfg.boards[0]?.id || ''
    const board = boardById(boardId)
    if (board === undefined) throw new Error('Board not found')
    const workspaceInput = input?.workspace ?? input
    const projectId = text(workspaceInput?.projectId).trim()
    if (projectId === '') throw new Error('Choose a Linear project')
    const path = text(workspaceInput?.path).trim()
    if (path === '') throw new Error('Choose a directory')
    if ((await gitSafe(path, ['rev-parse', '--show-toplevel'])) === '') {
      throw new Error(`"${path}" is not a git repository`)
    }
    if (cfg.boards.some(candidate => candidate.workspaces.some(workspace => workspace.projectId === projectId))) {
      throw new Error('That project is already linked to a board')
    }
    if (board.workspaces.some(workspace => workspace.projectId === projectId && workspace.path === path)) {
      throw new Error('That project is already linked to this directory')
    }
    const workspace = {
      id: `ws-${randomUUID().slice(0, 8)}`,
      name: text(workspaceInput?.name).trim() || basename(path) || projectId,
      path,
      projectId,
      baseBranch: text(workspaceInput?.baseBranch).trim(),
    }
    return saveConfig({
      boards: cfg.boards.map(candidate => candidate.id === boardId
        ? { ...candidate, workspaces: [...candidate.workspaces, workspace] }
        : candidate),
    })
  }

  const removeWorkspace = (input) => {
    const id = text(input?.id)
    const boardId = text(input?.boardId)
    const board = boardId === ''
      ? cfg.boards.find(candidate => candidate.workspaces.some(workspace => workspace.id === id))
      : boardById(boardId)
    if (board === undefined) throw new Error('Workspace not found')
    return saveConfig({
      boards: cfg.boards.map(candidate => candidate.id === board.id
        ? { ...candidate, workspaces: candidate.workspaces.filter(workspace => workspace.id !== id) }
        : candidate),
    })
  }

  const board = async () => {
    const database = await db()
    const tasks = database.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
    const cycles = database.prepare('SELECT * FROM cycles ORDER BY starts_at DESC').all().map(cycle => ({
      id: cycle.id,
      boardId: cycle.board_id,
      workspaceId: cycle.workspace_id,
      projectId: cycle.project_id,
      name: cycle.name,
      number: cycle.number,
      startsAt: cycle.starts_at,
      endsAt: cycle.ends_at,
      state: cycle.state,
      branch: cycle.branch,
      worktreePath: cycle.worktree_path,
      baseBranch: cycle.base_branch,
      baseSha: cycle.base_sha,
      startedAt: cycle.started_at,
      closedAt: cycle.closed_at,
      lastError: cycle.last_error,
    }))
    const milestones = database.prepare('SELECT * FROM milestones ORDER BY target_date').all().map(milestone => ({
      id: milestone.id,
      boardId: milestone.board_id,
      projectId: milestone.project_id,
      name: milestone.name,
      targetDate: milestone.target_date,
    }))
    const turns = database.prepare('SELECT * FROM turns ORDER BY number DESC').all().map(turn => ({
      id: turn.id,
      boardId: turn.board_id,
      cycleId: turn.cycle_id,
      workspaceId: turn.workspace_id,
      number: turn.number,
      note: turn.note,
      branch: turn.branch,
      worktreePath: turn.worktree_path,
      baseBranch: turn.base_branch,
      baseSha: turn.base_sha,
      state: turn.state,
      startedAt: turn.started_at,
      finishedAt: turn.finished_at,
      lastError: turn.last_error,
    }))
    const connections = []
    for (const connection of cfg.connections) {
      connections.push({
        id: connection.id,
        name: connection.name,
        keyConfigured: (await resolveConnectionKey(connection)) !== '',
      })
    }
    const boards = cfg.boards.map(board => {
      const connection = connectionById(board.connectionId)
      return {
        id: board.id,
        name: board.name,
        connectionId: board.connectionId,
        connectionName: connection?.name ?? '',
        keyConfigured: connections.find(candidate => candidate.id === board.connectionId)?.keyConfigured ?? false,
        workspaces: board.workspaces,
      }
    })
    return {
      tasks: tasks.map(task => ({
        ...task,
        comments: parseComments(task.comments),
        workspaceName: workspaceOf(task)?.name ?? '',
        boardName: boardById(task.board_id)?.name ?? '',
      })),
      cycles,
      turns,
      milestones,
      boards,
      connections,
      workspaces: cfg.boards[0]?.workspaces ?? [],
      config: {
        pollIntervalMs: cfg.pollIntervalMs,
        promptTemplate: cfg.promptTemplate,
      },
      keyConfigured: connections.some(connection => connection.keyConfigured),
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
      await startTask(task, workspaceOf(task), { reuseSession: task.status === 'blocked' })
      return
    }
    const now = new Date().toISOString()
    if (status === 'done') {
      database.prepare("UPDATE tasks SET status = 'done', review_state = 'approved', reviewed_at = ?, updated_at = ? WHERE id = ?")
        .run(now, now, id)
      await pushState(task, 'completed')
      await finishTurnIfDone(task.turn_id)
      return
    }
    database.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)
  }

  /** Create a task that lives only in the plugin; its source is `local`. */
  const createTask = async (input) => {
    const title = text(input?.title).trim()
    if (title === '') throw new Error('Enter a task title')
    const boardId = text(input?.boardId).trim() || cfg.boards[0]?.id || ''
    const board = boardById(boardId)
    if (board === undefined) throw new Error('Choose a board')
    const workspaceId = text(input?.workspaceId)
    const workspace = board.workspaces.find(candidate => candidate.id === workspaceId)
    if (workspace === undefined) throw new Error('Choose a workspace')
    const database = await db()
    const now = new Date().toISOString()
    const cycle = input?.cycle ?? {}
    const milestone = input?.milestone ?? {}
    const cycleId = text(cycle.id)
    if (cycleId !== '') {
      const existingCycle = await cycleById(cycleId)
      if (existingCycle !== undefined && existingCycle.board_id !== boardId) {
        throw new Error('That cycle belongs to another board')
      }
      database.prepare(`INSERT INTO cycles
        (id, board_id, workspace_id, project_id, name, number, starts_at, ends_at, state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idle')
        ON CONFLICT(id) DO NOTHING`).run(
        cycleId,
        boardId,
        workspace.id,
        workspace.projectId,
        text(cycle.name),
        text(cycle.number),
        text(cycle.startsAt),
        text(cycle.endsAt),
      )
    }
    const max = database.prepare('SELECT COALESCE(MAX(sequence), 0) AS value FROM tasks WHERE cycle_id = ?').get(cycleId)?.value ?? 0
    const id = randomUUID()
    database.prepare(`INSERT INTO tasks
      (id, board_id, identifier, title, description, comments, url, state_id, state_name, state_type, project_id, team_id, workspace_id, status, session_id, source, source_id, cycle_id, cycle_name, cycle_number, cycle_starts_at, cycle_ends_at, milestone_id, milestone_name, milestone_target_date, priority, sequence, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id,
      boardId,
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
      'pending_approval',
      null,
      'local',
      '',
      cycleId,
      text(cycle.name),
      text(cycle.number),
      text(cycle.startsAt),
      text(cycle.endsAt),
      text(milestone.id),
      text(milestone.name),
      text(milestone.targetDate),
      0,
      Number(max) + 1,
      now,
      now,
      now,
    )
    if (cycleId !== '') resequenceCycle(database, cycleId)
    return id
  }

  const notifyReview = (task) => {
    const notifications = ctx.get('notifications')
    if (notifications === undefined) return
    const id = `linear-review-${task.id}`
    notifications.push({
      id,
      title: `${task.identifier || task.title} · ready for review`,
      body: task.diff_stat === '' ? 'The agent submitted this task.' : task.diff_stat,
      kind: 'linear',
      source: 'dsh-linear',
      actions: [{ id: 'open-review', label: 'Open review' }],
    })
    notifications.onAction(id, async (actionId) => {
      if (actionId === 'open-review') return { panel: 'linear' }
    })
  }

  const notifyBlocked = (task, reason) => {
    const notifications = ctx.get('notifications')
    if (notifications === undefined) return
    const id = `linear-blocked-${task.id}`
    notifications.push({
      id,
      title: `${task.identifier || task.title} · blocked`,
      body: reason,
      kind: 'linear',
      source: 'dsh-linear',
      actions: [{ id: 'open-review', label: 'Open board' }],
    })
    notifications.onAction(id, async (actionId) => {
      if (actionId === 'open-review') return { panel: 'linear' }
    })
  }

  /** The git root for a workspace, with a message that names the bad path. */
  const repoRootOf = async (workspace) => {
    const root = await gitSafe(workspace.path, ['rev-parse', '--show-toplevel'])
    if (root === '') throw new Error(`Workspace "${workspace.name}" is not a git repository: ${workspace.path}`)
    return root
  }

  /** Mark a cycle active on first use; there is no manual start button. */
  const ensureCycleStarted = async (cycleId) => {
    const database = await db()
    const cycle = database.prepare('SELECT * FROM cycles WHERE id = ?').get(text(cycleId))
    if (cycle === undefined) throw new Error('cycle not found')
    if (cycle.state === 'active') {
      const branch = cycleBranchName(cycle)
      if (cycle.branch !== branch) {
        database.prepare('UPDATE cycles SET branch = ? WHERE id = ?').run(branch, cycle.id)
        return database.prepare('SELECT * FROM cycles WHERE id = ?').get(cycle.id)
      }
      return cycle
    }
    if (cycle.state === 'closed') throw new Error('This cycle is closed')
    const workspace = workspaceForCycle(cycle)
    if (workspace === undefined) throw new Error('No workspace links this cycle')
    const active = database.prepare("SELECT * FROM cycles WHERE board_id = ? AND state = 'active' AND id <> ? LIMIT 1")
      .get(cycle.board_id, cycle.id)
    if (active !== undefined) throw new Error(`Close cycle "${active.name || active.id}" first`)
    const repoRoot = await repoRootOf(workspace)
    const baseBranch = workspace.baseBranch === '' ? await detectBaseBranch(repoRoot) : workspace.baseBranch
    await gitSafe(repoRoot, ['fetch', '--prune'])
    const baseRef = await resolveBaseRef(repoRoot, baseBranch)
    const baseSha = await git(repoRoot, ['rev-parse', baseRef])
    const branch = cycleBranchName(cycle)
    database.prepare(`UPDATE cycles SET
      state = 'active', branch = ?, worktree_path = '', dsh_workspace_id = '',
      base_branch = ?, base_sha = ?, started_at = ?, last_error = ''
      WHERE id = ?`).run(
      branch,
      baseBranch,
      baseSha,
      new Date().toISOString(),
      cycle.id,
    )
    return database.prepare('SELECT * FROM cycles WHERE id = ?').get(cycle.id)
  }

  /**
   * Start one turn: fetch the repo, branch the turn from the latest cycle
   * branch (or origin), create its worktree, and start the first queued task.
   */
  const startWorking = async (input) => {
    const database = await db()
    const cycleId = text(input?.cycleId)
    const cycle = cycleId === '' ? undefined : await cycleById(cycleId)
    if (cycle === undefined) throw new Error('Choose a cycle')
    if (cycle.state === 'closed') throw new Error('This cycle is closed')
    const pending = database.prepare("SELECT id FROM tasks WHERE cycle_id = ? AND status IN ('doing', 'in_review', 'blocked') LIMIT 1").get(cycle.id)
    if (pending !== undefined) throw new Error('Review the previous turn before starting a new one')
    const working = database.prepare("SELECT id FROM turns WHERE cycle_id = ? AND state = 'working' LIMIT 1").get(cycle.id)
    if (working !== undefined) throw new Error('A turn is already working in this cycle')
    const taskId = text(input?.taskId)
    const queue = taskId === ''
      ? database.prepare("SELECT * FROM tasks WHERE cycle_id = ? AND status = 'todo' AND archived_at = '' ORDER BY sequence ASC, priority DESC, created_at ASC").all(cycle.id)
      : database.prepare("SELECT * FROM tasks WHERE id = ? AND status = 'todo'").all(taskId)
    if (queue.length === 0) throw new Error('No queued task to start')
    const workspace = workspaceForCycle(cycle)
    if (workspace === undefined) throw new Error('No workspace links this cycle')
    const latest = await latestTurnForCycle(cycle.id)
    if (latest?.state === 'blocked') {
      const next = database.prepare("SELECT * FROM tasks WHERE turn_id = ? AND status = 'todo' ORDER BY sequence ASC, priority DESC, created_at ASC LIMIT 1").get(latest.id)
      if (next !== undefined) {
        database.prepare("UPDATE turns SET state = 'working', last_error = '' WHERE id = ?").run(latest.id)
        try {
          await startTask(next, workspace)
        } catch (error) {
          database.prepare("UPDATE turns SET state = 'blocked', last_error = ? WHERE id = ?").run(message(error), latest.id)
          throw error
        }
        return database.prepare('SELECT * FROM turns WHERE id = ?').get(latest.id)
      }
    }
    const started = await ensureCycleStarted(cycle.id)
    const repoRoot = await repoRootOf(workspace)
    await gitSafe(repoRoot, ['fetch', '--prune'])
    const baseBranch = started.base_branch
    const integration = started.branch
    const remoteRef = await resolveBaseRef(repoRoot, baseBranch)
    const integrationExists = (await gitSafe(repoRoot, ['rev-parse', '--verify', `refs/heads/${integration}`])) !== ''
    if (integrationExists) {
      // Fast-forward an untouched cycle branch to the latest origin before branching.
      try {
        await git(repoRoot, ['merge-base', '--is-ancestor', integration, remoteRef])
        await git(repoRoot, ['update-ref', `refs/heads/${integration}`, remoteRef])
      } catch {
        // The cycle branch has its own commits; keep them.
      }
    }
    const baseRef = integrationExists ? integration : remoteRef
    const baseSha = await git(repoRoot, ['rev-parse', baseRef])
    const number = Number(database.prepare('SELECT COALESCE(MAX(number), 0) AS value FROM turns WHERE cycle_id = ?').get(cycle.id)?.value ?? 0) + 1
    const branch = turnBranchName(started, number)
    const worktreePath = worktreePathFor(workspace.id, branch)
    mkdirSync(dirname(worktreePath), { recursive: true })
    await gitSafe(repoRoot, ['worktree', 'prune'])
    const hasWorktree = existsSync(worktreePath)
      && (await gitSafe(worktreePath, ['rev-parse', '--is-inside-work-tree'])) === 'true'
    if (!hasWorktree) {
      const branchExists = (await gitSafe(repoRoot, ['rev-parse', '--verify', `refs/heads/${branch}`])) !== ''
      if (branchExists) {
        await git(repoRoot, ['worktree', 'add', worktreePath, branch])
        try {
          await git(worktreePath, ['rebase', baseRef])
        } catch (error) {
          await gitSafe(worktreePath, ['rebase', '--abort'])
          await gitSafe(repoRoot, ['worktree', 'remove', '--force', worktreePath])
          throw new Error(`Turn branch rebase failed: ${message(error)}`)
        }
      } else {
        await git(repoRoot, ['worktree', 'add', '-b', branch, worktreePath, baseRef])
        // Start the turn on the latest origin, replaying the cycle's own
        // commits on top. A conflict blocks the turn instead of starting stale.
        if (integrationExists) {
          try {
            await git(worktreePath, ['rebase', remoteRef])
          } catch (error) {
            await gitSafe(worktreePath, ['rebase', '--abort'])
            await gitSafe(repoRoot, ['worktree', 'remove', '--force', worktreePath])
            await gitSafe(repoRoot, ['branch', '-D', branch])
            throw new Error(`Turn branch rebase failed: ${message(error)}`)
          }
        }
      }
    }
    const registry = ctx.get('workspaceRegistry')
    let dshWorkspaceId = ''
    if (registry !== undefined) {
      try {
        const registered = await registry.create(worktreePath, `${workspace.name} · ${branch}`)
        dshWorkspaceId = registered.id
      } catch {
        // The worktree still works without a registered workspace.
      }
    }
    const id = randomUUID()
    const now = new Date().toISOString()
    database.prepare(`INSERT INTO turns
      (id, board_id, cycle_id, workspace_id, number, note, branch, worktree_path, dsh_workspace_id, base_branch, base_sha, state, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'working', ?)`).run(
      id,
      cycle.board_id,
      cycle.id,
      workspace.id,
      number,
      text(input?.note).trim(),
      branch,
      worktreePath,
      dshWorkspaceId,
      baseBranch,
      baseSha,
      now,
    )
    for (const task of queue) {
      database.prepare('UPDATE tasks SET turn_id = ?, updated_at = ? WHERE id = ?').run(id, now, task.id)
    }
    database.prepare('UPDATE cycles SET worktree_path = ?, base_sha = ? WHERE id = ?').run(worktreePath, baseSha, cycle.id)
    const first = database.prepare('SELECT * FROM tasks WHERE id = ?').get(queue[0].id)
    try {
      await startTask(first, workspace)
    } catch (error) {
      database.prepare("UPDATE turns SET state = 'blocked', last_error = ? WHERE id = ?").run(message(error), id)
      throw error
    }
    return database.prepare('SELECT * FROM turns WHERE id = ?').get(id)
  }

  const saveTurnNote = async (turnId, note) => {
    const database = await db()
    const turn = await turnById(text(turnId))
    if (turn === undefined) throw new Error('turn not found')
    database.prepare('UPDATE turns SET note = ? WHERE id = ?').run(text(note), turn.id)
    return database.prepare('SELECT * FROM turns WHERE id = ?').get(turn.id)
  }

  const mergeCycle = async (cycleId) => {
    const database = await db()
    const cycle = database.prepare('SELECT * FROM cycles WHERE id = ?').get(text(cycleId))
    if (cycle === undefined) throw new Error('cycle not found')
    if (cycle.branch === '') throw new Error('Start the cycle first')
    const busy = database.prepare("SELECT COUNT(*) AS value FROM tasks WHERE cycle_id = ? AND status = 'doing'").get(cycle.id)
    if (Number(busy?.value ?? 0) > 0) throw new Error('Wait for the running task to finish first')
    const workspace = workspaceForCycle(cycle)
    if (workspace === undefined) throw new Error('No workspace links this cycle')
    const repoRoot = await repoRootOf(workspace)
    const current = await git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (current !== cycle.base_branch) {
      throw new Error(`Checkout ${cycle.base_branch} in ${repoRoot} before merging`)
    }
    const dirty = await git(repoRoot, ['status', '--porcelain'])
    if (dirty !== '') throw new Error('Commit or stash changes in the base checkout first')
    try {
      await git(repoRoot, ['merge', '--no-ff', cycle.branch, '-m', `Merge ${cycle.branch}`])
    } catch (error) {
      await gitSafe(repoRoot, ['merge', '--abort'])
      database.prepare("UPDATE cycles SET state = 'blocked', last_error = ? WHERE id = ?")
        .run(message(error), cycle.id)
      throw error
    }
    database.prepare("UPDATE cycles SET state = 'closed', closed_at = ?, last_error = '' WHERE id = ?")
      .run(new Date().toISOString(), cycle.id)
    return database.prepare('SELECT * FROM cycles WHERE id = ?').get(cycle.id)
  }

  const closeCycle = async (cycleId) => {
    const id = text(cycleId)
    if (id === '') throw new Error('Choose a cycle')
    const database = await db()
    const cycle = database.prepare('SELECT * FROM cycles WHERE id = ?').get(id)
    if (cycle === undefined) throw new Error('cycle not found')
    const busy = database.prepare("SELECT COUNT(*) AS value FROM tasks WHERE cycle_id = ? AND status IN ('doing', 'in_review')").get(id)
    if (Number(busy?.value ?? 0) > 0) throw new Error('Finish or reject the tasks in review first')
    database.prepare("UPDATE cycles SET state = 'closed', closed_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id)
    return database.prepare('SELECT * FROM cycles WHERE id = ?').get(id)
  }

  /** Edit a cycle locally, then push name and dates to Linear when it has an upstream cycle. */
  const updateCycle = async (input) => {
    const id = text(input?.id)
    if (id === '') throw new Error('Choose a cycle')
    const database = await db()
    const cycle = database.prepare('SELECT * FROM cycles WHERE id = ?').get(id)
    if (cycle === undefined) throw new Error('cycle not found')
    const name = text(input?.name).trim()
    if (name === '') throw new Error('Enter a cycle name')
    // The date input sends YYYY-MM-DD; keep the cycle's original time of day.
    const withTime = (value, existing) => value === ''
      ? ''
      : (value.length === 10 && existing.length > 10 ? `${value}${existing.slice(10)}` : value)
    const startsAt = withTime(text(input?.startsAt), cycle.starts_at)
    const endsAt = withTime(text(input?.endsAt), cycle.ends_at)
    if (startsAt !== '' && endsAt !== '' && endsAt.slice(0, 10) < startsAt.slice(0, 10)) {
      throw new Error('The end date must be on or after the start date')
    }
    // Ad-hoc cycles are created locally and have no number; only numbered cycles exist in Linear.
    if (cycle.number !== '') await pushCycleFields(cycle, name, startsAt, endsAt)
    database.prepare('UPDATE cycles SET name = ?, starts_at = ?, ends_at = ? WHERE id = ?')
      .run(name, startsAt, endsAt, id)
    database.prepare('UPDATE tasks SET cycle_name = ?, cycle_starts_at = ?, cycle_ends_at = ? WHERE cycle_id = ?')
      .run(name, startsAt, endsAt, id)
    return database.prepare('SELECT * FROM cycles WHERE id = ?').get(id)
  }

  /** Edit a task's points, milestone, and cycle locally, then push them to its Linear issue. */
  const updateTaskFields = async (input) => {
    const id = text(input?.id)
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (task === undefined) throw new Error('task not found')
    const estimate = Math.round(Number(input?.estimate ?? task.estimate ?? 0))
    if (!Number.isFinite(estimate) || estimate < 0) throw new Error('Points must be zero or more')
    const milestone = input?.milestone ?? {
      id: task.milestone_id,
      name: task.milestone_name,
      targetDate: task.milestone_target_date,
    }
    const milestoneId = text(milestone.id)
    let cycle = {
      id: task.cycle_id,
      name: task.cycle_name,
      number: task.cycle_number,
      startsAt: task.cycle_starts_at,
      endsAt: task.cycle_ends_at,
    }
    if (input?.cycle !== undefined) {
      const cycleId = text(input.cycle.id)
      if (cycleId === '') {
        cycle = { id: '', name: '', number: '', startsAt: '', endsAt: '' }
      } else {
        const row = database.prepare('SELECT * FROM cycles WHERE id = ?').get(cycleId)
        if (row === undefined) throw new Error('cycle not found')
        if (row.board_id !== task.board_id) throw new Error('That cycle belongs to another board')
        cycle = { id: row.id, name: row.name, number: row.number, startsAt: row.starts_at, endsAt: row.ends_at }
      }
    }
    if (task.source === 'linear') {
      await pushIssueFields(task, estimate, milestoneId)
      // Ad-hoc cycles have no Linear counterpart; keep that assignment local.
      if (cycle.id !== task.cycle_id && (cycle.id === '' || cycle.number !== '')) {
        await pushIssueCycle(task, cycle.id)
      }
    }
    database.prepare(`UPDATE tasks SET estimate = ?, milestone_id = ?, milestone_name = ?, milestone_target_date = ?,
      cycle_id = ?, cycle_name = ?, cycle_number = ?, cycle_starts_at = ?, cycle_ends_at = ?, updated_at = ? WHERE id = ?`)
      .run(
        estimate,
        milestoneId,
        text(milestone.name),
        text(milestone.targetDate),
        cycle.id,
        cycle.name,
        cycle.number,
        cycle.startsAt,
        cycle.endsAt,
        new Date().toISOString(),
        id,
      )
    if (cycle.id !== task.cycle_id) {
      if (task.cycle_id !== '') resequenceCycle(database, task.cycle_id)
      if (cycle.id !== '') resequenceCycle(database, cycle.id)
    }
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  }

  const clearDone = async (boardId) => {
    const database = await db()
    const id = text(boardId)
    const now = new Date().toISOString()
    const result = id === ''
      ? database.prepare("UPDATE tasks SET archived_at = ?, updated_at = ? WHERE status = 'done' AND archived_at = ''").run(now, now)
      : database.prepare("UPDATE tasks SET archived_at = ?, updated_at = ? WHERE status = 'done' AND archived_at = '' AND board_id = ?").run(now, now, id)
    return { archived: Number(result.changes) }
  }

  const approveTask = async (id) => {
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(text(id))
    if (task === undefined) throw new Error('task not found')
    const now = new Date().toISOString()
    if (task.status === 'pending_approval') {
      database.prepare("UPDATE tasks SET status = 'todo', review_state = 'approved_to_work', reviewed_at = ?, last_error = '', updated_at = ? WHERE id = ?")
        .run(now, now, task.id)
      if (task.cycle_id !== '') resequenceCycle(database, task.cycle_id)
      return database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
    }
    if (task.status !== 'in_review') throw new Error('task is not in review')
    database.prepare("UPDATE tasks SET status = 'done', review_state = 'approved', reviewed_at = ?, last_error = '', updated_at = ? WHERE id = ?")
      .run(now, now, task.id)
    if (task.cycle_id !== '') resequenceCycle(database, task.cycle_id)
    await pushState(task, 'completed')
    await finishTurnIfDone(task.turn_id)
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
  }

  /** A turn is done when every task in it is done or canceled. */
  const finishTurnIfDone = async (turnId) => {
    if (turnId === '') return
    const database = await db()
    const pending = database.prepare("SELECT COUNT(*) AS value FROM tasks WHERE turn_id = ? AND status NOT IN ('done', 'canceled')").get(turnId)
    if (Number(pending?.value ?? 0) > 0) return
    database.prepare("UPDATE turns SET state = 'done', finished_at = ?, last_error = '' WHERE id = ? AND state <> 'done'")
      .run(new Date().toISOString(), turnId)
  }

  const unapproveTask = async (id) => {
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(text(id))
    if (task === undefined) throw new Error('task not found')
    if (task.status !== 'todo') throw new Error('Only a queued task can go back to review')
    if (task.turn_id !== '') throw new Error('This task is already part of a turn')
    database.prepare("UPDATE tasks SET status = 'pending_approval', review_state = 'none', reviewed_at = '', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), task.id)
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
  }

  const rejectTask = async (id, reason) => {
    const textReason = text(reason).trim()
    if (textReason === '') throw new Error('Enter a rejection reason')
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(text(id))
    if (task === undefined) throw new Error('task not found')
    if (task.status !== 'in_review') throw new Error('task is not in review')
    const cycle = await cycleForTask(task)
    if (cycle === undefined) throw new Error('No cycle for this task')
    const turn = await turnById(task.turn_id)
    if (turn === undefined) throw new Error('No turn for this task')
    const workspace = workspaceForCycle(cycle)
    if (workspace === undefined) throw new Error('No workspace links this cycle')
    const now = new Date().toISOString()
    database.prepare("UPDATE tasks SET status = 'doing', review_state = 'rejected', review_reason = ?, reviewed_at = ?, last_error = '', updated_at = ? WHERE id = ?")
      .run(textReason, now, now, task.id)
    if (task.cycle_id !== '') resequenceCycle(database, task.cycle_id)
    const prompt = rejectionPrompt(task, turn, cycle, textReason)
    try {
      await startTask(task, workspace, { reuseSession: true, promptOverride: prompt })
    } catch {
      await startTask(task, workspace, { reuseSession: false, promptOverride: prompt })
    }
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
  }

  const markReviewed = async (id, reviewed) => {
    const database = await db()
    const now = new Date().toISOString()
    database.prepare('UPDATE tasks SET reviewed_at = ?, updated_at = ? WHERE id = ?')
      .run(reviewed === true ? now : '', now, text(id))
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(text(id))
  }

  /**
   * Finish a done task: push its reviewed state to Linear, then archive the row
   * locally. The row is kept so the next sync does not import the issue again.
   */
  const closeTask = async (id) => {
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(text(id))
    if (task === undefined) throw new Error('task not found')
    if (task.status !== 'done') throw new Error('only a done task can be closed')
    if (task.source === 'linear') await pushState(task, 'completed')
    const now = new Date().toISOString()
    database.prepare(`UPDATE tasks SET status = 'done', review_state = 'approved',
      reviewed_at = ?, archived_at = ?, updated_at = ? WHERE id = ?`)
      .run(now, now, now, task.id)
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
  }

  /**
   * Move a task out of the board into the local archive. Linear is untouched;
   * the row is kept so the next sync does not import the issue again.
   */
  const archiveTask = async (id) => {
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(text(id))
    if (task === undefined) throw new Error('task not found')
    if (task.status !== 'pending_approval' && task.status !== 'in_review') {
      throw new Error('only a task in review can be archived')
    }
    const now = new Date().toISOString()
    database.prepare('UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, task.id)
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
  }

  /** Cancel an archived task in Linear; the local row stays archived. */
  const cancelInLinear = async (id) => {
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(text(id))
    if (task === undefined) throw new Error('task not found')
    if (task.archived_at === '') throw new Error('only an archived task can be canceled in Linear')
    if (task.source === 'linear') await pushState(task, 'canceled')
    const now = new Date().toISOString()
    database.prepare(`UPDATE tasks SET status = 'canceled', review_state = 'canceled',
      reviewed_at = ?, updated_at = ? WHERE id = ?`)
      .run(now, now, task.id)
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
  }

  const notifyTurnReady = (turn, cycle, head) => {
    const notifications = ctx.get('notifications')
    if (notifications === undefined) return
    const id = `linear-turn-${turn.id}`
    notifications.push({
      id,
      title: `Turn ${turn.number} ready · ${cycle.branch}`,
      body: `Branch ${cycle.branch} is at ${head.slice(0, 7)}.${turn.note.trim() === '' ? '' : ` After merge: ${turn.note.trim()}`} Review, merge, or open a pull request.`,
      kind: 'linear',
      source: 'dsh-linear',
      actions: [{ id: 'open-review', label: 'Open board' }],
    })
    notifications.onAction(id, async (actionId) => {
      if (actionId === 'open-review') return { panel: 'linear' }
    })
  }

  /** Publish the finished turn as the real cycle branch in the repo. */
  const finishTurn = async (turn) => {
    // A turn already in review can get another commit (for example after a
    // rejection); republish so the real cycle branch follows the new HEAD.
    if (turn.state === 'done') return
    const database = await db()
    const cycle = await cycleById(turn.cycle_id)
    if (cycle === undefined) throw new Error('No cycle for this turn')
    const workspace = workspaceForCycle(cycle)
    if (workspace === undefined) throw new Error('No workspace links this cycle')
    const repoRoot = await repoRootOf(workspace)
    const head = await git(turn.worktree_path, ['rev-parse', 'HEAD'])
    await git(repoRoot, ['update-ref', `refs/heads/${cycle.branch}`, head])
    const now = new Date().toISOString()
    database.prepare("UPDATE turns SET state = 'review', finished_at = ?, last_error = '' WHERE id = ?").run(now, turn.id)
    database.prepare('UPDATE cycles SET worktree_path = ?, base_sha = ? WHERE id = ?').run(turn.worktree_path, head, cycle.id)
    notifyTurnReady(turn, cycle, head)
  }

  /** Start the next queued task in the turn, or publish the turn when the queue is empty. */
  const advanceTurn = async (task) => {
    if (task.turn_id === '') return
    const database = await db()
    const turn = await turnById(task.turn_id)
    if (turn === undefined) return
    const next = database.prepare("SELECT * FROM tasks WHERE turn_id = ? AND status = 'todo' ORDER BY sequence ASC, priority DESC, created_at ASC LIMIT 1").get(turn.id)
    if (next !== undefined) {
      try {
        await startTask(next, workspaceOf(next))
      } catch (error) {
        database.prepare("UPDATE turns SET state = 'blocked', last_error = ? WHERE id = ?").run(message(error), turn.id)
        lastError = message(error)
      }
      return
    }
    try {
      await finishTurn(turn)
    } catch (error) {
      database.prepare("UPDATE turns SET state = 'blocked', last_error = ? WHERE id = ?").run(message(error), turn.id)
      lastError = message(error)
    }
  }

  const submitTask = async (task, summary = '') => {
    if (task.status === 'in_review') return { commit: task.commit_hash, stat: task.diff_stat }
    if (task.status !== 'doing') throw new Error('This task is not in progress')
    const database = await db()
    const cycle = await cycleForTask(task)
    if (cycle === undefined) throw new Error('No cycle for this task')
    const turn = await turnById(task.turn_id)
    if (turn === undefined) throw new Error('No turn for this task')
    if (turn.worktree_path === '' || !existsSync(turn.worktree_path)) throw new Error('The turn worktree is missing')
    const dirty = await git(turn.worktree_path, ['status', '--porcelain'])
    if (dirty !== '') throw new Error('Commit your changes before submitting')
    const commit = await git(turn.worktree_path, ['rev-parse', 'HEAD'])
    const base = task.base_sha === '' ? cycle.base_sha : task.base_sha
    if (commit === base) throw new Error('No commit since this task started')
    const stat = await git(turn.worktree_path, ['diff', '--stat', `${base}..${commit}`])
    const now = new Date().toISOString()
    database.prepare(`UPDATE tasks SET
      status = 'in_review', commit_hash = ?, diff_stat = ?, submit_summary = ?,
      review_state = 'pending', submitted_at = ?, last_error = '', updated_at = ?
      WHERE id = ?`).run(commit, stat, text(summary), now, now, task.id)
    if (task.cycle_id !== '') resequenceCycle(database, task.cycle_id)
    const updated = database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
    notifyReview(updated)
    await advanceTurn(updated)
    return { commit, stat }
  }

  const diffForTask = async (id) => {
    const database = await db()
    const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(text(id))
    if (task === undefined) throw new Error('task not found')
    const cycle = await cycleForTask(task)
    if (cycle === undefined) throw new Error('No cycle for this task')
    const turn = await turnById(task.turn_id)
    if (turn === undefined) throw new Error('No turn for this task')
    if (turn.worktree_path === '' || !existsSync(turn.worktree_path)) throw new Error('The turn worktree is missing')
    const base = task.base_sha === '' ? cycle.base_sha : task.base_sha
    const commit = task.commit_hash === '' ? 'HEAD' : task.commit_hash
    const stat = await git(turn.worktree_path, ['diff', '--stat', `${base}..${commit}`])
    let diff = await git(turn.worktree_path, ['diff', '--unified=3', `${base}..${commit}`])
    const truncated = diff.length > DIFF_LIMIT
    if (truncated) diff = `${diff.slice(0, DIFF_LIMIT)}\n\n[diff truncated]`
    return { stat, diff, truncated }
  }

  const saveConfig = (input) => {
    const next = normalizeConfig({ ...cfg, ...input })
    writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`)
    cfg = next
    startLoop()
    notifyBoard()
    return next
  }

  const setKey = async (value) => {
    const connection = cfg.connections[0]
    if (connection === undefined) throw new Error('Add a connection first')
    const credentials = ctx.get('credentials')
    if (credentials === undefined) throw new Error('Credential storage is unavailable in this profile')
    if (value === '') await credentials.unset(connection.apiKeyEnv)
    else await credentials.set(connection.apiKeyEnv, value)
  }

  ctx.tools.register({
    name: 'linear_task',
    description: 'Report progress on the Linear task linked to this session. Call submit after committing, note to record post-merge steps, or blocked when you cannot continue.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['submit', 'status', 'blocked', 'note'],
          description: 'submit (the commit is ready for review) | status (current task) | blocked (cannot continue) | note (update the turn note).',
        },
        summary: { type: 'string', description: 'Short summary of the change for submit.' },
        reason: { type: 'string', description: 'Why the task is blocked.' },
        note: { type: 'string', description: 'Post-merge steps for the turn, such as migrations or version bumps.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['message'],
        properties: {
          message: { type: 'string' },
          taskId: { type: 'string' },
          status: { type: 'string' },
          commit: { type: 'string' },
        },
      },
      render(_args, value) {
        return [{ type: 'text', text: value.message }]
      },
    },
    async execute(args, exec) {
      const sessionId = exec.agent?.id
      if (sessionId === undefined) throw new Error('linear_task requires an agent session')
      const database = await db()
      const task = database.prepare('SELECT * FROM tasks WHERE session_id = ?').get(sessionId)
      if (task === undefined) throw new Error('No Linear task is linked to this session')
      if (args.action === 'status') {
        const cycle = await cycleForTask(task)
        return {
          message: `${task.identifier || task.title}: ${task.status}${cycle === undefined ? '' : ` on ${cycle.branch}`}.`,
          taskId: task.id,
          status: task.status,
          commit: task.commit_hash,
        }
      }
      if (args.action === 'submit') {
        const result = await submitTask(task, text(args.summary))
        return {
          message: `Submitted ${task.identifier || task.title} for review at ${result.commit.slice(0, 7)}.`,
          taskId: task.id,
          status: 'in_review',
          commit: result.commit,
        }
      }
      if (args.action === 'note') {
        const turn = await turnById(task.turn_id)
        if (turn === undefined) throw new Error('No turn is linked to this task')
        await saveTurnNote(turn.id, text(args.note))
        return { message: `Updated the turn note for turn ${turn.number}.`, taskId: task.id, status: task.status }
      }
      if (args.action === 'blocked') {
        const reason = text(args.reason).trim()
        if (reason === '') throw new Error('Enter a blocked reason')
        database.prepare("UPDATE tasks SET status = 'blocked', last_error = ?, updated_at = ? WHERE id = ?")
          .run(reason, new Date().toISOString(), task.id)
        notifyBlocked(task, reason)
        return { message: `Marked ${task.identifier || task.title} blocked.`, taskId: task.id, status: 'blocked' }
      }
      throw new Error(`unknown action ${String(args.action)}`)
    },
  })

  // A turn that ends without a submit is either a finished commit or a stuck
  // agent. Auto-submit a clean new commit; otherwise surface the blocker.
  ctx.effect(() => ctx.on('session/event', (session, event) => {
    if (event.type !== 'turn/end') return
    void (async () => {
      try {
        const database = await db()
        const task = database.prepare("SELECT * FROM tasks WHERE session_id = ? AND status = 'doing'").get(session.id)
        if (task === undefined) return
        const turn = await turnById(task.turn_id)
        if (turn === undefined || turn.worktree_path === '') return
        const dirty = await git(turn.worktree_path, ['status', '--porcelain'])
        const head = await git(turn.worktree_path, ['rev-parse', 'HEAD'])
        if (dirty === '' && head !== task.base_sha) {
          await submitTask(task, '')
          return
        }
        const reason = dirty === '' ? 'No commit after the turn ended' : 'Uncommitted changes after the turn ended'
        database.prepare("UPDATE tasks SET status = 'blocked', last_error = ?, updated_at = ? WHERE id = ?")
          .run(reason, new Date().toISOString(), task.id)
        notifyBlocked(task, reason)
      } catch (error) {
        lastError = message(error)
      }
    })()
  }), 'dsh-linear: turn end')

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

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-linear/events',
      handler: (req, res) => {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
          'x-accel-buffering': 'no',
        })
        res.write('retry: 2000\n\n')
        subscribers.add(res)
        const heartbeat = setInterval(() => {
          try {
            res.write(': ping\n\n')
          } catch {
            // The close handler removes the dead subscriber.
          }
        }, 25_000)
        req.on('close', () => {
          clearInterval(heartbeat)
          subscribers.delete(res)
        })
      },
    })
    return () => {
      dispose()
      for (const res of subscribers) res.end()
      subscribers.clear()
    }
  }, 'dsh-linear: events route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-linear/diff',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'method not allowed' })
        return
      }
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const taskId = url.searchParams.get('taskId') ?? ''
        if (taskId === '') throw new Error('taskId is required')
        sendJson(res, 200, await diffForTask(taskId))
      } catch (error) {
        sendJson(res, 400, { error: message(error) })
      }
    },
  }), 'dsh-linear: diff route')

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
          void tick(body.force === true)
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
          sendJson(res, 200, { ok: true, cycle: await closeCycle(body.cycleId) })
          return
        }
        if (body.op === 'mergeCycle') {
          sendJson(res, 200, { ok: true, cycle: await mergeCycle(body.cycleId) })
          return
        }
        if (body.op === 'updateCycle') {
          sendJson(res, 200, { ok: true, cycle: await updateCycle(body.cycle ?? {}) })
          return
        }
        if (body.op === 'updateTaskFields') {
          sendJson(res, 200, { ok: true, task: await updateTaskFields(body.task ?? {}) })
          return
        }
        if (body.op === 'clearDone') {
          sendJson(res, 200, { ok: true, ...(await clearDone(body.boardId)) })
          return
        }
        if (body.op === 'approve') {
          sendJson(res, 200, { ok: true, task: await approveTask(body.id) })
          return
        }
        if (body.op === 'reject') {
          sendJson(res, 200, { ok: true, task: await rejectTask(body.id, body.reason) })
          return
        }
        if (body.op === 'markReviewed') {
          sendJson(res, 200, { ok: true, task: await markReviewed(body.id, body.reviewed === true) })
          return
        }
        if (body.op === 'close') {
          sendJson(res, 200, { ok: true, task: await closeTask(body.id) })
          return
        }
        if (body.op === 'archive') {
          sendJson(res, 200, { ok: true, task: await archiveTask(body.id) })
          return
        }
        if (body.op === 'cancel') {
          sendJson(res, 200, { ok: true, task: await cancelInLinear(body.id) })
          return
        }
        if (body.op === 'start') {
          const database = await db()
          const found = database.prepare('SELECT * FROM tasks WHERE id = ?').get(String(body.id))
          if (found === undefined) throw new Error('task not found')
          if (found.status === 'blocked' && found.turn_id !== '') {
            await startTask(found, workspaceOf(found), { reuseSession: true })
            sendJson(res, 200, { ok: true })
            return
          }
          const turn = await startWorking({ cycleId: found.cycle_id, taskId: found.id })
          sendJson(res, 200, { ok: true, turn })
          return
        }
        if (body.op === 'startWorking') {
          sendJson(res, 200, { ok: true, turn: await startWorking(body) })
          return
        }
        if (body.op === 'saveTurnNote') {
          sendJson(res, 200, { ok: true, turn: await saveTurnNote(body.turnId, body.note) })
          return
        }
        if (body.op === 'unapprove') {
          sendJson(res, 200, { ok: true, task: await unapproveTask(body.id) })
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
          sendJson(res, 200, { ok: true, connect: await connect(body.connectionId, body.key) })
          return
        }
        if (body.op === 'disconnect') {
          await disconnect(body.connectionId)
          sendJson(res, 200, { ok: true })
          return
        }
        if (body.op === 'addConnection') {
          sendJson(res, 200, { ok: true, config: await addConnection(body.connection ?? {}) })
          return
        }
        if (body.op === 'saveConnection') {
          sendJson(res, 200, { ok: true, config: saveConnection(body.connection ?? {}) })
          return
        }
        if (body.op === 'removeConnection') {
          sendJson(res, 200, { ok: true, config: await removeConnection(body.id) })
          return
        }
        if (body.op === 'addBoard') {
          sendJson(res, 200, { ok: true, config: addBoard(body.board ?? {}) })
          return
        }
        if (body.op === 'saveBoard') {
          sendJson(res, 200, { ok: true, config: saveBoard(body.board ?? {}) })
          return
        }
        if (body.op === 'removeBoard') {
          sendJson(res, 200, { ok: true, config: await removeBoard(body.id) })
          return
        }
        if (body.op === 'addWorkspace') {
          sendJson(res, 200, { ok: true, config: await addWorkspace({ boardId: body.boardId, workspace: body.workspace ?? {} }) })
          return
        }
        if (body.op === 'removeWorkspace') {
          sendJson(res, 200, { ok: true, config: removeWorkspace({ boardId: body.boardId, id: body.id }) })
          return
        }
        sendJson(res, 400, { ok: false, error: `unknown op "${String(body.op)}"` })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: message(error) })
      }
    },
  }), 'dsh-linear: act route')

  const commandHandler = async ({ rawInput }: { rawInput: string }): Promise<{ kind: 'success' | 'error'; text: string }> => {
    const parts = rawInput.trim().split(/\s+/).filter((part) => part !== '')
    const sub = parts[0] ?? 'status'
    if (sub === 'status') {
      const state = await board()
      const counts = new Map<string, number>()
      for (const task of state.tasks) counts.set(task.status, (counts.get(task.status) ?? 0) + 1)
      const summary = [...counts.entries()].map(([status, count]) => `${status} ${count}`).join(', ') || 'no tasks'
      return {
        kind: 'success',
        text: [
          `boards: ${state.boards.map((entry) => entry.name).join(', ') || 'none'}`,
          `key configured: ${state.keyConfigured ? 'yes' : 'no'}`,
          `last sync: ${state.lastSync || 'never'}`,
          `tasks: ${summary}`,
          ...(state.lastError ? [`last error: ${state.lastError}`] : []),
        ].join('\n'),
      }
    }
    if (sub === 'sync') {
      await sync()
      return { kind: 'success', text: `Sync finished at ${lastSync || 'now'}.` }
    }
    if (sub === 'tasks') {
      const state = await board()
      const wanted = parts[1]
      const tasks = wanted === undefined ? state.tasks : state.tasks.filter((task) => task.status === wanted)
      if (tasks.length === 0) return { kind: 'success', text: 'No matching tasks.' }
      const lines = tasks.slice(0, 15).map((task) => `${String(task.status).padEnd(9)} ${task.source_id || task.id} ${task.title}`)
      return { kind: 'success', text: lines.join('\n') }
    }
    if (sub === 'start') {
      if (parts[1] === undefined) return { kind: 'error', text: 'Usage: /linear start <task id>' }
      const database = await db()
      const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(parts[1])
      if (task === undefined) return { kind: 'error', text: 'task not found' }
      await startWorking({ cycleId: task.cycle_id, taskId: task.id })
      return { kind: 'success', text: `Started ${parts[1]}.` }
    }
    if (sub === 'done') {
      if (parts[1] === undefined) return { kind: 'error', text: 'Usage: /linear done <task id>' }
      await move(parts[1], 'done')
      return { kind: 'success', text: `Completed ${parts[1]}.` }
    }
    return { kind: 'error', text: 'Subcommands: status, sync, tasks [status], start <id>, done <id>' }
  }

  // Optional: a headless composition has no command registry, and the plugin still works.
  ctx.inject(['commands'], (scope: CommandScope) => {
    scope.effect(() => scope.commands.register({
      name: 'linear',
      description: 'Report the Linear board, sync it, or move a task',
      input: { hint: '<status|sync|tasks|start|done>' },
      handler: commandHandler,
    }), 'dsh-linear: /linear command')
  })

  void (async () => {
    try {
      await db()
      lastSync = (await getMeta('lastSync')) ?? ''
      await restorePending()
      startLoop()
      await tick()
    } catch (error) {
      lastError = message(error)
    }
  })()
}
