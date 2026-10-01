// The stage strip: a workflow's stages in one row, where the task stands and
// which gates wait for a person. Colored chips for the terminal and an SVG for
// surfaces that draw one. Pure.
import type { FlowBoardTask, FlowStatus, FlowTask } from '../types'
import { railView } from './board'
import { nextAction } from './flow'
import { stageLabel } from './flows'
import { ACCENT } from './status'

export type Segment = {
  stage: string
  label: string
  /** `next`: the stage the recommended step starts, once nothing is under way. */
  state: 'done' | 'now' | 'next' | 'ahead'
  gate?: 'approved' | 'waiting' | 'ahead'
}

/** One run of styled text: the terminal draws each as a Text. */
export type Chip = { text: string; color?: string; bold?: true; dimColor?: true }

export const GLYPH = { done: '✓', now: '●', next: '○', ahead: '○' } as const
export const GATE = '◆'

const ARROW = ' → '

/** How each stage state is styled, in the strip and the board's stage list. */
export const STAGE_LOOK: Record<Segment['state'], Omit<Chip, 'text'>> = {
  done: { color: 'green' },
  now: { color: ACCENT, bold: true },
  next: { bold: true },
  ahead: { dimColor: true },
}

const GATE_LOOK: Record<NonNullable<Segment['gate']>, Omit<Chip, 'text'>> = {
  waiting: { color: 'yellow', bold: true },
  approved: { color: 'green' },
  ahead: { dimColor: true },
}

/** The rail as strip segments, each stage named in words. */
export const segmentsOf = (rail: FlowBoardTask['rail']): Segment[] =>
  rail.map(stop => ({
    stage: stop.stage,
    label: stageLabel(stop.stage),
    state: stop.state,
    ...(stop.gate === undefined ? {} : { gate: stop.gate }),
  }))

/**
 * The task's segments for a person at `status`: once the task is ready, the stage it is in counts
 * as done and the stage the next step starts is marked next, so the eye lands on what to do.
 */
export const segmentsFor = (task: FlowTask, status: FlowStatus): Segment[] => {
  const segments = segmentsOf(railView(task))
  const target = nextAction(task).stage
  if (status !== 'ready' || target === undefined) {
    return segments
  }

  return segments.map(one =>
    one.stage === target ? { ...one, state: 'next' as const } : one.state === 'now' ? { ...one, state: 'done' as const } : one,
  )
}

const cells = (text: string) => [...text].length

/**
 * The segments the focused strip names: the stage under way and the one the next step starts,
 * or, with nothing marked next, the stage after the current one. The rest are glyphs alone.
 */
const namedOf = (segments: Segment[]) => {
  const now = segments.findIndex(one => one.state === 'now')
  const next = segments.findIndex(one => one.state === 'next')
  const after = next === -1 && now !== -1 ? now + 1 : -1

  return new Set([now, next, after].filter(at => at >= 0 && at < segments.length))
}

const segmentText = (one: Segment, isNamed: boolean) =>
  isNamed ? `${GLYPH[one.state]} ${one.label}${one.gate === undefined ? '' : ` ${GATE}`}` : GLYPH[one.state]

/** The strip as one line, every stage named, or only the current and next ones when `isFocused`. */
export const stripLine = (segments: Segment[], isFocused = false) => {
  const named = namedOf(segments)

  return segments.map((one, at) => segmentText(one, !isFocused || named.has(at))).join(ARROW)
}

/** The width the strip takes on one line. */
export const stripWidth = (segments: Segment[], isFocused = false) => cells(stripLine(segments, isFocused))

/** The segments in rows no wider than `columns`, breaking only between stages. */
export const stripRows = (segments: Segment[], columns: number): Segment[][] =>
  segments.reduce<Segment[][]>((rows, one) => {
    const last = rows.at(-1)
    const fits = last !== undefined && cells(`${rows.length === 1 ? '' : ARROW.trimStart()}${stripLine([...last, one])}`) <= columns

    return last !== undefined && fits ? [...rows.slice(0, -1), [...last, one]] : [...rows, [one]]
  }, [])

/** The strip as plain lines; a row after the first starts with an arrow. */
export const stripText = (segments: Segment[], columns: number) =>
  stripRows(segments, columns).map((row, at) => `${at === 0 ? '' : ARROW.trimStart()}${stripLine(row)}`)

const chipsOf = (row: Segment[], named: Set<number> | undefined, isContinued: boolean): Chip[] =>
  row.flatMap((one, index) => {
    const isNamed = named === undefined || named.has(index)

    return [
      ...(index > 0 || isContinued ? [{ text: index > 0 ? ARROW : ARROW.trimStart(), dimColor: true as const }] : []),
      { text: segmentText({ ...one, gate: undefined }, isNamed), ...STAGE_LOOK[one.state] },
      ...(one.gate === undefined || !isNamed ? [] : [{ text: ` ${GATE}`, ...GATE_LOOK[one.gate] }]),
    ]
  })

/** The strip as rows of chips for the terminal, every stage named. */
export const stripChips = (segments: Segment[], columns: number): Chip[][] =>
  stripRows(segments, columns).map((row, at) => chipsOf(row, undefined, at > 0))

/** The strip as one row of chips naming only the stage under way and the one to start. */
export const focusedChips = (segments: Segment[]): Chip[] => chipsOf(segments, namedOf(segments), false)

