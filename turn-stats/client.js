window.__ModuleLoader__.load({
  id: '@local/turn-stats',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = '@local/turn-stats'

    const en = {
      'badge.tokens': '{tokens} tok',
      'badge.cost': '{cost}',
      'badge.more': '+{count}',
      'badge.noSkill': 'no skill',
      'badge.share': '{phase} {percent}%',
      'tooltip.turn': 'Turn {turn}',
      'tooltip.files': 'Files in context: {count}',
      'tooltip.file': '- {file}',
      'tooltip.model': 'Model: {model}',
      'tooltip.wall': 'Wall time: {duration}',
      'tooltip.llm': 'Model time: {duration}',
      'tooltip.tools': 'Tool time: {duration} ({count} calls)',
      'tooltip.skills': 'Skills: {skills}',
      'tooltip.noSkills': 'Skills: none',
      'tooltip.calls': 'Requests / responses: {requests} / {responses}',
      'tooltip.steps': 'Steps: {count}',
      'tooltip.context': 'Context blocks: {count}',
      'tooltip.retries': 'Retries: {count}',
      'tooltip.input': 'Input: {count} tokens',
      'tooltip.cache': 'Cache read: {count} tokens',
      'tooltip.cacheWrite': 'Cache write: {count} tokens',
      'tooltip.output': 'Output: {count} tokens',
      'tooltip.reasoning': 'Reasoning: {count} tokens',
      'tooltip.cost': 'Estimated cost: {cost}',
      'phase.think': 'thinking',
      'phase.plan': 'planning',
      'phase.read': 'reading',
      'phase.code': 'coding',
      'phase.test': 'testing',
      'phase.verify': 'verifying',
      'phase.run': 'running',
      'phase.delegate': 'delegating',
      'phase.other': 'other',
      'panel.tokens': 'Tokens',
      'panel.perAgent': 'Tokens per agent',
      'panel.skills': 'Skills',
      'panel.files': 'Context files',
      'panel.delegations': 'Delegated agents',
      'panel.tools': 'Tool calls',
      'panel.close': 'Close',
      'panel.hint': 'Click the badge for the full breakdown',
      'panel.empty': 'Nothing recorded',
      'panel.childUsage': 'A child agent reports its own usage; it is not part of this Turn.',
      'panel.cached': '{count} cached ({percent}%)',
      'panel.context': 'Prompt context',
      'panel.contextDelta': '{delta} vs turn {turn}',
      'panel.task': 'task',
      'panel.calls': 'calls',
      'panel.toolsOf': 'Tools',
      'panel.callsOf': 'Calls ({count})',
      'panel.moreCalls': '+{count} more',
      'panel.splitNote': 'Per-call tokens are an even share of the step that requested them.',
      'panel.fresh': 'in {count}',
      'panel.cachedShort': '{count} cached',
      'panel.out': 'out {count}',
      'panel.expandHint': 'Click a phase to see its tools',
      'panel.expandCommand': 'Click to show the full command',
      'why.button': 'Why so many tokens?',
      'why.ask': 'Ask AI',
      'why.cached': '{percent}% of {tokens} tokens were cached prefix — re-read context, not new work.',
      'why.topTool': '{tool} ×{calls} carried {tokens} tokens.',
      'why.output': '{tokens} output tokens were written by the model.',
      'why.shared': '{count} calls shared one message, so each row holds an even share.',
      'why.inserted': 'Added to the message box',
      'why.copied': 'Prompt copied',
      'why.failed': 'Could not hand off the prompt',
      'panel.cost': 'Cost',
      'panel.kind.instructions': 'instructions',
      'panel.kind.read': 'read',
    }

    const zh = {
      'badge.tokens': '{tokens} token',
      'badge.cost': '{cost}',
      'badge.more': '+{count}',
      'badge.noSkill': '未用技能',
      'badge.share': '{phase} {percent}%',
      'tooltip.turn': '第 {turn} 轮',
      'tooltip.files': '上下文文件：{count} 个',
      'tooltip.file': '- {file}',
      'tooltip.model': '模型：{model}',
      'tooltip.wall': '总耗时：{duration}',
      'tooltip.llm': '模型耗时：{duration}',
      'tooltip.tools': '工具耗时：{duration}（{count} 次调用）',
      'tooltip.skills': '技能：{skills}',
      'tooltip.noSkills': '技能：无',
      'tooltip.calls': '请求 / 响应：{requests} / {responses}',
      'tooltip.steps': '步数：{count}',
      'tooltip.context': '上下文段数：{count}',
      'tooltip.retries': '重试：{count}',
      'tooltip.input': '输入：{count} token',
      'tooltip.cache': '缓存命中：{count} token',
      'tooltip.cacheWrite': '缓存写入：{count} token',
      'tooltip.output': '输出：{count} token',
      'tooltip.reasoning': '推理：{count} token',
      'tooltip.cost': '预估费用：{cost}',
      'phase.think': '思考',
      'phase.plan': '规划',
      'phase.read': '阅读',
      'phase.code': '编码',
      'phase.test': '测试',
      'phase.verify': '校验',
      'phase.run': '运行',
      'phase.delegate': '委派',
      'phase.other': '其他',
      'panel.tokens': 'Token',
      'panel.perAgent': '按智能体统计 token',
      'panel.skills': '技能',
      'panel.files': '上下文文件',
      'panel.delegations': '委派的智能体',
      'panel.tools': '工具调用',
      'panel.close': '关闭',
      'panel.hint': '点击徽标查看完整明细',
      'panel.empty': '暂无记录',
      'panel.childUsage': '子智能体的用量归属它自己的会话，不计入本轮。',
      'panel.cached': '缓存命中 {count}（{percent}%）',
      'panel.context': '提示上下文',
      'panel.contextDelta': '较第 {turn} 轮 {delta}',
      'panel.task': '任务',
      'panel.calls': '次调用',
      'panel.toolsOf': '工具',
      'panel.callsOf': '调用明细（{count}）',
      'panel.moreCalls': '还有 {count} 条',
      'panel.splitNote': '单次调用的 token 为其所在步骤的均分，并非独立计量。',
      'panel.fresh': '输入 {count}',
      'panel.cachedShort': '缓存 {count}',
      'panel.out': '输出 {count}',
      'panel.expandHint': '点击阶段查看工具明细',
      'panel.expandCommand': '点击展开完整命令',
      'why.button': '为什么这么多 token？',
      'why.ask': '问 AI',
      'why.cached': '{tokens} token 中有 {percent}% 是缓存前缀——属于重复读取的上下文，不是新工作。',
      'why.topTool': '{tool} ×{calls} 占了 {tokens} token。',
      'why.output': '模型写出的输出为 {tokens} token。',
      'why.shared': '{count} 次调用由同一条消息发起，因此每行是均分。',
      'why.inserted': '已填入输入框',
      'why.copied': '提示词已复制',
      'why.failed': '无法转交提示词',
      'panel.cost': '费用',
      'panel.kind.instructions': '指令',
      'panel.kind.read': '读取',
    }

    /** Phase order, also the meter order. */
    const PHASES = ['think', 'plan', 'read', 'code', 'test', 'verify', 'run', 'delegate', 'other']

    /**
     * One hue per phase, all from theme tokens. Thinking stays neutral because it is
     * ambient; the working phases take the semantic colours the theme already owns.
     */
    const PHASE_COLOR = {
      think: 'var(--dsw-alias-label-tertiary)',
      plan: 'var(--dsw-alias-state-warn-primary)',
      read: 'var(--dsw-alias-state-business-primary)',
      code: 'var(--dsw-alias-state-success-primary)',
      test: 'var(--dsw-alias-state-error-primary)',
      verify: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent)',
      run: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 55%, transparent)',
      delegate: 'var(--dsw-alias-label-deep-diving)',
      other: 'var(--dsw-alias-label-dimmed)',
    }

    /** Instruction files a badge prefers when it names only one. */
    const INSTRUCTION_NAMES = ['agents.md', 'claude.md']

    function formatDuration(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return '0s'
      if (ms < 1000) return Math.round(ms) + 'ms'
      if (ms < 60000) return (ms / 1000).toFixed(1) + 's'
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.round((ms % 60000) / 1000)
      return minutes + 'm ' + seconds + 's'
    }

    function formatTokens(value) {
      if (!Number.isFinite(value) || value <= 0) return '0'
      if (value < 1000) return String(Math.round(value))
      if (value < 1e6) return (value / 1000).toFixed(value < 10000 ? 1 : 0) + 'k'
      return (value / 1e6).toFixed(2) + 'M'
    }

    function formatCount(value) {
      if (!Number.isFinite(value)) return '0'
      return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }

    function formatCost(value) {
      if (!Number.isFinite(value) || value <= 0) return '$0'
      if (value < 0.01) return '$' + value.toFixed(4)
      if (value < 1) return '$' + value.toFixed(3)
      return '$' + value.toFixed(2)
    }

    function formatClock(time) {
      if (typeof time !== 'number' || !Number.isFinite(time)) return ''
      const date = new Date(time)
      const pad = (part) => String(part).padStart(2, '0')
      return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
    }

    function segmentsOf(path) {
      return String(path).split(/[\\/]/).filter((part) => part !== '')
    }

    /**
     * Context files for the badge: instruction files first (AGENTS.md, then broader to
     * deeper), then the markdown the model read, newest first.
     */
    function contextFiles(loaded) {
      const instructions = []
      const reads = []
      for (const file of loaded) {
        if (file.kind === 'instructions') instructions.push(file)
        else reads.push(file)
      }
      const rank = (file) => {
        const at = INSTRUCTION_NAMES.indexOf(String(file.name).toLowerCase())
        return at === -1 ? INSTRUCTION_NAMES.length : at
      }
      instructions.sort(
        (left, right) => rank(left) - rank(right) || segmentsOf(right.path).length - segmentsOf(left.path).length,
      )
      reads.reverse()
      return instructions.concat(reads)
    }

    /** Phase rows of one Turn, richest first, with the share and cache hit each one holds. */
    function phaseRows(stats) {
      const source = stats.phases !== null && typeof stats.phases === 'object' ? stats.phases : {}
      const rows = []
      for (const name of PHASES) {
        const bucket = source[name]
        if (bucket === null || typeof bucket !== 'object') continue
        const tokens = Number(bucket.tokens) || 0
        const ms = Number(bucket.ms) || 0
        const calls = Number(bucket.calls) || 0
        if (tokens === 0 && ms === 0 && calls === 0) continue
        const cached = Number(bucket.cacheReadTokens) || 0
        rows.push({
          name,
          tokens,
          cached,
          cacheShare: tokens > 0 ? Math.min(1, cached / tokens) : 0,
          inputTokens: Number(bucket.inputTokens) || 0,
          outputTokens: Number(bucket.outputTokens) || 0,
          costUsd: Number(bucket.costUsd) || 0,
          ms,
          calls,
          tools: bucket.tools !== null && typeof bucket.tools === 'object' ? bucket.tools : {},
          callLog: Array.isArray(bucket.callLog) ? bucket.callLog : [],
        })
      }
      const total = rows.reduce((sum, row) => sum + row.tokens, 0)
      for (const row of rows) row.share = total > 0 ? row.tokens / total : 0
      rows.sort((left, right) => right.tokens - left.tokens || right.ms - left.ms)
      return { rows, total }
    }

    /** Prompt size of the last few Turns up to this one, for the context-growth strip. */
    function contextSeries(turns, turnNumber, limit) {
      if (turns === null || typeof turns !== 'object') return []
      return Object.keys(turns)
        .map(Number)
        .filter((number) => Number.isFinite(number) && number <= turnNumber)
        .sort((left, right) => left - right)
        .slice(-limit)
        .map((number) => ({ turn: number, prompt: Number(turns[number]?.promptTokens) || 0 }))
    }

    // One hue on a pale wash: the badge carries the plugin's accent while the tail's
    // action buttons stay neutral, so the summary reads before the controls.
    const badgeStyle = {
      display: 'inline-flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      alignSelf: 'flex-start',
      columnGap: '7px',
      rowGap: '2px',
      maxWidth: '100%',
      padding: '2px 8px 1px',
      border: '1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 22%, transparent)',
      borderRadius: 'var(--dsw-radius-xs)',
      background: 'var(--dsw-alias-state-business-tertiary)',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: 'calc(var(--dsh-content-font-size-secondary, 13px) - 1px)',
      fontWeight: '500',
      lineHeight: '16px',
      fontVariantNumeric: 'tabular-nums',
      cursor: 'pointer',
    }

    const segmentStyle = { whiteSpace: 'nowrap' }
    const dividerStyle = { width: '1px', height: '10px', flex: 'none', background: 'var(--dsw-alias-border-l4)' }
    const fileGroupStyle = { display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0, maxWidth: '100%' }
    const skillGroupStyle = { display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }
    const namesStyle = { whiteSpace: 'nowrap' }
    const glyphStyle = { flex: 'none', color: 'var(--dsw-alias-state-business-primary)' }
    const glyphMutedStyle = { flex: 'none', color: 'var(--dsw-alias-label-secondary)' }
    const moreStyle = { color: 'var(--dsw-alias-label-secondary)', fontWeight: '400' }
    const absentStyle = { color: 'var(--dsw-alias-label-secondary)', fontWeight: '400' }
    const shareStyle = { color: 'var(--dsw-alias-label-secondary)', fontWeight: '400' }

    const meterStyle = {
      display: 'inline-flex',
      width: '38px',
      height: '4px',
      flex: 'none',
      borderRadius: '2px',
      overflow: 'hidden',
      background: 'var(--dsw-alias-border-l4)',
    }

    /** Outline page glyph, 12px: the badge names files, so the mark carries meaning. */
    function FileGlyph() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 12,
          height: 12,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: glyphStyle,
        },
        h('path', { d: 'M4.25 1.75h5.1L12.5 5v9.25H4.25z' }),
        h('path', { d: 'M9.25 1.9V5h3.1' }),
      )
    }

    /**
     * Filled four-point star, 11px: a loaded skill is not a file, so it gets its own mark.
     * Muted when the Turn loaded none, matching the placeholder wording beside it.
     */
    function SkillGlyph({ muted }) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 11,
          height: 11,
          fill: 'currentColor',
          stroke: 'none',
          'aria-hidden': true,
          style: muted ? glyphMutedStyle : glyphStyle,
        },
        h('path', { d: 'M8 1.9 9.5 6.5 14.1 8 9.5 9.5 8 14.1 6.5 9.5 1.9 8 6.5 6.5Z' }),
      )
    }

    /** Stacked proportional bar; one segment per phase that spent tokens. */
    function Meter({ rows, total }) {
      if (rows.length === 0 || total <= 0) return null
      return h(
        'span',
        { style: meterStyle, 'aria-hidden': true },
        rows.map((row) =>
          h('span', {
            key: row.name,
            style: {
              display: 'block',
              height: '100%',
              width: (row.share * 100).toFixed(3) + '%',
              background: PHASE_COLOR[row.name] ?? PHASE_COLOR.other,
            },
          }),
        ),
      )
    }

    /** Colour dot plus label, the unit both detail surfaces use to name a phase. */
    function PhaseLabel({ name, t }) {
      return h(
        'span',
        { style: { display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0 } },
        h('span', {
          style: {
            width: '7px',
            height: '7px',
            flex: 'none',
            borderRadius: '50%',
            background: PHASE_COLOR[name] ?? PHASE_COLOR.other,
          },
          'aria-hidden': true,
        }),
        h('span', { style: { whiteSpace: 'nowrap' } }, t('phase.' + name)),
      )
    }

    /** One proportional share bar for the detail surfaces. */
    function ShareBar({ share, name }) {
      return h(
        'span',
        {
          style: {
            display: 'block',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--dsw-alias-border-l4)',
            overflow: 'hidden',
          },
        },
        h('span', {
          style: {
            display: 'block',
            height: '100%',
            width: Math.round(share * 100) + '%',
            background: PHASE_COLOR[name] ?? PHASE_COLOR.other,
          },
        }),
      )
    }

    // Opaque surface, not a layer token that may be undefined: a translucent popover over
    // the transcript is unreadable. bg-layer-* are the theme's solid surfaces.
    const popoverStyle = {
      position: 'fixed',
      zIndex: 3500,
      width: '300px',
      maxWidth: 'calc(100vw - 24px)',
      padding: '10px 12px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-md)',
      background: 'var(--dsw-alias-bg-layer-2)',
      boxShadow: 'var(--dsw-shadow-lv3)',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
      lineHeight: '18px',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }

    const panelStyle = {
      position: 'fixed',
      inset: 0,
      zIndex: 4000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--dsw-alias-bg-mask-1)',
    }

    const sheetStyle = {
      width: '100%',
      maxWidth: '560px',
      maxHeight: '78vh',
      overflow: 'auto',
      padding: '16px 18px 18px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-lg)',
      background: 'var(--dsw-alias-bg-layer-1)',
      boxShadow: 'var(--dsw-shadow-lv3)',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
      lineHeight: '18px',
    }

    const rowStyle = { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }
    const mutedStyle = { color: 'var(--dsw-alias-label-secondary)', fontWeight: '400' }
    const headingStyle = {
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      color: 'var(--dsw-alias-label-secondary)',
      marginTop: '12px',
    }
    const chipStyle = {
      display: 'inline-block',
      padding: '0 6px',
      borderRadius: 'var(--dsw-radius-xs)',
      border: '1px solid var(--dsw-alias-border-l4)',
      background: 'var(--dsw-alias-bg-layer-3)',
      whiteSpace: 'nowrap',
    }

    // A terminal surface reads as "this ran on your machine" better than any tint, and the
    // pale prompt glyph gives the eye something to land on before the command text.
    const terminalStyle = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '6px',
      padding: '3px 8px',
      borderRadius: 'var(--dsw-radius-xs)',
      background: '#0b0e14',
      border: '1px solid #1f2630',
      color: '#d7dce5',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '11px',
      lineHeight: '16px',
    }
    const terminalToolStyle = { flex: 'none', color: '#7d8590', marginTop: '1px' }
    const terminalGlyphStyle = { flex: 'none', marginTop: '3px', color: '#7ee787' }

    /** Prompt glyph: a chevron and an underscore, the smallest mark that says "terminal". */
    function TerminalGlyph() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 10,
          height: 10,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: terminalGlyphStyle,
        },
        h('path', { d: 'M2 3.5 6 6.5 2 9.5' }),
        h('path', { d: 'M8.5 10.5h5' }),
      )
    }

    /** Lines the badge's aria label adds after the phase split. */
    function detailLines(stats, t) {
      const lines = []
      if (stats.model !== null && stats.model !== undefined) lines.push(t('tooltip.model', { model: stats.model }))
      if (stats.durationMs !== null) lines.push(t('tooltip.wall', { duration: formatDuration(stats.durationMs) }))
      if (stats.llmMs > 0) lines.push(t('tooltip.llm', { duration: formatDuration(stats.llmMs) }))
      if (stats.toolCalls > 0) {
        lines.push(t('tooltip.tools', { duration: formatDuration(stats.toolMs), count: stats.toolCalls }))
      }
      if (stats.steps > 0) lines.push(t('tooltip.steps', { count: stats.steps }))
      return lines
    }

    /** Hover surface: the per-phase split plus the cheapest useful totals. */
    function Popover({ stats, rows, files, skills, rect, t, promptTokens, delta, previousTurn }) {
      if (rect === null) return null
      const width = 300
      const viewport = typeof window === 'undefined' ? width + 16 : window.innerWidth
      const left = Math.max(8, Math.min(rect.left, viewport - width - 12))
      const bottom = typeof window === 'undefined' ? 0 : window.innerHeight - rect.top + 8
      const body = []
      body.push(
        h(
          'div',
          { key: 'head', style: { ...rowStyle, justifyContent: 'space-between' } },
          h('span', { style: { fontWeight: 600 } }, t('tooltip.turn', { turn: stats.turn })),
          h('span', { style: mutedStyle }, stats.model ?? ''),
        ),
      )
      for (const row of rows.slice(0, 6)) {
        body.push(
          h(
            'div',
            { key: 'row-' + row.name, style: { ...rowStyle, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h(PhaseLabel, { name: row.name, t }),
            h(
              'span',
              { style: mutedStyle },
              formatTokens(row.tokens) + ' tok · ' + Math.round(row.share * 100) + '% · ' +
                t('panel.cached', { count: formatTokens(row.cached), percent: Math.round(row.cacheShare * 100) }),
            ),
          ),
        )
      }
      if (rows.length === 0) body.push(h('div', { key: 'none', style: mutedStyle }, t('panel.empty')))
      body.push(
        h(
          'div',
          { key: 'totals', style: { ...rowStyle, justifyContent: 'space-between', marginTop: '4px' } },
          h('span', null, formatTokens(stats.tokens) + ' tok'),
          h('span', null, formatCost(stats.costUsd)),
          h('span', { style: mutedStyle }, formatDuration(stats.durationMs ?? 0)),
        ),
      )
      if (skills.length > 0) {
        body.push(h('div', { key: 'skills', style: mutedStyle }, t('tooltip.skills', { skills: skills.join(', ') })))
      }
      if (promptTokens > 0) {
        const signed = delta === null ? null : (delta >= 0 ? '+' : '−') + formatTokens(Math.abs(delta))
        body.push(
          h(
            'div',
            { key: 'context', style: { ...rowStyle, justifyContent: 'space-between' } },
            h('span', null, t('panel.context') + ': ' + formatTokens(promptTokens) + ' tok'),
            signed === null ? null : h('span', { style: mutedStyle }, t('panel.contextDelta', { delta: signed, turn: previousTurn })),
          ),
        )
      }
      if (files.length > 0) {
        body.push(
          h(
            'div',
            { key: 'files', style: mutedStyle },
            t('tooltip.files', { count: files.length }) + ' · ' + files.slice(0, 4).map((file) => file.name).join(', '),
          ),
        )
      }
      body.push(h('div', { key: 'hint', style: { ...mutedStyle, fontStyle: 'italic' } }, t('panel.hint')))
      return h('div', { style: { ...popoverStyle, left: left + 'px', bottom: bottom + 'px' }, role: 'tooltip' }, body)
    }

    /**
     * One call as two stacked lines: the command stays on a single ellipsised line until
     * clicked, and the figures get their own line where they can be read as a row of numbers.
     */
    function CallRow({ call, t }) {
      const [open, setOpen] = React.useState(false)
      const label = call.label === '' ? call.name : call.label
      const terminal = [h(TerminalGlyph, { key: 'glyph' })]
      if (call.name !== 'bash') {
        terminal.push(h('span', { key: 'tool', style: terminalToolStyle }, call.name))
      }
      terminal.push(
        h(
          'button',
          {
            key: 'command',
            type: 'button',
            onClick: () => setOpen(!open),
            'aria-expanded': open ? 'true' : 'false',
            'aria-label': open ? label : label + ', ' + t('panel.expandCommand'),
            title: open ? undefined : label,
            style: {
              flex: '1',
              minWidth: 0,
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '11px',
              lineHeight: '16px',
              whiteSpace: open ? 'normal' : 'nowrap',
              overflowWrap: open ? 'anywhere' : 'normal',
              overflow: 'hidden',
              textOverflow: open ? 'clip' : 'ellipsis',
            },
          },
          label,
        ),
      )
      return h(
        'div',
        { style: { marginTop: '5px' } },
        h('div', { style: terminalStyle }, terminal),
        h(
          'div',
          {
            style: {
              ...mutedStyle,
              marginTop: '1px',
              fontSize: '11px',
              lineHeight: '15px',
              fontVariantNumeric: 'tabular-nums',
              overflowWrap: 'anywhere',
            },
          },
          usageLine(call, t),
        ),
      )
    }

    /**
     * The small context an explanation needs: this phase and its heaviest commands, plus
     * the turn's headline figures. Kept short so the answer stays cheap.
     */
    function explainPrompt(stats, row, callList) {
      const lines = [
        'Explain why this turn used so many tokens. Be concrete, 3 bullets, no preamble.',
        `Turn ${stats.turn}: ${formatTokens(stats.tokens)} tokens, ${formatCost(stats.costUsd)}, ${stats.steps} steps, model ${stats.model ?? 'unknown'}.`,
        `Phase ${row.name}: ${formatTokens(row.tokens)} tokens (${Math.round(row.share * 100)}% of the turn), ${row.calls} calls, ${formatDuration(row.ms)}, ${formatCost(row.costUsd)}.`,
        `Of those, ${formatTokens(row.cached)} were cached prefix, ${formatTokens(row.outputTokens)} output, ${formatTokens(row.inputTokens)} fresh input.`,
      ]
      const top = callList.slice(0, 5)
      if (top.length > 0) {
        lines.push(
          'Heaviest calls: ' +
            top
              .map(
                (call, index) =>
                  `${index + 1}. ${String(call.label || call.name).slice(0, 80)} — ${formatTokens(call.tokens)} tok (${formatTokens(call.outputTokens)} out)`,
              )
              .join('; '),
        )
      }
      lines.push(
        `Prompt context ${formatTokens(stats.promptTokens ?? 0)} tokens. Say what dominated, whether it was cache re-reads or real work, and what to change next time.`,
      )
      return lines.join('\n')
    }

    /**
     * One compact line: total, fresh input, cache hit, output, cost, duration. Cache is
     * called out separately because a cached prefix dwarfs the fresh tokens.
     */
    function usageLine(part, t) {
      const cached = Number(part.cacheReadTokens) || 0
      const pieces = [formatTokens(part.tokens) + ' tok', t('panel.fresh', { count: formatTokens(part.inputTokens) })]
      if (cached > 0) pieces[1] = pieces[1] + ' + ' + t('panel.cachedShort', { count: formatTokens(cached) })
      pieces.push(t('panel.out', { count: formatTokens(part.outputTokens) }))
      pieces.push(formatCost(part.costUsd))
      pieces.push(formatDuration(part.ms))
      return pieces.join(' · ')
    }

    // A tool keeps one colour wherever it appears: the order below covers the common
    // tools, and anything else hashes into the same palette, so the bar stays a legend.
    const TOOL_ORDER = ['bash', 'read', 'edit', 'write', 'grep', 'glob', 'skill', 'todo_write', 'subagent', 'web_search']
    const TOOL_COLOR = [
      'var(--dsw-alias-state-business-primary)',
      'var(--dsw-alias-state-success-primary)',
      'var(--dsw-alias-state-warn-primary)',
      'var(--dsw-alias-label-deep-diving)',
      'var(--dsw-alias-state-error-primary)',
      'color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent)',
      'color-mix(in srgb, var(--dsw-alias-state-success-primary) 55%, transparent)',
      'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 55%, transparent)',
    ]

    /** Stable colour for a tool name. */
    function toolColor(name) {
      const known = TOOL_ORDER.indexOf(name)
      if (known !== -1) return TOOL_COLOR[known % TOOL_COLOR.length]
      let hash = 0
      for (const character of String(name)) hash = (hash * 31 + character.charCodeAt(0)) % 997
      return TOOL_COLOR[hash % TOOL_COLOR.length]
    }

    const whyButtonStyle = {
      border: '1px solid var(--dsw-alias-border-l4)',
      borderRadius: 'var(--dsw-radius-xs)',
      background: 'transparent',
      color: 'inherit',
      cursor: 'pointer',
      font: 'inherit',
      fontSize: '11px',
      lineHeight: '16px',
      padding: '0 6px',
    }

    /**
     * Two things in one strip: the computed reason the phase cost what it did, and a
     * hand-off that puts a short prompt about this phase into the composer. The turn's
     * model answers there — a client plugin cannot call the model synchronously.
     */
    function WhyPanel({ stats, row, toolList, callList, t, inputActions }) {
      const [open, setOpen] = React.useState(false)
      const [note, setNote] = React.useState(null)
      const topTool = toolList[0]
      const bullets = [
        t('why.cached', {
          percent: Math.round(row.cacheShare * 100),
          tokens: formatTokens(row.tokens),
        }),
      ]
      if (topTool !== undefined) {
        bullets.push(t('why.topTool', { tool: topTool[0], calls: topTool[1].calls, tokens: formatTokens(topTool[1].tokens) }))
      }
      bullets.push(t('why.output', { tokens: formatTokens(row.outputTokens) }))
      if (callList.length > 1) bullets.push(t('why.shared', { count: callList.length }))

      const ask = () => {
        const prompt = explainPrompt(stats, row, callList)
        try {
          if (inputActions !== undefined && inputActions !== null && typeof inputActions.insertText === 'function') {
            const span = typeof inputActions.captureInsertion === 'function' ? inputActions.captureInsertion() : undefined
            const applied = inputActions.insertText(prompt, span)
            if (applied !== false) {
              setNote(t('why.inserted'))
              return
            }
          }
        } catch {
          // fall through to the clipboard
        }
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
            navigator.clipboard.writeText(prompt).then(
              () => setNote(t('why.copied')),
              () => setNote(t('why.failed')),
            )
            return
          }
        } catch {
          // report below
        }
        setNote(t('why.failed'))
      }

      return h(
        'div',
        { style: { marginTop: '8px' } },
        h(
          'div',
          { style: { ...rowStyle, gap: '6px', flexWrap: 'wrap' } },
          h(
            'button',
            {
              type: 'button',
              onClick: () => setOpen(!open),
              'aria-expanded': open ? 'true' : 'false',
              style: whyButtonStyle,
            },
            t('why.button'),
          ),
          h('button', { type: 'button', onClick: ask, style: whyButtonStyle }, t('why.ask')),
          note === null ? null : h('span', { style: { ...mutedStyle, fontSize: '11px' } }, note),
        ),
        open
          ? h(
              'ul',
              { style: { ...mutedStyle, margin: '5px 0 0', paddingLeft: '16px', fontSize: '11px', lineHeight: '16px' } },
              bullets.map((line, index) => h('li', { key: 'why-' + index }, line)),
            )
          : null,
      )
    }

    /**
     * Tools and individual calls of one phase. Per-call token figures are the phase's
     * even share per call, so they partition real usage rather than measure each call.
     */
    function expandedTools(row, toolList, callList, t, stats, inputActions) {
      const detail = {
        marginTop: '6px',
        paddingLeft: '10px',
        borderLeft: '1px solid var(--dsw-alias-border-l4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
      }
      const lines = [h('div', { key: 'h-tools', style: { ...mutedStyle, fontWeight: 600 } }, t('panel.toolsOf'))]
      if (toolList.length === 0) {
        lines.push(h('div', { key: 't-none', style: mutedStyle }, t('panel.empty')))
      } else {
        lines.push(
          h(
            'div',
            {
              key: 'tool-composition',
              style: {
                display: 'flex',
                height: '6px',
                marginTop: '4px',
                borderRadius: '3px',
                overflow: 'hidden',
                background: 'var(--dsw-alias-border-l4)',
              },
              'aria-hidden': true,
            },
            toolList.map(([name, stat]) =>
              h('span', {
                key: 'seg-' + name,
                style: {
                  display: 'block',
                  height: '100%',
                  width: (row.tokens > 0 ? Math.min(100, (stat.tokens / row.tokens) * 100) : 0).toFixed(3) + '%',
                  background: toolColor(name),
                },
              }),
            ),
          ),
        )
        for (const [name, stat] of toolList) {
          const share = row.tokens > 0 ? Math.min(1, stat.tokens / row.tokens) : 0
          lines.push(
            h(
              'div',
              { key: 't-' + name, style: { marginTop: '5px' } },
              h(
                'div',
                { style: { ...rowStyle, gap: '6px' } },
                h('span', { style: { ...chipStyle, flex: 'none' } }, name + ' ×' + stat.calls),
                h(
                  'span',
                  {
                    style: {
                      flex: '1',
                      minWidth: '36px',
                      height: '4px',
                      borderRadius: '2px',
                      background: 'var(--dsw-alias-border-l4)',
                      overflow: 'hidden',
                    },
                    'aria-hidden': true,
                  },
                  h('span', {
                    style: {
                      display: 'block',
                      height: '100%',
                      width: Math.round(share * 100) + '%',
                      background: toolColor(name),
                    },
                  }),
                ),
                h(
                  'span',
                  { style: { ...mutedStyle, flex: 'none', fontVariantNumeric: 'tabular-nums' } },
                  Math.round(share * 100) + '%',
                ),
              ),
              h(
                'div',
                {
                  style: {
                    ...mutedStyle,
                    marginTop: '1px',
                    fontSize: '11px',
                    lineHeight: '15px',
                    fontVariantNumeric: 'tabular-nums',
                    overflowWrap: 'anywhere',
                  },
                },
                usageLine(stat, t),
              ),
            ),
          )
        }
      }
      if (callList.length > 0) {
        lines.push(
          h('div', { key: 'h-calls', style: { ...mutedStyle, fontWeight: 600, marginTop: '4px' } }, t('panel.callsOf', { count: callList.length })),
        )
        for (const call of callList.slice(0, 12)) {
          lines.push(h(CallRow, { key: 'c-' + call.id, call, t }))
        }
        if (callList.length > 12) {
          lines.push(h('div', { key: 'c-more', style: mutedStyle }, t('panel.moreCalls', { count: callList.length - 12 })))
        }
        lines.push(h('div', { key: 'c-note', style: { ...mutedStyle, fontStyle: 'italic' } }, t('panel.splitNote')))
      }
      lines.push(h(WhyPanel, { key: 'why', stats, row, toolList, callList, t, inputActions }))
      return h('div', { key: 'detail', style: detail }, lines)
    }

    /** Click surface: everything the host captured for this Turn. */
    function Sheet({ stats, rows, files, skills, agents, tools, t, onClose, closeRef, context, delta, previousTurn, promptTokens, inputActions }) {
      const [opened, setOpened] = React.useState({})
      const sections = []

      sections.push(
        h(
          'div',
          { key: 'head', style: { ...rowStyle, justifyContent: 'space-between', alignItems: 'flex-start' } },
          h(
            'div',
            null,
            h('div', { style: { fontSize: '14px', fontWeight: 600 } }, t('tooltip.turn', { turn: stats.turn })),
            h('div', { style: mutedStyle }, [stats.model, formatDuration(stats.durationMs ?? 0)].filter(Boolean).join(' · ')),
          ),
          h(
            'button',
            {
              type: 'button',
              ref: closeRef,
              onClick: onClose,
              'aria-label': t('panel.close'),
              style: {
                border: '1px solid var(--dsw-alias-border-l4)',
                borderRadius: 'var(--dsw-radius-xs)',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                font: 'inherit',
                padding: '1px 7px',
              },
            },
            '×',
          ),
        ),
      )

      sections.push(
        h(
          'div',
          { key: 'summary', style: { ...rowStyle, gap: '14px', flexWrap: 'wrap', marginTop: '10px' } },
          h('span', null, t('panel.tokens') + ': ' + formatCount(stats.tokens)),
          h('span', null, t('panel.cost') + ': ' + formatCost(stats.costUsd)),
          h('span', { style: mutedStyle }, t('tooltip.llm', { duration: formatDuration(stats.llmMs) })),
          h('span', { style: mutedStyle }, t('tooltip.tools', { duration: formatDuration(stats.toolMs), count: stats.toolCalls })),
          h('span', { style: mutedStyle }, t('tooltip.calls', { requests: stats.requests, responses: stats.responses })),
          stats.contexts > 0 ? h('span', { style: mutedStyle }, t('tooltip.context', { count: stats.contexts })) : null,
          stats.retries > 0 ? h('span', { style: mutedStyle }, t('tooltip.retries', { count: stats.retries })) : null,
        ),
      )

      sections.push(h('div', { key: 'h-context', style: headingStyle }, t('panel.context')))
      if (context.length === 0) {
        sections.push(h('div', { key: 'c-none', style: mutedStyle }, t('panel.empty')))
      } else {
        const widest = Math.max(...context.map((point) => point.prompt), 1)
        const signed = delta === null ? null : (delta >= 0 ? '+' : '−') + formatTokens(Math.abs(delta))
        sections.push(
          h(
            'div',
            { key: 'c-total', style: { ...rowStyle, justifyContent: 'space-between' } },
            h('span', null, formatCount(promptTokens) + ' tok'),
            signed === null ? null : h('span', { style: mutedStyle }, t('panel.contextDelta', { delta: signed, turn: previousTurn })),
          ),
          h(
            'div',
            { key: 'c-bars', style: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '42px', marginTop: '6px' } },
            context.map((point) =>
              h(
                'div',
                { key: 'cb-' + point.turn, style: { flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: 0 } },
                h('span', {
                  title: t('tooltip.turn', { turn: point.turn }) + ' · ' + formatTokens(point.prompt),
                  style: {
                    width: '100%',
                    height: Math.max(3, Math.round((point.prompt / widest) * 30)) + 'px',
                    borderRadius: '2px',
                    background:
                      point.turn === stats.turn
                        ? 'var(--dsw-alias-state-business-primary)'
                        : 'var(--dsw-alias-border-l3)',
                  },
                }),
                h('span', { style: { ...mutedStyle, fontSize: '10px' } }, point.turn),
              ),
            ),
          ),
        )
      }

      sections.push(h('div', { key: 'h-agent', style: headingStyle }, t('panel.perAgent')))
      if (rows.length > 0) {
        sections.push(h('div', { key: 'h-agent-hint', style: { ...mutedStyle, marginTop: '2px' } }, t('panel.expandHint')))
      }
      if (rows.length === 0) {
        sections.push(h('div', { key: 'a-none', style: mutedStyle }, t('panel.empty')))
      } else {
        for (const row of rows) {
          const isOpen = opened[row.name] === true
          const toolList = Object.entries(row.tools ?? {}).sort((left, right) => right[1].tokens - left[1].tokens)
          const callList = row.callLog ?? []
          sections.push(
            h(
              'div',
              { key: 'a-' + row.name, style: { marginTop: '6px' } },
              h(
                'div',
                {
                  style: { ...rowStyle, justifyContent: 'space-between', flexWrap: 'wrap', cursor: 'pointer' },
                  role: 'button',
                  tabIndex: 0,
                  'aria-expanded': isOpen ? 'true' : 'false',
                  onClick: () => setOpened({ ...opened, [row.name]: !isOpen }),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setOpened({ ...opened, [row.name]: !isOpen })
                    }
                  },
                },
                h(PhaseLabel, { name: row.name, t }),
                h(
                  'span',
                  { style: mutedStyle },
                  formatCount(row.tokens) + ' tok · ' +
                    t('panel.cached', { count: formatTokens(row.cached), percent: Math.round(row.cacheShare * 100) }) +
                    ' · ' + formatCost(row.costUsd) + ' · ' + formatDuration(row.ms) +
                    (row.calls > 0 ? ' · ' + row.calls + ' ' + t('panel.calls') : '') +
                    (isOpen ? '  ▾' : '  ▸'),
                ),
              ),
              h('div', { style: { marginTop: '3px' } }, h(ShareBar, { share: row.share, name: row.name })),
              isOpen ? expandedTools(row, toolList, callList, t, stats, inputActions) : null,
            ),
          )
        }
      }

      sections.push(h('div', { key: 'h-tokens', style: headingStyle }, t('panel.tokens')))
      sections.push(
        h(
          'div',
          { key: 'tokens', style: { ...rowStyle, gap: '12px', flexWrap: 'wrap' } },
          h('span', { style: mutedStyle }, t('tooltip.input', { count: formatCount(stats.inputTokens) })),
          h('span', { style: mutedStyle }, t('tooltip.cache', { count: formatCount(stats.cacheReadTokens) })),
          h('span', { style: mutedStyle }, t('tooltip.cacheWrite', { count: formatCount(stats.cacheWriteTokens) })),
          h('span', { style: mutedStyle }, t('tooltip.output', { count: formatCount(stats.outputTokens) })),
          h('span', { style: mutedStyle }, t('tooltip.reasoning', { count: formatCount(stats.reasoningTokens) })),
        ),
      )

      sections.push(h('div', { key: 'h-skills', style: headingStyle }, t('panel.skills')))
      sections.push(
        h(
          'div',
          { key: 'skills', style: { ...rowStyle, gap: '6px', flexWrap: 'wrap' } },
          skills.length === 0
            ? h('span', { style: mutedStyle }, t('panel.empty'))
            : skills.map((name) => h('span', { key: name, style: chipStyle }, name)),
        ),
      )

      sections.push(h('div', { key: 'h-files', style: headingStyle }, t('panel.files')))
      if (files.length === 0) {
        sections.push(h('div', { key: 'f-none', style: mutedStyle }, t('panel.empty')))
      } else {
        for (const file of files) {
          sections.push(
            h(
              'div',
              { key: 'f-' + file.path, style: { ...rowStyle, justifyContent: 'space-between', marginTop: '4px' } },
              h('span', { style: { whiteSpace: 'nowrap' } }, file.name),
              h(
                'span',
                { style: { ...mutedStyle, display: 'inline-flex', gap: '8px', flex: 'none' } },
                h('span', null, t('panel.kind.' + (file.kind === 'instructions' ? 'instructions' : 'read'))),
                h('span', null, formatClock(file.at)),
              ),
            ),
          )
          sections.push(h('div', { key: 'fp-' + file.path, style: { ...mutedStyle, overflowWrap: 'anywhere' } }, file.path))
        }
      }

      sections.push(h('div', { key: 'h-agents', style: headingStyle }, t('panel.delegations')))
      if (agents.length === 0) {
        sections.push(h('div', { key: 'ag-none', style: mutedStyle }, t('panel.empty')))
      } else {
        for (const agent of agents) {
          sections.push(
            h(
              'div',
              { key: 'ag-' + agent.id, style: { marginTop: '4px' } },
              h(
                'div',
                { style: { ...rowStyle, justifyContent: 'space-between' } },
                h('span', { style: { overflowWrap: 'anywhere' } }, agent.name),
                h('span', { style: { ...mutedStyle, flex: 'none' } }, formatDuration(agent.ms)),
              ),
              h(
                'div',
                { style: mutedStyle },
                [agent.tool !== agent.name ? agent.tool : null, agent.route].filter(Boolean).join(' · '),
              ),
              agent.task === null || agent.task === undefined
                ? null
                : h('div', { style: { ...mutedStyle, fontStyle: 'italic' } }, t('panel.task') + ': ' + agent.task),
            ),
          )
        }
        sections.push(h('div', { key: 'ag-note', style: { ...mutedStyle, marginTop: '4px' } }, t('panel.childUsage')))
      }

      sections.push(h('div', { key: 'h-tools', style: headingStyle }, t('panel.tools')))
      const toolRows = Object.entries(tools).sort((left, right) => right[1] - left[1])
      sections.push(
        h(
          'div',
          { key: 'tools', style: { ...rowStyle, gap: '6px', flexWrap: 'wrap' } },
          toolRows.length === 0
            ? h('span', { style: mutedStyle }, t('panel.empty'))
            : toolRows.map(([name, calls]) => h('span', { key: name, style: chipStyle }, name + ' ×' + calls)),
        ),
      )

      return h(
        'div',
        {
          style: panelStyle,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t('tooltip.turn', { turn: stats.turn }),
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h('div', { style: sheetStyle }, sections),
      )
    }

    /**
     * Compact per-turn status bar under a finished reply: skill, tokens, context file,
     * cost, and the per-phase token split. Hovering opens the split; clicking opens the
     * full captured record.
     */
    function TurnStatsBadge({ turn, useProjection, t, inputActions }) {
      const turnNumber = turn !== undefined && turn !== null && typeof turn.turn === 'number' ? turn.turn : undefined
      const stats = useProjection('turnStats', (value) => {
        if (value === undefined || value === null || value.turns === undefined) return undefined
        return value.turns[turnNumber]
      })
      const catalog = useProjection('turnStats', (value) =>
        value === undefined || value === null ? undefined : value.files,
      )
      const turnsMap = useProjection('turnStats', (value) =>
        value === undefined || value === null ? undefined : value.turns,
      )
      const [peek, setPeek] = React.useState(false)
      const [detail, setDetail] = React.useState(false)
      const [rect, setRect] = React.useState(null)
      const badgeRef = React.useRef(null)
      const closeRef = React.useRef(null)

      React.useEffect(() => {
        if (detail && closeRef.current !== null) closeRef.current.focus()
      }, [detail])

      React.useEffect(() => {
        if (!detail) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') setDetail(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [detail])

      if (stats === undefined || stats === null) return null

      const loaded = Array.isArray(catalog)
        ? catalog
            .slice(0, stats.fileCount || 0)
            .filter((file) => file !== null && typeof file === 'object' && file.removed !== true)
        : []
      const files = contextFiles(loaded)
      const primary = files[0]
      const extras = files.slice(1)

      const skills = Array.isArray(stats.skills)
        ? stats.skills.filter((skill) => typeof skill === 'string' && skill !== '')
        : []

      const { rows, total } = phaseRows(stats)
      const context = contextSeries(turnsMap, turnNumber, 6)
      const previous = context.length > 1 ? context[context.length - 2] : null
      const promptTokens = Number(stats.promptTokens) || 0
      const delta = previous === null ? null : promptTokens - previous.prompt
      const previousTurn = previous === null ? null : previous.turn
      const agents = Array.isArray(stats.agents) ? stats.agents : []
      const tools = stats.tools !== null && typeof stats.tools === 'object' ? stats.tools : {}
      const totalTokens = Number(stats.tokens) > 0 ? Number(stats.tokens) : 0

      const hasSkills = skills.length > 0
      const skillGroup = h(
        'span',
        {
          key: 'skills',
          style: skillGroupStyle,
          title: hasSkills ? t('tooltip.skills', { skills: skills.join(', ') }) : t('tooltip.noSkills'),
        },
        h(SkillGlyph, { muted: !hasSkills }),
        hasSkills ? h('span', { style: segmentStyle }, skills[0]) : h('span', { style: absentStyle }, t('badge.noSkill')),
        hasSkills && skills.length > 1
          ? h('span', { key: 'more', style: moreStyle }, ' ' + t('badge.more', { count: skills.length - 1 }))
          : null,
      )

      const tokensNode = h(
        'span',
        { key: 'tokens', style: segmentStyle },
        t('badge.tokens', { tokens: formatTokens(totalTokens) }),
      )

      const fileGroup =
        primary === undefined
          ? null
          : h(
              'span',
              { key: 'files', style: fileGroupStyle, title: files.map((file) => file.path).join('\n') },
              h(FileGlyph),
              h(
                'span',
                { style: namesStyle },
                h('span', null, primary.name),
                extras.length > 0
                  ? h('span', { key: 'more', style: moreStyle }, ' ' + t('badge.more', { count: extras.length }))
                  : null,
              ),
            )

      const costNode = h('span', { key: 'cost', style: segmentStyle }, t('badge.cost', { cost: formatCost(stats.costUsd) }))

      const top = rows[0]
      const shareNode =
        top === undefined
          ? null
          : h(
              'span',
              { key: 'share', style: { display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0 } },
              h(Meter, { rows, total }),
              h(
                'span',
                { style: shareStyle },
                t('badge.share', { phase: t('phase.' + top.name), percent: Math.round(top.share * 100) }),
              ),
            )

      const segments = [skillGroup, tokensNode, fileGroup, costNode, shareNode].filter(Boolean)
      const children = []
      segments.forEach((node, index) => {
        if (index > 0) children.push(h('span', { key: 'divider-' + index, style: dividerStyle, 'aria-hidden': true }))
        children.push(node)
      })

      const label = [t('tooltip.turn', { turn: stats.turn })]
      if (files.length > 0) {
        label.push(t('tooltip.files', { count: files.length }))
        for (const file of files) {
          label.push(t('tooltip.file', { file: file.path === file.name ? file.name : file.name + ' (' + file.path + ')' }))
        }
      }
      label.push(hasSkills ? t('tooltip.skills', { skills: skills.join(', ') }) : t('tooltip.noSkills'))
      label.push(t('badge.tokens', { tokens: formatCount(totalTokens) }))
      label.push(t('tooltip.cost', { cost: formatCost(stats.costUsd) }))
      for (const row of rows) label.push(t('phase.' + row.name) + ': ' + Math.round(row.share * 100) + '%')
      label.push(...detailLines(stats, t))
      label.push(t('panel.hint'))

      const openDetail = () => setDetail(true)

      const badge = h(
        'div',
        {
          ref: badgeRef,
          style: badgeStyle,
          role: 'button',
          tabIndex: 0,
          'data-turn-stats': turnNumber,
          'aria-haspopup': 'dialog',
          'aria-expanded': detail ? 'true' : 'false',
          'aria-label': label.join(', '),
          onMouseEnter: () => {
            if (typeof window === 'undefined' || badgeRef.current === null) return
            const bounds = badgeRef.current.getBoundingClientRect()
            setRect({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
            setPeek(true)
          },
          onMouseLeave: () => setPeek(false),
          onClick: openDetail,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
              event.preventDefault()
              openDetail()
            }
          },
        },
        children,
      )

      const surfaces = [badge]
      if (peek && !detail) {
        surfaces.push(
          h(Popover, { key: 'popover', stats, rows, files, skills, rect, t, promptTokens, delta, previousTurn }),
        )
      }
      if (detail) {
        surfaces.push(
          h(Sheet, {
            key: 'sheet',
            stats,
            rows,
            files,
            skills,
            agents,
            tools,
            t,
            onClose: () => setDetail(false),
            closeRef,
            context,
            delta,
            previousTurn,
            promptTokens,
            inputActions,
          }),
        )
      }
      return h(React.Fragment, null, surfaces)
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'turn-stats: dictionaries')
        ctx.slots.inject('conversation.chat.turnTail', () =>
          ctx.slots.register(
            {
              name: 'conversation.chat.turnTail',
              id: '@local/turn-stats',
              order: 15,
              locale: NS,
            },
            TurnStatsBadge,
          ),
        )
      },
    }
  },
})
