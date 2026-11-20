/**
 * Realtime turn graph for the conversation view ring.
 *
 * Data comes from the built-in Trajectory target (`useTrajectory`) and the
 * `todos` projection. React Flow owns pan, zoom, and edge rendering; the graph
 * shape itself is built by `flow-graph.ts`.
 */
import React from 'react'
import {
  Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import flowCss from '@xyflow/react/dist/style.css?inline'
import {
  buildFlowGraph, type FlowDetail, type FlowGraph, type FlowNodeData, type FlowPersistEvent, type FlowSnapshot,
  type FlowStatus, type FlowTodo,
} from './flow-graph'
import { MOCK_FLOW_SNAPSHOT, MOCK_FLOW_TODOS } from './flow-mock'

const h: any = React.createElement

type FlowTranslate = (key: string, params?: Record<string, string | number>) => string

interface FlowViewProps {
  t: FlowTranslate
  useTrajectory?: (selector: (value: unknown) => unknown) => unknown
  useProjection: (key: string, selector: (value: unknown) => unknown) => unknown
  useSessions: (selector: (value: unknown) => unknown) => unknown
  sessionId: string
}

interface FlowSessionsState {
  byId?: Record<string, { running?: boolean } | undefined>
}

interface FlowCardData extends FlowNodeData {
  onSelect?: (id: string) => void
  selectedId?: string | null
}

const ICON_PATHS: Record<string, string[]> = {
  route: ['M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0', 'M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4', 'M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5'],
  brain: ['M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8', 'M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8', 'M17.5 16a3.5 3.5 0 0 0 0 -7h-.5', 'M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0', 'M6.5 16a3.5 3.5 0 0 1 0 -7h.5', 'M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10'],
  search: ['M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6'],
  list: ['M3.5 5.5l1.5 1.5l2.5 -2.5', 'M3.5 11.5l1.5 1.5l2.5 -2.5', 'M3.5 17.5l1.5 1.5l2.5 -2.5', 'M11 6l9 0', 'M11 12l9 0', 'M11 18l9 0'],
  code: ['M7 8l-4 4l4 4', 'M17 8l4 4l-4 4', 'M14 4l-4 16'],
  test: ['M9 3l6 0', 'M10 9l4 0', 'M10 3v6l-4 11a.7 .7 0 0 0 .5 1h11a.7 .7 0 0 0 .5 -1l-4 -11v-6'],
  tool: ['M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5'],
  message: ['M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1'],
  user: ['M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0', 'M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2'],
  info: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 9h.01', 'M11 12h1v4h1'],
  alert: ['M12 9v4', 'M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0', 'M12 16h.01'],
  archive: ['M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2', 'M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10', 'M10 12l4 0'],
  terminal: ['M8 9l3 3l-3 3', 'M13 15l3 0', 'M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -12'],
  refresh: ['M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4', 'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4'],
  loader: ['M12 3a9 9 0 1 0 9 9'],
  check: ['M5 12l5 5l10 -10'],
  circle: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0'],
  close: ['M18 6l-12 12', 'M6 6l12 12'],
}

function FlowIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return h('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  }, ...(ICON_PATHS[name] ?? []).map((d, index) => h('path', { key: index, d })))
}

const FlowLocale = React.createContext<FlowTranslate>((key) => key)

function statusLabel(status: FlowStatus, t: FlowTranslate): string {
  if (status === 'running') return t('flow.running')
  if (status === 'error') return t('flow.failed')
  if (status === 'done') return t('flow.done')
  return t('flow.pending')
}

function statusIcon(status: FlowStatus, t: FlowTranslate) {
  if (status === 'running') {
    return h('span', { className: 'dsh-flow-status is-running', role: 'status', 'aria-label': t('flow.running') },
      h(FlowIcon, { name: 'loader', className: 'dsh-flow-spin' }))
  }
  if (status === 'error') {
    return h('span', { className: 'dsh-flow-status is-error', role: 'img', 'aria-label': t('flow.failed') },
      h(FlowIcon, { name: 'alert' }))
  }
  if (status === 'done') {
    return h('span', { className: 'dsh-flow-status is-done', role: 'img', 'aria-label': t('flow.done') },
      h(FlowIcon, { name: 'check' }))
  }
  return h('span', { className: 'dsh-flow-status is-idle', role: 'img', 'aria-label': t('flow.pending') },
    h(FlowIcon, { name: 'circle' }))
}

function TurnCard({ id, data, t }: { id: string; data: FlowCardData; t: FlowTranslate }) {
  const selected = data.selectedId === id
  const open = (): void => { data.onSelect?.(id) }
  return h('div', {
    className: `dsh-flow-turn-card nodrag nopan is-${data.status}${selected ? ' is-selected' : ''}`,
    role: 'button',
    tabIndex: 0,
    'aria-label': `${data.title}: ${data.detail ?? ''}`,
    onClick: open,
    onPointerDown: (event: React.PointerEvent) => { event.stopPropagation() },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    },
  },
  h(Handle, { type: 'source', position: Position.Right, className: 'dsh-flow-handle' }),
  h('div', { className: 'dsh-flow-turn-head' },
    h('span', { className: 'dsh-flow-turn-icon' }, h(FlowIcon, { name: data.icon, size: 18 })),
    h('span', { className: 'dsh-flow-turn-title' }, data.title),
    h('span', { className: 'dsh-flow-turn-phase' }, t('flow.phase.capture')),
    statusIcon(data.status, t),
  ),
  h('div', { className: 'dsh-flow-turn-prompt' }, data.detail ?? ''),
  data.meta === undefined || data.meta === '' ? null : h('div', { className: 'dsh-flow-turn-meta' }, data.meta),
  )
}

