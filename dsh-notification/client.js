/**
 * Notification bell: one footer action above the account launcher, with a
 * fixed popover that lists notifications and runs their actions.
 *
 * The Host owns the list and the meaning of every action; this module only
 * renders and posts.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-notification',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dshNotification'
    const API = '/dsh-notification'
    const POLL_MS = 5000
    let layout = null

    const en = {
      'meta.title': 'Notifications',
      'meta.description': 'A bell above the account launcher that lists notifications from plugins, with their actions.',
      'bell': 'Notifications',
      'title': 'Notifications',
      'empty': 'No notifications',
      'markAll': 'Mark all read',
      'dismiss': 'Dismiss',
      'confirm': 'Confirm',
      'choose': 'Choose workspace',
      'error': 'The action failed.',
      'unread': '{count} unread',
    }

    const zh = {
      'meta.title': '通知',
      'meta.description': '账户入口上方的通知铃铛，列出插件推送的通知及其操作。',
      'bell': '通知',
      'title': '通知',
      'empty': '没有通知',
      'markAll': '全部标为已读',
      'dismiss': '关闭',
      'confirm': '确认',
      'choose': '选择工作区',
      'error': '操作失败。',
      'unread': '{count} 条未读',
    }

    const CSS = `
.dshn-root { position: relative; display: flex; width: 100%; }
.dshn-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  width: calc(100% + 4px); height: 42px; margin: 0 -2px; padding: 0 10px 0 8px;
  border: none; border-radius: 12px; background: transparent;
  color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 14px;
  cursor: pointer; overflow: hidden;
}
@media (hover: hover) { .dshn-trigger:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dshn-trigger[aria-expanded="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.dshn-icon { flex: none; display: inline-flex; }
.dshn-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshn-badge {
  flex: none; margin-left: auto; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-label-inverse, #fff); font-size: 11px; line-height: 18px;
  text-align: center; font-variant-numeric: tabular-nums;
}
.dshn-rail .dshn-trigger { justify-content: center; gap: 0; width: 36px; height: 36px; padding: 0; border-radius: 50%; }
.dshn-rail .dshn-label { display: none; }
.dshn-rail .dshn-badge { position: absolute; top: 2px; right: 2px; margin: 0; min-width: 14px; height: 14px; line-height: 14px; font-size: 10px; }
.dshn-panel {
  position: fixed; z-index: 40; display: flex; flex-direction: column;
  width: 380px; max-width: calc(100vw - 24px); max-height: 60vh; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px;
  background: var(--dsw-specific-menu, var(--dsw-alias-bg-l1));
  box-shadow: var(--dsw-elevation-prominent);
  outline: none;
}
.dshn-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; padding: 10px 12px; }
.dshn-head-title { font-size: 14px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dshn-link { border: none; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.dshn-link:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshn-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 12px 12px; }
.dshn-empty { margin: 8px 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dshn-item { display: flex; flex-direction: column; gap: 6px; padding: 10px; margin-bottom: 8px; border-radius: 10px; background: var(--dsw-alias-bg-l2); }
.dshn-item.dshn-unread { box-shadow: inset 2px 0 0 var(--dsw-alias-state-error-primary); }
.dshn-item-head { display: flex; align-items: flex-start; gap: 8px; }
.dshn-item-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 500; line-height: 18px; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshn-x { flex: none; border: none; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 16px; line-height: 16px; cursor: pointer; padding: 0 2px; border-radius: 4px; }
.dshn-x:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dshn-item-body { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dshn-actions, .dshn-choice { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.dshn-btn { border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 16px; padding: 4px 10px; border-radius: 8px; cursor: pointer; }
.dshn-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshn-btn.primary { background: var(--dsw-alias-button-primary-fill); border-color: transparent; color: var(--dsw-alias-label-primary-inverted, #fff); }
.dshn-btn.primary:hover { background: var(--dsw-alias-button-primary-hover); }
.dshn-btn:disabled { opacity: 0.5; cursor: default; }
.dshn-select { flex: 1; min-width: 0; height: 28px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-l1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; padding: 0 6px; }
.dshn-error { margin: 0 0 8px; font-size: 12px; color: var(--dsw-alias-state-error-primary); }
`

    function BellIcon() {
      return h('svg', {
        viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
        strokeLinejoin: 'round', 'aria-hidden': true, className: 'dshn-icon',
      },
      h('path', { d: 'M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7' }),
      h('path', { d: 'M10.3 20a2 2 0 0 0 3.4 0' }))
    }

    function Bell(props) {
      const { wide, t } = props
      const [data, setData] = React.useState({ items: [], unread: 0 })
      const [open, setOpen] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const [choice, setChoice] = React.useState({})
      const [anchor, setAnchor] = React.useState(null)
      const rootRef = React.useRef(null)
      const panelRef = React.useRef(null)
      const triggerRef = React.useRef(null)

      const refresh = React.useCallback(() => {
        fetch(`${API}/list`)
          .then(response => (response.ok ? response.json() : null))
          .then((payload) => {
            if (payload === null || typeof payload !== 'object') return
            setData({
              items: Array.isArray(payload.items) ? payload.items : [],
              unread: Number(payload.unread) || 0,
            })
          })
          .catch(() => {})
      }, [])

      React.useEffect(() => {
        refresh()
        const timer = setInterval(refresh, POLL_MS)
        return () => clearInterval(timer)
      }, [refresh])

      React.useEffect(() => {
        if (!open) return undefined
        const place = () => {
          const rect = rootRef.current === null ? null : rootRef.current.getBoundingClientRect()
          if (rect !== null) setAnchor({ left: rect.left, bottom: window.innerHeight - rect.top + 8 })
        }
        place()
        panelRef.current?.focus()
        window.addEventListener('resize', place)
        const close = () => {
          setOpen(false)
          triggerRef.current?.focus()
        }
        const onPointerDown = (event) => {
          if (rootRef.current !== null && !rootRef.current.contains(event.target)) close()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') close()
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          window.removeEventListener('resize', place)
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [open])

      const post = async (body) => {
        setBusy(true)
        setError('')
        try {
          const response = await fetch(`${API}/act`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          })
          const payload = await response.json()
          if (payload.ok !== true) setError(payload.error || t('error'))
          else if (typeof payload.result?.panel === 'string') layout?.selectPanel(payload.result.panel)
          refresh()
          return payload
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
          return { ok: false }
        } finally {
          setBusy(false)
        }
      }

      const label = t('bell')
      const items = data.items

      return h('div', { ref: rootRef, className: wide ? 'dshn-root' : 'dshn-root dshn-rail' },
        h('button', {
          ref: triggerRef,
          type: 'button',
          className: 'dshn-trigger',
          'aria-label': data.unread > 0 ? `${label} (${data.unread})` : label,
          'aria-expanded': open,
          title: label,
          onClick: () => setOpen(value => !value),
        },
        h(BellIcon),
        wide ? h('span', { className: 'dshn-label' }, label) : null,
        data.unread > 0
          ? h('span', { className: 'dshn-badge' }, data.unread > 99 ? '99+' : String(data.unread))
          : null),

        open && anchor !== null
          ? h('div', {
            ref: panelRef,
            className: 'dshn-panel',
            role: 'dialog',
            'aria-label': t('title'),
            tabIndex: -1,
            style: { left: `${anchor.left}px`, bottom: `${anchor.bottom}px` },
          },
          h('div', { className: 'dshn-head' },
            h('span', { className: 'dshn-head-title' }, t('title')),
            items.length > 0
              ? h('button', {
                type: 'button',
                className: 'dshn-link',
                disabled: busy,
                onClick: () => { void post({ op: 'readAll' }) },
              }, t('markAll'))
              : null),
          h('div', { className: 'dshn-body' },
            error === '' ? null : h('p', { className: 'dshn-error' }, error),
            items.length === 0
              ? h('p', { className: 'dshn-empty' }, t('empty'))
              : items.map(item => h('div', {
                key: item.id,
                className: item.read === true ? 'dshn-item' : 'dshn-item dshn-unread',
              },
              h('div', { className: 'dshn-item-head' },
                h('span', { className: 'dshn-item-title' }, item.title),
                h('button', {
                  type: 'button',
                  className: 'dshn-x',
                  'aria-label': t('dismiss'),
                  title: t('dismiss'),
                  onClick: () => { void post({ op: 'dismiss', id: item.id }) },
                }, '\u00d7')),
              item.body === '' ? null : h('p', { className: 'dshn-item-body' }, item.body),
              Array.isArray(item.options) && item.options.length > 0
                ? h('div', { className: 'dshn-choice' },
                  h('select', {
                    className: 'dshn-select',
                    'aria-label': t('choose'),
                    value: choice[item.id] ?? item.options[0].value,
                    onChange: event => setChoice(current => ({ ...current, [item.id]: event.target.value })),
                  }, item.options.map(option => h('option', { key: option.value, value: option.value }, option.label))),
                  h('button', {
                    type: 'button',
                    className: 'dshn-btn primary',
                    disabled: busy,
                    onClick: () => {
                      void post({
                        id: item.id,
                        actionId: 'choose',
                        value: choice[item.id] ?? item.options[0].value,
                      })
                    },
                  }, item.confirmLabel || t('confirm')))
                : null,
              Array.isArray(item.actions) && item.actions.length > 0
                ? h('div', { className: 'dshn-actions' }, item.actions.map(action => h('button', {
                  key: action.id,
                  type: 'button',
                  className: 'dshn-btn',
                  disabled: busy,
                  onClick: () => { void post({ id: item.id, actionId: action.id }) },
                }, action.label)))
                : null))))
          : null)
    }

    function apply(ctx) {
      layout = ctx.layout
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-notification: dictionaries')
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.dshNotification = 'bell'
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-notification: styles')
      ctx.effect(() => ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'dsh-notification.bell',
        order: 20,
        locale: NS,
      }, Bell)), 'dsh-notification: bell')
    }

    return { inject: ['slots', 'locale', 'layout'], apply }
  },
})
