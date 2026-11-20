/**
 * Linear browser half: a review-first work queue, its sidebar entry, and the
 * settings page that links projects.
 *
 * The Host owns the board, git, the Linear connection, and every action; this
 * module renders and posts.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-linear',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dshLinear'
    const API = '/dsh-linear'
    const FALLBACK_POLL_MS = 30000
    let uiWorkspace = null
    let workspacesService = null
    let sessionsService = null
    const NO_WORKSPACES = { items: [] }

    const en = {
      'meta.title': 'Linear board',
      'meta.description': 'Mirror Linear issues, run a cycle in a git worktree, and review the agent’s commits before they land.',
      'panel': 'Linear',
      'board.title': 'Linear board',
      'board.board': 'Board',
      'board.changeBoard': 'Change board',
      'board.settings': 'Settings',
      'board.setup': 'Set up dsh-linear',
      'board.setupHint': 'Add a Linear connection, then a board linked to one or more workspaces.',
      'board.openSettings': 'Open settings',
      'board.noBoards': 'No boards yet.',
      'board.connectBoard': 'Connect this board',
      'board.connectHint': 'This board needs a Linear API key.',
      'board.connection': 'Connection',
      'board.connectionMissing': 'Connection missing',
      'board.workspaces': 'Workspaces',
      'board.workspaceCount': '{count} workspaces',
      'board.addConnection': 'Add connection',
      'board.connectionName': 'Connection name',
      'board.apiKey': 'API key',
      'board.add': 'Add',
      'board.remove': 'Remove',
      'board.save': 'Save',
      'board.saved': 'Saved.',
      'board.setKey': 'Set key',
      'board.disconnect': 'Disconnect',
      'board.connectedAs': 'Connected as {name}',
      'board.notConnected': 'Not connected',
      'board.projects': 'Projects',
      'board.addBoard': 'Add board',
      'board.boardName': 'Board name',
      'board.addWorkspace': 'Add workspace',
      'board.directory': 'Directory',
      'board.browse': 'Browse…',
      'board.project': 'Linear project',
      'board.chooseProject': 'Choose a project',
      'board.baseBranch': 'Base branch',
      'board.baseBranchHint': 'Defaults to origin/HEAD, then main.',
      'board.existingWorkspace': 'Existing workspace',
      'board.newWorkspace': 'New directory',
      'board.chooseWorkspace': 'Choose a workspace',
      'board.general': 'General',
      'board.connections': 'Connections',
      'board.boards': 'Boards',
      'board.connectionsAndBoards': 'Connections & boards',
      'board.newBoard': 'New board',
      'board.searchWorkspace': 'Search workspaces',
      'board.poll': 'Poll interval (seconds)',
      'board.autoStart': 'Start a session when a task enters Todo',
      'board.maxParallel': 'Sessions started per tick',
      'board.prompt': 'Prompt template',
      'board.promptHint': 'Placeholders: {identifier} {title} {description} {comments} {url} {path}',
      'board.settingsTitle': 'dsh-linear settings',
      'board.connectionError': 'Could not connect.',
      'board.connectionAdded': 'Connection added.',
      'board.connectionRemoved': 'Connection removed.',
      'board.boardAdded': 'Board added.',
      'board.boardRemoved': 'Board removed.',
      'board.workspaceAdded': 'Workspace added.',
      'board.workspaceRemoved': 'Workspace removed.',
      'board.settingsSaved': 'Settings saved.',
      'board.removeBoardConfirm': 'Remove {name} and its local tasks?',
      'board.removeConnectionConfirm': 'Remove {name}?',
      'board.removeWorkspaceConfirm': 'Remove {name} from this board?',
      'board.noConnections': 'No connections yet.',
      'board.noProjects': 'No projects. Check the connection key.',
      'board.keyRequired': 'Enter an API key.',
      'board.nameRequired': 'Enter a name.',
      'board.projectRequired': 'Choose a project.',
      'board.pathRequired': 'Choose a directory.',
      'board.connectionRequired': 'Choose a connection.',
      'board.boardRequired': 'Choose a board.',
      'board.sync': 'Sync now',
      'board.syncing': 'Syncing…',
      'board.forceSync': 'Force sync',
      'board.forceSyncConfirm': 'Re-read all issues from Linear? Existing tasks are updated, not duplicated.',
      'board.forceSyncStarted': 'Force sync started.',
      'board.never': 'Never synced',
      'board.lastSync': 'Last sync {time}',
      'board.loading': 'Loading…',
      'board.retry': 'Retry',
      'board.error': 'The action failed.',
      'board.actionError': 'The action failed.',
      'board.cycleActionError': 'The cycle action failed.',
      'board.newTask': 'New task',
      'board.clearDone': 'Archive done',
      'board.clearDoneConfirm': 'Move {count} approved tasks to Archive?',
      'board.cleared': 'Archived {count} tasks.',
      'board.closed': 'Closed {id}.',
      'board.archive': 'Archive',
      'board.archiveConfirm': 'Archive {id}? It leaves the board; Linear is untouched.',
      'board.archived': 'Archived {id}.',
      'board.archiveTab': 'Archive',
      'board.archiveEmpty': 'Nothing archived.',
      'board.archiveHint': 'Archived tasks stay local. Cancel one in Linear when it should not continue.',
      'board.cancelInLinear': 'Cancel in Linear',
      'board.cancelInLinearConfirm': 'Cancel {id} in Linear? The local row stays archived.',
      'board.canceledInLinear': 'Canceled {id} in Linear.',
      'board.archivedAt': 'Archived {time}',
      'board.confirm': 'Confirm',
      'board.cancel': 'Cancel',
      'board.close': 'Close',
      'board.cycleFilter': 'Cycle',
      'board.allCycles': 'All cycles',
      'board.currentCycle': 'Current',
      'board.nextCycle': 'Next',
      'board.noCycle': 'No cycle',
      'board.cycleNumber': 'Cycle {number}',
      'board.cycleClose': 'Close cycle',
      'board.cycleMerge': 'Merge cycle',
      'board.cycleCloseConfirm': 'Close {name}? Tasks stay in history.',
      'board.cycleMergeConfirm': 'Merge {branch} into {base}?',
      'board.cycleState.idle': 'Not started',
      'board.cycleState.active': 'Active',
      'board.cycleState.closed': 'Closed',
      'board.cycleState.blocked': 'Blocked',
      'board.cycleState.unknown': 'Unknown',
      'board.cycleBranch': 'Branch',
      'board.cycleWorktree': 'Worktree',
      'board.cycleBase': 'Base',
      'board.cycleStarted': 'Started {time}',
      'board.cycleClosed': 'Closed {time}',
      'board.cycleError': 'Cycle error',
      'board.cycleClosedNotice': 'Cycle closed.',
      'board.cycleMergedNotice': 'Cycle merged.',
      'board.cycleUpdated': 'Cycle updated.',
      'board.edit': 'Edit',
      'board.editCycle': 'Edit cycle',
      'board.editCycleTitle': 'Edit cycle',
      'board.cycleName': 'Cycle name',
      'board.cycleStarts': 'Start date',
      'board.cycleEnds': 'End date',
      'board.cycleNameRequired': 'Enter a cycle name.',
      'board.invalidDates': 'The end date must be on or after the start date.',
      'board.points': 'Points',
      'board.noPoints': 'No points',
      'board.taskUpdated': 'Task updated.',
      'board.invalidPoints': 'Points must be zero or more.',
      'board.cycleBlockedNotice': 'Cycle blocked: {error}',
      'board.noActiveCycle': 'No active cycle.',
      'board.activeCycle': 'Active cycle',
      'board.review': 'Review',
      'board.queue': 'Queue',
      'board.done': 'Done',
      'board.reviewEmpty': 'Nothing to review.',
      'board.queueEmpty': 'No tasks waiting.',
      'board.doneEmpty': 'No approved tasks.',
      'board.reviewHint': 'Approve or reject the agent’s work.',
      'board.reviewSections.approval': 'Approve to work',
      'board.reviewSections.work': 'Review AI work',
      'board.reviewSections.approvalHint': 'Approve a task before the agent can pick it.',
      'board.reviewSections.workHint': 'Approve or reject the agent’s commit.',
      'board.noApprovalTasks': 'No tasks waiting for approval.',
      'board.noReviewTasks': 'No AI work waiting for review.',
      'board.approveToWork': 'Approve to work',
      'board.approvedToWork': 'Approved to work.',
      'board.markDone': 'Mark done',
      'board.markedDone': 'Marked done.',
      'board.needsApproval': 'Needs your approval',
      'board.sessionRunning': 'Session running',
      'board.sessionFinished': 'Session finished',
      'board.queueStatus.pending_approval': 'Needs approval',
      'board.queueStatus.finished': 'Session finished',
      'board.queueHint': 'The agent picks the next task in sequence.',
      'board.startWorking': 'Start working',
      'board.startWorkingHint': 'Starts every queued task in order as one turn.',
      'board.startedWorking': 'Turn started.',
      'board.turn': 'Turn {number}',
      'board.newTurn': 'New turn',
      'board.turnNote': 'Turn note',
      'board.previousNote': 'Previous turn note',
      'board.turnNoteHint': 'Post-merge steps for this turn. The agent can update it too.',
      'board.turnNotePlaceholder': 'e.g. run migrations, bump version',
      'board.saveNote': 'Save note',
      'board.noteSaved': 'Turn note saved.',
      'board.pauseTurn': 'Pause turn',
      'board.resumeTurn': 'Resume turn',
      'board.turnPaused': 'Turn paused. The next queued task waits until you resume.',
      'board.pausedNotice': 'Turn paused.',
      'board.resumedNotice': 'Turn resumed.',
      'board.backToReview': 'Back to review',
      'board.movedToReview': 'Moved back to review.',
      'board.turnReview': 'Turn {number} ready on {branch}',
      'board.turnReviewHint': 'Review, merge, or open a pull request.',
      'board.turnPending': 'Review the previous turn before starting a new one.',
      'board.noQueueTasks': 'No queued tasks.',
      'board.doneHint': 'Approved work. Clear it when you no longer need it.',
      'board.reviewCount': '{count} in review',
      'board.queueCount': '{count} queued',
      'board.doneCount': '{count} done',
      'board.task': 'Task',
      'board.source': 'Source',
      'board.status': 'Status',
      'board.actions': 'Actions',
      'board.commit': 'Commit',
      'board.diff': 'Diff',
      'board.reviewed': 'Reviewed',
      'board.notReviewed': 'Not reviewed',
      'board.submittedAt': 'Submitted {time}',
      'board.reviewedAt': 'Reviewed {time}',
      'board.viewDiff': 'View diff',
      'board.hideDiff': 'Hide diff',
      'board.approve': 'Approve',
      'board.reject': 'Reject',
      'board.markReviewed': 'Mark reviewed',
      'board.unmarkReviewed': 'Unmark reviewed',
      'board.openSession': 'Open session',
      'board.transcript': 'Session',
      'board.noSession': 'No session',
      'board.transcriptHint': 'Read-only preview. Open the session to reply.',
      'board.transcriptEmpty': 'No messages yet.',
      'board.transcriptLoading': 'Loading session…',
      'board.transcriptError': 'Could not load the session.',
      'board.rejectReason': 'Rejection reason',
      'board.rejectPlaceholder': 'What needs to change?',
      'board.sendBack': 'Send back',
      'board.rejectReasonRequired': 'Enter a reason.',
      'board.approved': 'Approved.',
      'board.rejected': 'Sent back for changes.',
      'board.markedReviewed': 'Marked reviewed.',
      'board.unmarkedReviewed': 'Unmarked reviewed.',
      'board.startedNotice': 'Task started.',
      'board.noCommit': 'No commit',
      'board.noDiff': 'No diff yet.',
      'board.diffLoading': 'Loading diff…',
      'board.diffError': 'Could not load the diff.',
      'board.diffTruncated': 'Diff truncated.',
      'board.files': 'Files',
      'board.noFiles': 'No files.',
      'board.sequence': '#',
      'board.queueStatus.todo': 'Todo',
      'board.queueStatus.doing': 'Working',
      'board.queueStatus.in_review': 'In review',
      'board.queueStatus.blocked': 'Blocked',
      'board.queueStatus.done': 'Done',
      'board.queueStatus.canceled': 'Canceled',
      'board.queueStatus.backlog': 'Backlog',
      'board.queueStatus.unassigned': 'Unassigned',
      'board.start': 'Start',
      'board.assign': 'Assign',
      'board.choose': 'Choose workspace',
      'board.noProject': 'No workspace links this project.',
      'board.workspace': 'Workspace',
      'board.cycle': 'Cycle',
      'board.milestone': 'Milestone',
      'board.noMilestone': 'No milestone',
      'board.details': 'Details',
      'board.summary': 'Summary',
      'board.blockedReason': 'Blocked reason',
      'board.description': 'Description',
      'board.comments': 'Comments',
      'board.noDescription': 'No description.',
      'board.noComments': 'No comments.',
      'board.showMore': 'Show more',
      'board.showLess': 'Show less',
      'board.commentCount': '{count} comments',
      'board.due': 'Due',
      'board.localTask': 'Local task',
      'board.sourceLinear': 'Linear',
      'board.sourceLocal': 'Local',
      'board.sourceLinearTitle': 'Synced from Linear',
      'board.sourceLocalTitle': 'Created in this plugin',
      'board.createTitle': 'New task',
      'board.create': 'Create task',
      'board.taskTitle': 'Title',
      'board.taskTitlePlaceholder': 'What needs doing?',
      'board.taskDescription': 'Description',
      'board.taskDescriptionPlaceholder': 'Add context for the agent…',
      'board.optional': 'Optional',
      'board.noWorkspaces': 'Link a workspace first.',
      'board.titleRequired': 'Enter a task title.',
      'board.workspaceRequired': 'Choose a workspace.',
      'board.createError': 'Could not create the task.',
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
      'connect.baseBranch': 'Base branch',
      'connect.baseBranchHint': 'Defaults to origin/HEAD, then main.',
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
      'meta.description': '镜像 Linear 任务，在 git 工作树中运行周期，并在合入前审查智能体的提交。',
      'panel': 'Linear',
      'board.title': 'Linear 看板',
      'board.board': '看板',
      'board.changeBoard': '切换看板',
      'board.settings': '设置',
      'board.setup': '设置 dsh-linear',
      'board.setupHint': '先添加 Linear 连接，再创建一个关联一个或多个工作区的看板。',
      'board.openSettings': '打开设置',
      'board.noBoards': '还没有看板。',
      'board.connectBoard': '连接此看板',
      'board.connectHint': '此看板需要 Linear API 密钥。',
      'board.connection': '连接',
      'board.connectionMissing': '连接缺失',
      'board.workspaces': '工作区',
      'board.workspaceCount': '{count} 个工作区',
      'board.addConnection': '添加连接',
      'board.connectionName': '连接名称',
      'board.apiKey': 'API 密钥',
      'board.add': '添加',
      'board.remove': '移除',
      'board.save': '保存',
      'board.saved': '已保存。',
      'board.setKey': '设置密钥',
      'board.disconnect': '断开连接',
      'board.connectedAs': '已连接：{name}',
      'board.notConnected': '未连接',
      'board.projects': '项目',
      'board.addBoard': '添加看板',
      'board.boardName': '看板名称',
      'board.addWorkspace': '添加工作区',
      'board.directory': '目录',
      'board.browse': '浏览…',
      'board.project': 'Linear 项目',
      'board.chooseProject': '选择项目',
      'board.baseBranch': '基线分支',
      'board.baseBranchHint': '默认使用 origin/HEAD，其次 main。',
      'board.existingWorkspace': '已有工作区',
      'board.newWorkspace': '新目录',
      'board.chooseWorkspace': '选择工作区',
      'board.general': '通用',
      'board.connections': '连接',
      'board.boards': '看板',
      'board.connectionsAndBoards': '连接与看板',
      'board.newBoard': '新建看板',
      'board.searchWorkspace': '搜索工作区',
      'board.poll': '轮询间隔（秒）',
      'board.autoStart': '任务进入待办时启动会话',
      'board.maxParallel': '每次同步启动的会话数',
      'board.prompt': '提示词模板',
      'board.promptHint': '占位符：{identifier} {title} {description} {comments} {url} {path}',
      'board.settingsTitle': 'dsh-linear 设置',
      'board.connectionError': '无法连接。',
      'board.connectionAdded': '连接已添加。',
      'board.connectionRemoved': '连接已移除。',
      'board.boardAdded': '看板已添加。',
      'board.boardRemoved': '看板已移除。',
      'board.workspaceAdded': '工作区已添加。',
      'board.workspaceRemoved': '工作区已移除。',
      'board.settingsSaved': '设置已保存。',
      'board.removeBoardConfirm': '移除 {name} 及其本地任务？',
      'board.removeConnectionConfirm': '移除 {name}？',
      'board.removeWorkspaceConfirm': '从此看板移除 {name}？',
      'board.noConnections': '还没有连接。',
      'board.noProjects': '没有项目。请检查连接密钥。',
      'board.keyRequired': '请输入 API 密钥。',
      'board.nameRequired': '请输入名称。',
      'board.projectRequired': '请选择项目。',
      'board.pathRequired': '请选择目录。',
      'board.connectionRequired': '请选择连接。',
      'board.boardRequired': '请选择看板。',
      'board.sync': '立即同步',
      'board.syncing': '同步中…',
      'board.forceSync': '强制同步',
      'board.forceSyncConfirm': '从 Linear 重新读取全部任务？已有任务会更新，不会重复创建。',
      'board.forceSyncStarted': '强制同步已开始。',
      'board.never': '从未同步',
      'board.lastSync': '上次同步 {time}',
      'board.loading': '加载中…',
      'board.retry': '重试',
      'board.error': '操作失败。',
      'board.actionError': '操作失败。',
      'board.cycleActionError': '周期操作失败。',
      'board.newTask': '新建任务',
      'board.clearDone': '归档已完成',
      'board.clearDoneConfirm': '将 {count} 个已批准任务移到归档？',
      'board.cleared': '已归档 {count} 个任务。',
      'board.closed': '已关闭 {id}。',
      'board.archive': '归档',
      'board.archiveConfirm': '归档 {id}？它会离开看板，Linear 不变。',
      'board.archived': '已归档 {id}。',
      'board.archiveTab': '归档',
      'board.archiveEmpty': '没有归档任务。',
      'board.archiveHint': '归档任务保留在本地。需要停止时，在 Linear 中取消。',
      'board.cancelInLinear': '在 Linear 中取消',
      'board.cancelInLinearConfirm': '在 Linear 中取消 {id}？本地记录仍保留归档。',
      'board.canceledInLinear': '已在 Linear 中取消 {id}。',
      'board.archivedAt': '归档于 {time}',
      'board.confirm': '确认',
      'board.cancel': '取消',
      'board.close': '关闭',
      'board.cycleFilter': '周期',
      'board.allCycles': '全部周期',
      'board.currentCycle': '当前',
      'board.nextCycle': '下一个',
      'board.noCycle': '无周期',
      'board.cycleNumber': '周期 {number}',
      'board.cycleClose': '关闭周期',
      'board.cycleMerge': '合并周期',
      'board.cycleCloseConfirm': '关闭 {name}？任务会保留在历史中。',
      'board.cycleMergeConfirm': '将 {branch} 合并到 {base}？',
      'board.cycleState.idle': '未开始',
      'board.cycleState.active': '进行中',
      'board.cycleState.closed': '已关闭',
      'board.cycleState.blocked': '已阻塞',
      'board.cycleState.unknown': '未知',
      'board.cycleBranch': '分支',
      'board.cycleWorktree': '工作树',
      'board.cycleBase': '基线',
      'board.cycleStarted': '开始于 {time}',
      'board.cycleClosed': '关闭于 {time}',
      'board.cycleError': '周期错误',
      'board.cycleClosedNotice': '周期已关闭。',
      'board.cycleMergedNotice': '周期已合并。',
      'board.cycleUpdated': '周期已更新。',
      'board.edit': '编辑',
      'board.editCycle': '编辑周期',
      'board.editCycleTitle': '编辑周期',
      'board.cycleName': '周期名称',
      'board.cycleStarts': '开始日期',
      'board.cycleEnds': '结束日期',
      'board.cycleNameRequired': '请输入周期名称。',
      'board.invalidDates': '结束日期不能早于开始日期。',
      'board.points': '点数',
      'board.noPoints': '无点数',
      'board.taskUpdated': '任务已更新。',
      'board.invalidPoints': '点数必须为零或更大。',
      'board.cycleBlockedNotice': '周期已阻塞：{error}',
      'board.noActiveCycle': '没有进行中的周期。',
      'board.activeCycle': '进行中的周期',
      'board.review': '审查',
      'board.queue': '队列',
      'board.done': '已完成',
      'board.reviewEmpty': '没有待审查的任务。',
      'board.queueEmpty': '没有等待中的任务。',
      'board.doneEmpty': '还没有已批准的任务。',
      'board.reviewHint': '批准或拒绝智能体的工作。',
      'board.reviewSections.approval': '批准开始',
      'board.reviewSections.work': '审查 AI 工作',
      'board.reviewSections.approvalHint': '批准后智能体才会领取该任务。',
      'board.reviewSections.workHint': '批准或拒绝智能体的提交。',
      'board.noApprovalTasks': '没有等待批准的任务。',
      'board.noReviewTasks': '没有等待审查的 AI 工作。',
      'board.approveToWork': '批准开始',
      'board.approvedToWork': '已批准开始。',
      'board.markDone': '标记完成',
      'board.markedDone': '已标记完成。',
      'board.needsApproval': '需要你批准',
      'board.sessionRunning': '会话运行中',
      'board.sessionFinished': '会话已结束',
      'board.queueStatus.pending_approval': '待批准',
      'board.queueStatus.finished': '会话已结束',
      'board.queueHint': '智能体会按顺序领取下一个任务。',
      'board.startWorking': '开始工作',
      'board.startWorkingHint': '按顺序把队列里的任务作为一个回合开始。',
      'board.startedWorking': '回合已开始。',
      'board.turn': '回合 {number}',
      'board.newTurn': '新回合',
      'board.turnNote': '回合备注',
      'board.previousNote': '上一回合备注',
      'board.turnNoteHint': '合并后需要执行的步骤。智能体也可以更新。',
      'board.turnNotePlaceholder': '例如：运行迁移、升级版本',
      'board.saveNote': '保存备注',
      'board.noteSaved': '回合备注已保存。',
      'board.pauseTurn': '暂停回合',
      'board.resumeTurn': '继续回合',
      'board.turnPaused': '回合已暂停。下一个排队任务会等到你继续。',
      'board.pausedNotice': '回合已暂停。',
      'board.resumedNotice': '回合已继续。',
      'board.backToReview': '退回审查',
      'board.movedToReview': '已退回审查。',
      'board.turnReview': '回合 {number} 已就绪：{branch}',
      'board.turnReviewHint': '审查、合并或创建拉取请求。',
      'board.turnPending': '开始新回合前，请先审查上一个回合。',
      'board.noQueueTasks': '没有排队任务。',
      'board.doneHint': '已批准的工作。不需要时可清除。',
      'board.reviewCount': '{count} 个待审查',
      'board.queueCount': '{count} 个排队',
      'board.doneCount': '{count} 个已完成',
      'board.task': '任务',
      'board.source': '来源',
      'board.status': '状态',
      'board.actions': '操作',
      'board.commit': '提交',
      'board.diff': '差异',
      'board.reviewed': '已审查',
      'board.notReviewed': '未审查',
      'board.submittedAt': '提交于 {time}',
      'board.reviewedAt': '审查于 {time}',
      'board.viewDiff': '查看差异',
      'board.hideDiff': '隐藏差异',
      'board.approve': '批准',
      'board.reject': '拒绝',
      'board.markReviewed': '标记已审查',
      'board.unmarkReviewed': '取消已审查',
      'board.openSession': '打开会话',
      'board.transcript': '会话',
      'board.noSession': '无会话',
      'board.transcriptHint': '只读预览。打开会话以回复。',
      'board.transcriptEmpty': '还没有消息。',
      'board.transcriptLoading': '正在加载会话…',
      'board.transcriptError': '无法加载会话。',
      'board.rejectReason': '拒绝原因',
      'board.rejectPlaceholder': '需要修改什么？',
      'board.sendBack': '退回修改',
      'board.rejectReasonRequired': '请输入原因。',
      'board.approved': '已批准。',
      'board.rejected': '已退回修改。',
      'board.markedReviewed': '已标记为已审查。',
      'board.unmarkedReviewed': '已取消已审查。',
      'board.startedNotice': '任务已开始。',
      'board.noCommit': '无提交',
      'board.noDiff': '还没有差异。',
      'board.diffLoading': '正在加载差异…',
      'board.diffError': '无法加载差异。',
      'board.diffTruncated': '差异已截断。',
      'board.files': '文件',
      'board.noFiles': '没有文件。',
      'board.sequence': '#',
      'board.queueStatus.todo': '待办',
      'board.queueStatus.doing': '进行中',
      'board.queueStatus.in_review': '待审查',
      'board.queueStatus.blocked': '已阻塞',
      'board.queueStatus.done': '已完成',
      'board.queueStatus.canceled': '已取消',
      'board.queueStatus.backlog': '积压',
      'board.queueStatus.unassigned': '未分配',
      'board.start': '开始',
      'board.assign': '分配',
      'board.choose': '选择工作区',
      'board.noProject': '没有工作区关联此项目。',
      'board.workspace': '工作区',
      'board.cycle': '周期',
      'board.milestone': '里程碑',
      'board.noMilestone': '无里程碑',
      'board.details': '详情',
      'board.summary': '摘要',
      'board.blockedReason': '阻塞原因',
      'board.description': '描述',
      'board.comments': '评论',
      'board.noDescription': '没有描述。',
      'board.noComments': '没有评论。',
      'board.showMore': '展开',
      'board.showLess': '收起',
      'board.commentCount': '{count} 条评论',
      'board.due': '截止',
      'board.localTask': '本地任务',
      'board.sourceLinear': 'Linear',
      'board.sourceLocal': '本地',
      'board.sourceLinearTitle': '从 Linear 同步',
      'board.sourceLocalTitle': '在插件中创建',
      'board.createTitle': '新建任务',
      'board.create': '创建任务',
      'board.taskTitle': '标题',
      'board.taskTitlePlaceholder': '要做什么？',
      'board.taskDescription': '描述',
      'board.taskDescriptionPlaceholder': '为智能体补充上下文…',
      'board.optional': '可选',
      'board.noWorkspaces': '请先关联工作区。',
      'board.titleRequired': '请输入任务标题。',
      'board.workspaceRequired': '请选择工作区。',
      'board.createError': '无法创建任务。',
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
      'connect.baseBranch': '基线分支',
      'connect.baseBranchHint': '默认使用 origin/HEAD，其次 main。',
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
.dshl-page { display: flex; flex-direction: column; height: 100%; min-height: 0; width: 100%; max-width: 1440px; margin: 0 auto; padding: 20px 24px; box-sizing: border-box; gap: 12px; overflow: hidden; }
.dshl-board { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 12px; }
.dshl-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dshl-heading { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dshl-title { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dshl-subtitle { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dshl-meta { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dshl-spacer { flex: 1; }
.dshl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 28px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; white-space: nowrap; }
.dshl-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-btn:active { background: var(--dsw-alias-interactive-bg-active); }
.dshl-btn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-btn.primary { background: var(--dsw-alias-state-success-primary); border-color: transparent; color: var(--dsw-alias-label-primary-inverted); }
.dshl-btn.primary:hover { opacity: .9; }
.dshl-btn.active { border-color: var(--dsw-alias-state-success-primary); background: var(--dsw-alias-bg-layer-2); font-weight: 600; }
.dshl-btn.danger { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.dshl-btn.danger:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-btn:disabled { opacity: .5; cursor: default; }
.dshl-error { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
.dshl-note { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dshl-ok { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-success-primary); }
.dshl-link { font-size: 12px; line-height: 18px; color: var(--dsw-alias-link); }
.dshl-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dshl-switcher { position: relative; min-width: 0; }
.dshl-identity { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; max-width: 320px; padding: 0 8px 0 4px; border: 1px solid transparent; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; cursor: pointer; }
.dshl-identity:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-identity:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-avatar { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: none; border-radius: var(--dsw-radius-xs); background: var(--dsw-alias-state-success-primary); color: var(--dsw-alias-label-primary-inverted); font-size: 12px; line-height: 18px; font-weight: 600; }
.dshl-identity-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 20px; font-weight: 600; }
.dshl-identity-caret { flex: none; color: var(--dsw-alias-label-tertiary); }
.dshl-head-cycle { display: inline-flex; align-items: center; gap: 6px; min-width: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dshl-head-cycle-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-head-cycle-range { flex: none; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshl-menu { position: absolute; top: calc(100% + 4px); left: 0; z-index: 20; min-width: 220px; max-width: 320px; max-height: 320px; overflow-y: auto; padding: 4px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-specific-menu); box-shadow: var(--dsw-elevation-panel); }
.dshl-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; padding: 0 8px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.dshl-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-menu-item:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.dshl-menu-item[aria-checked="true"] { background: var(--dsw-alias-bg-layer-2); font-weight: 600; }
.dshl-menu-check { width: 14px; flex: none; color: var(--dsw-alias-state-success-primary); }
.dshl-filter-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dshl-filter-label { font-size: 11px; line-height: 16px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }
.dshl-filter-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9999px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.dshl-filter-chip:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshl-filter-chip:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-filter-chip[aria-pressed="true"] { border-color: var(--dsw-alias-state-success-primary); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 600; }
.dshl-setup { display: flex; flex-direction: column; gap: 12px; max-width: 640px; padding: 16px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.dshl-settings-modal { width: min(980px, 100%); }
.dshl-settings-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshl-settings-card { display: flex; flex-direction: column; gap: 12px; padding: 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); }
.dshl-settings-card-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dshl-settings-card-title { font-size: 13px; line-height: 20px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dshl-settings-list { display: flex; flex-direction: column; gap: 8px; }
.dshl-settings-group { display: flex; flex-direction: column; gap: 8px; }
.dshl-settings-group-head { display: flex; align-items: center; gap: 8px; }
.dshl-settings-group-title { margin: 0; flex: 1; font-size: 11px; line-height: 16px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }
.dshl-row-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.dshl-row-card-head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border: none; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.dshl-row-card-head:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-row-card-head:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.dshl-row-card-main { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.dshl-row-card-title { font-size: 13px; line-height: 20px; font-weight: 600; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-row-card-meta { display: inline-flex; align-items: center; gap: 6px; flex: none; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshl-row-card-caret { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dshl-row-card-body { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-top: 1px solid var(--dsw-alias-border-l1); }
.dshl-avatar-circle { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; flex: none; padding: 0; border-radius: 9999px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); font-family: inherit; font-size: 12px; line-height: 18px; font-weight: 600; }
.dshl-avatar-circle.small { width: 20px; height: 20px; font-size: 11px; line-height: 16px; }
.dshl-avatar-btn { border: none; cursor: pointer; }
.dshl-avatar-btn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-avatar-circle.selected { box-shadow: 0 0 0 2px var(--dsw-alias-state-success-primary); }
.dshl-avatar-add { background: var(--dsw-alias-state-idle-primary); color: var(--dsw-alias-label-primary-inverted); font-size: 16px; line-height: 24px; font-weight: 400; }
.dshl-avatar-add:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-avatar-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dshl-workspace-name { flex: none; max-width: 140px; font-size: 12px; line-height: 18px; font-weight: 600; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-picker { display: flex; flex-direction: column; gap: 6px; }
.dshl-picker-list { display: flex; flex-direction: column; gap: 2px; }
.dshl-picker-row { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; padding: 0 8px; border: 1px solid transparent; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.dshl-picker-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-picker-row.selected { border-color: var(--dsw-alias-state-success-primary); background: var(--dsw-alias-bg-layer-2); }
.dshl-picker-row:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.dshl-picker-name { flex: none; font-weight: 600; }
.dshl-picker-path { flex: 1; min-width: 0; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-settings-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dshl-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 700px) { .dshl-settings-grid { grid-template-columns: minmax(0, 1fr); } }
.dshl-settings-note { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-settings-error { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
.dshl-settings-ok { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-success-primary); }
.dshl-workspace-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); }
.dshl-workspace-row .dshl-meta { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-cycle-state { display: inline-flex; align-items: center; min-height: 20px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9999px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); }
.dshl-cycle-state.active { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
.dshl-cycle-state.closed { color: var(--dsw-alias-label-tertiary); }
.dshl-cycle-state.blocked { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.dshl-cycle-state.idle { color: var(--dsw-alias-label-secondary); }
.dshl-cycle-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-cycle-meta span { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-tabs { display: flex; align-items: center; gap: 4px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshl-tab { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px; border: none; border-bottom: 2px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.dshl-tab:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dshl-tab.active { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-state-success-primary); }
.dshl-tab:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.dshl-tab-count { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshl-review-layout { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 12px; }
@media (max-width: 1000px) { .dshl-review-layout { grid-template-columns: minmax(0, 1fr); overflow-y: auto; } .dshl-review-list, .dshl-review-detail { overflow-y: visible; min-height: auto; } }
.dshl-review-list, .dshl-list { min-height: 0; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.dshl-review-section { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshl-review-section:last-child { border-bottom: none; }
.dshl-review-section .dshl-row { border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); }
.dshl-turn-panel { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.dshl-turn-head { display: flex; align-items: center; gap: 8px; }
.dshl-session-dot { display: inline-block; width: 8px; height: 8px; border-radius: 9999px; flex: none; }
.dshl-session-dot.pending { background: var(--dsw-alias-state-warn-primary); }
.dshl-session-dot.running { background: var(--dsw-alias-state-success-primary); }
.dshl-transcript { display: flex; flex-direction: column; gap: 12px; }
.dshl-turn { display: flex; flex-direction: column; min-width: 0; }
.dshl-turn.user { align-self: flex-end; max-width: 82%; padding: 8px 12px; border-radius: var(--dsw-radius-lg); background: var(--dsw-specific-bubble); }
.dshl-turn.assistant { align-self: stretch; }
.dshl-turn-text { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); white-space: pre-wrap; overflow-wrap: anywhere; }
.dshl-transcript-footer { flex: none; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px 16px; border-top: 1px solid var(--dsw-alias-border-l1); }
.dshl-transcript-note { margin: 0; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-review-detail { min-height: 0; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.dshl-empty-panel { display: flex; align-items: center; justify-content: center; padding: 24px; }
.dshl-row { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); cursor: pointer; }
.dshl-row:last-child { border-bottom: none; }
.dshl-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshl-row.selected { background: var(--dsw-alias-bg-layer-3); box-shadow: inset 2px 0 0 var(--dsw-alias-state-success-primary); }
.dshl-row:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.dshl-row-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dshl-row-title { min-width: 0; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-row-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-row-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dshl-source { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; color: var(--dsw-alias-label-tertiary); }
.dshl-source.linear { color: var(--dsw-alias-state-business-primary); }
.dshl-source.local { color: var(--dsw-alias-state-success-primary); }
.dshl-card-id { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshl-chip { display: inline-flex; align-items: center; min-height: 18px; padding: 0 6px; border-radius: 9999px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
.dshl-cycle-chip { gap: 4px; }
.dshl-cycle-chip svg { flex: none; }
.dshl-cycle-chip-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.dshl-badge { display: inline-flex; align-items: center; min-height: 18px; padding: 0 6px; border-radius: 9999px; font-size: 11px; line-height: 16px; }
.dshl-badge.review { color: var(--dsw-alias-state-warn-primary); background: var(--dsw-alias-bg-layer-3); }
.dshl-badge.done { color: var(--dsw-alias-state-success-primary); background: var(--dsw-alias-bg-layer-3); }
.dshl-badge.blocked { color: var(--dsw-alias-state-error-primary); background: var(--dsw-alias-bg-layer-3); }
.dshl-badge.working { color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-bg-layer-3); }
.dshl-badge.idle { color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-bg-layer-3); }
.dshl-detail { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.dshl-detail-head { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshl-detail-heading { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dshl-detail-title { margin: 0; font-size: 12px; line-height: 16px; font-weight: 600; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshl-detail-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding: 16px; }
.dshl-section { display: flex; flex-direction: column; gap: 8px; }
.dshl-section-title { margin: 0; font-size: 11px; line-height: 16px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }
.dshl-prose { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); white-space: pre-wrap; overflow-wrap: anywhere; }
.dshl-clamped { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 8; overflow: hidden; }
.dshl-more { align-self: flex-start; padding: 0; border: none; background: transparent; color: var(--dsw-alias-link); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.dshl-more:hover { text-decoration: underline; }
.dshl-more:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; border-radius: var(--dsw-radius-xs); }
.dshl-comment { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); }
.dshl-comment-head { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
.dshl-detail-row { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dshl-detail-label { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-detail-value { font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshl-inline-value { display: inline-flex; align-items: center; min-height: 20px; padding: 0; border: none; border-radius: var(--dsw-radius-xs); background: transparent; font: inherit; text-align: left; cursor: pointer; }
.dshl-inline-value:hover { color: var(--dsw-alias-link); }
.dshl-inline-value:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dshl-inline-value:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.dshl-inline-control { width: 100%; height: 28px; min-height: 28px; font-size: 13px; line-height: 20px; }
.dshl-select.dshl-inline-control { font-size: 13px; line-height: 20px; }
.dshl-diff { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.dshl-diff-stat { margin: 0; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); font-family: var(--ds-font-family-code); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); white-space: pre-wrap; overflow-x: auto; }
.dshl-diff-body { margin: 0; max-height: 420px; overflow: auto; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); font-family: var(--ds-font-family-code); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary); }
.dshl-diff-line { display: block; white-space: pre; }
.dshl-diff-line.add { color: var(--dsw-alias-state-success-primary); }
.dshl-diff-line.del { color: var(--dsw-alias-state-error-primary); }
.dshl-diff-line.hunk { color: var(--dsw-alias-state-business-primary); }
.dshl-diff-line.meta { color: var(--dsw-alias-label-tertiary); }
.dshl-reject { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); }
.dshl-confirm { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 12px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary); }
.dshl-inline { display: flex; align-items: center; gap: 8px; }
.dshl-inline .dshl-input { flex: 1; min-width: 0; }
.dshl-form { display: flex; flex-direction: column; gap: 12px; }
.dshl-field { display: flex; flex-direction: column; gap: 4px; }
.dshl-label { font-size: 12px; line-height: 18px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dshl-hint { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dshl-input { height: 32px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; padding: 0 8px; }
.dshl-input:focus-visible, .dshl-textarea:focus-visible, .dshl-select:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dshl-textarea { min-height: 88px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; padding: 8px; resize: vertical; }
.dshl-select { height: 28px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; padding: 0 6px; }
.dshl-check { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.dshl-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--dsw-alias-bg-mask-1); }
.dshl-modal { display: flex; flex-direction: column; width: min(760px, 100%); max-height: min(82vh, 900px); border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-layer-3); box-shadow: var(--dsw-elevation-prominent); overflow: hidden; }
.dshl-modal-head { flex: none; display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshl-modal-heading { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dshl-modal-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshl-modal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
.dshl-modal-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.dshl-connect { display: flex; flex-direction: column; gap: 12px; max-width: 760px; }
.dshl-connect-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.dshl-link-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); }
.dshl-link-name { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dshl-link-row .dshl-meta { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshl-settings { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.dshl-fields { display: flex; flex-direction: column; gap: 12px; }
.dshl-modes { display: flex; gap: 6px; }
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
        const source = new EventSource(`${API}/events`)
        source.onmessage = () => refresh()
        // Fallback poll covers a dropped stream; SSE carries the live updates.
        const timer = setInterval(refresh, FALLBACK_POLL_MS)
        return () => {
          source.close()
          clearInterval(timer)
        }
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
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
    }

    /** YYYY-MM-DD in the browser's timezone, for a date input. */
    const dateInputValue = (value) => {
      if (typeof value !== 'string' || value === '') return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value.slice(0, 10)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    }

    const shortSha = (value) => typeof value === 'string' && value.length > 7 ? value.slice(0, 7) : value

    const cycleLabel = (cycle, t) => cycle.name
      || (cycle.number === '' ? cycle.id : t('board.cycleNumber').replace('{number}', cycle.number))

    const cycleTime = (value) => {
      const stamp = Date.parse(value)
      return Number.isNaN(stamp) ? 0 : stamp
    }

    /** The cycle in progress and the one after it; later cycles stay out of the board. */
    const cycleWindow = (cycles) => {
      const sorted = [...cycles].sort((left, right) => cycleTime(left.startsAt) - cycleTime(right.startsAt))
      const now = Date.now()
      const current = sorted.find(cycle => cycle.state === 'active')
        ?? sorted.find(cycle => cycleTime(cycle.startsAt) <= now && now < cycleTime(cycle.endsAt))
        ?? [...sorted].reverse().find(cycle => cycleTime(cycle.startsAt) <= now)
        ?? null
      if (current === null) return { current: null, next: sorted.find(cycle => cycleTime(cycle.startsAt) > now) ?? null }
      const after = current.startsAt === '' ? now : cycleTime(current.startsAt)
      return { current, next: sorted.find(cycle => cycleTime(cycle.startsAt) > after) ?? null }
    }

    const cycleRange = (cycle) => {
      const day = (value) => {
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }
      const start = day(cycle.startsAt)
      const end = day(cycle.endsAt)
      return start === '' ? '' : end === '' ? start : `${start} – ${end}`
    }

    const previewBranch = (cycle) => {
      const value = cycle.number === '' ? cycle.name || cycle.id : cycle.number
      const slug = String(value).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
      return `cycles/${slug === '' ? 'cycle' : slug}`
    }

    const statusLabel = (task, t) => t(`board.queueStatus.${task.status}`)

    const trapFocus = (event, container) => {
      if (event.key !== 'Tab') return
      const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
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

    function SourceMark({ task, t }) {
      const local = task.source === 'local'
      return h('span', {
        className: `dshl-source ${local ? 'local' : 'linear'}`,
        role: 'img',
        'aria-label': local ? t('board.sourceLocalTitle') : t('board.sourceLinearTitle'),
        title: local ? t('board.sourceLocalTitle') : t('board.sourceLinearTitle'),
      }, h(SourceIcon, { source: task.source }))
    }

    function CycleIcon({ size = 12 }) {
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      h('path', { d: 'M20 11a8 8 0 0 0-14.5-4.5L4 8' }),
      h('path', { d: 'M4 4v4h4' }),
      h('path', { d: 'M4 13a8 8 0 0 0 14.5 4.5L20 16' }),
      h('path', { d: 'M20 20v-4h-4' }))
    }

    const cycleNumberOf = task => task.cycle_number === undefined || task.cycle_number === null
      ? ''
      : String(task.cycle_number)

    function CycleChip({ task, t }) {
      if (!task.cycle_id && !task.cycle_name) return null
      const number = cycleNumberOf(task)
      const label = number !== ''
        ? `#${number}`
        : (task.cycle_name || t('board.cycle'))
      return h('span', {
        className: 'dshl-chip dshl-cycle-chip',
        title: task.cycle_name || label,
      },
      h(CycleIcon, { size: 12 }),
      h('span', { className: 'dshl-cycle-chip-label' }, label))
    }

    function SessionDot({ status, t }) {
      if (status === undefined) return null
      if (status.pendingInteraction !== undefined) {
        return h('span', {
          className: 'dshl-session-dot pending',
          role: 'img',
          'aria-label': t('board.needsApproval'),
          title: t('board.needsApproval'),
        })
      }
      if (status.running === true) {
        return h('span', {
          className: 'dshl-session-dot running',
          role: 'img',
          'aria-label': t('board.sessionRunning'),
          title: t('board.sessionRunning'),
        })
      }
      return null
    }

    const textOf = content => Array.isArray(content)
      ? content.filter(block => block?.type === 'text').map(block => block.text).join('\n')
      : ''

    const useSessionTranscript = (sessionId) => {
      const [state, setState] = React.useState({ entries: [], loading: false, error: '' })
      React.useEffect(() => {
        if (sessionId === null || sessionsService === null) {
          setState({ entries: [], loading: false, error: '' })
          return
        }
        let cancelled = false
        let reference
        try {
          reference = sessionsService.retain(sessionId, { source: 'dsh-linear' })
        } catch (failure) {
          setState({ entries: [], loading: false, error: failure instanceof Error ? failure.message : String(failure) })
          return
        }
        let source
        try {
          source = reference.binding.eventSource
        } catch (failure) {
          reference.release()
          setState({ entries: [], loading: false, error: failure instanceof Error ? failure.message : String(failure) })
          return
        }
        const update = () => {
          if (cancelled) return
          setState({ entries: source.getSnapshot().entries, loading: false, error: '' })
        }
        setState({ entries: source.getSnapshot().entries, loading: true, error: '' })
        const unsubscribe = source.subscribe(update)
        reference.ready.then(update).catch((failure) => {
          if (cancelled) return
          setState({ entries: [], loading: false, error: failure instanceof Error ? failure.message : String(failure) })
        })
        return () => {
          cancelled = true
          unsubscribe()
          reference.release()
        }
      }, [sessionId])
      return state
    }

    // One row per turn: the user prompt plus the turn's last assistant text.
    // Thinking, tool calls, and intermediate steps stay out of the transcript.
    const finalTranscript = entries => {
      const rows = []
      let lastAssistant = null
      for (const entry of entries) {
        if (entry.type !== 'event') continue
        const event = entry.event
        if (event.type === 'turn/start') {
          lastAssistant = null
          continue
        }
        if (event.type === 'turn/end') {
          if (lastAssistant !== null) rows.push(lastAssistant)
          lastAssistant = null
          continue
        }
        if (event.type === 'user/message') {
          if (event.data.source?.kind !== 'user') continue
          const text = textOf(event.data.content)
          if (text !== '') rows.push({ key: `u${event.seq}`, role: 'user', text })
          continue
        }
        if (event.type === 'assistant/message') {
          const text = textOf(event.data.message.content)
          if (text !== '') lastAssistant = { key: `a${event.seq}`, role: 'assistant', text }
        }
      }
      if (lastAssistant !== null) rows.push(lastAssistant)
      return rows
    }

    function SessionTranscript({ task, t, onClose, onOpenSession }) {
      const transcript = useSessionTranscript(task.session_id)
      const bodyRef = React.useRef(null)
      const stickRef = React.useRef(true)
      React.useEffect(() => { stickRef.current = true }, [task.session_id])
      React.useLayoutEffect(() => {
        const node = bodyRef.current
        if (node !== null && stickRef.current) node.scrollTop = node.scrollHeight
      }, [transcript.entries])
      const rows = finalTranscript(transcript.entries)
      const onScroll = () => {
        const node = bodyRef.current
        if (node !== null) stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 32
      }
      return h('div', { className: 'dshl-detail' },
        h('div', { className: 'dshl-detail-head' },
          h('div', { className: 'dshl-detail-heading' },
            h('div', { className: 'dshl-row-top' },
              h(SourceMark, { task, t }),
              h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask')),
              h('span', { className: 'dshl-badge review' }, t('board.transcript'))),
            h('h2', { className: 'dshl-detail-title' }, task.title),
            h('div', { className: 'dshl-row-meta' },
              task.session_id ? h('span', null, task.session_id) : h('span', null, t('board.noSession')))),
          h('button', { type: 'button', className: 'dshl-btn', onClick: onClose }, t('board.close'))),
        h('div', { className: 'dshl-detail-body', ref: bodyRef, onScroll },
          transcript.loading
            ? h('p', { className: 'dshl-note' }, t('board.transcriptLoading'))
            : transcript.error !== ''
              ? h('p', { className: 'dshl-error' }, transcript.error)
              : rows.length === 0
                ? h('p', { className: 'dshl-note' }, t('board.transcriptEmpty'))
                : h('div', { className: 'dshl-transcript' },
                  rows.map(row => h('div', { key: row.key, className: `dshl-turn ${row.role}` },
                    h('p', { className: 'dshl-turn-text' }, row.text))))),
        h('div', { className: 'dshl-transcript-footer' },
          h('span', { className: 'dshl-transcript-note' }, t('board.transcriptHint')),
          h('span', { className: 'dshl-spacer' }),
          task.session_id ? h('button', {
            type: 'button',
            className: 'dshl-btn primary',
            onClick: onOpenSession,
          }, t('board.openSession')) : null))
    }

    function CycleStateBadge({ cycle, t }) {
      const state = cycle.state || 'idle'
      return h('span', { className: `dshl-cycle-state ${state}` }, t(`board.cycleState.${state}`))
    }

    function DiffViewer({ diff, t }) {
      if (diff === null) return null
      if (diff.loading) return h('p', { className: 'dshl-note' }, t('board.diffLoading'))
      if (diff.error) return h('p', { className: 'dshl-error' }, diff.error)
      if (diff.diff === '') return h('p', { className: 'dshl-note' }, t('board.noDiff'))
      const lines = diff.diff.split('\n')
      return h('div', { className: 'dshl-diff' },
        diff.stat === '' ? null : h('pre', { className: 'dshl-diff-stat' }, diff.stat),
        h('pre', { className: 'dshl-diff-body' }, lines.map((line, index) => h('span', {
          key: index,
          className: `dshl-diff-line ${diffLineClass(line)}`,
        }, `${line}\n`))),
        diff.truncated ? h('p', { className: 'dshl-note' }, t('board.diffTruncated')) : null)
    }

    const diffLineClass = (line) => {
      if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git') || line.startsWith('index ')) return 'meta'
      if (line.startsWith('@@')) return 'hunk'
      if (line.startsWith('+')) return 'add'
      if (line.startsWith('-')) return 'del'
      return ''
    }

    function ReviewRow({ task, selected, t, sessionStatus, onSelect, onApprove, onReject, onMarkReviewed, onOpenSession, onArchive, showCycle = true }) {
      const pending = task.status === 'pending_approval'
      const reviewed = task.reviewed_at !== ''
      return h('div', {
        className: `dshl-row${selected ? ' selected' : ''}`,
        role: 'button',
        tabIndex: 0,
        'aria-label': `${t('board.task')}: ${task.title}`,
        onClick: onSelect,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        },
      },
      h('div', { className: 'dshl-row-top' },
        h(SourceMark, { task, t }),
        h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask')),
        h('span', { className: 'dshl-row-title' }, task.title),
        h(SessionDot, { status: sessionStatus, t }),
        h('span', { className: 'dshl-badge review' },
          pending ? t('board.queueStatus.pending_approval') : t('board.queueStatus.in_review'))),
      h('div', { className: 'dshl-row-meta' },
        showCycle ? h(CycleChip, { task, t }) : null,
        pending ? null : h('span', null, `${t('board.commit')}: ${task.commit_hash === '' ? t('board.noCommit') : shortSha(task.commit_hash)}`),
        pending ? null : (task.diff_stat === '' ? null : h('span', null, task.diff_stat)),
        pending ? null : (task.submitted_at === '' ? null : h('span', null, t('board.submittedAt').replace('{time}', formatDate(task.submitted_at)))),
        reviewed ? h('span', { className: 'dshl-ok' }, t('board.reviewed')) : null),
      h('div', { className: 'dshl-row-actions' },
        pending
          ? h('button', {
            type: 'button',
            className: 'dshl-btn primary',
            onClick: (event) => { event.stopPropagation(); onApprove() },
          }, t('board.approveToWork'))
          : h('button', {
            type: 'button',
            className: 'dshl-btn',
            onClick: (event) => { event.stopPropagation(); onSelect() },
          }, t('board.viewDiff')),
        h('button', {
          type: 'button',
          className: 'dshl-btn',
          onClick: (event) => { event.stopPropagation(); onArchive() },
        }, t('board.archive')),
        pending ? null : h('button', {
          type: 'button',
          className: 'dshl-btn primary',
          onClick: (event) => { event.stopPropagation(); onApprove() },
        }, t('board.approve')),
        pending ? null : h('button', {
          type: 'button',
          className: 'dshl-btn',
          onClick: (event) => { event.stopPropagation(); onReject() },
        }, t('board.reject')),
        pending ? null : h('button', {
          type: 'button',
          className: 'dshl-btn',
          onClick: (event) => { event.stopPropagation(); onMarkReviewed(!reviewed) },
        }, reviewed ? t('board.unmarkReviewed') : t('board.markReviewed')),
        task.session_id ? h('button', {
          type: 'button',
          className: 'dshl-btn',
          onClick: (event) => { event.stopPropagation(); onOpenSession() },
        }, t('board.openSession')) : null))
    }

    function QueueRow({ task, t, sessionStatus, onSelect, onStart, onMarkDone, onAssign, onOpenSession, onBackToReview, onArchive, workspaces, canStart, showCycle = true }) {
      const options = workspaces.filter(workspace => workspace.projectId === task.project_id)
      const [choice, setChoice] = React.useState('')
      const running = sessionStatus === undefined ? task.session_id !== null : sessionStatus.running !== false
      const needsApproval = sessionStatus?.pendingInteraction !== undefined
      const finished = task.status === 'doing' && task.session_id !== null && !running
      const badgeClass = needsApproval ? 'review'
        : finished ? 'idle'
          : task.status === 'doing' ? 'working'
            : task.status === 'blocked' ? 'blocked'
              : task.status === 'in_review' ? 'review'
                : task.status === 'done' ? 'done' : 'idle'
      const label = needsApproval ? t('board.needsApproval') : finished ? t('board.queueStatus.finished') : statusLabel(task, t)
      return h('div', {
        className: 'dshl-row',
        role: 'button',
        tabIndex: 0,
        'aria-label': `${t('board.task')}: ${task.title}`,
        onClick: onSelect,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        },
      },
      h('div', { className: 'dshl-row-top' },
        h('span', { className: 'dshl-card-id' }, String(task.sequence || '')),
        h(SourceMark, { task, t }),
        h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask')),
        h('span', { className: 'dshl-row-title' }, task.title),
        h(SessionDot, { status: sessionStatus, t }),
        h('span', { className: `dshl-badge ${badgeClass}` }, label)),
      h('div', { className: 'dshl-row-meta' },
        showCycle ? h(CycleChip, { task, t }) : null,
        task.workspaceName ? h('span', null, task.workspaceName) : null,
        task.last_error ? h('span', { className: 'dshl-error' }, task.last_error) : null),
      task.status === 'unassigned'
        ? h('div', { className: 'dshl-row-actions' },
          options.length === 0
            ? h('span', { className: 'dshl-note' }, t('board.noProject'))
            : h('select', {
              className: 'dshl-select',
              'aria-label': t('board.choose'),
              value: choice,
              onClick: event => event.stopPropagation(),
              onChange: event => setChoice(event.target.value),
            },
            h('option', { value: '' }, t('board.choose')),
            options.map(workspace => h('option', { key: workspace.id, value: workspace.id }, workspace.name))),
          h('button', {
            type: 'button',
            className: 'dshl-btn primary',
            disabled: choice === '',
            onClick: (event) => { event.stopPropagation(); onAssign(choice) },
          }, t('board.assign')))
        : h('div', { className: 'dshl-row-actions' },
          task.status === 'blocked' && canStart && task.cycle_id !== ''
            ? h('button', {
              type: 'button',
              className: 'dshl-btn primary',
              onClick: (event) => { event.stopPropagation(); onStart() },
            }, t('board.start'))
            : null,
          (task.status === 'todo' && task.turn_id === '') || task.status === 'blocked'
            ? h('button', {
              type: 'button',
              className: 'dshl-btn',
              onClick: (event) => { event.stopPropagation(); onBackToReview() },
            }, t('board.backToReview'))
            : null,
          task.status === 'blocked'
            ? h('button', {
              type: 'button',
              className: 'dshl-btn',
              onClick: (event) => { event.stopPropagation(); onArchive() },
            }, t('board.archive'))
            : null,
          finished && !needsApproval
            ? h('button', {
              type: 'button',
              className: 'dshl-btn primary',
              onClick: (event) => { event.stopPropagation(); onMarkDone() },
            }, t('board.markDone'))
            : null,
          task.session_id ? h('button', {
            type: 'button',
            className: 'dshl-btn',
            onClick: (event) => { event.stopPropagation(); onOpenSession() },
          }, t('board.openSession')) : null))
    }

    function DoneRow({ task, t, onSelect, onOpenSession, onClose, showCycle = true }) {
      return h('div', {
        className: 'dshl-row',
        role: 'button',
        tabIndex: 0,
        'aria-label': `${t('board.task')}: ${task.title}`,
        onClick: onSelect,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        },
      },
      h('div', { className: 'dshl-row-top' },
        h(SourceMark, { task, t }),
        h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask')),
        h('span', { className: 'dshl-row-title' }, task.title),
        h('span', { className: 'dshl-badge done' }, t('board.queueStatus.done'))),
      h('div', { className: 'dshl-row-meta' },
        showCycle ? h(CycleChip, { task, t }) : null,
        h('span', null, `${t('board.commit')}: ${task.commit_hash === '' ? t('board.noCommit') : shortSha(task.commit_hash)}`),
        task.diff_stat === '' ? null : h('span', null, task.diff_stat),
        task.reviewed_at === '' ? null : h('span', null, t('board.reviewedAt').replace('{time}', formatDate(task.reviewed_at)))),
      h('div', { className: 'dshl-row-actions' },
        h('button', {
          type: 'button',
          className: 'dshl-btn',
          onClick: (event) => { event.stopPropagation(); onSelect() },
        }, t('board.viewDiff')),
        task.session_id ? h('button', {
          type: 'button',
          className: 'dshl-btn',
          onClick: (event) => { event.stopPropagation(); onOpenSession() },
        }, t('board.openSession')) : null,
        h('button', {
          type: 'button',
          className: 'dshl-btn',
          onClick: (event) => { event.stopPropagation(); onClose() },
        }, t('board.close'))))
    }

    function ArchiveRow({ task, t, onSelect, onOpenSession, onCancel, showCycle = true }) {
      return h('div', {
        className: 'dshl-row',
        role: 'button',
        tabIndex: 0,
        'aria-label': `${t('board.task')}: ${task.title}`,
        onClick: onSelect,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        },
      },
      h('div', { className: 'dshl-row-top' },
        h(SourceMark, { task, t }),
        h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask')),
        h('span', { className: 'dshl-row-title' }, task.title),
        h('span', { className: 'dshl-badge idle' }, statusLabel(task, t))),
      h('div', { className: 'dshl-row-meta' },
        showCycle ? h(CycleChip, { task, t }) : null,
        h('span', null, t('board.archivedAt').replace('{time}', formatDate(task.archived_at)))),
      h('div', { className: 'dshl-row-actions' },
        task.source === 'linear' && task.status !== 'canceled'
          ? h('button', {
            type: 'button',
            className: 'dshl-btn danger',
            onClick: (event) => { event.stopPropagation(); onCancel() },
          }, t('board.cancelInLinear'))
          : null,
        task.session_id ? h('button', {
          type: 'button',
          className: 'dshl-btn',
          onClick: (event) => { event.stopPropagation(); onOpenSession() },
        }, t('board.openSession')) : null))
    }

    function InlineDetail({ t, label, value, display, type, options, onSave, disabled }) {
      const [editing, setEditing] = React.useState(false)
      const [draft, setDraft] = React.useState(value)
      const cancelled = React.useRef(false)
      React.useEffect(() => { setDraft(value) }, [value])
      const commit = (next) => {
        setEditing(false)
        if (next !== value) onSave(next)
      }
      return h('div', { className: 'dshl-detail-row' },
        h('span', { className: 'dshl-detail-label' }, label),
        editing
          ? type === 'select'
            ? h('select', {
              className: 'dshl-select dshl-inline-control',
              value: draft,
              autoFocus: true,
              onChange: event => { setDraft(event.target.value); commit(event.target.value) },
              onBlur: () => setEditing(false),
              onKeyDown: event => { if (event.key === 'Escape') { setDraft(value); setEditing(false) } },
            }, options.map(option => h('option', { key: option.value, value: option.value }, option.label)))
            : h('input', {
              className: 'dshl-input dshl-inline-control',
              type: 'number',
              min: '0',
              step: '1',
              value: draft,
              autoFocus: true,
              onChange: event => { cancelled.current = false; setDraft(event.target.value) },
              onBlur: () => {
                if (cancelled.current) {
                  cancelled.current = false
                  return
                }
                commit(draft)
              },
              onKeyDown: event => {
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') {
                  cancelled.current = true
                  setDraft(value)
                  setEditing(false)
                }
              },
            })
          : h('button', {
            type: 'button',
            className: 'dshl-detail-value dshl-inline-value',
            title: t('board.edit'),
            'aria-label': `${t('board.edit')} ${label}`,
            disabled,
            onClick: () => { cancelled.current = false; setDraft(value); setEditing(true) },
          }, display))
    }

    /** Long issue text: clamp to 8 lines, expand on demand. */
    function ClampedProse({ text, t }) {
      const [open, setOpen] = React.useState(false)
      const [overflowing, setOverflowing] = React.useState(false)
      const ref = React.useRef(null)
      React.useEffect(() => { setOpen(false) }, [text])
      React.useEffect(() => {
        const node = ref.current
        if (node === null || open) return
        setOverflowing(node.scrollHeight > node.clientHeight + 1)
      }, [text, open])
      return h('div', { className: 'dshl-section' },
        h('p', { ref, className: `dshl-prose${open ? '' : ' dshl-clamped'}` }, text),
        overflowing ? h('button', {
          type: 'button',
          className: 'dshl-more',
          'aria-expanded': open,
          onClick: () => setOpen(value => !value),
        }, open ? t('board.showLess') : t('board.showMore')) : null)
    }

    function ReviewDetail({
      task, cycle, cycles, milestones, diff, t, busy, rejecting, rejectReason, sessionStatus, showCycle = true,
      onRejectReason, onStartReject, onCancelReject, onReject, onApprove,
      onMarkReviewed, onOpenSession, onClose, onArchive, onBackToReview, onCancelInLinear, onUpdateFields,
    }) {
      const comments = Array.isArray(task.comments) ? task.comments : []
      const pending = task.status === 'pending_approval'
      const archived = task.archived_at !== ''
      const reviewed = task.reviewed_at !== ''
      const badgeClass = task.status === 'done' ? 'done' : task.status === 'blocked' ? 'blocked' : 'review'
      const badgeLabel = pending ? t('board.queueStatus.pending_approval') : statusLabel(task, t)
      const detail = (label, value) => h('div', { className: 'dshl-detail-row' },
        h('span', { className: 'dshl-detail-label' }, label),
        h('span', { className: 'dshl-detail-value' }, value))
      const cycleOptions = [
        { value: '', label: t('board.noCycle') },
        ...cycles.map(candidate => ({ value: candidate.id, label: cycleLabel(candidate, t) })),
      ]
      const milestoneOptions = [
        { value: '', label: t('board.noMilestone') },
        ...milestones.map(candidate => ({ value: candidate.id, label: candidate.name })),
      ]
      return h('div', { className: 'dshl-detail' },
        h('div', { className: 'dshl-detail-head' },
          h('div', { className: 'dshl-detail-heading' },
            h('div', { className: 'dshl-row-top' },
              h(SourceMark, { task, t }),
              h('span', { className: 'dshl-card-id' }, task.identifier || t('board.localTask')),
              h(SessionDot, { status: sessionStatus, t }),
              h('span', { className: `dshl-badge ${badgeClass}` }, badgeLabel)),
            h('h2', { className: 'dshl-detail-title' }, task.title),
            h('div', { className: 'dshl-row-meta' },
              showCycle ? h(CycleChip, { task, t }) : null,
              task.workspaceName ? h('span', null, task.workspaceName) : null,
              task.submitted_at === '' ? null : h('span', null, t('board.submittedAt').replace('{time}', formatDate(task.submitted_at))),
              reviewed ? h('span', { className: 'dshl-ok' }, t('board.reviewed')) : null)),
          h('button', { type: 'button', className: 'dshl-btn', onClick: onClose }, t('board.close'))),
        h('div', { className: 'dshl-detail-body' },
          h('section', { className: 'dshl-section' },
            h('h3', { className: 'dshl-section-title' }, t('board.details')),
            h('div', { className: 'dshl-details' },
              detail(t('board.status'), badgeLabel),
              detail(t('board.workspace'), task.workspaceName || t('board.queueStatus.unassigned')),
              h(InlineDetail, {
                t,
                label: t('board.cycle'),
                value: task.cycle_id || '',
                display: cycleNumberOf(task) !== '' ? `#${cycleNumberOf(task)}${task.cycle_name === '' ? '' : ` · ${task.cycle_name}`}` : (task.cycle_name || t('board.noCycle')),
                type: 'select',
                options: cycleOptions,
                disabled: busy,
                onSave: value => onUpdateFields({ cycleId: value }),
              }),
              h(InlineDetail, {
                t,
                label: t('board.points'),
                value: task.estimate ? String(task.estimate) : '',
                display: task.estimate ? String(task.estimate) : t('board.noPoints'),
                type: 'number',
                disabled: busy,
                onSave: value => onUpdateFields({ estimate: Number(value) }),
              }),
              h(InlineDetail, {
                t,
                label: t('board.milestone'),
                value: task.milestone_id || '',
                display: task.milestone_name || t('board.noMilestone'),
                type: 'select',
                options: milestoneOptions,
                disabled: busy,
                onSave: value => onUpdateFields({ milestoneId: value }),
              }),
              pending ? null : detail(t('board.commit'), task.commit_hash === '' ? t('board.noCommit') : shortSha(task.commit_hash)),
              pending ? null : detail(t('board.cycleBranch'), cycle?.branch || '—'),
              pending ? null : detail(t('board.cycleBase'), cycle?.baseBranch || '—'),
              pending ? null : detail(t('board.cycleWorktree'), cycle?.worktreePath || '—'))),
          task.submit_summary === '' ? null : h('section', { className: 'dshl-section' },
            h('h3', { className: 'dshl-section-title' }, t('board.summary')),
            h('p', { className: 'dshl-prose' }, task.submit_summary)),
          task.review_reason === '' ? null : h('section', { className: 'dshl-section' },
            h('h3', { className: 'dshl-section-title' }, t('board.rejectReason')),
            h('p', { className: 'dshl-prose' }, task.review_reason)),
          task.last_error === '' ? null : h('section', { className: 'dshl-section' },
            h('h3', { className: 'dshl-section-title' }, t('board.blockedReason')),
            h('p', { className: 'dshl-error' }, task.last_error)),
          h('section', { className: 'dshl-section' },
            h('h3', { className: 'dshl-section-title' }, t('board.description')),
            h(ClampedProse, { text: task.description || t('board.noDescription'), t })),
          h('section', { className: 'dshl-section' },
            h('h3', { className: 'dshl-section-title' }, t('board.comments')),
            comments.length === 0
              ? h('p', { className: 'dshl-prose' }, t('board.noComments'))
              : comments.map(comment => h('div', { key: comment.id, className: 'dshl-comment' },
                h('span', { className: 'dshl-comment-head' },
                  [comment.author || 'Linear', comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''].filter(Boolean).join(' · ')),
                h(ClampedProse, { text: comment.body, t })))),
          pending ? null : h('section', { className: 'dshl-section' },
            h('h3', { className: 'dshl-section-title' }, t('board.diff')),
            h(DiffViewer, { diff, t })),
          archived
            ? h('div', { className: 'dshl-row-actions' },
              task.source === 'linear' && task.status !== 'canceled'
                ? h('button', { type: 'button', className: 'dshl-btn danger', disabled: busy, onClick: onCancelInLinear }, t('board.cancelInLinear'))
                : null,
              task.session_id ? h('button', {
                type: 'button',
                className: 'dshl-btn',
                onClick: onOpenSession,
              }, t('board.openSession')) : null)
            : pending
            ? h('div', { className: 'dshl-row-actions' },
              h('button', { type: 'button', className: 'dshl-btn primary', disabled: busy, onClick: onApprove }, t('board.approveToWork')),
              h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: onArchive }, t('board.archive')),
              task.session_id ? h('button', {
                type: 'button',
                className: 'dshl-btn',
                onClick: onOpenSession,
              }, t('board.openSession')) : null)
            : rejecting
              ? h('div', { className: 'dshl-reject' },
                h('label', { className: 'dshl-field' },
                  h('span', { className: 'dshl-label' }, t('board.rejectReason')),
                  h('textarea', {
                    className: 'dshl-textarea',
                    value: rejectReason,
                    autoFocus: true,
                    placeholder: t('board.rejectPlaceholder'),
                    onChange: event => onRejectReason(event.target.value),
                  })),
                h('div', { className: 'dshl-row-actions' },
                  h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: onReject }, t('board.sendBack')),
                  h('button', { type: 'button', className: 'dshl-btn', onClick: onCancelReject }, t('board.cancel'))))
              : h('div', { className: 'dshl-row-actions' },
                task.status === 'in_review'
                  ? h('button', { type: 'button', className: 'dshl-btn primary', disabled: busy, onClick: onApprove }, t('board.approve'))
                  : null,
                task.status === 'in_review'
                  ? h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: onStartReject }, t('board.reject'))
                  : null,
                task.status === 'in_review'
                  ? h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: onArchive }, t('board.archive'))
                  : null,
                task.status === 'blocked'
                  ? h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: onBackToReview }, t('board.backToReview'))
                  : null,
                task.status === 'blocked'
                  ? h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: onArchive }, t('board.archive'))
                  : null,
                h('button', {
                  type: 'button',
                  className: 'dshl-btn',
                  disabled: busy,
                  onClick: () => onMarkReviewed(!reviewed),
                }, reviewed ? t('board.unmarkReviewed') : t('board.markReviewed')),
                task.session_id ? h('button', {
                  type: 'button',
                  className: 'dshl-btn',
                  onClick: onOpenSession,
                }, t('board.openSession')) : null)))
    }

    /** One workspace per task. A board with more than two gets a searchable picker. */
    function WorkspacePicker({ t, workspaces, value, onChange }) {
      const [query, setQuery] = React.useState('')
      if (workspaces.length <= 2) {
        return h('select', {
          className: 'dshl-input',
          value,
          onChange: event => onChange(event.target.value),
        },
        workspaces.length === 0 ? h('option', { value: '' }, t('board.noWorkspaces')) : null,
        workspaces.map(workspace => h('option', { key: workspace.id, value: workspace.id }, workspace.name)))
      }
      const needle = query.trim().toLowerCase()
      const filtered = needle === '' ? workspaces : workspaces.filter(workspace =>
        `${workspace.name} ${workspace.path}`.toLowerCase().includes(needle))
      return h('div', { className: 'dshl-picker' },
        h('input', {
          className: 'dshl-input',
          value: query,
          placeholder: t('board.searchWorkspace'),
          'aria-label': t('board.searchWorkspace'),
          onChange: event => setQuery(event.target.value),
        }),
        h('div', { className: 'dshl-picker-list', role: 'radiogroup', 'aria-label': t('board.workspace') },
          filtered.length === 0 ? h('p', { className: 'dshl-settings-note' }, t('board.noWorkspaces')) : null,
          filtered.map(workspace => h('button', {
            key: workspace.id,
            type: 'button',
            role: 'radio',
            'aria-checked': value === workspace.id,
            className: `dshl-picker-row${value === workspace.id ? ' selected' : ''}`,
            onClick: () => onChange(workspace.id),
          },
          h('span', { className: 'dshl-picker-name' }, workspace.name),
          h('span', { className: 'dshl-picker-path' }, workspace.path)))))
    }

    function CreateTaskModal({ t, boardId, cycles, milestones, workspaces, defaultCycleId, onClose, onCreated }) {
      const [title, setTitle] = React.useState('')
      const [description, setDescription] = React.useState('')
      const [workspaceId, setWorkspaceId] = React.useState(workspaces[0]?.id ?? '')
      const [cycleId, setCycleId] = React.useState(defaultCycleId ?? '')
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
            task: { boardId, title: title.trim(), description, workspaceId, cycle, milestone },
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
        tabIndex: -1,
        autoFocus: true,
        onKeyDown: event => trapFocus(event, event.currentTarget),
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
          h('div', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.workspace')),
            h(WorkspacePicker, { t, workspaces, value: workspaceId, onChange: setWorkspaceId })),
          h('div', { className: 'dshl-inline' },
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

    function CycleEditModal({ t, cycle, onClose, onSaved }) {
      const [name, setName] = React.useState(cycle.name)
      const [startsAt, setStartsAt] = React.useState(dateInputValue(cycle.startsAt))
      const [endsAt, setEndsAt] = React.useState(dateInputValue(cycle.endsAt))
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')

      React.useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])

      const submit = async () => {
        if (name.trim() === '') {
          setError(t('board.cycleNameRequired'))
          return
        }
        if (startsAt !== '' && endsAt !== '' && endsAt < startsAt) {
          setError(t('board.invalidDates'))
          return
        }
        setBusy(true)
        setError('')
        try {
          const payload = await post({
            op: 'updateCycle',
            cycle: { id: cycle.id, name: name.trim(), startsAt, endsAt },
          })
          if (payload.ok !== true) {
            setError(payload.error || t('board.actionError'))
            return
          }
          onSaved()
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
        'aria-label': t('board.editCycleTitle'),
        tabIndex: -1,
        autoFocus: true,
        onKeyDown: event => trapFocus(event, event.currentTarget),
        onClick: event => event.stopPropagation(),
      },
      h('div', { className: 'dshl-modal-head' },
        h('div', { className: 'dshl-modal-heading' },
          h('h2', { className: 'dshl-modal-title' }, t('board.editCycleTitle'))),
        h('button', { type: 'button', className: 'dshl-btn', onClick: onClose }, t('board.close'))),
      h('div', { className: 'dshl-modal-body' },
        h('div', { className: 'dshl-form' },
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.cycleName')),
            h('input', {
              className: 'dshl-input',
              value: name,
              autoFocus: true,
              onChange: event => setName(event.target.value),
            })),
          h('div', { className: 'dshl-inline' },
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-label' }, t('board.cycleStarts')),
              h('input', {
                className: 'dshl-input',
                type: 'date',
                value: startsAt,
                onChange: event => setStartsAt(event.target.value),
              })),
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-label' }, t('board.cycleEnds')),
              h('input', {
                className: 'dshl-input',
                type: 'date',
                value: endsAt,
                onChange: event => setEndsAt(event.target.value),
              }))),
          error !== '' ? h('p', { className: 'dshl-error' }, error) : null,
          h('div', { className: 'dshl-modal-actions' },
            h('button', { type: 'button', className: 'dshl-btn', onClick: onClose }, t('board.cancel')),
            h('button', { type: 'button', className: 'dshl-btn primary', disabled: busy, onClick: () => { void submit() } }, t('board.save')))))))
    }

    function ConnectBoard({ t, board, onConnected }) {
      const [key, setKey] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const submit = async () => {
        if (key.trim() === '') {
          setError(t('board.keyRequired'))
          return
        }
        setBusy(true)
        setError('')
        try {
          const payload = await post({ op: 'connect', connectionId: board.connectionId, key })
          if (payload.ok !== true) {
            setError(payload.error || t('board.connectionError'))
            return
          }
          setKey('')
          onConnected()
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(false)
        }
      }
      return h('div', { className: 'dshl-setup' },
        h('h2', { className: 'dshl-subtitle' }, t('board.connectBoard')),
        h('p', { className: 'dshl-note' }, t('board.connectHint')),
        h('div', { className: 'dshl-inline' },
          h('input', {
            className: 'dshl-input',
            type: 'password',
            value: key,
            placeholder: t('connect.keyPlaceholder'),
            onChange: event => setKey(event.target.value),
          }),
          h('button', { type: 'button', className: 'dshl-btn primary', disabled: busy, onClick: () => { void submit() } }, t('connect.button'))),
        error !== '' ? h('p', { className: 'dshl-error' }, error) : null)
    }

    /** Two letters for a connection avatar. */
    const initialsOf = value => {
      const words = String(value).trim().split(/\s+/).filter(Boolean)
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
      return (words[0] ?? '?').slice(0, 2).toUpperCase()
    }

    /** Stable accent per connection, tinted so the initials stay readable. */
    const AVATAR_COLORS = [
      'var(--dsw-alias-state-business-primary)',
      'var(--dsw-alias-state-success-primary)',
      'var(--dsw-alias-state-warn-primary)',
      'var(--dsw-alias-state-error-primary)',
      'var(--dsw-alias-state-done-primary)',
    ]
    const avatarColor = value => {
      let hash = 0
      for (const character of String(value)) hash = (hash * 31 + character.charCodeAt(0)) % 997
      return AVATAR_COLORS[hash % AVATAR_COLORS.length]
    }
    const avatarStyle = value => {
      const color = avatarColor(value)
      return {
        background: `color-mix(in srgb, ${color} 24%, var(--dsw-alias-bg-layer-2))`,
        color: 'var(--dsw-alias-label-primary)',
      }
    }

    function ConnectionAvatar({ connection, selected, onSelect }) {
      return h('button', {
        type: 'button',
        className: `dshl-avatar-circle dshl-avatar-btn${selected ? ' selected' : ''}`,
        style: avatarStyle(connection.id),
        title: connection.name,
        'aria-label': connection.name,
        'aria-pressed': selected,
        onClick: onSelect,
      }, initialsOf(connection.name))
    }

    function ConnectionEditor({ t, connection, busy, onConnect, onDisconnect, onRename, onRemove }) {
      const [key, setKey] = React.useState('')
      const [name, setName] = React.useState(connection.name)
      const connected = connection.keyConfigured === true
      const viewer = connection.viewer?.name || connection.viewer?.email || 'Linear'
      return h('div', { className: 'dshl-settings-card' },
        h('div', { className: 'dshl-settings-card-head' },
          h('span', { className: 'dshl-settings-card-title' }, connection.name),
          h('span', { className: connected ? 'dshl-settings-ok' : 'dshl-settings-note' },
            connected ? t('board.connectedAs').replace('{name}', viewer) : t('board.notConnected')),
          h('span', { className: 'dshl-spacer' }),
          h('span', { className: 'dshl-settings-note' }, `${t('board.projects')}: ${connection.projects?.length ?? 0}`)),
        connection.error ? h('p', { className: 'dshl-settings-error' }, connection.error) : null,
        h('div', { className: 'dshl-inline' },
          h('input', {
            className: 'dshl-input',
            value: name,
            'aria-label': t('board.connectionName'),
            placeholder: t('board.connectionName'),
            onChange: event => setName(event.target.value),
          }),
          h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy || name.trim() === '' || name.trim() === connection.name,
            onClick: () => { void onRename(name) },
          }, t('board.save'))),
        h('div', { className: 'dshl-inline' },
          h('input', {
            className: 'dshl-input',
            type: 'password',
            value: key,
            placeholder: t('connect.keyPlaceholder'),
            onChange: event => setKey(event.target.value),
          }),
          h('button', {
            type: 'button',
            className: 'dshl-btn primary',
            disabled: busy || key.trim() === '',
            onClick: async () => {
              const ok = await onConnect(key)
              if (ok) setKey('')
            },
          }, t('board.setKey'))),
        h('div', { className: 'dshl-settings-actions' },
          connected ? h('button', { type: 'button', className: 'dshl-btn', disabled: busy, onClick: onDisconnect }, t('board.disconnect')) : null,
          h('span', { className: 'dshl-spacer' }),
          h('button', { type: 'button', className: 'dshl-btn danger', disabled: busy, onClick: onRemove }, t('board.remove'))))
    }

    function BoardRow({ t, board, connections, projectsFor, dshWorkspaces, busy, onSave, onRemove, onAddWorkspace, onRemoveWorkspace }) {
      const [open, setOpen] = React.useState(false)
      const [adding, setAdding] = React.useState(false)
      const [name, setName] = React.useState(board.name)
      const [connectionId, setConnectionId] = React.useState(board.connectionId)
      const [mode, setMode] = React.useState('new')
      const [path, setPath] = React.useState('')
      const [projectId, setProjectId] = React.useState('')
      const [baseBranch, setBaseBranch] = React.useState('')
      const [workspaceId, setWorkspaceId] = React.useState('')
      const projects = projectsFor(connectionId)
      const existing = (dshWorkspaces.items ?? []).filter(workspace =>
        !board.workspaces.some(link => link.path === workspace.path))
      const picked = existing.find(workspace => workspace.workspaceId === workspaceId)
      const connection = connections.find(candidate => candidate.id === connectionId)
      const addWorkspace = async () => {
        const chosenPath = mode === 'new' ? path.trim() : (picked?.path ?? '')
        if (chosenPath === '') return
        if (projectId === '') return
        const ok = await onAddWorkspace({
          boardId: board.id,
          workspace: {
            name: mode === 'existing' ? (picked?.title || '') : '',
            path: chosenPath,
            projectId,
            baseBranch: baseBranch.trim(),
          },
        })
        if (!ok) return
        setPath('')
        setProjectId('')
        setBaseBranch('')
        setWorkspaceId('')
        setAdding(false)
      }
      return h('div', { className: 'dshl-row-card' },
        h('button', {
          type: 'button',
          className: 'dshl-row-card-head',
          'aria-expanded': open,
          onClick: () => setOpen(value => !value),
        },
        h('span', { className: 'dshl-row-card-main' },
          h('span', { className: 'dshl-row-card-title' }, board.name),
          h('span', { className: 'dshl-row-card-meta' },
            connection !== undefined
              ? h('span', {
                className: 'dshl-avatar-circle small',
                style: avatarStyle(connection.id),
                role: 'img',
                title: connection.name,
                'aria-label': connection.name,
              }, initialsOf(connection.name))
              : null,
            t('board.workspaceCount').replace('{count}', String(board.workspaces.length)))),
        h('span', { className: 'dshl-row-card-caret', 'aria-hidden': true }, open ? '▴' : '▾')),
        open ? h('div', { className: 'dshl-row-card-body' },
          h('div', { className: 'dshl-settings-grid' },
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-label' }, t('board.boardName')),
              h('input', { className: 'dshl-input', value: name, onChange: event => setName(event.target.value) })),
            h('label', { className: 'dshl-field' },
              h('span', { className: 'dshl-label' }, t('board.connection')),
              h('select', { className: 'dshl-input', value: connectionId, onChange: event => setConnectionId(event.target.value) },
                connections.map(connection => h('option', { key: connection.id, value: connection.id }, connection.name))))),
          h('div', { className: 'dshl-settings-actions' },
            h('button', {
              type: 'button',
              className: 'dshl-btn primary',
              disabled: busy,
              onClick: () => onSave({ id: board.id, name, connectionId }),
            }, t('board.save')),
            h('span', { className: 'dshl-spacer' }),
            h('button', { type: 'button', className: 'dshl-btn danger', disabled: busy, onClick: onRemove }, t('board.remove'))),
          h('div', { className: 'dshl-settings-list' },
            board.workspaces.length === 0 ? h('p', { className: 'dshl-settings-note' }, t('board.noWorkspaces')) : null,
            board.workspaces.map(workspace => h('div', { key: workspace.id, className: 'dshl-workspace-row' },
              h('span', { className: 'dshl-workspace-name' }, workspace.name),
              h('span', { className: 'dshl-meta' }, `${workspace.path} · ${workspace.projectId}${workspace.baseBranch === '' ? '' : ` · ${workspace.baseBranch}`}`),
              h('button', {
                type: 'button',
                className: 'dshl-btn',
                disabled: busy,
                onClick: () => onRemoveWorkspace({ boardId: board.id, id: workspace.id }),
              }, t('board.remove'))))),
          adding
            ? h('div', { className: 'dshl-settings-card' },
              h('div', { className: 'dshl-modes', role: 'group', 'aria-label': t('board.addWorkspace') },
                h('button', {
                  type: 'button',
                  className: `dshl-btn${mode === 'new' ? ' active' : ''}`,
                  'aria-pressed': mode === 'new',
                  onClick: () => setMode('new'),
                }, t('board.newWorkspace')),
                h('button', {
                  type: 'button',
                  className: `dshl-btn${mode === 'existing' ? ' active' : ''}`,
                  'aria-pressed': mode === 'existing',
                  onClick: () => setMode('existing'),
                }, t('board.existingWorkspace'))),
              mode === 'new'
                ? h('div', { className: 'dshl-inline' },
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
                      const chosen = await uiWorkspace?.pickDirectory()
                      if (typeof chosen === 'string') setPath(chosen)
                    },
                  }, t('board.browse')))
                : h('select', {
                  className: 'dshl-input',
                  value: workspaceId,
                  onChange: event => setWorkspaceId(event.target.value),
                },
                h('option', { value: '' }, t('board.chooseWorkspace')),
                existing.map(workspace => h('option', { key: workspace.workspaceId, value: workspace.workspaceId }, `${workspace.title} — ${workspace.path}`))),
              h('div', { className: 'dshl-settings-grid' },
                h('label', { className: 'dshl-field' },
                  h('span', { className: 'dshl-label' }, t('board.project')),
                  h('select', { className: 'dshl-input', value: projectId, onChange: event => setProjectId(event.target.value) },
                    h('option', { value: '' }, t('board.chooseProject')),
                    projects.map(project => h('option', { key: project.id, value: project.id }, project.name)))),
                h('label', { className: 'dshl-field' },
                  h('span', { className: 'dshl-label' }, t('board.baseBranch')),
                  h('input', { className: 'dshl-input', value: baseBranch, placeholder: 'main', onChange: event => setBaseBranch(event.target.value) }))),
              projects.length === 0 ? h('p', { className: 'dshl-settings-note' }, t('board.noProjects')) : null,
              h('div', { className: 'dshl-settings-actions' },
                h('button', {
                  type: 'button',
                  className: 'dshl-btn primary',
                  disabled: busy || projectId === '' || (mode === 'new' ? path.trim() === '' : picked === undefined),
                  onClick: () => { void addWorkspace() },
                }, t('board.add')),
                h('button', { type: 'button', className: 'dshl-btn', onClick: () => setAdding(false) }, t('board.cancel'))))
            : h('div', { className: 'dshl-settings-actions' },
              h('button', { type: 'button', className: 'dshl-btn', onClick: () => setAdding(true) }, t('board.addWorkspace')))) : null)
    }

    function AddConnectionForm({ t, busy, onAdd, onCancel }) {
      const [name, setName] = React.useState('')
      const [key, setKey] = React.useState('')
      const [error, setError] = React.useState('')
      const submit = async () => {
        if (name.trim() === '') {
          setError(t('board.nameRequired'))
          return
        }
        const ok = await onAdd({ name: name.trim(), key: key.trim() })
        if (ok) {
          setName('')
          setKey('')
        }
      }
      return h('div', { className: 'dshl-settings-card' },
        h('div', { className: 'dshl-settings-grid' },
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.connectionName')),
            h('input', { className: 'dshl-input', value: name, onChange: event => setName(event.target.value) })),
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.apiKey')),
            h('input', {
              className: 'dshl-input',
              type: 'password',
              value: key,
              placeholder: t('connect.keyPlaceholder'),
              onChange: event => setKey(event.target.value),
            }))),
        error !== '' ? h('p', { className: 'dshl-error' }, error) : null,
        h('div', { className: 'dshl-settings-actions' },
          h('button', { type: 'button', className: 'dshl-btn primary', disabled: busy, onClick: () => { void submit() } }, t('board.add')),
          h('button', { type: 'button', className: 'dshl-btn', onClick: onCancel }, t('board.cancel'))))
    }

    function AddBoardForm({ t, connections, busy, onAdd, onCancel }) {
      const [name, setName] = React.useState('')
      const [connectionId, setConnectionId] = React.useState(connections[0]?.id ?? '')
      const [error, setError] = React.useState('')
      const submit = async () => {
        if (name.trim() === '') {
          setError(t('board.nameRequired'))
          return
        }
        if (connectionId === '') {
          setError(t('board.connectionRequired'))
          return
        }
        const ok = await onAdd({ name: name.trim(), connectionId })
        if (ok) setName('')
      }
      return h('div', { className: 'dshl-settings-card' },
        h('div', { className: 'dshl-settings-grid' },
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.boardName')),
            h('input', { className: 'dshl-input', value: name, onChange: event => setName(event.target.value) })),
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.connection')),
            h('select', {
              className: 'dshl-input',
              value: connectionId,
              onChange: event => setConnectionId(event.target.value),
            },
            h('option', { value: '' }, t('board.connectionRequired')),
            connections.map(connection => h('option', { key: connection.id, value: connection.id }, connection.name))))),
        error !== '' ? h('p', { className: 'dshl-error' }, error) : null,
        h('div', { className: 'dshl-settings-actions' },
          h('button', { type: 'button', className: 'dshl-btn primary', disabled: busy, onClick: () => { void submit() } }, t('board.add')),
          h('button', { type: 'button', className: 'dshl-btn', onClick: onCancel }, t('board.cancel'))))
    }

    function GeneralForm({ t, config, busy, onSave }) {
      const [draft, setDraft] = React.useState({
        pollIntervalMs: config.pollIntervalMs,
        promptTemplate: config.promptTemplate,
      })
      const update = patch => setDraft(current => ({ ...current, ...patch }))
      return h('div', { className: 'dshl-settings-card' },
        h('div', { className: 'dshl-settings-grid' },
          h('label', { className: 'dshl-field' },
            h('span', { className: 'dshl-label' }, t('board.poll')),
            h('input', {
              className: 'dshl-input',
              type: 'number',
              min: 15,
              value: Math.round(draft.pollIntervalMs / 1000),
              onChange: event => update({ pollIntervalMs: Number(event.target.value) * 1000 }),
            }))),
        h('label', { className: 'dshl-field' },
          h('span', { className: 'dshl-label' }, t('board.prompt')),
          h('span', { className: 'dshl-hint' }, t('board.promptHint')),
          h('textarea', {
            className: 'dshl-textarea',
            value: draft.promptTemplate,
            onChange: event => update({ promptTemplate: event.target.value }),
          })),
        h('div', { className: 'dshl-settings-actions' },
          h('button', {
            type: 'button',
            className: 'dshl-btn primary',
            disabled: busy,
            onClick: () => onSave({
              pollIntervalMs: draft.pollIntervalMs,
              promptTemplate: draft.promptTemplate,
            }),
          }, t('board.save'))))
    }

    function SettingsModal({ t, data, onClose, onChanged }) {
      const { state: connectState, error: connectError, refresh: refreshConnect } = useConnect()
      const dshWorkspaces = useDshWorkspaces()
      const [tab, setTab] = React.useState('setup')
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [error, setError] = React.useState('')
      const [addingConnection, setAddingConnection] = React.useState(false)
      const [openConnectionId, setOpenConnectionId] = React.useState(null)
      const [addingBoard, setAddingBoard] = React.useState(false)
      const [confirm, setConfirm] = React.useState(null)

      React.useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])

      const connections = connectState?.connections ?? data?.connections ?? []
      const boards = data?.boards ?? []
      const openConnection = connections.find(connection => connection.id === openConnectionId) ?? null
      const projectsFor = connectionId => connections.find(connection => connection.id === connectionId)?.projects ?? []

      const run = async (body, message) => {
        setBusy(true)
        setError('')
        setNotice('')
        try {
          const payload = await post(body)
          if (payload.ok !== true) {
            setError(payload.error || t('board.actionError'))
            return null
          }
          refreshConnect()
          onChanged()
          if (message !== undefined) setNotice(message)
          return payload
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
          return null
        } finally {
          setBusy(false)
        }
      }

      const addConnection = async input => {
        const payload = await run({ op: 'addConnection', connection: input }, t('board.connectionAdded'))
        if (payload !== null) setAddingConnection(false)
        return payload !== null
      }

      const addBoard = async input => {
        const payload = await run({ op: 'addBoard', board: input }, t('board.boardAdded'))
        if (payload !== null) setAddingBoard(false)
        return payload !== null
      }

      const ask = (message, action) => setConfirm({ message, action })

      const tabButton = (key, label) => h('button', {
        type: 'button',
        className: `dshl-tab${tab === key ? ' active' : ''}`,
        'aria-pressed': tab === key,
        onClick: () => setTab(key),
      }, label)

      return h('div', {
        className: 'dshl-modal-backdrop',
        role: 'presentation',
        onClick: onClose,
      },
      h('div', {
        className: 'dshl-modal dshl-settings-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': t('board.settingsTitle'),
        tabIndex: -1,
        autoFocus: true,
        onKeyDown: event => trapFocus(event, event.currentTarget),
        onClick: event => event.stopPropagation(),
      },
      h('div', { className: 'dshl-modal-head' },
        h('div', { className: 'dshl-modal-heading' },
          h('h2', { className: 'dshl-modal-title' }, t('board.settingsTitle'))),
        h('button', { type: 'button', className: 'dshl-btn', onClick: onClose }, t('board.close'))),
      h('div', { className: 'dshl-modal-body' },
        h('div', { className: 'dshl-settings-tabs', role: 'group', 'aria-label': t('board.settingsTitle') },
          tabButton('setup', t('board.connectionsAndBoards')),
          tabButton('general', t('board.general'))),
        error !== '' ? h('p', { className: 'dshl-error' }, error) : null,
        connectError !== '' ? h('p', { className: 'dshl-error' }, connectError) : null,
        notice !== '' ? h('p', { className: 'dshl-ok' }, notice) : null,
        confirm !== null
          ? h('div', { className: 'dshl-confirm', role: 'alertdialog' },
            h('span', null, confirm.message),
            h('button', {
              type: 'button',
              className: 'dshl-btn danger',
              disabled: busy,
              onClick: () => {
                const action = confirm.action
                setConfirm(null)
                action()
              },
            }, t('board.confirm')),
            h('button', { type: 'button', className: 'dshl-btn', onClick: () => setConfirm(null) }, t('board.cancel')))
          : null,
        tab === 'setup'
          ? h('div', { className: 'dshl-settings-list' },
            h('section', { className: 'dshl-settings-group' },
              h('div', { className: 'dshl-settings-group-head' },
                h('h3', { className: 'dshl-settings-group-title' }, t('board.connections'))),
              h('div', { className: 'dshl-avatar-row' },
                connections.map(connection => h(ConnectionAvatar, {
                  key: connection.id,
                  connection,
                  selected: openConnectionId === connection.id,
                  onSelect: () => setOpenConnectionId(current => current === connection.id ? null : connection.id),
                })),
                h('button', {
                  type: 'button',
                  className: `dshl-avatar-circle dshl-avatar-btn dshl-avatar-add${addingConnection ? ' selected' : ''}`,
                  title: addingConnection ? t('board.cancel') : t('board.addConnection'),
                  'aria-label': addingConnection ? t('board.cancel') : t('board.addConnection'),
                  'aria-expanded': addingConnection,
                  onClick: () => setAddingConnection(value => !value),
                }, addingConnection ? '×' : '+')),
              connections.length === 0 ? h('p', { className: 'dshl-settings-note' }, t('board.noConnections')) : null,
              openConnection !== null ? h(ConnectionEditor, {
                key: openConnection.id,
                t,
                connection: openConnection,
                busy,
                onConnect: key => run({ op: 'connect', connectionId: openConnection.id, key }, t('board.saved')),
                onDisconnect: () => { void run({ op: 'disconnect', connectionId: openConnection.id }, t('board.saved')) },
                onRename: name => { void run({ op: 'saveConnection', connection: { id: openConnection.id, name } }, t('board.saved')) },
                onRemove: () => ask(
                  t('board.removeConnectionConfirm').replace('{name}', openConnection.name),
                  () => { void run({ op: 'removeConnection', id: openConnection.id }, t('board.connectionRemoved')) },
                ),
              }) : null,
              addingConnection ? h(AddConnectionForm, {
                t,
                busy,
                onAdd: addConnection,
                onCancel: () => setAddingConnection(false),
              }) : null),
            h('section', { className: 'dshl-settings-group' },
              h('div', { className: 'dshl-settings-group-head' },
                h('h3', { className: 'dshl-settings-group-title' }, t('board.boards')),
                h('button', {
                  type: 'button',
                  className: 'dshl-btn',
                  onClick: () => setAddingBoard(value => !value),
                }, addingBoard ? t('board.cancel') : `+ ${t('board.newBoard')}`)),
              boards.length === 0 ? h('p', { className: 'dshl-settings-note' }, t('board.noBoards')) : null,
              boards.map(board => h(BoardRow, {
                key: board.id,
                t,
                board,
                connections,
                projectsFor,
                dshWorkspaces,
                busy,
                onSave: input => { void run({ op: 'saveBoard', board: input }, t('board.saved')) },
                onRemove: () => ask(
                  t('board.removeBoardConfirm').replace('{name}', board.name),
                  () => { void run({ op: 'removeBoard', id: board.id }, t('board.boardRemoved')) },
                ),
                onAddWorkspace: input => run({ op: 'addWorkspace', ...input }, t('board.workspaceAdded')),
                onRemoveWorkspace: input => ask(
                  t('board.removeWorkspaceConfirm').replace('{name}', board.name),
                  () => { void run({ op: 'removeWorkspace', ...input }, t('board.workspaceRemoved')) },
                ),
              })),
              addingBoard ? h(AddBoardForm, {
                t,
                connections,
                busy,
                onAdd: addBoard,
                onCancel: () => setAddingBoard(false),
              }) : null))
          : h(GeneralForm, {
            t,
            config: data?.config ?? { autoStart: true, maxParallel: 3, pollIntervalMs: 60000, promptTemplate: '' },
            busy,
            onSave: input => { void run({ op: 'saveConfig', config: input }, t('board.settingsSaved')) },
          }))))
    }

    function BoardSwitcher({ boards, selected, onSelect, t }) {
      const [open, setOpen] = React.useState(false)
      const root = React.useRef(null)
      const trigger = React.useRef(null)
      const menu = React.useRef(null)
      const items = () => Array.from(menu.current?.querySelectorAll('[role="menuitemradio"]') ?? [])
      React.useEffect(() => {
        if (!open) return
        const onPointer = (event) => {
          if (root.current !== null && !root.current.contains(event.target)) setOpen(false)
        }
        const onKey = (event) => {
          if (event.key !== 'Escape') return
          setOpen(false)
          trigger.current?.focus()
        }
        document.addEventListener('mousedown', onPointer)
        document.addEventListener('keydown', onKey)
        const checked = items().find(item => item.getAttribute('aria-checked') === 'true')
        ;(checked ?? items()[0])?.focus()
        return () => {
          document.removeEventListener('mousedown', onPointer)
          document.removeEventListener('keydown', onKey)
        }
      }, [open])
      const onMenuKey = (event) => {
        const list = items()
        if (list.length === 0) return
        const index = list.indexOf(document.activeElement)
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const step = event.key === 'ArrowDown' ? 1 : -1
          list[(index + step + list.length) % list.length]?.focus()
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault()
          list[event.key === 'Home' ? 0 : list.length - 1]?.focus()
        }
      }
      const name = selected?.name ?? t('board.board')
      const initial = (Array.from(name.trim())[0] ?? '?').toUpperCase()
      return h('div', { className: 'dshl-switcher', ref: root },
        h('button', {
          type: 'button',
          ref: trigger,
          className: 'dshl-identity',
          'aria-haspopup': 'menu',
          'aria-expanded': open ? 'true' : 'false',
          title: t('board.changeBoard'),
          onClick: () => setOpen(value => !value),
        },
        h('span', { className: 'dshl-avatar', 'aria-hidden': true }, initial),
        h('span', { className: 'dshl-identity-name' }, name),
        h('svg', {
          className: 'dshl-identity-caret', viewBox: '0 0 12 12', width: 12, height: 12,
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', 'aria-hidden': true,
        }, h('path', { d: 'M3 4.5 6 7.5 9 4.5' }))),
        open ? h('div', { className: 'dshl-menu', role: 'menu', ref: menu, 'aria-label': t('board.board'), onKeyDown: onMenuKey },
          boards.map(board => h('button', {
            key: board.id,
            type: 'button',
            role: 'menuitemradio',
            'aria-checked': board.id === selected?.id ? 'true' : 'false',
            className: 'dshl-menu-item',
            onClick: () => { setOpen(false); trigger.current?.focus(); onSelect(board.id) },
          },
          h('span', { className: 'dshl-menu-check', 'aria-hidden': true }, board.id === selected?.id ? '✓' : ''),
          h('span', { className: 'dshl-identity-name' }, board.name)))) : null)
    }

    function Board({ t, useSessionStatus }) {
      const { data, error, setError, refresh } = useBoard()
      const [busy, setBusy] = React.useState(false)
      const [tab, setTab] = React.useState('review')
      const [cycleId, setCycleId] = React.useState('all')
      const [cycleTouched, setCycleTouched] = React.useState(false)
      const [selectedId, setSelectedId] = React.useState(null)
      const [sessionView, setSessionView] = React.useState(null)
      const [autoSelected, setAutoSelected] = React.useState(false)
      const [diff, setDiff] = React.useState(null)
      const [rejecting, setRejecting] = React.useState(null)
      const [rejectReason, setRejectReason] = React.useState('')
      const [confirm, setConfirm] = React.useState(null)
      const [creating, setCreating] = React.useState(false)
      const [editingCycle, setEditingCycle] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [turnNote, setTurnNote] = React.useState('')
      const [turnNoteTouched, setTurnNoteTouched] = React.useState(false)
      const useStatus = useSessionStatus ?? (() => null)
      const statuses = useStatus(state => state)

      const tasks = data?.tasks ?? []
      const cycles = data?.cycles ?? []
      const turns = data?.turns ?? []
      const boards = data?.boards ?? []
      const [selectedBoardId, setSelectedBoardId] = React.useState(() => {
        try {
          return window.localStorage.getItem('dsh-linear:board') ?? ''
        } catch {
          return ''
        }
      })
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const selectedBoard = boards.find(board => board.id === selectedBoardId) ?? boards[0] ?? null
      const boardTasks = selectedBoard === null ? [] : tasks.filter(task => task.board_id === selectedBoard.id)
      const boardCycles = selectedBoard === null ? [] : cycles.filter(cycle => cycle.boardId === selectedBoard.id)
      const boardTurns = selectedBoard === null ? [] : turns.filter(turn => turn.boardId === selectedBoard.id)
      const workspaces = selectedBoard?.workspaces ?? []
      const selectedCycle = cycleId === 'all' ? null : (boardCycles.find(cycle => cycle.id === cycleId) ?? null)
      const activeCycle = boardCycles.find(cycle => cycle.state === 'active') ?? null
      const workingCycle = selectedCycle ?? activeCycle
      const cycleTurns = workingCycle === null ? boardTurns : boardTurns.filter(turn => turn.cycleId === workingCycle.id)
      const latestTurn = cycleTurns[0] ?? null
      const turnActive = latestTurn !== null && (latestTurn.state === 'working' || latestTurn.state === 'blocked' || latestTurn.state === 'paused')
      const turnPaused = latestTurn !== null && latestTurn.state === 'paused'
      const { current: currentCycle, next: nextCycle } = cycleWindow(boardCycles)
      const headCycle = selectedCycle ?? activeCycle
      const filteredAll = cycleId === 'all' ? boardTasks : boardTasks.filter(task => task.cycle_id === cycleId)
      const filtered = filteredAll.filter(task => task.archived_at === '')
      const archiveTasks = filteredAll.filter(task => task.archived_at !== '')
      const approvalTasks = filtered.filter(task => task.status === 'pending_approval')
      const reviewTasks = filtered.filter(task => task.status === 'in_review')
      const queueTasks = filtered
        .filter(task => task.status === 'todo' || task.status === 'doing' || task.status === 'blocked' || task.status === 'unassigned' || task.status === 'backlog')
        .sort((left, right) => (left.sequence || 0) - (right.sequence || 0))
      const workingTasks = workingCycle === null ? filtered : filtered.filter(task => task.cycle_id === workingCycle.id)
      const todoTasks = workingTasks.filter(task => task.status === 'todo')
      const turnPending = workingTasks.some(task => task.status === 'doing' || task.status === 'in_review' || task.status === 'blocked')
      // A blocked turn with queued tasks resumes from Start working once the blocker is cleared.
      const canResumeBlocked = latestTurn !== null && latestTurn.state === 'blocked' && todoTasks.length > 0 && !turnPending
      const doneTasks = filtered.filter(task => task.status === 'done')
      const selected = selectedId === null ? null : (boardTasks.find(task => task.id === selectedId) ?? null)
      const transcriptTask = sessionView === null ? null : (boardTasks.find(task => task.id === sessionView) ?? null)
      const milestones = []
      const milestoneIds = new Set()
      for (const milestone of data?.milestones ?? []) {
        if (milestone.boardId !== selectedBoard?.id || milestoneIds.has(milestone.id)) continue
        milestoneIds.add(milestone.id)
        milestones.push(milestone)
      }
      for (const task of boardTasks) {
        if (task.milestone_id === '' || milestoneIds.has(task.milestone_id)) continue
        milestoneIds.add(task.milestone_id)
        milestones.push({ id: task.milestone_id, name: task.milestone_name, targetDate: task.milestone_target_date })
      }
      const needsSetup = data !== null && boards.length === 0
      const needsConnect = selectedBoard !== null && selectedBoard.keyConfigured !== true
      const sessionStatusOf = task => task.session_id === null || statuses === null || statuses === undefined
        ? undefined
        : statuses.get(task.session_id)

      React.useEffect(() => {
        if (data === null || boards.length === 0) return
        if (!boards.some(board => board.id === selectedBoardId)) setSelectedBoardId(boards[0].id)
      }, [data, boards, selectedBoardId])

      React.useEffect(() => {
        if (selectedBoard === null) return
        try {
          window.localStorage.setItem('dsh-linear:board', selectedBoard.id)
        } catch {
          // Storage can be unavailable; the selection still works for this session.
        }
      }, [selectedBoard?.id])

      React.useEffect(() => {
        setCycleId('all')
        setCycleTouched(false)
        setSelectedId(null)
        setSessionView(null)
        setAutoSelected(false)
      }, [selectedBoard?.id])

      React.useEffect(() => {
        if (data === null || cycleTouched) return
        if (currentCycle !== null) setCycleId(currentCycle.id)
      }, [data, cycleTouched, currentCycle])

      React.useEffect(() => {
        const first = reviewTasks[0] ?? approvalTasks[0]
        if (autoSelected || tab !== 'review' || first === undefined) return
        setSelectedId(first.id)
        setAutoSelected(true)
      }, [autoSelected, tab, reviewTasks, approvalTasks])

      React.useEffect(() => {
        setTurnNoteTouched(false)
        setTurnNote(turnActive ? latestTurn.note : '')
      }, [latestTurn?.id, latestTurn?.state])

      React.useEffect(() => {
        if (!turnNoteTouched) setTurnNote(turnActive ? latestTurn.note : '')
      }, [latestTurn?.note, turnActive, turnNoteTouched])

      React.useEffect(() => {
        if (selected === null) {
          setDiff(null)
          return
        }
        if (selected.commit_hash === '' && selected.status !== 'in_review' && selected.status !== 'done') {
          setDiff(null)
          return
        }
        let cancelled = false
        setDiff({ taskId: selected.id, loading: true, diff: '', stat: '', truncated: false, error: '' })
        fetch(`${API}/diff?taskId=${encodeURIComponent(selected.id)}`)
          .then(response => (response.ok ? response.json() : Promise.reject(new Error(t('board.diffError')))))
          .then((payload) => {
            if (cancelled) return
            setDiff({
              taskId: selected.id,
              loading: false,
              diff: typeof payload.diff === 'string' ? payload.diff : '',
              stat: typeof payload.stat === 'string' ? payload.stat : '',
              truncated: payload.truncated === true,
              error: '',
            })
          })
          .catch((failure) => {
            if (cancelled) return
            setDiff({
              taskId: selected.id,
              loading: false,
              diff: '',
              stat: '',
              truncated: false,
              error: failure instanceof Error ? failure.message : String(failure),
            })
          })
        return () => { cancelled = true }
      }, [selected?.id, selected?.commit_hash])

      const act = async (body) => {
        setBusy(true)
        setError('')
        setNotice('')
        try {
          const payload = await post(body)
          if (payload.ok !== true) setError(payload.error || t('board.actionError'))
          refresh()
          return payload
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
          return null
        } finally {
          setBusy(false)
        }
      }

      const updateFields = async (task, patch) => {
        let cycle
        if (patch.cycleId !== undefined) {
          cycle = patch.cycleId === ''
            ? { id: '', name: '', number: '', startsAt: '', endsAt: '' }
            : boardCycles.find(candidate => candidate.id === patch.cycleId)
        } else {
          cycle = boardCycles.find(candidate => candidate.id === task.cycle_id) ?? {
            id: task.cycle_id,
            name: task.cycle_name,
            number: task.cycle_number,
            startsAt: task.cycle_starts_at,
            endsAt: task.cycle_ends_at,
          }
        }
        let milestone
        if (patch.milestoneId !== undefined) {
          milestone = patch.milestoneId === ''
            ? { id: '', name: '', targetDate: '' }
            : milestones.find(candidate => candidate.id === patch.milestoneId)
        } else {
          milestone = {
            id: task.milestone_id,
            name: task.milestone_name,
            targetDate: task.milestone_target_date,
          }
        }
        const payload = await act({
          op: 'updateTaskFields',
          task: {
            id: task.id,
            estimate: patch.estimate !== undefined ? patch.estimate : task.estimate,
            milestone,
            cycle,
          },
        })
        if (payload?.ok === true) setNotice(t('board.taskUpdated'))
      }

      const askCycle = (kind) => {
        if (selectedCycle === null) return
        const name = cycleLabel(selectedCycle, t)
        const message = kind === 'close'
          ? t('board.cycleCloseConfirm').replace('{name}', name)
          : t('board.cycleMergeConfirm').replace('{branch}', selectedCycle.branch || previewBranch(selectedCycle)).replace('{base}', selectedCycle.baseBranch || 'main')
        setConfirm({ kind, cycleId: selectedCycle.id, message })
      }

      const askArchive = (task) => setConfirm({
        kind: 'archiveTask',
        taskId: task.id,
        message: t('board.archiveConfirm').replace('{id}', task.identifier || task.id.slice(0, 8)),
      })

      const runCycle = async (kind, id) => {
        const payload = await act({
          op: kind === 'close' ? 'closeCycle' : 'mergeCycle',
          cycleId: id,
        })
        if (payload?.ok === true) {
          setNotice(kind === 'close' ? t('board.cycleClosedNotice') : t('board.cycleMergedNotice'))
        }
      }

      const runConfirm = async () => {
        if (confirm === null) return
        if (confirm.kind === 'clearDone') {
          const payload = await act({ op: 'clearDone', boardId: selectedBoard?.id ?? '' })
          if (payload?.ok === true) setNotice(t('board.cleared').replace('{count}', String(payload.archived ?? 0)))
          setConfirm(null)
          return
        }
        if (confirm.kind === 'forceSync') {
          const payload = await act({ op: 'sync', force: true })
          if (payload?.ok === true) setNotice(t('board.forceSyncStarted'))
          setConfirm(null)
          return
        }
        if (confirm.kind === 'archiveTask') {
          const payload = await act({ op: 'archive', id: confirm.taskId })
          if (payload?.ok === true) {
            setNotice(t('board.archived').replace('{id}', payload.task?.identifier || confirm.taskId.slice(0, 8)))
          }
          setConfirm(null)
          return
        }
        if (confirm.kind === 'cancelInLinear') {
          const payload = await act({ op: 'cancel', id: confirm.taskId })
          if (payload?.ok === true) {
            setNotice(t('board.canceledInLinear').replace('{id}', payload.task?.identifier || confirm.taskId.slice(0, 8)))
          }
          setConfirm(null)
          return
        }
        await runCycle(confirm.kind, confirm.cycleId)
        setConfirm(null)
      }

      const approve = async (id) => {
        const payload = await act({ op: 'approve', id })
        if (payload?.ok === true) {
          setNotice(payload.task?.status === 'doing'
            ? t('board.startedNotice')
            : payload.task?.status === 'todo' ? t('board.approvedToWork') : t('board.approved'))
        }
      }

      const reject = async (id) => {
        if (rejectReason.trim() === '') {
          setError(t('board.rejectReasonRequired'))
          return
        }
        const payload = await act({ op: 'reject', id, reason: rejectReason.trim() })
        if (payload?.ok === true) {
          setNotice(t('board.rejected'))
          setRejecting(null)
          setRejectReason('')
        }
      }

      const markReviewed = async (id, reviewed) => {
        const payload = await act({ op: 'markReviewed', id, reviewed })
        if (payload?.ok === true) setNotice(reviewed ? t('board.markedReviewed') : t('board.unmarkedReviewed'))
      }

      const closeTask = async (id) => {
        const payload = await act({ op: 'close', id })
        if (payload?.ok === true) {
          setNotice(t('board.closed').replace('{id}', payload.task?.identifier || id.slice(0, 8)))
        }
      }

      const startTask = async (id) => {
        const payload = await act({ op: 'start', id })
        if (payload?.ok === true) setNotice(t('board.startedNotice'))
      }

      const startWorking = async () => {
        const payload = await act({
          op: 'startWorking',
          cycleId: workingCycle?.id ?? '',
          note: turnNote.trim(),
        })
        if (payload?.ok === true) {
          setNotice(t('board.startedWorking'))
          setTurnNoteTouched(false)
        }
      }

      const saveTurnNote = async () => {
        if (latestTurn === null) return
        const payload = await act({ op: 'saveTurnNote', turnId: latestTurn.id, note: turnNote })
        if (payload?.ok === true) {
          setNotice(t('board.noteSaved'))
          setTurnNoteTouched(false)
        }
      }

      const pauseTurn = async () => {
        if (latestTurn === null) return
        const payload = await act({ op: 'pauseTurn', turnId: latestTurn.id })
        if (payload?.ok === true) setNotice(t('board.pausedNotice'))
      }

      const resumeTurn = async () => {
        if (latestTurn === null) return
        const payload = await act({ op: 'resumeTurn', turnId: latestTurn.id })
        if (payload?.ok === true) setNotice(t('board.resumedNotice'))
      }

      const backToReview = async (id) => {
        const payload = await act({ op: 'unapprove', id })
        if (payload?.ok === true) setNotice(t('board.movedToReview'))
      }

      const markDone = async (id) => {
        const payload = await act({ op: 'move', id, status: 'done' })
        if (payload?.ok === true) setNotice(t('board.markedDone'))
      }

      const assignTask = async (id, workspaceId) => {
        await act({ op: 'assign', id, workspaceId })
      }

      const selectTask = (id) => {
        setSelectedId(id)
        setSessionView(null)
        setRejecting(null)
        setRejectReason('')
      }

      const tabButton = (key, label, count) => h('button', {
        type: 'button',
        className: `dshl-tab${tab === key ? ' active' : ''}`,
        'aria-pressed': tab === key,
        onClick: () => setTab(key),
      }, label, h('span', { className: 'dshl-tab-count' }, String(count)))

      const empty = (message, hint) => h('div', { className: 'dshl-empty-panel' },
        h('div', { className: 'dshl-section' },
          h('p', { className: 'dshl-note' }, message),
          h('p', { className: 'dshl-meta' }, hint)))

      const cycleChip = (id, label, title) => h('button', {
        key: id,
        type: 'button',
        className: 'dshl-filter-chip',
        title: title ?? label,
        'aria-pressed': cycleId === id ? 'true' : 'false',
        onClick: () => {
          setCycleTouched(true)
          setCycleId(id)
          setSelectedId(null)
        },
      }, label)

      return h('div', { className: 'dshl-page' },
        h('div', { className: 'dshl-head' },
          h('div', { className: 'dshl-heading' },
            h('h1', { className: 'dshl-title' }, t('board.title')),
            h('span', { className: 'dshl-meta' }, data?.lastSync ? t('board.lastSync').replace('{time}', formatDate(data.lastSync)) : t('board.never'))),
          h('span', { className: 'dshl-spacer' }),
          h('button', {
            type: 'button',
            className: 'dshl-btn',
            onClick: () => setSettingsOpen(true),
          }, t('board.settings')),
          h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy || data === null || needsSetup || needsConnect,
            onClick: () => { void act({ op: 'sync' }) },
          }, data?.syncing === true ? t('board.syncing') : t('board.sync')),
          h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy || data === null || needsSetup || needsConnect,
            onClick: () => setConfirm({ kind: 'forceSync', message: t('board.forceSyncConfirm') }),
          }, t('board.forceSync')),
          h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy || data === null || needsSetup || needsConnect,
            onClick: () => setCreating(true),
          }, t('board.newTask')),
          h('button', {
            type: 'button',
            className: 'dshl-btn danger',
            disabled: busy || doneTasks.length === 0,
            onClick: () => setConfirm({
              kind: 'clearDone',
              message: t('board.clearDoneConfirm').replace('{count}', String(doneTasks.length)),
            }),
          }, t('board.clearDone'))),
        boards.length === 0 ? null : h('div', { className: 'dshl-toolbar' },
          h(BoardSwitcher, { boards, selected: selectedBoard, onSelect: setSelectedBoardId, t }),
          cycleId === 'all'
            ? h('span', { className: 'dshl-head-cycle' }, h('span', { className: 'dshl-head-cycle-name' }, t('board.allCycles')))
            : headCycle === null ? null : h('span', { className: 'dshl-head-cycle' },
              h('span', { 'aria-hidden': true }, '·'),
              h(CycleStateBadge, { cycle: headCycle, t }),
              h('span', { className: 'dshl-head-cycle-name', title: cycleLabel(headCycle, t) }, cycleLabel(headCycle, t)),
              cycleRange(headCycle) === '' ? null : h('span', { className: 'dshl-head-cycle-range' }, cycleRange(headCycle))),
          h('span', { className: 'dshl-spacer' }),
          selectedCycle === null ? null : h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy,
            onClick: () => setEditingCycle(true),
          }, t('board.editCycle')),
          selectedCycle === null || (selectedCycle.state !== 'active' && selectedCycle.state !== 'blocked') ? null : h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy,
            onClick: () => askCycle('close'),
          }, t('board.cycleClose')),
          selectedCycle === null || selectedCycle.branch === '' ? null : h('button', {
            type: 'button',
            className: 'dshl-btn',
            disabled: busy,
            onClick: () => askCycle('merge'),
          }, t('board.cycleMerge'))),
        boards.length === 0 || needsConnect ? null : h('div', { className: 'dshl-filter-chips', role: 'group', 'aria-label': t('board.cycleFilter') },
          h('span', { className: 'dshl-filter-label' }, t('board.cycleFilter')),
          cycleChip('all', t('board.allCycles')),
          currentCycle === null ? null : cycleChip(currentCycle.id, `${t('board.currentCycle')} · ${cycleLabel(currentCycle, t)}`, cycleRange(currentCycle)),
          nextCycle === null ? null : cycleChip(nextCycle.id, `${t('board.nextCycle')} · ${cycleLabel(nextCycle, t)}`, cycleRange(nextCycle))),
        error !== '' ? h('p', { className: 'dshl-error' }, error) : null,
        data !== null && data.lastError ? h('p', { className: 'dshl-error' }, data.lastError) : null,
        notice !== '' ? h('p', { className: 'dshl-ok' }, notice) : null,
        data === null
          ? h('div', { className: 'dshl-inline' },
            h('p', { className: 'dshl-note' }, error === '' ? t('board.loading') : t('board.error')),
            h('button', { type: 'button', className: 'dshl-btn', onClick: refresh }, t('board.retry')))
          : needsSetup
            ? h('div', { className: 'dshl-setup' },
              h('h2', { className: 'dshl-subtitle' }, t('board.setup')),
              h('p', { className: 'dshl-note' }, t('board.setupHint')),
              h('button', { type: 'button', className: 'dshl-btn primary', onClick: () => setSettingsOpen(true) }, t('board.openSettings')))
            : needsConnect
              ? h(ConnectBoard, { t, board: selectedBoard, onConnected: refresh })
              : h('div', { className: 'dshl-board' },
              selectedCycle === null
                ? h('p', { className: 'dshl-note' }, activeCycle === null ? t('board.noActiveCycle') : `${t('board.activeCycle')}: ${cycleLabel(activeCycle, t)}`)
                : h('div', { className: 'dshl-cycle-meta' },
                  h('span', { title: selectedCycle.branch }, `${t('board.cycleBranch')}: ${selectedCycle.branch || '—'}`),
                  h('span', { title: selectedCycle.worktreePath }, `${t('board.cycleWorktree')}: ${selectedCycle.worktreePath || '—'}`),
                  h('span', null, `${t('board.cycleBase')}: ${selectedCycle.baseBranch || '—'}`),
                  selectedCycle.startedAt === '' ? null : h('span', null, t('board.cycleStarted').replace('{time}', formatDate(selectedCycle.startedAt))),
                  selectedCycle.lastError === '' ? null : h('span', { className: 'dshl-error' }, selectedCycle.lastError)),
              confirm !== null
                ? h('div', { className: 'dshl-confirm', role: 'alertdialog' },
                  h('span', null, confirm.message),
                  h('button', { type: 'button', className: 'dshl-btn danger', disabled: busy, onClick: () => { void runConfirm() } }, t('board.confirm')),
                  h('button', { type: 'button', className: 'dshl-btn', onClick: () => setConfirm(null) }, t('board.cancel')))
                : null,
              h('div', { className: 'dshl-tabs', role: 'group', 'aria-label': t('board.title') },
                tabButton('review', t('board.review'), approvalTasks.length + reviewTasks.length),
                tabButton('queue', t('board.queue'), queueTasks.length),
                tabButton('done', t('board.done'), doneTasks.length),
                tabButton('archive', t('board.archiveTab'), archiveTasks.length)),
              h('div', { className: 'dshl-review-layout' },
                h('div', { className: 'dshl-review-list' },
                  tab === 'review'
                    ? h('div', null,
                      h('section', { className: 'dshl-review-section' },
                        h('h3', { className: 'dshl-section-title' }, t('board.reviewSections.approval')),
                        approvalTasks.length === 0
                          ? h('p', { className: 'dshl-note' }, t('board.noApprovalTasks'))
                          : approvalTasks.map(task => h(ReviewRow, {
                            key: task.id,
                            task,
                            selected: selectedId === task.id,
                            t,
                            sessionStatus: sessionStatusOf(task),
                            onSelect: () => selectTask(task.id),
                            onApprove: () => { void approve(task.id) },
                            onReject: () => { selectTask(task.id); setRejecting(task.id) },
                            onMarkReviewed: reviewed => { void markReviewed(task.id, reviewed) },
                            onOpenSession: () => { selectTask(task.id); setSessionView(task.id) },
                            onArchive: () => askArchive(task),
                            showCycle: cycleId === 'all',
                          }))),
                      h('section', { className: 'dshl-review-section' },
                        h('h3', { className: 'dshl-section-title' }, t('board.reviewSections.work')),
                        reviewTasks.length === 0
                          ? h('p', { className: 'dshl-note' }, t('board.noReviewTasks'))
                          : reviewTasks.map(task => h(ReviewRow, {
                            key: task.id,
                            task,
                            selected: selectedId === task.id,
                            t,
                            sessionStatus: sessionStatusOf(task),
                            onSelect: () => selectTask(task.id),
                            onApprove: () => { void approve(task.id) },
                            onReject: () => { selectTask(task.id); setRejecting(task.id) },
                            onMarkReviewed: reviewed => { void markReviewed(task.id, reviewed) },
                            onOpenSession: () => { selectTask(task.id); setSessionView(task.id) },
                            onArchive: () => askArchive(task),
                            showCycle: cycleId === 'all',
                          }))))
                    : tab === 'queue'
                      ? h('div', null,
                        h('section', { className: 'dshl-turn-panel' },
                          h('div', { className: 'dshl-turn-head' },
                            h('h3', { className: 'dshl-section-title' }, latestTurn === null
                              ? t('board.newTurn')
                              : t('board.turn').replace('{number}', String(latestTurn.number))),
                            latestTurn === null ? null : h('span', { className: 'dshl-meta' }, latestTurn.branch)),
                          latestTurn?.state === 'review'
                            ? h('p', { className: 'dshl-ok' }, `${t('board.turnReview').replace('{number}', String(latestTurn.number)).replace('{branch}', latestTurn.branch)} · ${t('board.turnReviewHint')}`)
                            : null,
                          latestTurn !== null && !turnActive && latestTurn.note !== ''
                            ? h('p', { className: 'dshl-note' }, `${t('board.previousNote')}: ${latestTurn.note}`)
                            : null,
                          h('p', { className: 'dshl-hint' }, turnActive ? t('board.turnNoteHint') : t('board.startWorkingHint')),
                          turnPaused ? h('p', { className: 'dshl-note' }, t('board.turnPaused')) : null,
                          h('textarea', {
                            className: 'dshl-textarea',
                            value: turnNote,
                            placeholder: t('board.turnNotePlaceholder'),
                            onChange: (event) => { setTurnNoteTouched(true); setTurnNote(event.target.value) },
                          }),
                          h('div', { className: 'dshl-row-actions' },
                            turnActive ? h('button', {
                              type: 'button',
                              className: 'dshl-btn',
                              disabled: busy,
                              onClick: () => { void saveTurnNote() },
                            }, t('board.saveNote')) : null,
                            latestTurn?.state === 'working' ? h('button', {
                              type: 'button',
                              className: 'dshl-btn',
                              disabled: busy,
                              onClick: () => { void pauseTurn() },
                            }, t('board.pauseTurn')) : null,
                            turnPaused ? h('button', {
                              type: 'button',
                              className: 'dshl-btn primary',
                              disabled: busy,
                              onClick: () => { void resumeTurn() },
                            }, t('board.resumeTurn')) : null,
                            h('button', {
                              type: 'button',
                              className: 'dshl-btn primary',
                              disabled: busy || todoTasks.length === 0 || turnPending || (turnActive && !canResumeBlocked) || workingCycle === null,
                              onClick: () => { void startWorking() },
                            }, t('board.startWorking')))),
                        turnPending ? h('p', { className: 'dshl-note' }, t('board.turnPending')) : null,
                        queueTasks.length === 0
                          ? empty(t('board.queueEmpty'), t('board.queueHint'))
                          : queueTasks.map(task => h(QueueRow, {
                            key: task.id,
                            task,
                            t,
                            sessionStatus: sessionStatusOf(task),
                            onSelect: () => selectTask(task.id),
                            onStart: () => { void startTask(task.id) },
                            onMarkDone: () => { void markDone(task.id) },
                            onAssign: workspaceId => { void assignTask(task.id, workspaceId) },
                            onOpenSession: () => { selectTask(task.id); setSessionView(task.id) },
                            onBackToReview: () => { void backToReview(task.id) },
                            onArchive: () => askArchive(task),
                            workspaces,
                            canStart: boardCycles.find(cycle => cycle.id === task.cycle_id)?.state === 'active',
                            showCycle: cycleId === 'all',
                          })))
                      : tab === 'done'
                        ? (doneTasks.length === 0
                          ? empty(t('board.doneEmpty'), t('board.doneHint'))
                          : doneTasks.map(task => h(DoneRow, {
                            key: task.id,
                            task,
                            t,
                            onSelect: () => selectTask(task.id),
                            onOpenSession: () => { selectTask(task.id); setSessionView(task.id) },
                            onClose: () => { void closeTask(task.id) },
                            showCycle: cycleId === 'all',
                          })))
                        : (archiveTasks.length === 0
                          ? empty(t('board.archiveEmpty'), t('board.archiveHint'))
                          : archiveTasks.map(task => h(ArchiveRow, {
                            key: task.id,
                            task,
                            t,
                            onSelect: () => selectTask(task.id),
                            onOpenSession: () => { selectTask(task.id); setSessionView(task.id) },
                            onCancel: () => setConfirm({
                              kind: 'cancelInLinear',
                              taskId: task.id,
                              message: t('board.cancelInLinearConfirm').replace('{id}', task.identifier || task.id.slice(0, 8)),
                            }),
                            showCycle: cycleId === 'all',
                          })))),
                transcriptTask !== null
                  ? h(SessionTranscript, {
                    task: transcriptTask,
                    t,
                    onClose: () => setSessionView(null),
                    onOpenSession: () => { uiWorkspace?.openSession(transcriptTask.session_id) },
                  })
                  : selected === null
                    ? empty(t('board.reviewEmpty'), t('board.reviewHint'))
                    : h(ReviewDetail, {
                    task: selected,
                    cycle: selectedCycle ?? boardCycles.find(cycle => cycle.id === selected.cycle_id) ?? null,
                    cycles: boardCycles,
                    milestones,
                    diff,
                    t,
                    busy,
                    rejecting: rejecting === selected.id,
                    rejectReason,
                    sessionStatus: sessionStatusOf(selected),
                    showCycle: cycleId === 'all',
                    onRejectReason: setRejectReason,
                    onStartReject: () => setRejecting(selected.id),
                    onCancelReject: () => { setRejecting(null); setRejectReason('') },
                    onReject: () => { void reject(selected.id) },
                    onApprove: () => { void approve(selected.id) },
                    onMarkReviewed: reviewed => { void markReviewed(selected.id, reviewed) },
                    onOpenSession: () => { setSessionView(selected.id) },
                    onClose: () => setSelectedId(null),
                    onArchive: () => askArchive(selected),
                    onBackToReview: () => { void backToReview(selected.id) },
                    onCancelInLinear: () => setConfirm({
                      kind: 'cancelInLinear',
                      taskId: selected.id,
                      message: t('board.cancelInLinearConfirm').replace('{id}', selected.identifier || selected.id.slice(0, 8)),
                    }),
                    onUpdateFields: patch => { void updateFields(selected, patch) },
                  }))),        creating
          ? h(CreateTaskModal, {
            t,
            boardId: selectedBoard?.id ?? '',
            cycles: boardCycles,
            milestones,
            workspaces,
            defaultCycleId: selectedCycle?.id ?? currentCycle?.id ?? '',
            onClose: () => setCreating(false),
            onCreated: () => { setCreating(false); refresh() },
          })
          : null,
        editingCycle && selectedCycle !== null
          ? h(CycleEditModal, {
            t,
            cycle: selectedCycle,
            onClose: () => setEditingCycle(false),
            onSaved: () => { setEditingCycle(false); setNotice(t('board.cycleUpdated')); refresh() },
          })
          : null,
        settingsOpen
          ? h(SettingsModal, {
            t,
            data,
            onClose: () => setSettingsOpen(false),
            onChanged: refresh,
          })
          : null)
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
      sessionsService = ctx.sessions
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

    }

    return { inject: ['slots', 'locale', 'uiWorkspace', 'workspaces', 'sessions'], apply, finalTranscript, cycleWindow }
  },
})
