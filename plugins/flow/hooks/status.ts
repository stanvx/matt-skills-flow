// What the band, the task pane and the board pane say and how they style it.
// Pure: the drawing lives in ui*.tsx.
import type { FlowWorkflow, FlowStatus, FlowTask } from '../types'
import { editGate, nextAction, rail } from './flow'

export const RAIL = 'flow'
export const BOARD = 'flow-board'

/** The next command as a person types it: `/to-spec` or `/flow approve`. */
export const commandLine = (task: FlowTask) => {
  const step = nextAction(task)

  return [`/${step.command}`, step.args].filter(Boolean).join(' ')
}

type Look = { color?: string; bold?: true; dimColor?: true }

/** Working and Done recede, a wait for a person stands out, Ready is go. */
export const statusLook: Record<FlowStatus, Look> = {
  working: { dimColor: true },
  waiting: { color: 'yellow', bold: true },
  ready: { color: 'green' },
  done: { dimColor: true },
}

/** The terminal's accent, for the stage the task is in. */
export const ACCENT = 'cyan'

/** Each workflow's chip color, the board's hues. */
export const FLOW_COLOR: Record<FlowWorkflow, string> = {
  oneshot: '#5ad1e6',
  grill: '#f59e6b',
  spec: '#a78bfa',
  wayfind: '#6ee7a8',
  freeform: '#b4bccb',
}

export const STATUS_GLYPH: Record<FlowStatus, string> = { working: '…', waiting: '◆', ready: '●', done: '✓' }

/** The band's frame follows the status: a wait for a person is the one that stands out. */
export const STATUS_BORDER: Record<FlowStatus, { borderColor: string; borderDimColor?: boolean }> = {
  working: { borderColor: 'gray', borderDimColor: true },
  waiting: { borderColor: 'yellow' },
  ready: { borderColor: 'green' },
  done: { borderColor: 'gray', borderDimColor: true },
}

export const glyph = { done: '✓', now: '●', ahead: '○' } as const

export const gateText = (gate: 'approved' | 'waiting' | 'ahead' | undefined) =>
  gate === 'approved' ? 'approved' : gate === 'waiting' ? 'waiting for approval' : undefined

/** Stages reached and stages in the rail; Freeform has none, so no progress. */
export const progress = (task: FlowTask) => {
  if (task.flow === 'freeform') {
    return undefined
  }
  const stops = rail(task)

  return { at: stops.filter(stop => stop.state !== 'ahead').length, of: stops.length }
}

/** `stage 2 of 6`, or `not started` before the first stage; undefined for Freeform. */
export const stageText = (task: FlowTask) => {
  const found = progress(task)

  return found === undefined ? undefined : found.at === 0 ? 'not started' : `stage ${found.at} of ${found.of}`
}

/** The workflow's chip text: `Spec 2/6`, or just `Freeform`. */
export const badgeText = (label: string, task: FlowTask) => {
  const found = progress(task)

  return found === undefined ? label : `${label} ${found.at}/${found.of}`
}

/** The pane's second line: where the task lives, how far it got, what it runs on. */
export const subline = (task: FlowTask) =>
  [
    `.scratch/${task.slug}`,
    stageText(task),
    task.model === undefined ? undefined : `model ${task.model}`,
    task.effort === undefined ? undefined : `effort ${task.effort}`,
  ]
    .filter(Boolean)
    .join(' · ')

/** Freeform has no rail: the skills that ran, latest last. */
export const skillsRun = (task: FlowTask) => task.history.slice(-10).map(step => step.skill)

/** The keys that work now, as the pane's one dim line. */
export const keyHints = (task: FlowTask) =>
  [
    'n next',
    task.artifacts.length > 0 ? 'o artifact' : undefined,
    nextAction(task).alt === undefined ? undefined : `m ${nextAction(task).alt?.label.toLowerCase() ?? ''}`,
    editGate(task, 'src') === undefined ? undefined : 'e allow edits',
    'b board',
    'ctrl+x tab focus',
    'esc back',
  ]
    .filter(Boolean)
    .join(' · ')

/** Rows the framed band needs: the frame, the header, the strip's rows (one for Freeform's note), the next step, and a quickbar row under it. */
export const bandRows = (stripRows: number) => 2 + 1 + Math.max(1, stripRows) + 1 + 1

/** Whether the button and its why share one line in `columns` cells. */
export const fitsOneLine = (columns: number, label: string, why: string) => label.length + why.length + 6 <= columns

/** Board rows: open tasks first, closed ones last, each group in the order given. */
export const boardOrder = (tasks: FlowTask[]) => [
  ...tasks.filter(task => task.closedAt === undefined),
  ...tasks.filter(task => task.closedAt !== undefined),
]