/** What the strip says, for a reader that cannot see it. */
export const stripAlt = (segments: Segment[]) =>
  `Stages: ${segments
    .map(one => {
      const gate = one.gate === 'waiting' ? ', waiting for approval' : one.gate === 'approved' ? ', approved' : ''

      return `${one.label} (${one.state === 'now' ? 'current' : one.state === 'next' ? 'up next' : one.state}${gate})`
    })
    .join(', ')}`

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ponytail: widths from a per-character estimate at 12px; a measured font if labels ever clip.
const CHAR = 7
const PAD = 10
const HEIGHT = 28
const GAP = 28
const TOP = 4
const ROW_GAP = 10

const STYLE = [
  '.box{fill:none;stroke:#a1a1aa}.box.now{fill:#0891b2;stroke:#0891b2}.box.ahead{stroke-dasharray:3 3}.box.next{stroke:#0891b2;stroke-width:1.5}',
  '.label{font:12px system-ui,-apple-system,sans-serif;fill:#3f3f46}.label.done{fill:#15803d}.label.now{fill:#fff;font-weight:600}.label.ahead{fill:#a1a1aa}.label.next{font-weight:600}',
  '.arrow{stroke:#a1a1aa;fill:#a1a1aa}.gate-waiting{fill:#ca8a04}.gate-approved{fill:#16a34a}.gate-ahead{fill:#d4d4d8;stroke:#a1a1aa}',
  '@media (prefers-color-scheme:dark){.box{stroke:#52525b}.label{fill:#e4e4e7}.label.done{fill:#4ade80}.label.ahead{fill:#71717a}',
  '.arrow{stroke:#52525b;fill:#52525b}.gate-waiting{fill:#facc15}.gate-approved{fill:#4ade80}.gate-ahead{fill:#27272a;stroke:#52525b}}',
].join('')

/** Pixels per terminal column, to turn a pane's `bodyColumns` into an SVG width. */
export const COLUMN_PX = 8

/**
 * The strip as a standalone SVG: boxes, arrows and gate diamonds, colored
 * for the viewer's light or dark scheme, wrapped into rows no wider than
 * `maxWidth` so a narrow pane never shrinks the text.
 */
export const stripSvg = (segments: Segment[], maxWidth = Number.POSITIVE_INFINITY) => {
  const widths = segments.map(one => cells(`${GLYPH[one.state]} ${one.label}`) * CHAR + PAD * 2)
  // Each row holds segment indexes; a row after the first starts after an arrow.
  const rows = widths.reduce<number[][]>((packed, width, index) => {
    const last = packed.at(-1)
    const used = last === undefined ? 0 : (packed.length > 1 ? GAP : 0) + last.reduce((sum, at) => sum + (widths[at] ?? 0) + GAP, 0)

    return last !== undefined && used + width + 16 <= maxWidth ? [...packed.slice(0, -1), [...last, index]] : [...packed, [index]]
  }, [])
  const arrowAt = (from: number, middle: number) =>
    `<path class="arrow" d="M${from + 3} ${middle}H${from + GAP - 7}"/><path class="arrow" d="M${from + GAP - 8} ${middle - 3.5}L${from + GAP - 3} ${middle}L${from + GAP - 8} ${middle + 3.5}Z"/>`
  const drawn = rows.map((row, line) => {
    const top = TOP + line * (HEIGHT + ROW_GAP)
    const middle = top + HEIGHT / 2
    const start = line === 0 ? 0 : GAP
    const lefts = row.map((_index, at) => start + row.slice(0, at).reduce((sum, index) => sum + (widths[index] ?? 0) + GAP, 0))
    const parts = row.map((index, at) => {
      const one = segments[index]
      const left = lefts[at] ?? 0
      const width = widths[index] ?? 0
      if (one === undefined) {
        return ''
      }
      const right = left + width
      const box = `<rect class="box ${one.state}" x="${left + 0.5}" y="${top + 0.5}" width="${width - 1}" height="${HEIGHT - 1}" rx="7"/>`
      const label = `<text class="label ${one.state}" x="${left + width / 2}" y="${middle + 4}" text-anchor="middle">${escape(`${GLYPH[one.state]} ${one.label}`)}</text>`
      const isRowEnd = at === row.length - 1
      const arrow = isRowEnd ? '' : arrowAt(right, middle)
      const x = isRowEnd ? right + 9 : right + GAP / 2 - 2
      const gate =
        one.gate === undefined
          ? ''
          : `<path class="gate-${one.gate}" d="M${x} ${middle - 5.5}L${x + 5.5} ${middle}L${x} ${middle + 5.5}L${x - 5.5} ${middle}Z"/>`

      return `${box}${label}${arrow}${gate}`
    })

    return { html: `${line === 0 ? '' : arrowAt(0, middle)}${parts.join('')}`, right: (lefts.at(-1) ?? 0) + (widths[row.at(-1) ?? 0] ?? 0) }
  })
  // Room for a gate diamond after a row's last box.
  const width = Math.ceil(Math.max(0, ...drawn.map(one => one.right)) + 16)
  const height = TOP * 2 + rows.length * HEIGHT + (rows.length - 1) * ROW_GAP

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>${STYLE}</style>${drawn.map(one => one.html).join('')}</svg>`
}
