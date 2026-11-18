/**
 * Linear browser half: a kanban/list main panel, its sidebar entry, and the
 * settings page that links projects.
 *
 * The Host owns the board, the Linear connection, and every action; this module
 * renders and posts.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-linear',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dshLinear'
    const API = '/dsh-linear'
    const POLL_MS = 5000
    const VIEW_KEY = 'dsh-linear:view'
    let uiWorkspace = null
    let workspacesService = null
    const NO_WORKSPACES = { items: [] }

    const en = {
      'meta.title': 'Linear board',
      'meta.description': 'Connect Linear, link projects to workspaces, sync issues into a local board, and start an agent session per task.',
      'panel': 'Linear',
      'board.title': 'Linear board',
      'board.sync': 'Sync now',
      'board.syncing': 'Syncing…',
      'board.empty': 'No tasks yet. Sync, or create a task.',
      'board.never': 'Never synced',
      'board.lastSync': 'Last sync {time}',
      'board.todo': 'Todo',
      'board.doing': 'In progress',
      'board.done': 'Done',
      'board.unassigned': 'Unassigned',
      'board.start': 'Start',
      'board.doneAction': 'Done',
      'board.reopen': 'Reopen',
      'board.openSession': 'Open session',
      'board.description': 'Description',
      'board.comments': 'Comments',
      'board.noDescription': 'No description.',
      'board.noComments': 'No comments.',
      'board.commentCount': '{count} comments',
      'board.close': 'Close',
      'board.assign': 'Assign',
      'board.choose': 'Choose workspace',
      'board.noProject': 'No workspace links this project.',
      'board.loading': 'Loading…',
      'board.retry': 'Retry',
      'board.error': 'The action failed.',
      'board.viewBoard': 'Board',
      'board.viewList': 'List',
      'board.views': 'View',
      'board.newTask': 'New task',
      'board.createTitle': 'New task',
      'board.create': 'Create task',
      'board.cancel': 'Cancel',
      'board.taskTitle': 'Title',
      'board.taskTitlePlaceholder': 'What needs doing?',
      'board.taskDescription': 'Description',
      'board.taskDescriptionPlaceholder': 'Add context for the agent…',
      'board.workspace': 'Workspace',
      'board.cycle': 'Cycle',
      'board.milestone': 'Milestone',
      'board.noCycle': 'No cycle',
      'board.noMilestone': 'No milestone',
      'board.cycles': 'Cycles',
      'board.allCycles': 'All cycles',
      'board.closeCycle': 'Close cycle',
      'board.closeCycleConfirm': 'Remove {count} tasks from this cycle?',
      'board.confirmClose': 'Remove tasks',
      'board.cancelClose': 'Keep cycle',
      'board.removed': 'Removed {count} tasks.',
      'board.cycleEmpty': 'No tasks in this cycle.',
      'board.cycleNumber': 'Cycle {number}',
      'board.cycleRange': '{start} – {end}',
      'board.milestoneDue': 'Due {date}',
      'board.count': '{count} tasks',
      'board.source': 'Source',
      'board.sourceLinear': 'Linear',
      'board.sourceLocal': 'Local',
      'board.status': 'Status',
      'board.details': 'Details',
      'board.due': 'Due',
      'board.listTask': 'Task',
      'board.listSource': 'Source',
      'board.listCycle': 'Cycle',
      'board.listMilestone': 'Milestone',
      'board.listWorkspace': 'Workspace',
      'board.listStatus': 'Status',
      'board.listActions': 'Actions',
      'board.localTask': 'Local task',
      'board.createError': 'Could not create the task.',
      'board.closeCycleError': 'Could not close the cycle.',
      'board.titleRequired': 'Enter a task title.',
      'board.workspaceRequired': 'Choose a workspace.',
      'board.optional': 'Optional',
      'board.noWorkspaces': 'Link a workspace first.',
      'board.sourceLinearTitle': 'Synced from Linear',
      'board.sourceLocalTitle': 'Created in this plugin',
      'board.openTask': 'Open task',
      'connect.title': 'Connect to Linear',
      'connect.intro': 'Create a personal API key in Linear, paste it here, then link a project to a directory. No file editing.',
      'connect.openKey': 'Open Linear API settings',
      'connect.key': 'Linear API key',
      'connect.keyPlaceholder': 'lin_api_…',
      'connect.button': 'Connect',
      'connect.connected': 'Connected as {name}',
      'connect.disconnect': 'Disconnect',
      'connect.project': 'Linear project',
      'connect.chooseProject': 'Choose a project',
      'connect.mode': 'Workspace',
      'connect.newWorkspace': 'New workspace',
      'connect.existingWorkspace': 'Existing workspace',
      'connect.directory': 'Directory',
      'connect.browse': 'Browse…',
      'connect.name': 'Name',
      'connect.create': 'Create new workspace',
      'connect.add': 'Link project',
      'connect.chooseWorkspace': 'Choose a workspace',
      'connect.noWorkspaces': 'No workspace to link yet. Create one first.',
      'connect.links': 'Linked projects',
      'connect.none': 'No project linked yet.',
      'connect.remove': 'Remove',
      'connect.error': 'Could not connect.',
      'settings.title': 'Linear',
      'settings.intro': 'Link one or more workspaces to Linear projects. Each linked project is polled for issues.',
      'settings.autoStart': 'Start a session when a task enters Todo',
      'settings.maxParallel': 'Sessions started per tick',
      'settings.poll': 'Poll interval (seconds)',
      'settings.prompt': 'Prompt template',
      'settings.promptHint': 'Placeholders: {identifier} {title} {description} {comments} {url} {path}',
      'settings.save': 'Save settings',
      'settings.saved': 'Saved.',
      'settings.error': 'Could not save.',
    }

    const zh = {
      'meta.title': 'Linear 看板',
      'meta.description': '连接 Linear，将项目关联到工作区，把任务同步到本地看板，并为每个任务启动一个智能体会话。',
      'panel': 'Linear',
      'board.title': 'Linear 看板',
      'board.sync': '立即同步',
      'board.syncing': '同步中…',
      'board.empty': '还没有任务。同步，或新建一个任务。',
      'board.never': '从未同步',
      'board.lastSync': '上次同步 {time}',
      'board.todo': '待办',
      'board.doing': '进行中',
      'board.done': '已完成',
      'board.unassigned': '未分配',
      'board.start': '开始',
      'board.doneAction': '完成',
      'board.reopen': '重新打开',
      'board.openSession': '打开会话',
      'board.description': '描述',
      'board.comments': '评论',
      'board.noDescription': '没有描述。',
      'board.noComments': '没有评论。',
      'board.commentCount': '{count} 条评论',
      'board.close': '关闭',
      'board.assign': '分配',
      'board.choose': '选择工作区',
      'board.noProject': '没有工作区关联此项目。',
      'board.loading': '加载中…',
      'board.retry': '重试',
      'board.error': '操作失败。',
      'board.viewBoard': '看板',
      'board.viewList': '列表',
      'board.views': '视图',
      'board.newTask': '新建任务',
      'board.createTitle': '新建任务',
      'board.create': '创建任务',
      'board.cancel': '取消',
      'board.taskTitle': '标题',
      'board.taskTitlePlaceholder': '要做什么？',
      'board.taskDescription': '描述',
      'board.taskDescriptionPlaceholder': '为智能体补充上下文…',
      'board.workspace': '工作区',
      'board.cycle': '周期',
      'board.milestone': '里程碑',
      'board.noCycle': '无周期',
      'board.noMilestone': '无里程碑',
      'board.cycles': '周期',
      'board.allCycles': '全部周期',
      'board.closeCycle': '关闭周期',
      'board.closeCycleConfirm': '从此周期移除 {count} 个任务？',
      'board.confirmClose': '移除任务',
      'board.cancelClose': '保留周期',
      'board.removed': '已移除 {count} 个任务。',
      'board.cycleEmpty': '此周期没有任务。',
      'board.cycleNumber': '周期 {number}',
      'board.cycleRange': '{start} – {end}',
      'board.milestoneDue': '截止 {date}',
      'board.count': '{count} 个任务',
      'board.source': '来源',
      'board.sourceLinear': 'Linear',
      'board.sourceLocal': '本地',
      'board.status': '状态',
      'board.details': '详情',
      'board.due': '截止',
      'board.listTask': '任务',
      'board.listSource': '来源',
      'board.listCycle': '周期',
      'board.listMilestone': '里程碑',
      'board.listWorkspace': '工作区',
      'board.listStatus': '状态',
      'board.listActions': '操作',
      'board.localTask': '本地任务',
      'board.createError': '无法创建任务。',
      'board.closeCycleError': '无法关闭周期。',
      'board.titleRequired': '请输入任务标题。',
      'board.workspaceRequired': '请选择工作区。',
      'board.optional': '可选',
      'board.noWorkspaces': '请先关联工作区。',
      'board.sourceLinearTitle': '从 Linear 同步',
      'board.sourceLocalTitle': '在插件中创建',
      'board.openTask': '打开任务',
      'connect.title': '连接 Linear',
      'connect.intro': '在 Linear 中创建个人 API 密钥，粘贴到这里，然后把项目关联到目录。无需编辑文件。',
      'connect.openKey': '打开 Linear API 设置',
      'connect.key': 'Linear API 密钥',
      'connect.keyPlaceholder': 'lin_api_…',
      'connect.button': '连接',
      'connect.connected': '已连接：{name}',
      'connect.disconnect': '断开连接',
      'connect.project': 'Linear 项目',
      'connect.chooseProject': '选择项目',
      'connect.mode': '工作区',
      'connect.newWorkspace': '新建工作区',
      'connect.existingWorkspace': '已有工作区',
      'connect.directory': '目录',
      'connect.browse': '浏览…',
      'connect.name': '名称',
      'connect.create': '新建工作区',
      'connect.add': '关联项目',
      'connect.chooseWorkspace': '选择工作区',
      'connect.noWorkspaces': '还没有可关联的工作区，请先新建。',
      'connect.links': '已关联项目',
      'connect.none': '还没有关联项目。',
      'connect.remove': '移除',
      'connect.error': '无法连接。',
      'settings.title': 'Linear',
      'settings.intro': '将一个或多个工作区关联到 Linear 项目。每个已关联项目都会被轮询。',
      'settings.autoStart': '任务进入待办时启动会话',
      'settings.maxParallel': '每次同步启动的会话数',
      'settings.poll': '轮询间隔（秒）',
      'settings.prompt': '提示词模板',
      'settings.promptHint': '占位符：{identifier} {title} {description} {comments} {url} {path}',
      'settings.save': '保存设置',
      'settings.saved': '已保存。',
      'settings.error': '无法保存。',
    }

    const CSS = `
.dshl-page { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 20px 24px; box-sizing: border-box; gap: 16px; overflow: hidden; }
.dshl-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dshl-heading { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dshl-title { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dshl-subtitle { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dshl-meta { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dshl-spacer { flex: 1; }
.dshl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 28px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; white-space: nowrap; }
.dshl-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-btn:active { background: var(--dsw-alias-interactive-bg-active); }
.dshl-btn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-btn.primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: var(--dsw-alias-label-primary-inverted); }
.dshl-btn.primary:hover { opacity: .9; }
.dshl-btn.danger { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.dshl-btn.danger:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-btn:disabled { opacity: .5; cursor: default; }
.dshl-btn.active { background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l2); }
.dshl-error { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
.dshl-note { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dshl-ok { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-success-primary); }
.dshl-link { font-size: 12px; line-height: 18px; color: var(--dsw-alias-link); }
.dshl-segmented { display: inline-flex; padding: 2px; gap: 2px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); }
.dshl-seg { display: inline-flex; align-items: center; gap: 6px; min-height: 24px; padding: 0 8px; border: none; border-radius: var(--dsw-radius-xs); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.dshl-seg:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshl-seg.active { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); }
.dshl-seg:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dshl-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dshl-cycles { display: flex; align-items: center; gap: 4px; overflow-x: auto; min-width: 0; padding: 2px; }
.dshl-cycle-tab { flex: none; min-height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 9999px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; white-space: nowrap; }
.dshl-cycle-tab:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshl-cycle-tab[aria-selected="true"] { background: var(--dsw-alias-bg-layer-3); border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); }
.dshl-cycle-tab:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-cycle-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dshl-confirm { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 12px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary); }
.dshl-columns { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 900px) { .dshl-columns { grid-template-columns: minmax(0, 1fr); overflow-y: auto; } }
.dshl-column { display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.dshl-column-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; font-size: 12px; line-height: 18px; font-weight: 600; color: var(--dsw-alias-label-secondary); border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshl-count { font-weight: 400; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshl-cards { flex: 1; min-height: 0; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.dshl-card { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); }
.dshl-card-main { display: flex; flex-direction: column; gap: 6px; cursor: pointer; border-radius: var(--dsw-radius-xs); }
.dshl-card-main:hover .dshl-card-title { text-decoration: underline; }
.dshl-card-main:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-card-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dshl-source { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; color: var(--dsw-alias-label-tertiary); }
.dshl-source.linear { color: var(--dsw-alias-brand-primary); }
.dshl-source.local { color: var(--dsw-alias-state-success-primary); }
.dshl-card-id { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshl-chip { display: inline-flex; align-items: center; min-height: 18px; padding: 0 6px; border-radius: 9999px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
.dshl-card-title { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshl-card-meta { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }
.dshl-card-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.dshl-assign { display: flex; gap: 6px; align-items: center; }
.dshl-select { flex: 1; min-width: 0; height: 28px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; padding: 0 6px; }
.dshl-select:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dshl-empty { margin: 8px 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dshl-list { flex: 1; min-height: 0; overflow: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.dshl-list-head, .dshl-list-row { display: grid; grid-template-columns: minmax(0, 2.4fr) 88px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) 88px minmax(0, 1.4fr); gap: 12px; align-items: center; padding: 8px 12px; }
.dshl-list-head { position: sticky; top: 0; z-index: 1; background: var(--dsw-alias-bg-layer-2); border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: 11px; line-height: 16px; font-weight: 600; color: var(--dsw-alias-label-tertiary); text-transform: uppercase; letter-spacing: .04em; }
.dshl-list-row { border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshl-list-row:last-child { border-bottom: none; }
.dshl-list-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-list-task { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dshl-list-title { min-width: 0; border: none; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0; }
.dshl-list-title:hover { text-decoration: underline; }
.dshl-list-title:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-list-cell { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-list-actions { display: flex; justify-content: flex-end; }
@media (max-width: 1100px) {
  .dshl-list-head, .dshl-list-row { grid-template-columns: minmax(0, 2.4fr) 88px minmax(0, 1fr) 88px minmax(0, 1.4fr); }
  .dshl-list-head > :nth-child(4), .dshl-list-head > :nth-child(5), .dshl-list-row > :nth-child(4), .dshl-list-row > :nth-child(5) { display: none; }
}
.dshl-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--dsw-alias-bg-mask-1); }
.dshl-modal { display: flex; flex-direction: column; width: min(760px, 100%); max-height: min(82vh, 900px); border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-layer-3); box-shadow: var(--dsw-elevation-prominent); overflow: hidden; }
.dshl-modal-head { flex: none; display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshl-modal-heading { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dshl-modal-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshl-modal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
.dshl-section { display: flex; flex-direction: column; gap: 8px; }
.dshl-section-title { margin: 0; font-size: 11px; line-height: 16px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }
.dshl-prose { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); white-space: pre-wrap; overflow-wrap: anywhere; }
.dshl-comment { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); }
.dshl-comment-head { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
.dshl-detail { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dshl-detail-label { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-detail-value { font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshl-form { display: flex; flex-direction: column; gap: 12px; }
.dshl-field { display: flex; flex-direction: column; gap: 4px; }
.dshl-label { font-size: 12px; line-height: 18px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dshl-hint { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-input { height: 32px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; padding: 0 8px; }
.dshl-input:focus-visible, .dshl-textarea:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dshl-textarea { min-height: 96px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; padding: 8px; resize: vertical; }
.dshl-row { display: flex; align-items: center; gap: 8px; }
.dshl-row .dshl-input { flex: 1; min-width: 0; }
.dshl-fields { display: flex; flex-direction: column; gap: 12px; }
.dshl-modes { display: flex; gap: 6px; }
.dshl-check { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.dshl-connect { display: flex; flex-direction: column; gap: 12px; max-width: 760px; }
.dshl-connect-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.dshl-link-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); }
.dshl-link-name { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dshl-link-row .dshl-card-meta { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-settings { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.dshl-modal-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; padding-top: 4px; }
`

    const post = async (body) => {
      const response = await fetch(`${API}/act`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return response.json()
    }

    const useBoard = () => {
      const [data, setData] = React.useState(null)
      const [error, setError] = React.useState('')
      const refresh = React.useCallback(() => {
        fetch(`${API}/board`)
          .then(response => (response.ok ? response.json() : null))
          .then((payload) => {
            if (payload === null || typeof payload !== 'object') return
            setData(payload)
            setError('')
          })
          .catch(failure => setError(failure instanceof Error ? failure.message : String(failure)))
      }, [])
      React.useEffect(() => {
        refresh()
        const timer = setInterval(refresh, POLL_MS)
        return () => clearInterval(timer)
      }, [refresh])
      return { data, error, setError, refresh }
    }

    const useConnect = () => {
      const [state, setState] = React.useState(null)
      const [error, setError] = React.useState('')
      const refresh = React.useCallback(() => {
        fetch(`${API}/connect`)
          .then(response => (response.ok ? response.json() : null))
          .then((payload) => {
            if (payload === null || typeof payload !== 'object') return
            setState(payload)
            setError('')
          })
          .catch(failure => setError(failure instanceof Error ? failure.message : String(failure)))
      }, [])
      React.useEffect(() => { refresh() }, [refresh])
      return { state, error, setError, refresh }
    }

    const useDshWorkspaces = () => {
      const subscribe = React.useCallback((listener) => {
        const store = workspacesService?.list
        return store === undefined ? () => {} : store.subscribe(listener)
      }, [])
      const getSnapshot = React.useCallback(() => workspacesService?.list.getSnapshot() ?? NO_WORKSPACES, [])
      return React.useSyncExternalStore(subscribe, getSnapshot)
    }

    const formatDate = (value) => {
      if (typeof value !== 'string' || value === '') return ''
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
    }

    const cycleLabel = (cycle, t) => cycle.name
      || (cycle.number === '' ? cycle.id : t('board.cycleNumber').replace('{number}', cycle.number))

    const cycleRange = (cycle, t) => {
      const start = formatDate(cycle.startsAt)
      const end = formatDate(cycle.endsAt)
      return start === '' || end === '' ? '' : t('board.cycleRange').replace('{start}', start).replace('{end}', end)
    }

    const statusLabel = (task, t) => {
      if (task.status === 'doing') return t('board.doing')
      if (task.status === 'done') return t('board.done')
      if (task.status === 'unassigned') return t('board.unassigned')
      return t('board.todo')
    }

    function SourceIcon({ source, size = 14 }) {
      if (source === 'local') {
        return h('svg', {
          viewBox: '0 0 24 24', width: size, height: size, fill: 'currentColor', 'aria-hidden': true,
        },
        h('rect', { x: 4, y: 5, width: 4, height: 14, rx: 1.5 }),
        h('rect', { x: 10, y: 5, width: 4, height: 9, rx: 1.5 }),
        h('rect', { x: 16, y: 5, width: 4, height: 12, rx: 1.5 }))
      }
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', 'aria-hidden': true,
      },
      h('rect', { x: 3.5, y: 3.5, width: 17, height: 17, rx: 5 }),
      h('path', { d: 'M7.5 15.5 15.5 7.5M7.5 11.5 11.5 7.5M11 17l6-6' }))
    }

    function BoardViewIcon({ size }) {
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', 'aria-hidden': true,
      },
      h('rect', { x: 3, y: 4, width: 5, height: 16, rx: 1.5 }),
      h('rect', { x: 10, y: 4, width: 5, height: 10, rx: 1.5 }),
      h('rect', { x: 17, y: 4, width: 4, height: 13, rx: 1.5 }))
    }

    function ListViewIcon({ size }) {
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', 'aria-hidden': true,
      },
      h('path', { d: 'M4 6h16M4 12h16M4 18h16' }))
    }

    function ViewToggle({ view, onChange, t }) {
      return h('div', { className: 'dshl-segmented', role: 'group', 'aria-label': t('board.views') },
        h('button', {
          type: 'button',
          className: `dshl-seg${view === 'board' ? ' active' : ''}`,
          'aria-pressed': view === 'board',
          onClick: () => onChange('board'),
        }, h(BoardViewIcon, { size: 14 }), t('board.viewBoard')),
        h('button', {
          type: 'button',
          className: `dshl-seg${view === 'list' ? ' active' : ''}`,
          'aria-pressed': view === 'list',
          onClick: () => onChange('list'),
        }, h(ListViewIcon, { size: 14 }), t('board.viewList')))
    }

    function AssignControl({ task, t, busy, act, workspaces }) {
      const [choice, setChoice] = React.useState('')
      const options = workspaces.filter(workspace => workspace.projectId === task.project_id)
      if (options.length === 0) return h('span', { className: 'dshl-card-meta' }, t('board.noProject'))
      return h('div', { className: 'dshl-assign' },
        h('select', {
          className: 'dshl-select',
          'aria-label': t('board.choose'),
          value: choice,
          onChange: event => setChoice(event.target.value),
        },
        h('option', { value: '' }, t('board.choose')),
        options.map(workspace => h('option', { key: workspace.id, value: workspace.id }, workspace.name))),
        h('button', {
          type: 'button',
          className: 'dshl-btn primary',
          disabled: busy || choice === '',
          onClick: () => { void act({ op: 'assign', id: task.id, workspaceId: choice }) },
        }, t('board.assign')))
    }

    function TaskActions({ task, t, busy, act }) {
      return h('div', { className: 'dshl-card-actions' },
        task.status === 'todo' || task.status === 'backlog'
          ? h('button', { type: 'button', className: 'dshl-btn primary', disabled: busy, onClick: () => { void act({ op: 'move', id: task.id, status: 'doing' }) } }, t('board.start'))
          : null,
        task.status === 'doing'
          ? h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: () => { void act({ op: 'move', id: task.id, status: 'done' }) } }, t('board.doneAction'))
          : null,
        task.status === 'done'
          ? h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: () => { void act({ op: 'move', id: task.id, status: 'todo' }) } }, t('board.reopen'))
          : null,
        task.session_id
          ? h('button', {
            type: 'button',
            className: 'dshl-btn',
            onClick: () => { uiWorkspace?.openSession(task.session_id) },
          }, t('board.openSession'))
          : null)
    }

    function Card({ task, t, busy, act, workspaces, onOpen }) {
      const commentCount = Array.isArray(task.comments) ? task.comments.length : 0
      const meta = [task.workspaceName || t('board.unassigned'), task.cycle_name, task.milestone_name].filter(Boolean)
      if (commentCount > 0) meta.push(t('board.commentCount').replace('{count}', String(commentCount)))
      return h('article', { className: 'dshl-card' },
        h('div', {
          className: 'dshl-card-main',
          role: 'button',
          tabIndex: 0,
          'aria-label': t('board.openTask'),
          onClick: onOpen,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpen()
            }
          },
        },
        h('div', { className: 'dshl-card-top' },
          h('span', {
            className: `dshl-source ${task.source === 'local' ? 'local' : 'linear'}`,
            title: task.source === 'local' ? t('board.sourceLocalTitle') : t('board.sourceLinearTitle'),
          }, h(SourceIcon, { source: task.source })),
          h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask')),
          task.cycle_name ? h('span', { className: 'dshl-chip' }, task.cycle_name) : null),
        h('span', { className: 'dshl-card-title' }, task.title),
        meta.length > 0 ? h('span', { className: 'dshl-card-meta' }, meta.join(' · ')) : null,
        task.milestone_name && task.milestone_target_date
          ? h('span', { className: 'dshl-card-meta' }, t('board.milestoneDue').replace('{date}', formatDate(task.milestone_target_date)))
          : null),
        task.status === 'unassigned'
          ? h(AssignControl, { task, t, busy, act, workspaces })
          : h(TaskActions, { task, t, busy, act }))
    }

    function TaskModal({ task, t, busy, act, workspaces, onClose }) {
      React.useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      const comments = Array.isArray(task.comments) ? task.comments : []
      const detail = (label, value) => h('div', { className: 'dshl-detail' },
        h('span', { className: 'dshl-detail-label' }, label),
        h('span', { className: 'dshl-detail-value' }, value))
      return h('div', {
        className: 'dshl-modal-backdrop',
        role: 'presentation',
        onClick: onClose,
      },
      h('div', {
        className: 'dshl-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': task.title,
        onClick: event => event.stopPropagation(),
      },
      h('div', { className: 'dshl-modal-head' },
        h('div', { className: 'dshl-modal-heading' },
          h('div', { className: 'dshl-card-top' },
            h('span', {
              className: `dshl-source ${task.source === 'local' ? 'local' : 'linear'}`,
              title: task.source === 'local' ? t('board.sourceLocalTitle') : t('board.sourceLinearTitle'),
            }, h(SourceIcon, { source: task.source })),
            h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask'))),
          h('h2', { className: 'dshl-modal-title' }, task.title),
          h('span', { className: 'dshl-card-meta' },
            [task.workspaceName || t('board.unassigned'), task.cycle_name, task.milestone_name].filter(Boolean).join(' · '))),
        h('button', { type: 'button', className: 'dshl-btn', onClick: onClose }, t('board.close'))),
      h('div', { className: 'dshl-modal-body' },
        h('section', { className: 'dshl-section' },
          h('h3', { className: 'dshl-section-title' }, t('board.details')),
          h('div', { className: 'dshl-details' },
            detail(t('board.source'), task.source === 'local' ? t('board.sourceLocal') : t('board.sourceLinear')),
            detail(t('board.status'), statusLabel(task, t)),
            detail(t('board.workspace'), task.workspaceName || t('board.unassigned')),
            detail(t('board.cycle'), task.cycle_name || t('board.noCycle')),
            detail(t('board.milestone'), task.milestone_name || t('board.noMilestone')),
            task.milestone_target_date ? detail(t('board.due'), formatDate(task.milestone_target_date)) : null)),
        task.status === 'unassigned'
          ? h('section', { className: 'dshl-section' },
            h('h3', { className: 'dshl-section-title' }, t('board.workspace')),
            h(AssignControl, { task, t, busy, act, workspaces }))
          : null,
        h('section', { className: 'dshl-section' },
          h('h3', { className: 'dshl-section-title' }, t('board.description')),
          h('p', { className: 'dshl-prose' }, task.description || t('board.noDescription'))),
        h('section', { className: 'dshl-section' },
          h('h3', { className: 'dshl-section-title' }, t('board.comments')),
          comments.length === 0
            ? h('p', { className: 'dshl-prose' }, t('board.noComments'))
            : comments.map(comment => h('div', { key: comment.id, className: 'dshl-comment' },
              h('span', { className: 'dshl-comment-head' },
                [comment.author || 'Linear', comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''].filter(Boolean).join(' · ')),
              h('p', { className: 'dshl-prose' }, comment.body)))))))
    }

    function CreateTaskModal({ t, cycles, milestones, workspaces, onClose, onCreated }) {
      const [title, setTitle] = React.useState('')
      const [description, setDescription] = React.useState('')
      const [workspaceId, setWorkspaceId] = React.useState(workspaces[0]?.id ?? '')
      const [cycleId, setCycleId] = React.useState('')
      const [milestoneId, setMilestoneId] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')

      React.useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])

      const submit = async () => {
        if (title.trim() === '') {
          setError(t('board.titleRequired'))
          return
        }
        if (workspaceId === '') {
          setError(t('board.workspaceRequired'))
          return
        }
        setBusy(true)
        setError('')
        try {
          const cycle = cycles.find(candidate => candidate.id === cycleId)
          const milestone = milestones.find(candidate => candidate.id === milestoneId)
          const payload = await post({
            op: 'createTask',
            task: { title: title.trim(), description, workspaceId, cycle, milestone },
          })
          if (payload.ok !== true) {
            setError(payload.error || t('board.createError'))
            return
          }
          onCreated()
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(false)
        }
      }

      return h('div', {
        className: 'dshl-modal-backdrop',
        role: 'presentation',
        onClick: onClose,
      },
      h('div', {
        className: 'dshl-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': t('board.createTitle'),
        onClick: event => event.stopPropagation(),
      },
      h('div', { className: 'dshl-modal-head' },
        h('div', { className: 'dshl-modal-heading' },
          h('h2', { className: 'dshl-modal-title' }, t('board.createTitle'))),
        h('button', { type: 'button', className: 'dshl-btn', onClick: onClose }, t('board.close'))),
      h('div', { className: 'dshl-modal-body' },
        h('div', { className: 'dshl-form' },
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.taskTitle')),
            h('input', {
              className: 'dshl-input',
              value: title,
              autoFocus: true,
              placeholder: t('board.taskTitlePlaceholder'),
              onChange: event => setTitle(event.target.value),
            })),
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.taskDescription')),
            h('textarea', {
              className: 'dshl-textarea',
              value: description,
              placeholder: t('board.taskDescriptionPlaceholder'),
              onChange: event => setDescription(event.target.value),
            })),
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.workspace')),
            h('select', {
              className: 'dshl-input',
              value: workspaceId,
              onChange: event => setWorkspaceId(event.target.value),
            },
            workspaces.length === 0 ? h('option', { value: '' }, t('board.noWorkspaces')) : null,
            workspaces.map(workspace => h('option', { key: workspace.id, value: workspace.id }, workspace.name)))),
          h('div', { className: 'dshl-row' },
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-label' }, t('board.cycle')),
              h('select', {
                className: 'dshl-input',
                value: cycleId,
                onChange: event => setCycleId(event.target.value),
              },
              h('option', { value: '' }, t('board.noCycle')),
              cycles.map(cycle => h('option', { key: cycle.id, value: cycle.id }, cycleLabel(cycle, t))))),
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-label' }, t('board.milestone')),
              h('select', {
                className: 'dshl-input',
                value: milestoneId,
                onChange: event => setMilestoneId(event.target.value),
              },
              h('option', { value: '' }, t('board.noMilestone')),
              milestones.map(milestone => h('option', { key: milestone.id, value: milestone.id }, milestone.name))))),
          error !== '' ? h('p', { className: 'dshl-error' }, error) : null,
          h('div', { className: 'dshl-modal-actions' },
            h('button', { type: 'button', className: 'dshl-btn', onClick: onClose }, t('board.cancel')),
            h('button', { type: 'button', className: 'dshl-btn primary', disabled: busy, onClick: () => { void submit() } }, t('board.create')))))))
    }

    function ListView({ tasks, t, busy, act, workspaces, onOpen }) {
      return h('div', { className: 'dshl-list', role: 'table', 'aria-label': t('board.title') },
        h('div', { className: 'dshl-list-head', role: 'row' },
          h('span', { role: 'columnheader' }, t('board.listTask')),
          h('span', { role: 'columnheader' }, t('board.listSource')),
          h('span', { role: 'columnheader' }, t('board.listCycle')),
          h('span', { role: 'columnheader' }, t('board.listMilestone')),
          h('span', { role: 'columnheader' }, t('board.listWorkspace')),
          h('span', { role: 'columnheader' }, t('board.listStatus')),
          h('span', { role: 'columnheader' }, t('board.listActions'))),
        tasks.length === 0
          ? h('p', { className: 'dshl-empty' }, t('board.empty'))
          : tasks.map(task => h('div', { key: task.id, className: 'dshl-list-row', role: 'row' },
            h('div', { className: 'dshl-list-task', role: 'cell' },
              h('span', {
                className: `dshl-source ${task.source === 'local' ? 'local' : 'linear'}`,
                title: task.source === 'local' ? t('board.sourceLocalTitle') : t('board.sourceLinearTitle'),
              }, h(SourceIcon, { source: task.source })),
              h('button', {
                type: 'button',
                className: 'dshl-list-title',
                onClick: () => onOpen(task.id),
              }, task.title),
              h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask'))),
            h('span', { role: 'cell', className: 'dshl-list-cell' }, task.source === 'local' ? t('board.sourceLocal') : t('board.sourceLinear')),
            h('span', { role: 'cell', className: 'dshl-list-cell' }, task.cycle_name || '—'),
            h('span', { role: 'cell', className: 'dshl-list-cell' }, task.milestone_name || '—'),
            h('span', { role: 'cell', className: 'dshl-list-cell' }, task.workspaceName || t('board.unassigned')),
            h('span', { role: 'cell', className: 'dshl-list-cell' }, statusLabel(task, t)),
            h('div', { role: 'cell', className: 'dshl-list-actions' },
              task.status === 'unassigned'
                ? h(AssignControl, { task, t, busy, act, workspaces })
                : h(TaskActions, { task, t, busy, act })))))
    }

    function Connect({ t, workspaces, onChanged }) {
      const { state, error, setError, refresh } = useConnect()
      const dshWorkspaces = useDshWorkspaces()
      const [key, setKey] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [projectId, setProjectId] = React.useState('')
      const [mode, setMode] = React.useState('new')
      const [path, setPath] = React.useState('')
      const [name, setName] = React.useState('')
      const [workspaceId, setWorkspaceId] = React.useState('')

      const run = async (body) => {
        setBusy(true)
        setError('')
        try {
          const payload = await post(body)
          if (payload.ok !== true) {
            setError(payload.error || t('connect.error'))
            return null
          }
          refresh()
          onChanged?.()
          return payload
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
          return null
        } finally {
          setBusy(false)
        }
      }

      if (state === null) return h('p', { className: 'dshl-note' }, error || t('board.loading'))

      const projects = Array.isArray(state.projects) ? state.projects : []
      const chosen = projects.find(project => project.id === projectId)
      const existing = (dshWorkspaces.items ?? []).filter(workspace =>
        !workspaces.some(link => link.projectId === projectId && link.path === workspace.path))
      const picked = existing.find(workspace => workspace.workspaceId === workspaceId)

      const createAndLink = async () => {
        setBusy(true)
        setError('')
        try {
          const created = await workspacesService.create({ path: path.trim() })
          const payload = await post({
            op: 'addWorkspace',
            workspace: { projectId, path: created.path, name: name.trim() || created.title || chosen?.name || '' },
          })
          if (payload.ok !== true) {
            setError(payload.error || t('connect.error'))
            return
          }
          refresh()
          onChanged?.()
          setPath('')
          setName('')
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(false)
        }
      }

      const linkExisting = async () => {
        if (picked === undefined) return
        setBusy(true)
        setError('')
        try {
          const payload = await post({
            op: 'addWorkspace',
            workspace: { projectId, path: picked.path, name: picked.title || chosen?.name || '' },
          })
          if (payload.ok !== true) {
            setError(payload.error || t('connect.error'))
            return
          }
          refresh()
          onChanged?.()
          setWorkspaceId('')
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(false)
        }
      }

      const keyForm = h('div', { className: 'dshl-connect-card' },
        h('p', { className: 'dshl-note' }, t('connect.intro')),
        h('a', {
          className: 'dshl-link',
          href: 'https://linear.app/settings/api',
          target: '_blank',
          rel: 'noreferrer',
        }, t('connect.openKey')),
        h('div', { className: 'dshl-row' },
          h('input', {
            className: 'dshl-input',
            type: 'password',
            'aria-label': t('connect.key'),
            placeholder: t('connect.keyPlaceholder'),
            value: key,
            onChange: event => setKey(event.target.value),
          }),
          h('button', {
            type: 'button',
            className: 'dshl-btn primary',
            disabled: busy || key.trim() === '',
            onClick: async () => {
              const result = await run({ op: 'connect', key })
              if (result !== null) setKey('')
            },
          }, t('connect.button'))))

      const connected = h('div', { className: 'dshl-connect-card' },
        h('div', { className: 'dshl-row' },
          h('span', { className: 'dshl-ok' }, t('connect.connected').replace('{name}', state.viewer?.name || state.viewer?.email || 'Linear')),
          h('span', { className: 'dshl-spacer' }),
          h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy,
            onClick: () => { void run({ op: 'disconnect' }) },
          }, t('connect.disconnect'))),
        h('label', { className: 'dshl-field' },
          h('span', { className: 'dshl-hint' }, t('connect.project')),
          h('select', {
            className: 'dshl-input',
            value: projectId,
            onChange: (event) => {
              setProjectId(event.target.value)
              setWorkspaceId('')
              const project = projects.find(candidate => candidate.id === event.target.value)
              if (project !== undefined && name === '') setName(project.name)
            },
          },
          h('option', { value: '' }, t('connect.chooseProject')),
          projects.map(project => h('option', { key: project.id, value: project.id }, project.name)))),
        h('div', { className: 'dshl-modes', role: 'group', 'aria-label': t('connect.mode') },
          h('button', {
            type: 'button',
            className: `dshl-btn${mode === 'new' ? ' active' : ''}`,
            'aria-pressed': mode === 'new',
            onClick: () => setMode('new'),
          }, t('connect.newWorkspace')),
          h('button', {
            type: 'button',
            className: `dshl-btn${mode === 'existing' ? ' active' : ''}`,
            'aria-pressed': mode === 'existing',
            onClick: () => setMode('existing'),
          }, t('connect.existingWorkspace'))),
        mode === 'new'
          ? h('div', { className: 'dshl-fields' },
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-hint' }, t('connect.directory')),
              h('div', { className: 'dshl-row' },
                h('input', {
                  className: 'dshl-input',
                  value: path,
                  placeholder: '/Users/me/project',
                  onChange: event => setPath(event.target.value),
                }),
                h('button', {
                  type: 'button',
                  className: 'dshl-btn',
                  onClick: async () => {
                    const chosenPath = await uiWorkspace?.pickDirectory()
                    if (typeof chosenPath === 'string') setPath(chosenPath)
                  },
                }, t('connect.browse')))),
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-hint' }, t('connect.name')),
              h('input', {
                className: 'dshl-input',
                value: name,
                placeholder: chosen?.name ?? '',
                onChange: event => setName(event.target.value),
              })),
            h('div', { className: 'dshl-row' },
              h('button', {
                type: 'button',
                className: 'dshl-btn primary',
                disabled: busy || projectId === '' || path.trim() === '',
                onClick: () => { void createAndLink() },
              }, t('connect.create'))))
          : h('div', { className: 'dshl-row' },
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-hint' }, t('connect.existingWorkspace')),
              h('select', {
                className: 'dshl-input',
                value: workspaceId,
                onChange: event => setWorkspaceId(event.target.value),
              },
              h('option', { value: '' }, t('connect.chooseWorkspace')),
              existing.map(workspace => h('option', {
                key: workspace.workspaceId,
                value: workspace.workspaceId,
              }, `${workspace.title} — ${workspace.path}`)))),
            h('button', {
              type: 'button',
              className: 'dshl-btn primary',
              disabled: busy || projectId === '' || picked === undefined,
              onClick: () => { void linkExisting() },
            }, t('connect.add'))),
        mode === 'existing' && existing.length === 0
          ? h('p', { className: 'dshl-empty' }, t('connect.noWorkspaces'))
          : null,
        h('div', { className: 'dshl-field' },
          h('span', { className: 'dshl-label' }, t('connect.links')),
          workspaces.length === 0 ? h('p', { className: 'dshl-empty' }, t('connect.none')) : null,
          workspaces.map(workspace => h('div', { key: workspace.id, className: 'dshl-link-row' },
            h('span', { className: 'dshl-link-name' }, workspace.name),
            h('span', { className: 'dshl-card-meta' }, workspace.path),
            h('button', {
              type: 'button',
              className: 'dshl-btn',
              disabled: busy,
              onClick: () => { void run({ op: 'removeWorkspace', id: workspace.id }) },
            }, t('connect.remove'))))))

      return h('div', { className: 'dshl-connect' },
        h('h2', { className: 'dshl-subtitle' }, t('connect.title')),
        state.keyConfigured && state.viewer !== null ? connected : keyForm,
        error !== '' ? h('p', { className: 'dshl-error' }, error) : null,
        state.error ? h('p', { className: 'dshl-error' }, state.error) : null)
    }

    function Board({ t }) {
      const { data, error, setError, refresh } = useBoard()
      const [busy, setBusy] = React.useState(false)
      const [selectedId, setSelectedId] = React.useState(null)
      const [creating, setCreating] = React.useState(false)
      const [closing, setClosing] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [cycleId, setCycleId] = React.useState('all')
      const [view, setView] = React.useState(() => {
        try {
          return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board'
        } catch {
          return 'board'
        }
      })

      const changeView = (next) => {
        setView(next)
        try {
          window.localStorage.setItem(VIEW_KEY, next)
        } catch {
          // Storage can be unavailable; the view still changes for this session.
        }
      }

      const act = async (body) => {
        setBusy(true)
        setError('')
        setNotice('')
        try {
          const payload = await post(body)
          if (payload.ok !== true) setError(payload.error || t('board.error'))
          refresh()
          return payload
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
          return null
        } finally {
          setBusy(false)
        }
      }

      const tasks = data?.tasks ?? []
      const cycles = data?.cycles ?? []
      const milestones = []
      const milestoneIds = new Set()
      for (const task of tasks) {
        if (task.milestone_id === '' || milestoneIds.has(task.milestone_id)) continue
        milestoneIds.add(task.milestone_id)
        milestones.push({ id: task.milestone_id, name: task.milestone_name, targetDate: task.milestone_target_date })
      }
      const activeCycle = cycleId === 'all' ? null : (cycles.find(cycle => cycle.id === cycleId) ?? null)
      const visible = activeCycle === null ? tasks : tasks.filter(task => task.cycle_id === activeCycle.id)
      const selected = selectedId === null ? null : (tasks.find(task => task.id === selectedId) ?? null)
      const columns = [
        { key: 'todo', label: t('board.todo'), rows: visible.filter(task => task.status === 'todo' || task.status === 'unassigned' || task.status === 'backlog') },
        { key: 'doing', label: t('board.doing'), rows: visible.filter(task => task.status === 'doing') },
        { key: 'done', label: t('board.done'), rows: visible.filter(task => task.status === 'done') },
      ]
      const lastSync = data?.lastSync
      const needsConnect = data !== null && (data.keyConfigured === false || data.workspaces.length === 0)

      React.useEffect(() => {
        if (cycleId !== 'all' && !cycles.some(cycle => cycle.id === cycleId)) setCycleId('all')
      }, [cycleId, cycles])

      const confirmClose = async () => {
        if (activeCycle === null) return
        const payload = await act({ op: 'closeCycle', cycleId: activeCycle.id })
        if (payload?.ok === true) {
          setNotice(t('board.removed').replace('{count}', String(payload.removed ?? 0)))
          setClosing(false)
          setCycleId('all')
        }
      }

      return h('div', { className: 'dshl-page' },
        h('div', { className: 'dshl-head' },
          h('div', { className: 'dshl-heading' },
            h('h1', { className: 'dshl-title' }, t('board.title')),
            h('span', { className: 'dshl-meta' }, lastSync ? t('board.lastSync').replace('{time}', new Date(lastSync).toLocaleString()) : t('board.never'))),
          h('span', { className: 'dshl-spacer' }),
          h(ViewToggle, { view, onChange: changeView, t }),
          h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy || needsConnect,
            onClick: () => setCreating(true),
          }, t('board.newTask')),
          h('button', {
            type: 'button',
            className: 'dshl-btn primary',
            disabled: busy || data?.syncing === true || needsConnect,
            onClick: () => { void act({ op: 'sync' }) },
          }, data?.syncing === true ? t('board.syncing') : t('board.sync'))),
        error !== '' ? h('p', { className: 'dshl-error' }, error) : null,
        data !== null && data.lastError ? h('p', { className: 'dshl-error' }, data.lastError) : null,
        notice !== '' ? h('p', { className: 'dshl-ok' }, notice) : null,
        data === null
          ? h('div', { className: 'dshl-row' },
            h('p', { className: 'dshl-note' }, error === '' ? t('board.loading') : t('board.error')),
            h('button', { type: 'button', className: 'dshl-btn', onClick: refresh }, t('board.retry')))
          : needsConnect
            ? h(Connect, { t, workspaces: data.workspaces, onChanged: refresh })
            : h('div', { className: 'dshl-page', style: { padding: 0, gap: '12px' } },
              h('div', { className: 'dshl-toolbar' },
                h('div', { className: 'dshl-cycles', role: 'tablist', 'aria-label': t('board.cycles') },
                  h('button', {
                    type: 'button',
                    role: 'tab',
                    className: 'dshl-cycle-tab',
                    'aria-selected': cycleId === 'all',
                    onClick: () => setCycleId('all'),
                  }, t('board.allCycles')),
                  cycles.map(cycle => h('button', {
                    key: cycle.id,
                    type: 'button',
                    role: 'tab',
                    className: 'dshl-cycle-tab',
                    'aria-selected': cycleId === cycle.id,
                    onClick: () => setCycleId(cycle.id),
                  }, cycleLabel(cycle, t)))),
                activeCycle === null
                  ? null
                  : h('button', {
                    type: 'button',
                    className: 'dshl-btn danger',
                    disabled: busy,
                    onClick: () => setClosing(true),
                  }, t('board.closeCycle'))),
              activeCycle === null
                ? null
                : h('div', { className: 'dshl-cycle-meta' },
                  cycleRange(activeCycle, t) === '' ? null : h('span', null, cycleRange(activeCycle, t)),
                  h('span', null, t('board.count').replace('{count}', String(visible.length)))),
              closing && activeCycle !== null
                ? h('div', { className: 'dshl-confirm', role: 'alertdialog', 'aria-label': t('board.closeCycle') },
                  h('span', null, t('board.closeCycleConfirm').replace('{count}', String(visible.length))),
                  h('button', { type: 'button', className: 'dshl-btn danger', disabled: busy, onClick: () => { void confirmClose() } }, t('board.confirmClose')),
                  h('button', { type: 'button', className: 'dshl-btn', onClick: () => setClosing(false) }, t('board.cancelClose')))
                : null,
              view === 'list'
                ? h(ListView, { tasks: visible, t, busy, act, workspaces: data.workspaces, onOpen: setSelectedId })
                : h('div', { className: 'dshl-columns' }, columns.map(column => h('section', { key: column.key, className: 'dshl-column' },
                  h('div', { className: 'dshl-column-head' },
                    h('span', null, column.label),
                    h('span', { className: 'dshl-count' }, String(column.rows.length))),
                  h('div', { className: 'dshl-cards' },
                    column.rows.length === 0
                      ? h('p', { className: 'dshl-empty' }, visible.length === 0
                        ? (activeCycle === null ? t('board.empty') : t('board.cycleEmpty'))
                        : '—')
                      : column.rows.map(task => h(Card, {
                        key: task.id,
                        task,
                        t,
                        busy,
                        act,
                        workspaces: data.workspaces,
                        onOpen: () => setSelectedId(task.id),
                      })))))),
        selected !== null
          ? h(TaskModal, { task: selected, t, busy, act, workspaces: data.workspaces, onClose: () => setSelectedId(null) })
          : null,
        creating
          ? h(CreateTaskModal, {
            t,
            cycles,
            milestones,
            workspaces: data?.workspaces ?? [],
            onClose: () => setCreating(false),
            onCreated: () => { setCreating(false); refresh() },
          })
          : null)
    }

    function Settings({ t }) {
      const { data, error, setError, refresh } = useBoard()
      const [draft, setDraft] = React.useState(null)
      const [saved, setSaved] = React.useState('')
      const [busy, setBusy] = React.useState(false)

      React.useEffect(() => {
        if (data === null || draft !== null) return
        setDraft({
          autoStart: data.config.autoStart,
          maxParallel: data.config.maxParallel,
          pollIntervalMs: data.config.pollIntervalMs,
          promptTemplate: data.config.promptTemplate,
          workspaces: data.workspaces.map(workspace => ({ ...workspace })),
        })
      }, [data, draft])

      if (draft === null) {
        return h('div', { className: 'dshl-row' },
          h('p', { className: 'dshl-note' }, error === '' ? t('board.loading') : t('board.error')),
          h('button', { type: 'button', className: 'dshl-btn', onClick: refresh }, t('board.retry')))
      }

      const update = (patch) => setDraft(current => ({ ...current, ...patch }))
      const run = async (body, done) => {
        setBusy(true)
        setError('')
        setSaved('')
        try {
          const payload = await post(body)
          if (payload.ok !== true) setError(payload.error || t('settings.error'))
          else if (done !== undefined) setSaved(done)
          refresh()
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(false)
        }
      }

      return h('div', { className: 'dshl-settings' },
        h(Connect, { t, workspaces: data.workspaces, onChanged: refresh }),
        h('p', { className: 'dshl-note' }, t('settings.intro')),
        h('label', { className: 'dshl-check' },
          h('input', {
            type: 'checkbox',
            checked: draft.autoStart,
            onChange: event => update({ autoStart: event.target.checked }),
          }),
          t('settings.autoStart')),
        h('div', { className: 'dshl-row' },
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('settings.maxParallel')),
            h('input', {
              className: 'dshl-input',
              type: 'number',
              min: 1,
              max: 20,
              value: draft.maxParallel,
              onChange: event => update({ maxParallel: Number(event.target.value) }),
            })),
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('settings.poll')),
            h('input', {
              className: 'dshl-input',
              type: 'number',
              min: 15,
              value: Math.round(draft.pollIntervalMs / 1000),
              onChange: event => update({ pollIntervalMs: Number(event.target.value) * 1000 }),
            }))),
        h('label', { className: 'dshl-field' },
          h('span', { className: 'dshl-label' }, t('settings.prompt')),
          h('span', { className: 'dshl-hint' }, t('settings.promptHint')),
          h('textarea', {
            className: 'dshl-textarea',
            value: draft.promptTemplate,
            onChange: event => update({ promptTemplate: event.target.value }),
          })),
        h('div', { className: 'dshl-row' },
          h('button', {
            type: 'button',
            className: 'dshl-btn primary',
            disabled: busy,
            onClick: () => { void run({ op: 'saveConfig', config: draft }, t('settings.saved')) },
          }, t('settings.save')),
          saved !== '' ? h('span', { className: 'dshl-ok' }, saved) : null),
        error !== '' ? h('p', { className: 'dshl-error' }, error) : null)
    }

    function BoardIcon({ size }) {
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
        'aria-hidden': true,
      },
      h('rect', { x: 3, y: 4, width: 5, height: 16, rx: 1.5 }),
      h('rect', { x: 10, y: 4, width: 5, height: 10, rx: 1.5 }),
      h('rect', { x: 17, y: 4, width: 4, height: 13, rx: 1.5 }))
    }

    function apply(ctx) {
      uiWorkspace = ctx.uiWorkspace
      workspacesService = ctx.workspaces
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-linear: dictionaries')
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.dshLinear = 'board'
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-linear: styles')

      ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: 'linear',
        locale: NS,
      }, Board)), 'dsh-linear: board panel')

      ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: 'linear',
        order: 20,
        locale: NS,
        label: () => ctx.locale.bind(NS)('panel'),
      }, BoardIcon)), 'dsh-linear: sidebar entry')

      ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'linear',
        order: 60,
        locale: NS,
        label: () => ctx.locale.bind(NS)('settings.title'),
      }, Settings)), 'dsh-linear: settings')
    }

    return { inject: ['slots', 'locale', 'uiWorkspace', 'workspaces'], apply }
  },
})