function TaskCard({ data, t }: { data: FlowCardData; t: FlowTranslate }) {
  const checks = data.checks ?? []
  const total = data.progress?.total ?? checks.length
  const done = data.progress?.done ?? 0
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const open = (): void => {
    if (data.detailId !== undefined) data.onSelect?.(data.detailId)
  }
  return h('div', { className: `dsh-flow-group-card is-${data.status}` },
    h(Handle, { type: 'target', position: Position.Left, className: 'dsh-flow-handle' }),
    h('div', {
      className: 'dsh-flow-group-head nodrag nopan',
      role: 'button',
      tabIndex: 0,
      'aria-label': data.title,
      onClick: open,
      onPointerDown: (event: React.PointerEvent) => { event.stopPropagation() },
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      },
    },
    h('div', { className: 'dsh-flow-group-head-row' },
      h('span', { className: 'dsh-flow-group-icon' }, h(FlowIcon, { name: data.icon, size: 18 })),
      h('span', { className: 'dsh-flow-group-title' }, data.title),
      h('span', { className: 'dsh-flow-group-phase' }, t('flow.task')),
      h('span', { className: 'dsh-flow-group-count' }, `${done}/${total}`),
      statusIcon(data.status, t),
    ),
    h('div', { className: 'dsh-flow-group-progress' },
      h('div', { className: 'dsh-flow-group-progress-track' },
        h('div', {
          className: `dsh-flow-group-progress-fill is-${data.status}`,
          style: { width: `${percent}%` },
        })),
    ),
    ),
    h('div', { className: 'dsh-flow-group-rows' },
      checks.map((check) => h('button', {
        key: check.id,
        type: 'button',
        className: `dsh-flow-row nodrag nopan depth-1${data.selectedId === check.id ? ' is-selected' : ''}`,
        onClick: () => { data.onSelect?.(check.id) },
        onPointerDown: (event: React.PointerEvent) => { event.stopPropagation() },
        'aria-label': `${check.title} · ${statusLabel(check.status, t)}`,
      },
      h('span', { className: 'dsh-flow-row-icon' }, h(FlowIcon, { name: check.icon })),
      h('span', { className: 'dsh-flow-row-title' }, check.title),
      check.meta === undefined || check.meta === '' ? null : h('span', { className: 'dsh-flow-row-meta' }, check.meta),
      h('span', { className: `dsh-flow-row-status is-${check.status}` }, statusIcon(check.status, t)),
      )),
    ),
  )
}

