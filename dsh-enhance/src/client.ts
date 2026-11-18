import React from 'react'

const h: any = React.createElement
const NS = 'dshEnhance'
const API = '/dsh-enhance/terminals'
let sidebarRight: any = null
let workspacesService: any = null
let shortcutsService: any = null

    const en = {
      'meta.title': 'Terminal and workspace',
      'meta.description': 'Persistent multi-shell terminal in the right sidebar, plus workspace icons and badges.',
      'dock.new': 'New terminal',
      'dock.close': 'Close terminal',
      'dock.empty': 'No terminal open',
      'dock.missingTtyd': 'ttyd is not installed. Install it with: brew install ttyd',
      'dock.title': 'Terminal',
      'global.title': 'Global',
      'global.collapse': 'Collapse global bar',
      'global.expand': 'Expand global bar',
      'global.split': 'Split global bar',
      'global.newTab': 'New tab',
      'global.closeTab': 'Close tab',
      'global.switch': 'Switch tab',
      'global.noTab': 'No tab open. Press ⌘T to add one.',
      'global.noFocus': 'Focus the global bar first.',
      'global.resize': 'Resize global bar',
      'dock.tabDescription': 'Run commands in a persistent shell beside the conversation.',
      'settings.title': 'dsh-enhance',
      'settings.loading': 'Loading…',
      'settings.customLeftbar': 'Custom workspace browser',
      'settings.customLeftbarHint': 'Replace the shipped sidebar browser.',
      'settings.globalBar': 'Global bar',
      'settings.globalBarHint': 'Bottom bar with terminal and browser tabs.',
      'settings.virtualGroups': 'Virtual groups',
      'settings.virtualGroupsHint': 'Group workspaces from groups.json.',
      'settings.splitPanes': 'Split panes',
      'settings.splitPanesHint': 'Allow two panes in the global bar.',
      'settings.reload': 'Reload the page to apply changes.',
      'browser.title': 'Workspaces',
      'browser.search': 'Search workspaces',
      'browser.newSession': 'New session',
      'browser.rename': 'Rename workspace',
      'browser.renamePrompt': 'Workspace name',
      'browser.delete': 'Delete workspace',
      'browser.deleteConfirm': 'Remove "{title}" from the sidebar? Files and sessions stay.',
      'browser.deleteSession': 'Delete session',
      'browser.deleteRunning': 'This session is running. Stop its work and remove it from the list?',
      'browser.add': 'Add workspace',
      'browser.collapseAll': 'Collapse all (keep running)',
      'browser.more': 'More',
      'browser.changeIcon': 'Change icon',
      'browser.empty': 'No workspaces',
      'editor.card': 'Editor',
      'editor.cardHint': 'Neovim, VS Code, or a noVNC desktop in the right sidebar.',
      'editor.title': 'Editor',
      'editor.intro': 'Nothing starts until you pick one. Closing this tab keeps it running.',
      'editor.starting': 'Starting…',
      'editor.running': 'Running',
      'editor.unavailable': 'Unavailable',
      'editor.nativeOpened': 'Opened {label} on your desktop.',
      'editor.back': 'Back to editors',
      'editor.switch': 'Switch editor',
      'editor.shutdown': 'Shut down',
      'editor.shutdownLabel': 'Shut down {label}',
      'editor.refresh': 'Rescan editors',
      'editor.frame': 'Editor',
      'editor.type.ttyd': 'terminal',
      'editor.type.web': 'web server',
      'editor.type.novnc': 'noVNC',
      'editor.type.native': 'desktop app',
      'editor.hint': 'Sublime Text, Zed and Cursor have no web UI; add a noVNC URL in config.json to embed them.',
      'command.search': 'Search subcommands',
      'command.empty': 'No subcommands',
      'command.noResults': 'No matching subcommand',
      'command.groupOpen': 'Open',
      'command.groupHost': 'Host',
      'command.terminal': 'New terminal',
      'command.terminalDetail': 'Open a shell tab in the global bar',
      'command.editor': 'Editor',
      'command.editorDetail': 'Open the editor tab in the right sidebar',
      'command.status': 'Status',
      'command.statusDetail': 'Show ttyd, terminal, and editor availability',
      'command.config': 'Config',
      'command.configDetail': 'Show the plugin configuration',
      'command.noSession': 'This session is not ready yet.',
      'command.noCommand': 'The host does not offer /enhance.',
    }

    const zh = {
      'meta.title': '终端与工作区',
      'meta.description': '右侧栏中的常驻多 shell 终端，以及工作区图标和徽标。',
      'dock.new': '新建终端',
      'dock.close': '关闭终端',
      'dock.empty': '没有打开的终端',
      'dock.missingTtyd': '未安装 ttyd。请运行：brew install ttyd',
      'dock.title': '终端',
      'global.title': '全局',
      'global.collapse': '收起全局栏',
      'global.expand': '展开全局栏',
      'global.split': '拆分全局栏',
      'global.newTab': '新建标签',
      'global.closeTab': '关闭标签',
      'global.switch': '切换标签',
      'global.noTab': '没有标签。按 ⌘T 新建。',
      'global.noFocus': '请先聚焦全局栏。',
      'global.resize': '调整全局栏高度',
      'dock.tabDescription': '在对话旁边的常驻 shell 中运行命令。',
      'settings.title': 'dsh-enhance',
      'settings.loading': '加载中…',
      'settings.customLeftbar': '自定义工作区浏览器',
      'settings.customLeftbarHint': '替换内置的侧边栏浏览器。',
      'settings.globalBar': '全局栏',
      'settings.globalBarHint': '底部栏，包含终端和浏览器标签。',
      'settings.virtualGroups': '虚拟分组',
      'settings.virtualGroupsHint': '从 groups.json 分组工作区。',
      'settings.splitPanes': '分屏',
      'settings.splitPanesHint': '允许全局栏显示两个窗格。',
      'settings.reload': '重新加载页面以应用更改。',
      'browser.title': '工作区',
      'browser.search': '搜索工作区',
      'browser.newSession': '新建会话',
      'browser.rename': '重命名工作区',
      'browser.renamePrompt': '工作区名称',
      'browser.delete': '删除工作区',
      'browser.deleteConfirm': '从侧边栏移除“{title}”？文件和会话都会保留。',
      'browser.deleteSession': '删除会话',
      'browser.deleteRunning': '该会话正在运行。停止其工作并从列表中移除？',
      'browser.add': '添加工作区',
      'browser.collapseAll': '全部收起（保留运行中）',
      'browser.more': '更多',
      'browser.changeIcon': '更换图标',
      'browser.empty': '没有工作区',
      'editor.card': '编辑器',
      'editor.cardHint': '在右侧栏中运行 Neovim、VS Code 或 noVNC 桌面应用。',
      'editor.title': '编辑器',
      'editor.intro': '在你选择之前不会启动任何程序。关闭此标签后它仍会继续运行。',
      'editor.starting': '启动中…',
      'editor.running': '运行中',
      'editor.unavailable': '不可用',
      'editor.nativeOpened': '已在桌面打开 {label}。',
      'editor.back': '返回编辑器列表',
      'editor.switch': '切换编辑器',
      'editor.shutdown': '关闭应用',
      'editor.shutdownLabel': '关闭 {label}',
      'editor.refresh': '重新扫描编辑器',
      'editor.frame': '编辑器',
      'editor.type.ttyd': '终端',
      'editor.type.web': '网页服务',
      'editor.type.novnc': 'noVNC',
      'editor.type.native': '桌面应用',
      'editor.hint': 'Sublime Text、Zed 和 Cursor 没有网页版；在 config.json 中添加 noVNC 地址即可嵌入。',
      'command.search': '搜索子命令',
      'command.empty': '没有子命令',
      'command.noResults': '没有匹配的子命令',
      'command.groupOpen': '打开',
      'command.groupHost': '主机',
      'command.terminal': '新建终端',
      'command.terminalDetail': '在全局栏中打开一个 shell 标签',
      'command.editor': '编辑器',
      'command.editorDetail': '在右侧栏中打开编辑器标签',
      'command.status': '状态',
      'command.statusDetail': '显示 ttyd、终端和编辑器的可用性',
      'command.config': '配置',
      'command.configDetail': '显示插件配置',
      'command.noSession': '该会话尚未就绪。',
      'command.noCommand': '主机未提供 /enhance。',
    }

    const iconButtonStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '26px',
      flex: 'none',
      border: '1px solid transparent',
      borderRadius: 'var(--dsw-radius-xs)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-secondary)',
      font: 'inherit',
      fontSize: '14px',
      lineHeight: '1',
      cursor: 'pointer',
    }

    const menuStyle = {
      position: 'absolute',
      right: '8px',
      top: '36px',
      zIndex: 10,
      minWidth: '140px',
      padding: '4px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-md)',
      background: 'var(--dsw-alias-bg-layer-2)',
      boxShadow: 'var(--dsw-shadow-lv3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    }

    const menuItemStyle = {
      display: 'flex',
      alignItems: 'center',
      height: '28px',
      padding: '0 8px',
      border: 'none',
      borderRadius: 'var(--dsw-radius-xs)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
      textAlign: 'left',
      cursor: 'pointer',
    }

    function readTheme() {
      if (typeof window === 'undefined') return undefined
      const style = getComputedStyle(document.body)
      const value = (name, fallback) => style.getPropertyValue(name).trim() || fallback
      return {
        background: value('--dsw-alias-bg-layer-1', '#17191d'),
        foreground: value('--dsw-alias-label-primary', '#d7dce5'),
        cursor: value('--dsw-alias-label-primary', '#d7dce5'),
        selectionBackground: value('--dsw-alias-bg-layer-3', '#2b3240'),
        black: value('--dsw-alias-bg-layer-1', '#17191d'),
        red: value('--dsw-alias-state-error-primary', '#f07178'),
        green: value('--dsw-alias-state-success-primary', '#7ee787'),
        yellow: value('--dsw-alias-state-warn-primary', '#ffd479'),
        blue: value('--dsw-alias-state-business-primary', '#79b8ff'),
        magenta: value('--dsw-alias-label-deep-diving', '#d2a8ff'),
        cyan: value('--dsw-alias-state-business-primary', '#76e3ea'),
        white: value('--dsw-alias-label-primary', '#d7dce5'),
        brightBlack: value('--dsw-alias-label-secondary', '#6b7280'),
        brightRed: value('--dsw-alias-state-error-primary', '#ff8b92'),
        brightGreen: value('--dsw-alias-state-success-primary', '#9ef0a5'),
        brightYellow: value('--dsw-alias-state-warn-primary', '#ffe3a3'),
        brightBlue: value('--dsw-alias-state-business-primary', '#a5d6ff'),
        brightMagenta: value('--dsw-alias-label-deep-diving', '#e2c5ff'),
        brightCyan: value('--dsw-alias-state-business-primary', '#a5f3f8'),
        brightWhite: '#ffffff',
      }
    }

    function decoratorCss(config) {
      const rules = []
      const add = (selector, value) => {
        if (typeof value !== 'string' || value === '') return
        rules.push(selector + '::before{content:' + JSON.stringify(value)
          + ';flex:none;margin-right:6px;color:var(--dsw-alias-label-secondary);'
          + 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:24px;}')
      }
      const tools = config !== null && typeof config === 'object' && config.tools !== null && typeof config.tools === 'object' ? config.tools : {}
      const variants = config !== null && typeof config === 'object' && config.variants !== null && typeof config.variants === 'object' ? config.variants : {}
      for (const [tool, value] of Object.entries(tools)) add('[data-tool=' + JSON.stringify(tool) + '] > div', value)
      for (const [variant, value] of Object.entries(variants)) add('[data-variant=' + JSON.stringify(variant) + '] > div', value)
      return rules.join('\n')
    }

    const dockStore = (() => {
      let state: any = { active: null, terminals: [], shells: [], ttyd: true, error: null }
      const listeners = new Set<() => void>()
      const emit = () => { for (const listener of listeners) listener() }
      const set = (patch) => { state = { ...state, ...patch }; emit() }
      const refresh = async () => {
        try {
          const response = await fetch(API)
          const data = await response.json()
          const terminals = Array.isArray(data.terminals) ? data.terminals : []
          set({
            terminals,
            shells: Array.isArray(data.shells) ? data.shells : [],
            ttyd: data.ttyd !== false,
            error: null,
            active: state.active !== null && terminals.some((item) => item.id === state.active)
              ? state.active
              : terminals[0]?.id ?? null,
          })
        } catch (failure) {
          set({ error: String(failure) })
        }
      }
      const create = async (shell) => {
        try {
          const response = await fetch(API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'create', shell, theme: readTheme() }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error ?? 'create failed')
          await refresh()
          set({ active: data.terminal.id })
          return data.terminal
        } catch (failure) {
          set({ error: String(failure) })
          return undefined
        }
      }
      const close = async (id) => {
        try {
          await fetch(API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'close', id }),
          })
          await refresh()
        } catch (failure) {
          set({ error: String(failure) })
        }
      }
      return {
        get: () => state,
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
        set,
        refresh,
        create,
        close,
      }
    })()

    const globalStore = (() => {
      let state: any = { expanded: true, height: 260, split: false, tabs: [], active: null, left: null, right: null }
      const listeners = new Set<() => void>()
      const emit = () => { for (const listener of listeners) listener() }
      const set = (patch) => { state = { ...state, ...patch }; emit() }
      return {
        get: () => state,
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
        set,
      }
    })()

    const featureConfig = { splitPanes: true, globalBar: true }

    const addGlobalTab = (tab) => {
      const state = globalStore.get()
      globalStore.set({ tabs: [...state.tabs, tab], active: tab.id, expanded: true })
    }

    const closeGlobalTab = (tab) => {
      if (tab.kind === 'terminal') void dockStore.close(tab.id)
      const state = globalStore.get()
      const tabs = state.tabs.filter((item) => item.id !== tab.id)
      globalStore.set({
        tabs,
        active: state.active === tab.id ? tabs[0]?.id ?? null : state.active,
        left: state.left === tab.id ? tabs[0]?.id ?? null : state.left,
        right: state.right === tab.id ? tabs[1]?.id ?? null : state.right,
      })
    }

    function GlobalBar({ t }) {
      const state = React.useSyncExternalStore(globalStore.subscribe, globalStore.get)
      const terminals = React.useSyncExternalStore(dockStore.subscribe, dockStore.get)
      const [switcher, setSwitcher] = React.useState(null)
      const drag = React.useRef(null)

      React.useEffect(() => { void dockStore.refresh() }, [])

      if (featureConfig.globalBar === false) return null

      const expanded = state.expanded
      const active = state.tabs.find((tab) => tab.id === state.active) ?? state.tabs[0]
      const left = state.tabs.find((tab) => tab.id === state.left) ?? state.tabs[0]
      const right = state.tabs.find((tab) => tab.id === state.right) ?? state.tabs[1]

      const startResize = (event) => {
        event.preventDefault()
        drag.current = { startY: event.clientY, start: state.height }
        const move = (moveEvent) => {
          if (drag.current === null) return
          const next = Math.max(120, Math.min(window.innerHeight * 0.7, drag.current.start + (drag.current.startY - moveEvent.clientY)))
          globalStore.set({ height: next })
        }
        const up = () => {
          drag.current = null
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }

      const addTab = (tab) => addGlobalTab(tab)

      const newTab = async () => {
        const shell = terminals.shells[0]?.path
        if (shell === undefined) return
        const created = await dockStore.create(shell)
        if (created !== undefined) addGlobalTab({ id: created.id, kind: 'terminal', title: created.title, url: created.url })
      }

      const closeTab = (tab) => closeGlobalTab(tab)

      const toggleSplit = () => {
        if (state.split) {
          globalStore.set({ split: false })
          return
        }
        const second = state.tabs.find((tab) => tab.id !== left?.id)
        globalStore.set({ split: true, right: second?.id ?? null })
      }

      const tabStyle = (isActive) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '26px',
        padding: '0 8px',
        border: '1px solid ' + (isActive ? 'var(--dsw-alias-border-l2)' : 'transparent'),
        borderRadius: 'var(--dsw-radius-xs)',
        background: isActive ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
        color: isActive ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
        font: 'inherit',
        fontSize: '12px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        maxWidth: '160px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      })

      const renderTab = (tab) => {
        if (tab === undefined) {
          return h(
            'div',
            { style: { display: 'flex', flex: '1', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
            t('global.noTab'),
          )
        }
        return h('iframe', { src: tab.url, title: tab.title, style: { flex: '1', width: '100%', border: 'none', background: '#17191d' } })
      }

      const switcherMenu = (side) => h(
        'div',
        {
          style: {
            position: 'absolute',
            right: '8px',
            bottom: '36px',
            zIndex: 4,
            minWidth: '140px',
            padding: '4px',
            border: '1px solid var(--dsw-alias-border-l2)',
            borderRadius: 'var(--dsw-radius-md)',
            background: 'var(--dsw-alias-bg-layer-2)',
            boxShadow: 'var(--dsw-shadow-lv3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          },
        },
        state.tabs.map((item) => h('button', {
          key: item.id,
          type: 'button',
          style: menuItemStyle,
          onClick: () => {
            globalStore.set(side === 'main' ? { active: item.id } : { [side]: item.id })
            setSwitcher(null)
          },
        }, item.title)),
      )

      const switcherButton = (side) => state.tabs.length > 1
        ? h('button', {
            type: 'button',
            style: {
              position: 'absolute',
              right: '8px',
              bottom: '8px',
              zIndex: 3,
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '1px solid var(--dsw-alias-border-l2)',
              background: 'var(--dsw-alias-bg-layer-2)',
              color: 'var(--dsw-alias-label-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              padding: 0,
            },
            title: t('global.switch'),
            'aria-label': t('global.switch'),
            onClick: () => setSwitcher(switcher === side ? null : side),
          }, '⌄')
        : null

      const pane = (tab, side) => h(
        'div',
        {
          style: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flex: '1',
            minWidth: 0,
            minHeight: 0,
            borderLeft: side === 'right' ? '1px solid var(--dsw-alias-border-l2)' : 'none',
          },
        },
        renderTab(tab),
        switcherButton(side),
        switcher === side ? switcherMenu(side) : null,
      )

      return h(
        'section',
        {
          style: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: (expanded ? state.height : 36) + 'px',
            minHeight: 0,
            borderTop: '1px solid var(--dsw-alias-border-l2)',
            background: 'var(--dsw-alias-bg-layer-1)',
            color: 'var(--dsw-alias-label-primary)',
            font: 'inherit',
            overflow: 'hidden',
          },
          'data-dsh-enhance-global': '',
        },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '4px', height: '36px', flex: 'none', padding: '0 8px', borderBottom: expanded ? '1px solid var(--dsw-alias-border-l2)' : 'none', background: 'var(--dsw-alias-bg-layer-2)' } },
          h('button', {
            type: 'button',
            style: { display: 'inline-flex', alignItems: 'center', gap: '6px', height: '26px', padding: '0 8px', border: 'none', borderRadius: 'var(--dsw-radius-xs)', background: 'transparent', color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', cursor: 'pointer' },
            title: expanded ? t('global.collapse') : t('global.expand'),
            onClick: () => globalStore.set({ expanded: !expanded }),
          }, expanded ? '▾' : '▸', ' ', t('global.title')),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '2px', flex: '1', minWidth: 0, overflowX: 'auto' } },
            state.tabs.map((tab) => h('button', {
              key: tab.id,
              type: 'button',
              style: tabStyle(tab.id === active?.id),
              onClick: () => globalStore.set({ active: tab.id }),
            },
            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, tab.title),
            h('span', {
              role: 'button',
              tabIndex: 0,
              'aria-label': t('global.closeTab'),
              style: { color: 'var(--dsw-alias-label-secondary)', padding: '0 2px' },
              onClick: (event) => {
                event.stopPropagation()
                closeTab(tab)
              },
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  closeTab(tab)
                }
              },
            }, '×'),
            )),
          ),
          featureConfig.splitPanes
            ? h('button', { type: 'button', style: iconButtonStyle, title: t('global.split'), 'aria-label': t('global.split'), onClick: toggleSplit }, '◫')
            : null,
          h('button', { type: 'button', style: iconButtonStyle, title: t('global.newTab'), 'aria-label': t('global.newTab'), onClick: newTab }, '+'),
          h('button', { type: 'button', style: iconButtonStyle, title: t('global.collapse'), 'aria-label': t('global.collapse'), onClick: () => globalStore.set({ expanded: false }) }, '×'),
        ),
        expanded
          ? state.split && featureConfig.splitPanes
            ? h('div', { style: { display: 'flex', flex: '1', minHeight: 0 } }, pane(left, 'left'), pane(right, 'right'))
            : h('div', { style: { position: 'relative', display: 'flex', flex: '1', minHeight: 0 } },
                renderTab(active),
                switcherButton('main'),
                switcher === 'main' ? switcherMenu('main') : null,
              )
          : null,
        expanded
          ? h('div', {
              style: { position: 'absolute', top: 0, left: 0, right: 0, height: '6px', cursor: 'ns-resize', zIndex: 2 },
              role: 'separator',
              'aria-label': t('global.resize'),
              onPointerDown: startResize,
            })
          : null,
      )
    }

    const LUCIDE = {
      folder: [['path', { d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' }]],
      rocket: [
        ['path', { d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z' }],
        ['path', { d: 'm12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' }],
        ['path', { d: 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' }],
        ['path', { d: 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' }],
      ],
      code: [['path', { d: 'm16 18 6-6-6-6' }], ['path', { d: 'm8 6-6 6 6 6' }]],
      terminal: [['path', { d: 'm4 17 6-6-6-6' }], ['path', { d: 'M12 19h8' }]],
      database: [
        ['ellipse', { cx: 12, cy: 5, rx: 9, ry: 3 }],
        ['path', { d: 'M3 5V19A9 3 0 0 0 21 19V5' }],
        ['path', { d: 'M3 12A9 3 0 0 0 21 12' }],
      ],
      globe: [
        ['circle', { cx: 12, cy: 12, r: 10 }],
        ['path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }],
        ['path', { d: 'M2 12h20' }],
      ],
      package: [
        ['path', { d: 'm7.5 4.27 9 5.15' }],
        ['path', { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }],
        ['path', { d: 'm3.3 7 8.7 5 8.7-5' }],
        ['path', { d: 'M12 22V12' }],
      ],
      book: [['path', { d: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20' }]],
      briefcase: [
        ['rect', { width: 20, height: 14, x: 2, y: 7, rx: 2 }],
        ['path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }],
      ],
      palette: [
        ['circle', { cx: 13.5, cy: 6.5, r: 0.5 }],
        ['circle', { cx: 17.5, cy: 10.5, r: 0.5 }],
        ['circle', { cx: 8.5, cy: 7.5, r: 0.5 }],
        ['circle', { cx: 6.5, cy: 12.5, r: 0.5 }],
        ['path', { d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z' }],
      ],
      wrench: [['path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' }]],
      bug: [
        ['path', { d: 'm8 2 1.88 1.88' }],
        ['path', { d: 'M14.12 3.88 16 2' }],
        ['path', { d: 'M9 7.13v-1a3.003 3.003 0 1 1 6 0v1' }],
        ['path', { d: 'M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6' }],
        ['path', { d: 'M12 20v-9' }],
        ['path', { d: 'M6.53 9C4.6 8.8 3 7.1 3 5' }],
        ['path', { d: 'M6 13H2' }],
        ['path', { d: 'M3 21c0-2.1 1.7-3.9 3.8-4' }],
        ['path', { d: 'M20.97 5c0 2.1-1.6 3.8-3.5 4' }],
        ['path', { d: 'M22 13h-4' }],
        ['path', { d: 'M17.2 17c2.1.1 3.8 1.9 3.8 4' }],
      ],
      zap: [['path', { d: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' }]],
      star: [['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }]],
      heart: [['path', { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' }]],
      home: [
        ['path', { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' }],
        ['path', { d: 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }],
      ],
      layers: [
        ['path', { d: 'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z' }],
        ['path', { d: 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65' }],
        ['path', { d: 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65' }],
      ],
      box: [
        ['path', { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }],
        ['path', { d: 'm3.3 7 8.7 5 8.7-5' }],
        ['path', { d: 'M12 22V12' }],
      ],
      cpu: [
        ['rect', { width: 16, height: 16, x: 4, y: 4, rx: 2 }],
        ['rect', { width: 6, height: 6, x: 9, y: 9, rx: 1 }],
        ['path', { d: 'M15 2v2' }],
        ['path', { d: 'M15 20v2' }],
        ['path', { d: 'M2 15h2' }],
        ['path', { d: 'M2 9h2' }],
        ['path', { d: 'M20 15h2' }],
        ['path', { d: 'M20 9h2' }],
        ['path', { d: 'M9 2v2' }],
        ['path', { d: 'M9 20v2' }],
      ],
      cloud: [['path', { d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' }]],
      'git-branch': [
        ['line', { x1: 6, x2: 6, y1: 3, y2: 15 }],
        ['circle', { cx: 18, cy: 6, r: 3 }],
        ['circle', { cx: 6, cy: 18, r: 3 }],
        ['path', { d: 'M18 9a9 9 0 0 1-9 9' }],
      ],
      'file-code': [
        ['path', { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' }],
        ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' }],
        ['path', { d: 'm10 13-2 2 2 2' }],
        ['path', { d: 'm14 17 2-2-2-2' }],
      ],
      'flask-conical': [
        ['path', { d: 'M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2' }],
        ['path', { d: 'M8.5 2h7' }],
        ['path', { d: 'M7 16h10' }],
      ],
      shield: [['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }]],
      sparkles: [
        ['path', { d: 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z' }],
        ['path', { d: 'M20 3v4' }],
        ['path', { d: 'M22 5h-4' }],
        ['path', { d: 'M4 17v2' }],
        ['path', { d: 'M5 18H3' }],
      ],
      target: [
        ['circle', { cx: 12, cy: 12, r: 10 }],
        ['circle', { cx: 12, cy: 12, r: 6 }],
        ['circle', { cx: 12, cy: 12, r: 2 }],
      ],
      trophy: [
        ['path', { d: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6' }],
        ['path', { d: 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18' }],
        ['path', { d: 'M4 22h16' }],
        ['path', { d: 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' }],
        ['path', { d: 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' }],
        ['path', { d: 'M18 2H6v7a6 6 0 0 0 12 0V2Z' }],
      ],
      coffee: [
        ['path', { d: 'M10 2v2' }],
        ['path', { d: 'M14 2v2' }],
        ['path', { d: 'M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1' }],
        ['path', { d: 'M6 2v2' }],
      ],
      music: [
        ['path', { d: 'M9 18V5l12-2v13' }],
        ['circle', { cx: 6, cy: 18, r: 3 }],
        ['circle', { cx: 18, cy: 16, r: 3 }],
      ],
      camera: [
        ['path', { d: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z' }],
        ['circle', { cx: 12, cy: 13, r: 3 }],
      ],
      image: [
        ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
        ['circle', { cx: 9, cy: 9, r: 2 }],
        ['path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' }],
      ],
      map: [
        ['path', { d: 'M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z' }],
        ['path', { d: 'M15 5.764v15' }],
        ['path', { d: 'M9 3.236v15' }],
      ],
      compass: [
        ['circle', { cx: 12, cy: 12, r: 10 }],
        ['polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' }],
      ],
      key: [
        ['path', { d: 'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z' }],
        ['circle', { cx: 16.5, cy: 7.5, r: 0.5 }],
      ],
      lock: [
        ['rect', { width: 18, height: 11, x: 3, y: 11, rx: 2 }],
        ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }],
      ],
      bell: [
        ['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0' }],
        ['path', { d: 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326' }],
      ],
      calendar: [
        ['path', { d: 'M8 2v4' }],
        ['path', { d: 'M16 2v4' }],
        ['rect', { width: 18, height: 18, x: 3, y: 4, rx: 2 }],
        ['path', { d: 'M3 10h18' }],
      ],
      clock: [
        ['circle', { cx: 12, cy: 12, r: 10 }],
        ['polyline', { points: '12 6 12 12 16 14' }],
      ],
      mail: [
        ['rect', { width: 20, height: 16, x: 2, y: 4, rx: 2 }],
        ['path', { d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' }],
      ],
      'message-square': [['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }]],
      users: [
        ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
        ['circle', { cx: 9, cy: 7, r: 4 }],
        ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
        ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }],
      ],
      user: [
        ['path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }],
        ['circle', { cx: 12, cy: 7, r: 4 }],
      ],
      settings: [
        ['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }],
        ['circle', { cx: 12, cy: 12, r: 3 }],
      ],
      hammer: [
        ['path', { d: 'm15 12-8.373 8.373a1 1 0 1 1-3-3L12 9' }],
        ['path', { d: 'm18 15 4-4' }],
        ['path', { d: 'm21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5' }],
      ],
      'pen-tool': [
        ['path', { d: 'm12 19 7-7 3 3-7 7-3-3z' }],
        ['path', { d: 'm18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z' }],
        ['path', { d: 'm2 2 7.586 7.586' }],
        ['circle', { cx: 11, cy: 11, r: 2 }],
      ],
      brush: [
        ['path', { d: 'm9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08' }],
        ['path', { d: 'M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z' }],
      ],
      'graduation-cap': [
        ['path', { d: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z' }],
        ['path', { d: 'M22 10v6' }],
        ['path', { d: 'M6 12.5V16a6 3 0 0 0 12 0v-3.5' }],
      ],
      lightbulb: [
        ['path', { d: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5' }],
        ['path', { d: 'M9 18h6' }],
        ['path', { d: 'M10 22h4' }],
      ],
      puzzle: [['path', { d: 'M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z' }]],
      'gamepad-2': [
        ['line', { x1: 6, x2: 10, y1: 11, y2: 11 }],
        ['line', { x1: 8, x2: 8, y1: 9, y2: 13 }],
        ['line', { x1: 15, x2: 15.01, y1: 12, y2: 12 }],
        ['line', { x1: 18, x2: 18.01, y1: 10, y2: 10 }],
        ['path', { d: 'M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z' }],
      ],
      car: [
        ['path', { d: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2' }],
        ['circle', { cx: 7, cy: 17, r: 2 }],
        ['path', { d: 'M9 17h6' }],
        ['circle', { cx: 17, cy: 17, r: 2 }],
      ],
      plane: [['path', { d: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z' }]],
      leaf: [
        ['path', { d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z' }],
        ['path', { d: 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12' }],
      ],
      sun: [
        ['circle', { cx: 12, cy: 12, r: 4 }],
        ['path', { d: 'M12 2v2' }],
        ['path', { d: 'M12 20v2' }],
        ['path', { d: 'm4.93 4.93 1.41 1.41' }],
        ['path', { d: 'm17.66 17.66 1.41 1.41' }],
        ['path', { d: 'M2 12h2' }],
        ['path', { d: 'M20 12h2' }],
        ['path', { d: 'm6.34 17.66-1.41 1.41' }],
        ['path', { d: 'm19.07 4.93-1.41 1.41' }],
      ],
      moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
      'trash-2': [
        ['path', { d: 'M3 6h18' }],
        ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }],
        ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }],
        ['path', { d: 'M10 11v6' }],
        ['path', { d: 'M14 11v6' }],
      ],
    }

    function WorkspaceIcon({ name, size }) {
      const shapes = LUCIDE[name]
      if (shapes === undefined) {
        return h('span', { style: { fontSize: size * 0.8, lineHeight: 1 } }, name ?? '📁')
      }
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        shapes.map(([tag, attrs], index) => h(tag, { key: index, ...attrs })),
      )
    }

    function badgeOf(workspace, badges) {
      if (badges === null || typeof badges !== 'object') return undefined
      const byPath = badges[workspace.path]
      if (byPath !== undefined) return byPath
      return badges[workspace.title]
    }

    function relativeTime(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return ''
      const delta = Date.now() - value
      if (delta < 60_000) return 'now'
      if (delta < 3_600_000) return Math.round(delta / 60_000) + 'm'
      if (delta < 86_400_000) return Math.round(delta / 3_600_000) + 'h'
      return Math.round(delta / 86_400_000) + 'd'
    }

    const railStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '36px',
    }

    const railButtonStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      border: 'none',
      borderRadius: 'var(--dsw-radius-xs)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-secondary)',
      font: 'inherit',
      fontSize: '16px',
      cursor: 'pointer',
    }

    const browserRootStyle = {
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      height: '100%',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
    }

    const browserHeaderStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      height: '36px',
      flex: 'none',
      padding: '0 8px',
    }

    const browserTitleStyle = {
      flex: '1',
      minWidth: 0,
      fontWeight: 600,
      fontSize: '11px',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      color: 'var(--dsw-alias-label-secondary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }

    const searchStyle = {
      width: 'calc(100% - 16px)',
      height: '26px',
      margin: '0 8px 6px',
      padding: '0 8px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-xs)',
      background: 'var(--dsw-alias-bg-layer-2)',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
      outline: 'none',
    }

    const browserListStyle = {
      flex: '1',
      minHeight: 0,
      overflowY: 'auto',
      padding: '0 4px 8px',
    }

    const groupStyle = {
      marginBottom: '6px',
      padding: '2px 4px 4px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-md)',
      background: 'var(--dsw-alias-bg-layer-2)',
      overflow: 'hidden',
    }

    const workspaceBlockStyle = {
      marginBottom: '4px',
    }

    const workspaceRowStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      height: '32px',
      padding: '0 4px',
      borderRadius: 'var(--dsw-radius-xs)',
    }

    const iconStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      flex: 'none',
      color: 'var(--dsw-alias-label-secondary)',
      fontSize: '12px',
      lineHeight: '16px',
    }

    const workspaceTitleStyle = {
      flex: '1',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontWeight: 500,
      fontSize: '12px',
    }

    const badgeStyle = (color) => ({
      flex: 'none',
      maxWidth: '72px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '0 5px',
      borderRadius: '999px',
      border: '1px solid ' + (color || 'var(--dsw-alias-border-l2)'),
      background: 'color-mix(in srgb, ' + (color || 'var(--dsw-alias-border-l2)') + ' 18%, transparent)',
      color: color || 'var(--dsw-alias-label-secondary)',
      fontSize: '10px',
      lineHeight: '16px',
    })

    const actionStyle = {
      width: '26px',
      height: '26px',
      flex: 'none',
      border: 'none',
      borderRadius: 'var(--dsw-radius-xs)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-secondary)',
      font: 'inherit',
      fontSize: '14px',
      lineHeight: '1',
      cursor: 'pointer',
      padding: 0,
    }

    const headerAddStyle = {
      ...actionStyle,
      width: '30px',
      height: '30px',
      fontSize: '16px',
    }

    const moreMenuStyle = {
      position: 'absolute',
      top: '100%',
      right: 0,
      zIndex: 30,
      minWidth: '150px',
      padding: '4px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-md)',
      background: 'var(--dsw-alias-bg-layer-2)',
      boxShadow: 'var(--dsw-shadow-lv3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    }

    const iconPopoverStyle = {
      position: 'absolute',
      top: '100%',
      right: 0,
      zIndex: 31,
      width: '280px',
      maxHeight: '240px',
      overflowY: 'auto',
      padding: '8px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-md)',
      background: 'var(--dsw-alias-bg-layer-2)',
      boxShadow: 'var(--dsw-shadow-lv3)',
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gap: '4px',
    }

    const iconChoiceStyle = (active) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      border: '1px solid ' + (active ? 'var(--dsw-alias-state-business-primary)' : 'transparent'),
      borderRadius: 'var(--dsw-radius-xs)',
      background: active ? 'var(--dsw-alias-bg-layer-3)' : 'transparent',
      color: 'var(--dsw-alias-label-primary)',
      cursor: 'pointer',
      padding: 0,
    })

    const sessionRowStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      width: '100%',
      height: '26px',
      padding: '0 4px 0 12px',
      border: 'none',
      borderRadius: 'var(--dsw-radius-xs)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
      textAlign: 'left',
      cursor: 'pointer',
    }

    const sessionTitleStyle = {
      flex: '1',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }

    const timeStyle = {
      flex: 'none',
      color: 'var(--dsw-alias-label-secondary)',
      fontSize: '10px',
    }

    const sessionActionStyle = {
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '18px',
      height: '18px',
      borderRadius: 'var(--dsw-radius-xs)',
      color: 'var(--dsw-alias-label-secondary)',
      cursor: 'pointer',
    }

    const browserEmptyStyle = {
      padding: '16px 8px',
      color: 'var(--dsw-alias-label-secondary)',
      textAlign: 'center',
      fontSize: '12px',
    }

    class Boundary extends React.Component<any, any> {
      constructor(props: any) {
        super(props)
        this.state = { failed: false }
      }

      static getDerivedStateFromError() {
        return { failed: true }
      }

      componentDidCatch(error: any) {
        this.props.onCrash?.(error)
      }

      render() {
        return this.state.failed ? null : this.props.children
      }
    }

    function statusKind(status) {
      if (status === undefined) return 'idle'
      if (status.pendingInteraction !== undefined) return 'waiting'
      if (status.running === true) return 'running'
      if (status.completionUnread === true) return 'done'
      return 'idle'
    }

    function StatusDot({ kind }) {
      const base = { width: '8px', height: '8px', flex: 'none', borderRadius: '50%' }
      if (kind === 'running') {
        return h('span', {
          style: {
            ...base,
            border: '2px solid var(--dsw-alias-state-business-primary)',
            borderTopColor: 'transparent',
            animation: 'dsh-enhance-spin 0.8s linear infinite',
          },
          'aria-label': 'running',
        })
      }
      if (kind === 'waiting') {
        return h('span', { style: { ...base, background: 'var(--dsw-alias-state-warn-primary)' }, 'aria-label': 'waiting' })
      }
      if (kind === 'done') {
        return h('span', { style: { ...base, background: 'var(--dsw-alias-state-success-primary)' }, 'aria-label': 'done' })
      }
      return h('span', { style: { ...base, background: 'var(--dsw-alias-border-l3)' }, 'aria-hidden': true })
    }

    const browserCss = `
      @keyframes dsh-enhance-spin { to { transform: rotate(360deg); } }
      .dsh-enhance-row:hover { background: var(--dsw-alias-bg-layer-2); }
      .dsh-enhance-group .dsh-enhance-row:hover { background: var(--dsw-alias-bg-layer-3); }
      .dsh-enhance-row:focus-visible { outline: 1px solid var(--dsw-alias-state-business-primary); outline-offset: -1px; }
      .dsh-enhance-session-action { opacity: 0; }
      .dsh-enhance-row:hover .dsh-enhance-session-action,
      .dsh-enhance-session-action:focus-visible { opacity: 1; }
      .dsh-enhance-session-action:hover { color: var(--dsw-alias-state-error-primary); }
      @media (hover: none) { .dsh-enhance-session-action { opacity: 1; } }
    `

    function ShadowBrowser(props) {
      const {
        wide, expandSidebar, useWorkspaces, useSessions, useSessionStatus, t,
        openSession, startSession, renameWorkspace, deleteWorkspace, createWorkspace, pickDirectory, archiveSession, badges, virtualGroups,
      } = props
      const workspaces = useWorkspaces((state) => state.items)
      const archived = useWorkspaces((state) => state.archivedSessionIds)
      const sessions = useSessions((state) => state)
      const statuses = useSessionStatus((state) => state)
      const [query, setQuery] = React.useState('')
      const [collapsed, setCollapsed] = React.useState({})
      const [badgeConfig, setBadgeConfig] = React.useState(badges)
      const [groups, setGroups] = React.useState([])
      const [menuFor, setMenuFor] = React.useState(null)
      const [iconFor, setIconFor] = React.useState(null)
      const [renaming, setRenaming] = React.useState(null)
      const [renameDraft, setRenameDraft] = React.useState('')

      React.useEffect(() => {
        void fetch('/dsh-enhance/groups')
          .then((response) => response.json())
          .then((data) => {
            if (data !== null && typeof data === 'object' && Array.isArray(data.groups)) setGroups(data.groups)
          })
          .catch(() => {})
      }, [])

      if (!wide) {
        return h('div', { style: railStyle },
          h('button', {
            type: 'button',
            style: railButtonStyle,
            title: t('browser.title'),
            'aria-label': t('browser.title'),
            onClick: expandSidebar,
          }, '▤'),
        )
      }

      const setIcon = (workspace, name) => {
        const next = {
          ...badgeConfig,
          [workspace.path]: { ...(badgeConfig[workspace.path] ?? {}), icon: name },
        }
        setBadgeConfig(next)
        setIconFor(null)
        void fetch('/dsh-enhance/badges', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ shadowBrowser: true, workspaces: next }),
        }).catch(() => {})
      }

      const removeSession = (id) => {
        void archiveSession(id).catch(() => {
          if (window.confirm(t('browser.deleteRunning'))) void archiveSession(id, true).catch(() => {})
        })
      }

      const needle = query.trim().toLowerCase()
      const byPath = new Map(workspaces.map((workspace) => [workspace.path, workspace]))
      const groupedPaths = new Set()
      const activeGroups = virtualGroups === false ? [] : groups
      for (const group of activeGroups) {
        for (const path of group.workspaces ?? []) groupedPaths.add(path)
      }

      const renderWorkspace = (workspace, indent) => {
        const badge = badgeOf(workspace, badgeConfig)
        const title = workspace.title || workspace.path
        const sessionIds = workspace.sessionIds.filter((id) => !archived.includes(id))
        const visibleSessions = needle === ''
          ? sessionIds
          : sessionIds.filter((id) => String(sessions.byId[id]?.displayTitle ?? id).toLowerCase().includes(needle))
        const workspaceMatch = needle === ''
          || title.toLowerCase().includes(needle)
          || workspace.path.toLowerCase().includes(needle)
        if (!workspaceMatch && visibleSessions.length === 0) return null
        const menuOpen = menuFor === workspace.workspaceId
        const iconOpen = iconFor === workspace.workspaceId
        const isCollapsed = collapsed[workspace.workspaceId] === true
        const kinds = sessionIds.map((id) => statusKind(statuses.get(id)))
        const workspaceStatus = kinds.includes('waiting') ? 'waiting'
          : kinds.includes('running') ? 'running'
            : kinds.includes('done') ? 'done'
              : 'idle'
        return h('div', { key: workspace.workspaceId, style: workspaceBlockStyle },
          h('div', { className: 'dsh-enhance-row', style: { ...workspaceRowStyle, paddingLeft: (indent ? 16 : 0) + 4 + 'px', position: 'relative' } },
            h('button', {
              type: 'button',
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flex: '1',
                minWidth: 0,
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
              },
              'aria-expanded': !isCollapsed,
              title: workspace.path,
              onClick: () => setCollapsed({ ...collapsed, [workspace.workspaceId]: !isCollapsed }),
            },
            h('span', {
              style: {
                ...iconStyle,
                color: isCollapsed ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-state-success-primary)',
              },
            }, h(WorkspaceIcon, { name: badge?.icon ?? 'folder', size: 16 })),
            h('span', { style: workspaceTitleStyle }, title),
            ),
            h('span', {
              style: {
                flex: 'none',
                fontSize: '10px',
                lineHeight: '16px',
                color: 'var(--dsw-alias-label-secondary)',
                fontVariantNumeric: 'tabular-nums',
              },
            }, String(sessionIds.length)),
            workspaceStatus === 'idle' ? null : h(StatusDot, { kind: workspaceStatus }),
            badge?.badge ? h('span', { style: badgeStyle(badge.color) }, badge.badge) : null,
            h('button', {
              type: 'button',
              style: actionStyle,
              title: t('browser.newSession'),
              'aria-label': t('browser.newSession'),
              onClick: () => startSession(workspace.workspaceId),
            }, '+'),
            h('button', {
              type: 'button',
              style: actionStyle,
              title: t('browser.more'),
              'aria-label': t('browser.more'),
              'aria-expanded': menuOpen,
              onClick: () => {
                setMenuFor(menuOpen ? null : workspace.workspaceId)
                setIconFor(null)
              },
            }, '⋯'),
            menuOpen
              ? h('div', { style: moreMenuStyle, role: 'menu' },
                  h('button', {
                    type: 'button',
                    role: 'menuitem',
                    style: menuItemStyle,
                    onClick: () => {
                      setMenuFor(null)
                      setIconFor(workspace.workspaceId)
                    },
                  }, t('browser.changeIcon')),
                  h('button', {
                    type: 'button',
                    role: 'menuitem',
                    style: menuItemStyle,
                    onClick: () => {
                      setMenuFor(null)
                      setRenaming(workspace.workspaceId)
                      setRenameDraft(title)
                    },
                  }, t('browser.rename')),
                  h('button', {
                    type: 'button',
                    role: 'menuitem',
                    style: menuItemStyle,
                    onClick: () => {
                      setMenuFor(null)
                      if (window.confirm(t('browser.deleteConfirm', { title }))) void deleteWorkspace(workspace.workspaceId).catch(() => {})
                    },
                  }, t('browser.delete')),
                )
              : null,
            iconOpen
              ? h('div', { style: iconPopoverStyle, role: 'dialog', 'aria-label': t('browser.changeIcon') },
                  Object.keys(LUCIDE).map((name) => h('button', {
                    key: name,
                    type: 'button',
                    style: iconChoiceStyle(badge?.icon === name),
                    title: name,
                    'aria-label': name,
                    onClick: () => setIcon(workspace, name),
                  }, h(WorkspaceIcon, { name, size: 18 }))),
                )
              : null,
          ),
          renaming === workspace.workspaceId
            ? h('input', {
                style: searchStyle,
                value: renameDraft,
                autoFocus: true,
                'aria-label': t('browser.renamePrompt'),
                onChange: (event) => setRenameDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape') {
                    setRenaming(null)
                    return
                  }
                  if (event.key !== 'Enter') return
                  const next = renameDraft.trim()
                  if (next === '') return
                  setRenaming(null)
                  void renameWorkspace(workspace.workspaceId, next).catch(() => {})
                },
                onBlur: () => setRenaming(null),
              })
            : null,
          isCollapsed ? null : visibleSessions.map((id) => {
                const status = statuses.get(id)
                return h('button', {
                  key: id,
                  type: 'button',
                  className: 'dsh-enhance-row',
                  style: { ...sessionRowStyle, paddingLeft: (indent ? 10 : 0) + 12 + 'px' },
                  onClick: () => openSession(id),
                },
                h('span', { style: { width: '12px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h(StatusDot, { kind: statusKind(status) })),
                h('span', { style: sessionTitleStyle }, String(sessions.byId[id]?.displayTitle ?? id)),
                h('span', { style: timeStyle }, relativeTime(sessions.byId[id]?.updatedAt)),
                h('span', {
                  role: 'button',
                  tabIndex: 0,
                  className: 'dsh-enhance-session-action',
                  style: sessionActionStyle,
                  title: t('browser.deleteSession'),
                  'aria-label': t('browser.deleteSession'),
                  onClick: (event) => {
                    event.stopPropagation()
                    removeSession(id)
                  },
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      removeSession(id)
                    }
                  },
                }, h(WorkspaceIcon, { name: 'trash-2', size: 13 })),
                )
              }),
        )
      }

      const rows = []
      for (const group of activeGroups) {
        const members = (group.workspaces ?? []).map((path) => byPath.get(path)).filter((workspace) => workspace !== undefined)
        if (members.length === 0) continue
        rows.push(h('div', { key: 'group:' + group.id, className: 'dsh-enhance-group', style: groupStyle },
          h('div', { className: 'dsh-enhance-row', style: { ...workspaceRowStyle, paddingLeft: '8px', position: 'relative' } },
            h('span', { style: workspaceTitleStyle }, group.title),
            h('span', { style: { flex: 'none', fontSize: '10px', color: 'var(--dsw-alias-label-secondary)' } }, String(members.length)),
          ),
          members.map((workspace) => renderWorkspace(workspace, true)),
        ))
      }
      for (const workspace of workspaces) {
        if (groupedPaths.has(workspace.path)) continue
        const row = renderWorkspace(workspace, false)
        if (row !== null) rows.push(row)
      }

      return h('div', { style: browserRootStyle },
        h('style', null, browserCss),
        h('div', { style: browserHeaderStyle },
          h('span', { style: browserTitleStyle }, t('browser.title')),
          h('button', {
            type: 'button',
            style: actionStyle,
            title: t('browser.collapseAll'),
            'aria-label': t('browser.collapseAll'),
            onClick: () => {
              const next = {}
              for (const workspace of workspaces) {
                const running = workspace.sessionIds.some((id) => statusKind(statuses.get(id)) === 'running')
                if (!running) next[workspace.workspaceId] = true
              }
              setCollapsed(next)
            },
          }, '⊟'),
          h('button', {
            type: 'button',
            style: headerAddStyle,
            title: t('browser.add'),
            'aria-label': t('browser.add'),
            onClick: () => {
              void pickDirectory().then((path) => {
                if (path !== null) void createWorkspace(path).catch(() => {})
              }).catch(() => {})
            },
          }, '+'),
        ),
        h('input', {
          style: searchStyle,
          type: 'search',
          value: query,
          placeholder: t('browser.search'),
          'aria-label': t('browser.search'),
          onChange: (event) => setQuery(event.target.value),
        }),
        h('div', { style: browserListStyle },
          rows.length === 0 ? h('div', { style: browserEmptyStyle }, t('browser.empty')) : rows,
        ),
      )
    }

    function ShadowBrowserBoundary(props) {
      return h(Boundary, { onCrash: props.onCrash }, h(ShadowBrowser, props))
    }

    const EDITOR_ID = '@local/dsh-enhance/editor'
    const EDITOR_API = '/dsh-enhance/editors'
    const editorPaneStyle = {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      height: '100%',
      minHeight: 0,
      padding: '14px',
      overflow: 'auto',
      background: 'var(--dsw-alias-bg-base)',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
    }
    const editorHeaderStyle = { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }
    const editorCwdStyle = {
      marginLeft: 'auto',
      maxWidth: '62%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '2px 8px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: '999px',
      fontSize: '11px',
      color: 'var(--dsw-alias-label-secondary)',
    }
    const editorGridStyle = {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
      gap: '8px',
    }
    const editorCardStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-md)',
      background: 'var(--dsw-alias-bg-layer-2)',
      color: 'inherit',
      font: 'inherit',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'border-color 0.15s, background 0.15s',
    }
    const editorIconStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '30px',
      height: '30px',
      flex: 'none',
      borderRadius: '8px',
      border: '1px solid var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-layer-3)',
      color: 'var(--dsw-alias-label-secondary)',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    }
    const editorMetaStyle = { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' }
    const editorCardCss = `
      .dsh-editor-card:hover:not(:disabled) {
        border-color: var(--dsw-alias-state-business-primary);
        background: var(--dsw-alias-bg-layer-3);
      }
      .dsh-editor-card:focus-visible {
        outline: 2px solid var(--dsw-alias-state-business-primary);
        outline-offset: 1px;
      }
      .dsh-editor-shutdown {
        position: absolute;
        top: 4px;
        right: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 6px;
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        line-height: 1;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.12s, color 0.12s, border-color 0.12s;
      }
      .dsh-editor-card-wrap:hover .dsh-editor-shutdown,
      .dsh-editor-card-wrap:focus-within .dsh-editor-shutdown {
        opacity: 1;
      }
      .dsh-editor-shutdown:hover {
        color: var(--dsw-alias-state-error-primary);
        border-color: var(--dsw-alias-state-error-primary);
      }
      .dsh-editor-shutdown:focus-visible {
        opacity: 1;
        outline: 2px solid var(--dsw-alias-state-business-primary);
        outline-offset: 1px;
      }
      @media (hover: none) {
        .dsh-editor-shutdown { opacity: 1; }
      }
      .dsh-editor-chip {
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 6px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 11px;
        line-height: 16px;
        padding: 2px 8px;
        cursor: pointer;
      }
      .dsh-editor-chip:hover {
        background: var(--dsw-alias-interactive-bg-hover);
        color: var(--dsw-alias-label-primary);
      }
    `

    function workspacePathFor(sessionId) {
      try {
        const items = workspacesService?.list?.getSnapshot?.()?.items
        if (!Array.isArray(items)) return undefined
        const hit = items.find((workspace) => Array.isArray(workspace.sessionIds) && workspace.sessionIds.includes(sessionId))
        return typeof hit?.path === 'string' ? hit.path : undefined
      } catch {
        return undefined
      }
    }

    function shortPath(path) {
      if (typeof path !== 'string' || path === '') return ''
      return path.replace(/^\/Users\/[^/]+/u, '~')
    }

    // The picker is the home view: nothing starts until a card is clicked, and a
    // running editor is re-attached from its card instead of being restarted.
    function EditorBody({ t, sessionId }) {
      const [status, setStatus] = React.useState(null)
      const [frame, setFrame] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [busy, setBusy] = React.useState(null)
      const [keysThrough, setKeysThrough] = React.useState(false)
      const iframeRef = React.useRef(null)
      const cwd = workspacePathFor(sessionId)

      const refresh = React.useCallback(() => {
        void fetch(EDITOR_API)
          .then((response) => response.json())
          .then((data) => {
            if (data !== null && typeof data === 'object') setStatus(data)
          })
          .catch((failure) => setError(String(failure)))
      }, [])

      React.useEffect(() => {
        refresh()
        const timer = setInterval(refresh, 5000)
        return () => clearInterval(timer)
      }, [refresh])

      React.useEffect(() => {
        const onFocusIn = (event) => {
          if (iframeRef.current !== null && event.target === iframeRef.current) setKeysThrough(true)
        }
        const onFocusOut = (event) => {
          if (iframeRef.current !== null && event.target === iframeRef.current) setKeysThrough(false)
        }
        const syncKeysThrough = () => setKeysThrough(iframeRef.current !== null && document.activeElement === iframeRef.current)
        const onWindowBlur = syncKeysThrough
        const onWindowFocus = syncKeysThrough
        document.addEventListener('focusin', onFocusIn)
        document.addEventListener('focusout', onFocusOut)
        window.addEventListener('blur', onWindowBlur)
        window.addEventListener('focus', onWindowFocus)
        return () => {
          document.removeEventListener('focusin', onFocusIn)
          document.removeEventListener('focusout', onFocusOut)
          window.removeEventListener('blur', onWindowBlur)
          window.removeEventListener('focus', onWindowFocus)
        }
      }, [])

      // While the IDE owns the keyboard, DSH stops intercepting shortcuts so every key reaches it.
      React.useEffect(() => {
        if (shortcutsService === null || typeof shortcutsService.recording !== 'function') return
        void Promise.resolve(shortcutsService.recording(keysThrough)).catch(() => {})
        return () => { void Promise.resolve(shortcutsService.recording(false)).catch(() => {}) }
      }, [keysThrough])

      const open = async (editor) => {
        setBusy(editor.id)
        setError(null)
        try {
          const response = await fetch(EDITOR_API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'start', editor: editor.id, cwd }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error ?? 'start failed')
          if (data.native === true) setFrame({ native: true, label: data.label ?? editor.label })
          else setFrame({ editorId: editor.id, label: editor.label, url: data.url })
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(null)
        }
      }

      const shutdown = async (editorId) => {
        setBusy(editorId)
        setError(null)
        try {
          const response = await fetch(EDITOR_API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'stop', editorId }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error ?? 'stop failed')
          setFrame((current) => (current !== null && current.editorId === editorId ? null : current))
          refresh()
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(null)
        }
      }

      const styleTag = h('style', {}, editorCardCss)

      if (frame !== null && frame.url !== undefined) {
        return h('div', {
          style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: 0, height: '100%' },
        },
        styleTag,
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 'none',
            padding: '6px 10px',
            borderBottom: '1px solid var(--dsw-alias-border-l2)',
          },
        },
        h('span', {
          style: { fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        }, frame.label),
        h('span', { style: { flex: '1' } }),
        h('button', {
          type: 'button',
          className: 'dsh-editor-chip',
          onClick: () => setFrame(null),
        }, t('editor.switch')),
        h('button', {
          type: 'button',
          className: 'dsh-editor-chip',
          disabled: busy !== null,
          onClick: () => { void shutdown(frame.editorId) },
        }, t('editor.shutdown'))),
        h('iframe', {
          ref: iframeRef,
          src: frame.url,
          title: t('editor.frame'),
          allow: 'clipboard-read; clipboard-write; fullscreen',
          style: { flex: '1', width: '100%', minHeight: 0, border: 'none', background: '#17191d' },
        }))
      }

      if (frame !== null && frame.native === true) {
        return h('div', { style: editorPaneStyle },
          styleTag,
          h('div', { style: { fontSize: '13px' } }, t('editor.nativeOpened').replace('{label}', frame.label)),
          h('button', {
            type: 'button',
            onClick: () => setFrame(null),
            style: { ...editorCardStyle, width: 'fit-content' },
          }, t('editor.back')),
        )
      }

      const editors = status !== null && Array.isArray(status.editors) ? status.editors : []
      const running = new Set(status !== null && Array.isArray(status.running) ? status.running.map((item) => item.editorId) : [])
      return h('div', { style: editorPaneStyle },
        styleTag,
        h('div', { style: editorHeaderStyle },
          h('span', { style: { fontSize: '13px', fontWeight: 600 } }, t('editor.title')),
          cwd !== undefined ? h('span', { style: editorCwdStyle, title: cwd }, shortPath(cwd)) : null,
          h('button', {
            type: 'button',
            title: t('editor.refresh'),
            'aria-label': t('editor.refresh'),
            onClick: refresh,
            style: { ...editorCardStyle, padding: '4px 8px', width: 'fit-content', fontSize: '12px' },
          }, '↻'),
        ),
        h('div', { style: editorMetaStyle }, t('editor.intro')),
        error !== null
          ? h('div', { role: 'alert', style: { fontSize: '12px', color: 'var(--dsw-alias-state-error-primary)' } }, error)
          : null,
        editors.length === 0
          ? h('div', { style: editorMetaStyle }, status === null ? t('editor.starting') : t('editor.hint'))
          : h('div', { style: editorGridStyle }, editors.map((editor) => {
              const isRunning = running.has(editor.id)
              const dot = isRunning
                ? 'var(--dsw-alias-state-business-primary)'
                : editor.available === true ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-border-l3)'
              return h('div', {
                key: editor.id,
                className: 'dsh-editor-card-wrap',
                style: { position: 'relative' },
              },
              h('button', {
                type: 'button',
                className: 'dsh-editor-card',
                disabled: editor.available !== true || busy !== null,
                title: editor.available === true ? editor.label : (editor.reason ?? t('editor.unavailable')),
                onClick: () => { if (editor.available === true) void open(editor) },
                style: {
                  ...editorCardStyle,
                  width: '100%',
                  paddingRight: isRunning ? '30px' : '10px',
                  cursor: editor.available === true ? 'pointer' : 'not-allowed',
                  opacity: editor.available === true ? 1 : 0.55,
                },
              },
              h('span', { style: editorIconStyle }, editor.icon ?? editor.label.slice(0, 2)),
              h('span', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                h('span', { style: { fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, editor.label),
                h('span', { style: editorMetaStyle },
                  busy === editor.id ? t('editor.starting')
                    : isRunning ? t('editor.running')
                      : editor.available === true ? t('editor.type.' + editor.type)
                        : (editor.reason ?? t('editor.unavailable'))),
              ),
              h('span', { style: { width: '7px', height: '7px', flex: 'none', borderRadius: '50%', background: dot } }),
              ),
              isRunning
                ? h('button', {
                  type: 'button',
                  className: 'dsh-editor-shutdown',
                  title: t('editor.shutdown'),
                  'aria-label': t('editor.shutdownLabel').replace('{label}', editor.label),
                  disabled: busy !== null,
                  onClick: (event) => {
                    event.stopPropagation()
                    void shutdown(editor.id)
                  },
                }, '\u23fb')
                : null)
            })),
        h('div', { style: { marginTop: 'auto', ...editorMetaStyle } }, t('editor.hint')),
      )
    }

    const inject = ['slots', 'locale', 'uiWorkspace', 'workspaces', 'sidebarRight', 'sidebarRightTabs', 'shortcuts']

    function DecoratorStyle() {
      const [decorators, setDecorators] = React.useState({ tools: {}, variants: {} })
      React.useEffect(() => {
        void fetch('/dsh-enhance/decorators')
          .then((response) => response.json())
          .then((data) => {
            if (data === null || typeof data !== 'object') return
            setDecorators({
              tools: data.tools !== null && typeof data.tools === 'object' ? data.tools : {},
              variants: data.variants !== null && typeof data.variants === 'object' ? data.variants : {},
            })
          })
          .catch(() => {})
      }, [])
      return h('style', { 'data-dsh-enhance-decorators': '' }, decoratorCss(decorators))
    }

    function SettingsPage({ t }) {
      const [config, setConfig] = React.useState(null)
      const [saving, setSaving] = React.useState(false)

      React.useEffect(() => {
        void fetch('/dsh-enhance/config')
          .then((response) => response.json())
          .then((data) => setConfig(data !== null && typeof data === 'object' ? data : {}))
          .catch(() => setConfig({}))
      }, [])

      const toggle = (key) => {
        const next = { ...config, [key]: config[key] !== true }
        setConfig(next)
        setSaving(true)
        void fetch('/dsh-enhance/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(next),
        }).finally(() => setSaving(false))
      }

      if (config === null) {
        return h('div', { style: { padding: '16px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, t('settings.loading'))
      }

      const rows = [
        ['customLeftbar', t('settings.customLeftbar'), t('settings.customLeftbarHint')],
        ['globalBar', t('settings.globalBar'), t('settings.globalBarHint')],
        ['virtualGroups', t('settings.virtualGroups'), t('settings.virtualGroupsHint')],
        ['splitPanes', t('settings.splitPanes'), t('settings.splitPanesHint')],
      ]

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px' } },
        h('h2', { style: { margin: '0 0 8px', fontSize: '16px', fontWeight: 600 } }, t('settings.title')),
        rows.map(([key, label, hint]) => h(
          'div',
          {
            key,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l2)',
            },
          },
          h(
            'div',
            { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: '13px' } }, label),
            h('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } }, hint),
          ),
          h(
            'button',
            {
              type: 'button',
              role: 'switch',
              'aria-checked': config[key] === true,
              'aria-label': label,
              disabled: saving,
              onClick: () => toggle(key),
              style: {
                position: 'relative',
                width: '36px',
                height: '20px',
                flex: 'none',
                border: 'none',
                borderRadius: '10px',
                background: config[key] === true ? 'var(--dsw-alias-state-business-primary)' : 'var(--dsw-alias-border-l3)',
                cursor: 'pointer',
                padding: 0,
              },
            },
            h('span', {
              style: {
                position: 'absolute',
                top: '2px',
                left: config[key] === true ? '18px' : '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.15s',
              },
            }),
          ),
        )),
        h('div', { style: { marginTop: '8px', fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } }, t('settings.reload')),
      )
    }

    function apply(ctx) {
      sidebarRight = ctx.sidebarRight
      workspacesService = ctx.workspaces
      shortcutsService = ctx.shortcuts
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-enhance: dictionaries')
      const t = ctx.locale.bind(NS)

      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.dshEnhance = 'rightbar-focus'
        style.textContent = '[data-sidebar-right-panel]:focus-within{box-shadow:inset 0 0 0 2px var(--dsw-alias-state-success-primary,#2ea043);}'
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-enhance: rightbar focus ring')

      ctx.effect(
        () => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'dsh-enhance.decorators',
        }, DecoratorStyle)),
        'dsh-enhance: decorators',
      )
      ctx.effect(
        () => ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-enhance',
          order: 50,
          label: () => t('settings.title'),
          locale: NS,
        }, SettingsPage)),
        'dsh-enhance: settings',
      )

      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: EDITOR_ID,
        kind: 'editor',
        multiple: true,
        keepMounted: true,
        title: () => t('editor.title'),
        guide: [{
          id: 'editor',
          order: 10,
          title: () => t('editor.card'),
          description: () => t('editor.cardHint'),
        }],
      }), 'dsh-enhance: editor tab type')
      ctx.effect(
        () => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: EDITOR_ID,
          locale: NS,
        }, EditorBody)),
        'dsh-enhance: editor tab body',
      )

      const inGlobal = (target) => target !== undefined && target !== null
        && typeof target.closest === 'function'
        && target.closest('[data-dsh-enhance-global]') !== null

      ctx.effect(() => ctx.shortcuts.register({
        id: 'dsh-enhance.newTab',
        label: () => t('global.newTab'),
        aliases: ['new global tab'],
        defaults: {
          'desktop:macos': { code: 'KeyT', modifiers: ['primary', 'shift'] },
          'desktop:windows': { code: 'KeyT', modifiers: ['primary', 'shift'] },
          'desktop:linux': { code: 'KeyT', modifiers: ['primary', 'shift'] },
          'web:macos': { code: 'KeyT', modifiers: ['primary', 'shift'] },
          'web:windows': { code: 'KeyT', modifiers: ['primary', 'shift'] },
        },
        regions: ['page', 'editable', 'terminal'],
        modals: [],
        resolve: () => {
          if (featureConfig.globalBar === false) return { status: 'blocked', reason: t('global.noFocus') }
          return {
            status: 'handled',
            run: () => {
              const shell = dockStore.get().shells[0]?.path
              if (shell === undefined) return
              void dockStore.create(shell).then((created) => {
                if (created !== undefined) addGlobalTab({ id: created.id, kind: 'terminal', title: created.title, url: created.url })
              })
            },
          }
        },
      }), 'dsh-enhance: new tab shortcut')

      ctx.effect(() => ctx.shortcuts.register({
        id: 'dsh-enhance.closeTab',
        label: () => t('global.closeTab'),
        aliases: ['close global tab'],
        defaults: {
          'desktop:macos': { code: 'KeyW', modifiers: ['primary', 'shift'] },
          'desktop:windows': { code: 'KeyW', modifiers: ['primary', 'shift'] },
          'desktop:linux': { code: 'KeyW', modifiers: ['primary', 'shift'] },
          'web:macos': { code: 'KeyW', modifiers: ['primary', 'shift'] },
          'web:windows': { code: 'KeyW', modifiers: ['primary', 'shift'] },
        },
        regions: ['page', 'editable', 'terminal'],
        modals: [],
        resolve: ({ target }) => {
          if (!inGlobal(target)) return { status: 'blocked', reason: t('global.noFocus') }
          const state = globalStore.get()
          const tab = state.tabs.find((item) => item.id === state.active) ?? state.tabs[0]
          if (tab === undefined) return { status: 'blocked', reason: t('global.noTab') }
          return { status: 'handled', run: () => closeGlobalTab(tab) }
        },
      }), 'dsh-enhance: close tab shortcut')

      ctx.effect(
        () => ctx.slots.inject('shell.bottom', () => ctx.slots.register({
          name: 'shell.bottom',
          id: 'dsh-enhance.global-bar',
          locale: NS,
        }, GlobalBar)),
        'dsh-enhance: global bar',
      )

      // Bare `/enhance` opens the subcommand picker; a typed `/enhance <sub>`
      // never reaches this decoration and goes straight to the host handler.
      ctx.inject(['commandUi', 'sessions'], (scope) => {
        const commandUi = scope.commandUi
        const sessions = scope.sessions
        const submit = async (session, line) => {
          const live = sessions.binding(session.sessionId)?.session
          if (live === undefined) throw new Error(t('command.noSession'))
          const result = await live.command(line)
          if (!result.ok) throw new Error(result.error.message)
          if (!result.value.matched) throw new Error(t('command.noCommand'))
        }
        scope.effect(() => commandUi.decorate({
          name: 'enhance',
          available: () => true,
          ui: {
            kind: 'popupSelect',
            searchLabels: () => ({
              placeholder: t('command.search'),
              empty: t('command.empty'),
              noResults: t('command.noResults'),
            }),
            options: async () => [
              { id: 'terminal', label: t('command.terminal'), detail: t('command.terminalDetail'), group: { name: 'open', label: t('command.groupOpen') } },
              { id: 'editor', label: t('command.editor'), detail: t('command.editorDetail'), group: { name: 'open', label: t('command.groupOpen') } },
              { id: 'status', label: t('command.status'), detail: t('command.statusDetail'), group: { name: 'host', label: t('command.groupHost') } },
              { id: 'config', label: t('command.config'), detail: t('command.configDetail'), group: { name: 'host', label: t('command.groupHost') } },
            ],
            onSelect: (option, session) => {
              if (option.id === 'terminal') {
                return (async () => {
                  await dockStore.refresh()
                  const shell = dockStore.get().shells[0]?.path
                  if (shell === undefined) throw new Error(t('dock.missingTtyd'))
                  const created = await dockStore.create(shell)
                  if (created !== undefined) addGlobalTab({ id: created.id, kind: 'terminal', title: created.title, url: created.url })
                })()
              }
              if (option.id === 'editor') {
                sidebarRight.openTab('editor')
                return
              }
              return submit(session, `/enhance ${option.id}`)
            },
          },
        }), 'dsh-enhance: /enhance decoration')
      })

      const registerBrowser = (settings) => {
        let disposeShadow = null
        void fetch('/dsh-enhance/badges')
          .then((response) => response.json())
          .then((config) => {
            if (config === null || typeof config !== 'object' || config.shadowBrowser !== true) return
            const badges = config.workspaces !== null && typeof config.workspaces === 'object' ? config.workspaces : {}
            disposeShadow = ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
              name: 'sidebar.workspaces',
              id: 'dsh-enhance.browser',
              locale: NS,
              priority: -1,
              inject: () => ({
                openSession: (id) => ctx.uiWorkspace.openSession(id),
                startSession: (id) => ctx.uiWorkspace.startSession(id),
                renameWorkspace: (id, title) => ctx.workspaces.rename(id, title),
                deleteWorkspace: (id) => ctx.workspaces.delete(id),
                archiveSession: (id, stop) => ctx.workspaces.archiveSession(id, stop === true ? { stopActivity: true } : undefined),
                createWorkspace: (path) => ctx.workspaces.create({ path }),
                pickDirectory: () => ctx.uiWorkspace.pickDirectory(),
                badges,
                virtualGroups: settings.virtualGroups !== false,
                onCrash: () => {
                  try {
                    disposeShadow?.()
                  } catch {
                    // already disposed
                  }
                  disposeShadow = null
                },
              }),
            }, ShadowBrowserBoundary))
          })
          .catch(() => {})
      }

      void fetch('/dsh-enhance/config')
        .then((response) => response.json())
        .then((config) => {
          const settings = config !== null && typeof config === 'object' ? config : {}
          featureConfig.splitPanes = settings.splitPanes !== false
          featureConfig.globalBar = settings.globalBar !== false
          if (settings.customLeftbar !== false) registerBrowser(settings)
        })
        .catch(() => {
          registerBrowser({})
        })
    }

    export { apply, inject }
