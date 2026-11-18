# Notifications

A bell in the sidebar footer, directly above the account launcher, that lists notifications other plugins push.

## What it does

- **Bell and badge** — the footer action shows the unread count. In the collapsed rail it is an icon with a corner badge.
- **Popover** — a fixed panel anchored to the bell lists every notification, newest first. It stays open while you work and closes on an outside click.
- **Actions** — a notification may carry plain buttons, or a choice: a select plus a confirm button. The plugin that pushed the notification decides what each action does; the browser only posts the click.
- **Durable list** — items live in `notifications.json` beside the plugin, capped at 200. Dismissing removes an item; marking read keeps it.

## Host service

Other plugins push through the `notifications` service:

```js
const notifications = ctx.get('notifications')
const id = notifications.push({
  title: 'ENG-42 · Fix login',
  body: 'Added to the dsh workspace.',
  kind: 'linear',
  source: 'dsh-linear',
  actions: [{ id: 'open', label: 'Open board' }],
})
notifications.onAction(id, async (actionId, value) => {
  // Do the work. A thrown error is shown in the panel.
})
```

A choice notification passes `options: [{ value, label }]` and `confirmLabel`; its handler receives `actionId === 'choose'` and the selected value.

## HTTP routes

The browser half reads and acts through two same-origin routes:

| Route | Method | Body |
|---|---|---|
| `/dsh-notification/list` | GET | — |
| `/dsh-notification/act` | POST | `{ op: 'read' \| 'readAll' \| 'dismiss', id }` or `{ id, actionId, value }` |

## Limitations

- The browser polls every 5 seconds; there is no push channel.
- A handler is registered in memory by the pushing plugin. After a Host restart, a notification whose plugin did not re-register its handler reports `this notification has no handler` instead of acting.
- The list is a single JSON file, not a database. It is not meant for high volume.