function PlanningCard({ data, t }: { data: FlowCardData; t: FlowTranslate }) {
  const plan = data.plan ?? []
  const total = data.progress?.total ?? plan.length
  const done = data.progress?.done ?? 0
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const open = (): void => {
    if (data.detailId !== undefined) data.onSelect?.(data.detailId)
  }
  return h('div', { className: `dsh-flow-group-card is-${data.status}` },
    h(Handle, { type: 'target', position: Position.Left, className: 'dsh-flow-handle' }),
    h('div', {
      className: 'dsh-flow-group-head nodrag nopan',
      role: 'button',
      tabIndex: 0,
      'aria-label': data.title,
      onClick: open,
      onPointerDown: (event: React.PointerEvent) => { event.stopPropagation() },
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      },
    },
    h('div', { className: 'dsh-flow-group-head-row' },
      h('span', { className: 'dsh-flow-group-icon' }, h(FlowIcon, { name: data.icon, size: 18 })),
      h('span', { className: 'dsh-flow-group-title' }, data.title),
      h('span', { className: 'dsh-flow-group-phase' }, t('flow.plan')),
      h('span', { className: 'dsh-flow-group-count' }, `${done}/${total}`),
      statusIcon(data.status, t),
    ),
    h('div', { className: 'dsh-flow-group-prompt' }, data.detail ?? ''),
    h('div', { className: 'dsh-flow-group-progress' },
      h('div', { className: 'dsh-flow-group-progress-track' },
        h('div', {
          className: `dsh-flow-group-progress-fill is-${data.status}`,
          style: { width: `${percent}%` },
        })),
    ),
    ),
    h('div', { className: 'dsh-flow-group-rows' },
      plan.map((item, index) => h('div', { key: index, className: 'dsh-flow-row depth-1' },
        h('span', { className: 'dsh-flow-row-icon' },
          h(FlowIcon, {
            name: item.status === 'done' ? 'check' : item.status === 'running' ? 'loader' : 'circle',
            className: item.status === 'running' ? 'dsh-flow-spin' : undefined,
          })),
        h('span', { className: 'dsh-flow-row-title' }, item.title),
        h('span', { className: `dsh-flow-row-status is-${item.status}` }, statusIcon(item.status, t)),
      )),
    ),
    h(Handle, { type: 'source', position: Position.Right, className: 'dsh-flow-handle' }),
  )
}

function VerifyCard({ data, t }: { data: FlowCardData; t: FlowTranslate }) {
  const open = (): void => {
    if (data.detailId !== undefined) data.onSelect?.(data.detailId)
  }
  return h('div', {
    className: `dsh-flow-turn-card nodrag nopan is-${data.status}${data.selectedId === data.detailId ? ' is-selected' : ''}`,
    role: 'button',
    tabIndex: 0,
    'aria-label': data.title,
    onClick: open,
    onPointerDown: (event: React.PointerEvent) => { event.stopPropagation() },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    },
  },
  h(Handle, { type: 'target', position: Position.Left, className: 'dsh-flow-handle' }),
  h('div', { className: 'dsh-flow-turn-head' },
    h('span', { className: 'dsh-flow-turn-icon' }, h(FlowIcon, { name: data.icon, size: 18 })),
    h('span', { className: 'dsh-flow-turn-title' }, data.title),
    h('span', { className: 'dsh-flow-turn-phase' }, t('flow.prompt')),
    statusIcon(data.status, t),
  ),
  h('div', { className: 'dsh-flow-turn-prompt' }, data.detail ?? ''),
  h(Handle, { type: 'source', position: Position.Right, className: 'dsh-flow-handle' }),
  )
}

function FlowCard({ id, data }: { id: string; data: FlowCardData }) {
  const t = React.useContext(FlowLocale)
  if (data.kind === 'turn') return h(TurnCard, { id, data, t })
  if (data.kind === 'verify') return h(VerifyCard, { data, t })
  if (data.kind === 'planning') return h(PlanningCard, { data, t })
  return h(TaskCard, { data, t })
}

const NODE_TYPES = { flow: FlowCard }

function FlowCanvas({ graph, t, selectedId, onSelect, detailOpen }: {
  graph: FlowGraph
  t: FlowTranslate
  selectedId: string | null
  onSelect: (id: string) => void
  detailOpen: boolean
}) {
  const instance = useReactFlow()
  const reduceMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
    [],
  )
  const last = graph.nodes[graph.nodes.length - 1]
  const first = React.useRef(true)
  React.useEffect(() => {
    if (!detailOpen) return undefined
    const frame = requestAnimationFrame(() => {
      void instance.fitView({ padding: 0.2, maxZoom: 1.1, duration: reduceMotion ? 0 : 300 })
    })
    return () => cancelAnimationFrame(frame)
  }, [detailOpen, instance, reduceMotion])
  React.useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (last === undefined) return
    const frame = requestAnimationFrame(() => {
      void instance.setCenter(last.position.x + last.width / 2, last.position.y + last.height / 2, {
        zoom: 1,
        duration: reduceMotion ? 0 : 360,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [last?.id, instance, reduceMotion])

  const nodes = React.useMemo(() => graph.nodes.map((node) => ({
    id: node.id,
    type: 'flow',
    position: node.position,
    data: { ...node, selectedId, onSelect },
    width: node.width,
    height: node.height,
    ariaLabel: node.title,
    draggable: false,
    selectable: true,
    connectable: false,
  })), [graph.nodes, selectedId, onSelect])

  const edges = React.useMemo(() => graph.edges.map((edge) => ({
    ...edge,
    type: 'smoothstep',
  })), [graph.edges])

  return h(ReactFlow, {
    nodes,
    edges,
    nodeTypes: NODE_TYPES,
    fitView: true,
    fitViewOptions: { padding: 0.2, maxZoom: 1.1, duration: reduceMotion ? 0 : 300 },
    minZoom: 0.35,
    maxZoom: 1.6,
    nodesDraggable: false,
    nodesConnectable: false,
    elementsSelectable: true,
    panOnScroll: true,
    zoomOnScroll: true,
    proOptions: { hideAttribution: true },
    ariaLabelConfig: {
      'controls.ariaLabel': t('flow.controls'),
      'controls.zoomIn.ariaLabel': t('flow.zoomIn'),
      'controls.zoomOut.ariaLabel': t('flow.zoomOut'),
      'controls.fitView.ariaLabel': t('flow.fitView'),
      'node.a11yDescription.default': t('flow.node'),
      'edge.a11yDescription.default': t('flow.edge'),
    },
    className: 'dsh-flow-canvas',
  },
  h(Background, { variant: BackgroundVariant.Dots, gap: 18, size: 1, color: 'var(--dsw-alias-border-l1)' }),
  h(Controls, { showInteractive: false }))
}

function FlowDetailPanel({ t, detail, onClose }: { t: FlowTranslate; detail: FlowDetail; onClose: () => void }) {
  return h('aside', { className: 'dsh-flow-detail', role: 'region', 'aria-label': t('flow.detail') },
    h('div', { className: 'dsh-flow-detail-head' },
      h('div', { className: 'dsh-flow-detail-heading' },
        h('span', { className: 'dsh-flow-detail-title' }, detail.title),
        detail.subtitle === undefined || detail.subtitle === '' ? null : h('span', { className: 'dsh-flow-detail-subtitle' }, detail.subtitle),
      ),
      statusIcon(detail.status, t),
      h('button', {
        type: 'button',
        className: 'dsh-flow-detail-close',
        'aria-label': t('flow.close'),
        onClick: onClose,
      }, h(FlowIcon, { name: 'close' })),
    ),
    detail.meta === undefined || detail.meta === '' ? null : h('div', { className: 'dsh-flow-detail-meta' }, detail.meta),
    h('pre', { className: 'dsh-flow-detail-body' }, detail.body),
  )
}

function FlowEmpty({ t, running, unavailable }: { t: FlowTranslate; running: boolean; unavailable?: boolean }) {
  return h('div', { className: 'dsh-flow-empty' },
    h('span', { className: 'dsh-flow-empty-icon' },
      h(FlowIcon, { name: running ? 'loader' : 'route', size: 28, className: running ? 'dsh-flow-spin' : undefined })),
    h('div', { className: 'dsh-flow-empty-title' },
      unavailable === true ? t('flow.unavailable') : running ? t('flow.waiting') : t('flow.empty')),
    h('div', { className: 'dsh-flow-empty-hint' },
      unavailable === true ? t('flow.unavailableHint') : t('flow.emptyHint')),
  )
}

function FlowShell({ t, graph, running, selectedId, selectedTurn, onSelect, onClose, onTurnChange, unavailable, mock, onToggleMock }: {
  t: FlowTranslate
  graph?: FlowGraph
  running: boolean
  selectedId: string | null
  selectedTurn: number | null
  onSelect: (id: string) => void
  onClose: () => void
  onTurnChange: (turn: number) => void
  unavailable?: boolean
  mock: boolean
  onToggleMock: () => void
}) {
  const detail = selectedId === null ? undefined : graph?.detailById[selectedId]
  return h('div', { className: 'dsh-flow-root', 'data-conversation-composer-overlay': '' },
    h('style', null, flowCss + FLOW_CSS),
    h('div', { className: `dsh-flow-body${detail === undefined ? '' : ' has-detail'}` },
      graph === undefined || graph.nodes.length === 0
        ? h(FlowEmpty, { t, running, unavailable })
        : h(ReactFlowProvider, null, h(FlowCanvas, { graph, t, selectedId, onSelect, detailOpen: detail !== undefined })),
      detail === undefined ? null : h(FlowDetailPanel, { t, detail, onClose }),
    ),
    h('div', { className: 'dsh-flow-footer' },
      h('div', { className: 'dsh-flow-footer-side' },
        running ? h('span', { className: 'dsh-flow-live', role: 'status' },
          h(FlowIcon, { name: 'loader', className: 'dsh-flow-spin' }), t('flow.live')) : null),
      graph === undefined || graph.turns.length === 0
        ? null
        : h('select', {
          className: 'dsh-flow-turn-select',
          value: String(selectedTurn ?? graph.turn?.turn ?? ''),
          'aria-label': t('flow.selectTurn'),
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
            const value = Number(event.target.value)
            if (Number.isFinite(value)) onTurnChange(value)
          },
        }, ...graph.turns.map((turn) => h('option', { key: turn, value: String(turn) }, t('flow.turn', { turn })))),
      h('div', { className: 'dsh-flow-footer-side is-right' },
        unavailable === true ? null : h('button', {
          type: 'button',
          className: `dsh-flow-mock${mock ? ' is-on' : ''}`,
          'aria-pressed': mock,
          onClick: onToggleMock,
        }, t('flow.mock')))),
  )
}

function FlowViewInner(props: FlowViewProps) {
  const t = props.t
  const [mock, setMock] = React.useState(() => new URLSearchParams(window.location.search).has('flowMock'))
  const liveSnapshot = props.useTrajectory?.((value) => value) as FlowSnapshot | undefined
  const liveTodos = props.useProjection('todos', (value) => value) as readonly FlowTodo[] | null | undefined
  const liveRunning = props.useSessions((state) => (state as FlowSessionsState).byId?.[props.sessionId]?.running === true) as boolean
  const snapshot = mock ? MOCK_FLOW_SNAPSHOT : liveSnapshot
  const todos = mock ? MOCK_FLOW_TODOS : liveTodos
  const running = mock ? false : liveRunning
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [selectedTurn, setSelectedTurn] = React.useState<number | null>(null)
  const [storedEvents, setStoredEvents] = React.useState<readonly FlowPersistEvent[]>([])
  const [storedTurns, setStoredTurns] = React.useState<readonly number[]>([])
  const [storedRefresh, setStoredRefresh] = React.useState(0)
  const lastTurn = React.useRef<number | null>(null)
  const graph = React.useMemo(
    () => buildFlowGraph({ snapshot, todos, running, t, turn: selectedTurn, storedEvents, storedTurns }),
    [snapshot, todos, running, t, selectedTurn, storedEvents, storedTurns],
  )
  React.useEffect(() => {
    const sessionId = props.sessionId
    if (mock) {
      setStoredTurns([])
      return undefined
    }
    if (typeof sessionId !== 'string' || sessionId === '') return undefined
    let cancelled = false
    void fetch(`/dsh-enhance/flow?sessionId=${encodeURIComponent(sessionId)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.turns)) setStoredTurns(data.turns)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [props.sessionId, mock])
  const activeTurn = selectedTurn ?? graph.turn?.turn ?? null
  React.useEffect(() => {
    const sessionId = props.sessionId
    if (mock || typeof sessionId !== 'string' || sessionId === '' || activeTurn === null) {
      setStoredEvents([])
      return undefined
    }
    let cancelled = false
    void fetch(`/dsh-enhance/flow?sessionId=${encodeURIComponent(sessionId)}&turn=${activeTurn}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.events)) {
          setStoredEvents(data.events.map((event: any) => ({
            ...event,
            meta: typeof event.meta === 'string' ? event.meta : undefined,
            time: typeof event.time === 'number' ? event.time : undefined,
            seq: typeof event.seq === 'number' ? event.seq : undefined,
          })))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [props.sessionId, activeTurn, storedRefresh, mock])
  const pendingEvents = React.useRef(new Map<string, FlowPersistEvent>())
  const pendingSession = React.useRef('')
  const pendingTurn = React.useRef<number | null>(null)
  const sendTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSent = React.useRef('')
  const lastSentAt = React.useRef(0)
  const graphTurn = graph.turn?.turn ?? null
  if (graphTurn !== null) {
    if (pendingSession.current !== props.sessionId) {
      pendingSession.current = props.sessionId
      pendingTurn.current = null
      pendingEvents.current.clear()
      if (sendTimer.current !== null) {
        clearTimeout(sendTimer.current)
        sendTimer.current = null
      }
    }
    if (pendingTurn.current !== graphTurn) {
      pendingTurn.current = graphTurn
      pendingEvents.current.clear()
      if (sendTimer.current !== null) {
        clearTimeout(sendTimer.current)
        sendTimer.current = null
      }
    }
    for (const event of graph.persistEvents) pendingEvents.current.set(event.id, event)
  }
  React.useEffect(() => {
    const sessionId = props.sessionId
    const turn = graph.turn?.turn ?? null
    if (mock || turn === null || typeof sessionId !== 'string' || sessionId === '') return
    if (sendTimer.current !== null) return
    const delay = Math.max(0, 100 - (Date.now() - lastSentAt.current))
    sendTimer.current = setTimeout(() => {
      sendTimer.current = null
      const events = [...pendingEvents.current.values()]
      if (events.length === 0) return
      const signature = JSON.stringify(events)
      if (signature === lastSent.current) return
      lastSentAt.current = Date.now()
      void fetch('/dsh-enhance/flow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, turn, events }),
      }).then(() => {
        lastSent.current = signature
        setStoredRefresh((value) => value + 1)
      }).catch(() => {})
    }, delay)
  }, [graph.turn?.turn, graph.persistEvents, props.sessionId, mock])
  React.useEffect(() => () => {
    if (sendTimer.current !== null) {
      clearTimeout(sendTimer.current)
      sendTimer.current = null
    }
  }, [])
  React.useEffect(() => {
    if (selectedTurn !== null && !graph.turns.includes(selectedTurn)) setSelectedTurn(null)
  }, [graph.turns, selectedTurn])
  React.useEffect(() => {
    const turn = graph.turn?.turn ?? null
    if (lastTurn.current !== turn) {
      lastTurn.current = turn
      setSelectedId(null)
    }
  }, [graph.turn?.turn])
  React.useEffect(() => {
    if (selectedId !== null && graph.detailById[selectedId] === undefined) setSelectedId(null)
  }, [graph, selectedId])
  React.useEffect(() => {
    if (selectedId === null) return undefined
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])
  const onSelect = React.useCallback((id: string) => { setSelectedId(id) }, [])
  const onClose = React.useCallback(() => { setSelectedId(null) }, [])
  const onTurnChange = React.useCallback((turn: number) => { setSelectedTurn(turn) }, [])
  const onToggleMock = React.useCallback(() => {
    const next = !mock
    setMock(next)
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('flowMock', '1')
    else url.searchParams.delete('flowMock')
    window.history.replaceState(null, '', url)
  }, [mock])
  return h(FlowLocale.Provider, { value: t },
    h(FlowShell, { t, graph, running, selectedId, selectedTurn, onSelect, onClose, onTurnChange, mock, onToggleMock }))
}

/**
 * Conversation view entry. The Trajectory target is optional at runtime, so a
 * missing hook renders the unavailable state instead of throwing.
 */
export function FlowView(props: FlowViewProps) {
  if (typeof props.useTrajectory !== 'function') {
    return h(FlowShell, {
      t: props.t,
      running: false,
      selectedId: null,
      selectedTurn: null,
      onSelect: () => {},
      onClose: () => {},
      onTurnChange: () => {},
      unavailable: true,
      mock: false,
      onToggleMock: () => {},
    })
  }
  return h(FlowViewInner, props)
}

const FLOW_CSS = `
.dsh-flow-root { display: flex; flex-direction: column; height: 100%; min-height: 0; width: 100%; box-sizing: border-box; overflow: hidden; isolation: isolate; padding-bottom: calc(var(--dsh-composer-height, 152px) + 16px); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.dsh-flow-turn-select { height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px; font-weight: 600; cursor: pointer; }
.dsh-flow-turn-select:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dsh-flow-mock { height: 24px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; cursor: pointer; }
.dsh-flow-mock.is-on { border-color: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-state-business-primary); }
.dsh-flow-mock:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dsh-flow-footer { flex: none; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.dsh-flow-footer-side { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-flow-footer-side.is-right { justify-content: flex-end; }
.dsh-flow-live { display: inline-flex; align-items: center; gap: 4px; color: var(--dsw-alias-state-business-primary); font-size: 11px; line-height: 16px; }
.dsh-flow-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); }
.dsh-flow-body.has-detail { grid-template-columns: minmax(0, 1fr) minmax(300px, 380px); }
.dsh-flow-canvas { min-height: 0; min-width: 0; background: transparent; }
.dsh-flow-canvas .react-flow__pane { cursor: grab; }
.dsh-flow-canvas .react-flow__pane:active { cursor: grabbing; }
.dsh-flow-canvas .react-flow__background { opacity: .6; }
.dsh-flow-canvas .react-flow__controls { box-shadow: var(--dsw-elevation-soft); border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); overflow: hidden; }
.dsh-flow-canvas .react-flow__controls-button { background: var(--dsw-alias-bg-layer-2); border-bottom: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); width: 28px; height: 28px; }
.dsh-flow-canvas .react-flow__controls-button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-flow-canvas .react-flow__controls-button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.dsh-flow-canvas .react-flow__controls-button svg { fill: currentColor; }
.dsh-flow-canvas .react-flow__edge-path { stroke: var(--dsw-alias-border-l3); stroke-width: 1.5; }
.dsh-flow-canvas .react-flow__edge.animated .react-flow__edge-path { stroke: var(--dsw-alias-state-business-primary); stroke-dasharray: 6 4; animation: dsh-flow-dash 900ms linear infinite; }
.dsh-flow-canvas .react-flow__handle { opacity: 0; pointer-events: none; }
.dsh-flow-canvas .react-flow__node:focus-visible .dsh-flow-turn-card,
.dsh-flow-canvas .react-flow__node:focus-visible .dsh-flow-group-card { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dsh-flow-turn-card { box-sizing: border-box; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); cursor: pointer; animation: dsh-flow-in 220ms cubic-bezier(.4, 0, .2, 1); }
.dsh-flow-turn-card.is-running { border-color: var(--dsw-alias-state-business-primary); box-shadow: inset 0 0 0 1px var(--dsw-alias-state-business-primary); }
.dsh-flow-turn-card.is-error { border-color: var(--dsw-alias-state-error-primary); }
.dsh-flow-turn-card.is-selected { box-shadow: inset 0 0 0 2px var(--dsw-alias-state-business-primary); }
.dsh-flow-turn-card:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dsh-flow-turn-head { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dsh-flow-turn-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; border-radius: var(--dsw-radius-xs); background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-business-primary); }
.dsh-flow-turn-title { font-size: 13px; line-height: 20px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dsh-flow-turn-phase { flex: none; padding: 0 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9999px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dsh-flow-turn-prompt { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); overflow: hidden; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.dsh-flow-turn-meta { margin-top: auto; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-flow-group-card { box-sizing: border-box; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); animation: dsh-flow-in 220ms cubic-bezier(.4, 0, .2, 1); }
.dsh-flow-group-card.is-running { border-color: var(--dsw-alias-state-business-primary); box-shadow: inset 0 0 0 1px var(--dsw-alias-state-business-primary); }
.dsh-flow-group-card.is-error { border-color: var(--dsw-alias-state-error-primary); }
.dsh-flow-group-head { display: flex; flex-direction: column; gap: 8px; min-width: 0; cursor: pointer; border-radius: var(--dsw-radius-sm); }
.dsh-flow-group-head:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dsh-flow-group-head-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dsh-flow-group-prompt { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); overflow: hidden; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.dsh-flow-group-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; border-radius: var(--dsw-radius-xs); background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); }
.dsh-flow-group-title { font-size: 13px; line-height: 20px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dsh-flow-group-phase { flex: none; padding: 0 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9999px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dsh-flow-group-count { flex: none; padding: 0 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9999px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dsh-flow-group-progress { display: flex; align-items: center; gap: 8px; }
.dsh-flow-group-progress-track { flex: 1; height: 4px; border-radius: 9999px; background: var(--dsw-alias-bg-layer-3); overflow: hidden; }
.dsh-flow-group-progress-fill { height: 100%; border-radius: 9999px; transition: width 220ms cubic-bezier(.4, 0, .2, 1); }
.dsh-flow-group-progress-fill.is-running { background: var(--dsw-alias-state-business-primary); }
.dsh-flow-group-progress-fill.is-done { background: var(--dsw-alias-state-success-primary); }
.dsh-flow-group-progress-fill.is-error { background: var(--dsw-alias-state-error-primary); }
.dsh-flow-group-progress-fill.is-idle { background: var(--dsw-alias-border-l3); }
.dsh-flow-group-rows { display: flex; flex-direction: column; gap: 2px; min-height: 0; overflow: hidden; }
.dsh-flow-row { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; padding: 4px 8px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); text-align: left; cursor: pointer; font-size: 12px; line-height: 18px; }
.dsh-flow-row.depth-1 { padding-left: 20px; }
.dsh-flow-row.depth-2 { padding-left: 36px; }
.dsh-flow-row.depth-1::before { content: '→'; position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 18px; }
.dsh-flow-row.depth-2::before { content: '↳'; position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 18px; }
.dsh-flow-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-flow-row:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.dsh-flow-row.is-selected { background: var(--dsw-alias-bg-layer-3); box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary); }
.dsh-flow-row-icon { display: inline-flex; flex: none; color: var(--dsw-alias-label-tertiary); }
.dsh-flow-row-status { display: inline-flex; flex: none; }
.dsh-flow-row-status .dsh-flow-status { margin-left: 0; }
.dsh-flow-row-status.is-running { color: var(--dsw-alias-state-business-primary); }
.dsh-flow-row-status.is-done { color: var(--dsw-alias-state-success-primary); }
.dsh-flow-row-status.is-error { color: var(--dsw-alias-state-error-primary); }
.dsh-flow-row-status.is-idle { color: var(--dsw-alias-label-tertiary); }
.dsh-flow-row-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-flow-row-meta { flex: none; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dsh-flow-status { display: inline-flex; flex: none; margin-left: auto; }
.dsh-flow-status.is-running { color: var(--dsw-alias-state-business-primary); }
.dsh-flow-status.is-done { color: var(--dsw-alias-state-success-primary); }
.dsh-flow-status.is-error { color: var(--dsw-alias-state-error-primary); }
.dsh-flow-status.is-idle { color: var(--dsw-alias-label-tertiary); }
.dsh-flow-spin { animation: dsh-flow-spin 900ms linear infinite; }
.dsh-flow-detail { min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; border-left: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.dsh-flow-detail-head { display: flex; align-items: flex-start; gap: 8px; flex: none; }
.dsh-flow-detail-heading { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.dsh-flow-detail-title { font-size: 13px; line-height: 20px; font-weight: 600; overflow-wrap: anywhere; }
.dsh-flow-detail-subtitle { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }
.dsh-flow-detail-close { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dsh-flow-detail-close:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-flow-detail-close:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dsh-flow-detail-meta { flex: none; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.dsh-flow-detail-body { margin: 0; flex: 1; min-height: 0; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-family: var(--ds-font-family-code); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dsh-flow-empty { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center; color: var(--dsw-alias-label-secondary); }
.dsh-flow-empty-icon { display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.dsh-flow-empty-title { font-size: 13px; line-height: 20px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsh-flow-empty-hint { font-size: 12px; line-height: 18px; max-width: 36ch; }
@keyframes dsh-flow-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes dsh-flow-spin { to { transform: rotate(360deg); } }
@keyframes dsh-flow-dash { to { stroke-dashoffset: -20; } }
@media (max-width: 760px) {
  .dsh-flow-body.has-detail { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(200px, 40%); }
  .dsh-flow-detail { border-left: none; border-top: 1px solid var(--dsw-alias-border-l1); }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-flow-turn-card, .dsh-flow-group-card { animation: none; }
  .dsh-flow-spin { animation: none; }
  .dsh-flow-canvas .react-flow__edge.animated .react-flow__edge-path { animation: none; }
  .dsh-flow-group-progress-fill { transition: none; }
}
`
