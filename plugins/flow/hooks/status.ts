// What the band and the board pane say and how they style it. Pure: the
// drawing lives in ui*.tsx.
import type { FlowStatus, FlowTask, JevMode } from '../types'
import { GATED, gateArtifact, nextAction } from './flow'
import { PROVE, STUCK_AFTER, failStreak, judgedGap, proofGap, rounds, stuckReason } from './proof'
import { FLOWS, stageLabel } from './flows'
import { shortPointer } from './trail'

export const RAIL = 'flow'

/**
 * A button label that carries its key, `n: Build`, as the terminal writes a plain button's
 * (`1: Yes`): it draws no key on a bordered one. Other surfaces show their own.
 */
export const keyed = (surface: string, key: string, label: string) => (surface === 'terminal' ? `${key}: ${label}` : label)

/** `text` cut to `width` cells, ending in an ellipsis when it had to be cut. */
export const fit = (text: string, width: number) => {
  const chars = [...text]

  return chars.length <= width ? text : `${chars.slice(0, Math.max(0, width - 1)).join('')}…`
}

/** An artifact as the board lists it under its stage: a file in the task's own folder by its name there. */
export const artifactLabel = (task: FlowTask, pointer: string) => {
  const own = `.scratch/${task.slug}/`

  return pointer.startsWith(own) ? pointer.slice(own.length) : shortPointer(pointer)
}

/** The next command as a person types it: `/to-spec` or `/flow approve`. */
export const commandLine = (task: FlowTask) => {
  const step = nextAction(task)

  return [`/${step.command}`, step.args].filter(Boolean).join(' ')
}

/** The next command without its arguments, as the band names it beside its button. */
export const commandName = (task: FlowTask) => {
  const step = nextAction(task)

  return step.command === 'flow' ? `/flow ${step.args ?? ''}`.trim() : `/${step.command}`
}

/** What the next step does, in words: the stage it starts, or closing the task. */
export const actionLabel = (task: FlowTask) => {
  const step = nextAction(task)
  if (step.stage !== undefined) {
    return stageLabel(step.stage)
  }

  return step.command === 'ask-matt' ? 'Pick a skill' : step.args === 'approve' ? `Approve the ${GATED[task.phase] ?? 'stage'}` : 'Close the task'
}

/** What a waiting gate asks a person to read first: the spec or the tickets. */
export const readLabel = (task: FlowTask) => `Read the ${GATED[task.phase] ?? 'artifact'}`

/**
 * The prompt the empty box offers as ghost text: the next step once the task is ready, the
 * artifact to read at a waiting gate, the ask for proof while a build lacks it, and nothing while
 * a stage is under way, where the engine's own guess at a reply is the better one.
 */
export const ghostOf = (task: FlowTask, status: FlowStatus) =>
  status === 'ready'
    ? commandLine(task)
    : status === 'waiting' && gateArtifact(task) !== undefined
      ? '/flow doc'
      : status === 'proof'
        ? PROVE
        : undefined

/** Why the task needs proof or a person, as the band and the board say it beside the status. */
export const holdNote = (task: FlowTask, status: FlowStatus) => {
  if (status !== 'proof') {
    return status === 'stuck' ? stuckReason(task) : undefined
  }
  // A fact reads as itself; a judgment names its judge.
  const judged = judgedGap(task)

  return proofGap(task) ?? (judged === undefined ? undefined : `Jev: ${judged}`)
}

export const proofText = (proof: 'proven' | 'needed' | 'ahead' | undefined) =>
  proof === 'proven' ? 'proven' : proof === 'needed' ? 'needs proof' : proof === 'ahead' ? 'checks must pass' : undefined

/**
 * The counts a person steers by, for the band and the board: the build's round of edit and check
 * past the first, how long its latest check has been failing (until that reads Needs you), what
 * the person sent back, and Jev's mode while it is not off.
 */
export const tally = (task: FlowTask, jev: JevMode) => {
  const round = rounds(task)
  const streak = failStreak(task)
  const reworks = task.log.filter(one => one.kind === 'rework').length

  return [
    round > 1 ? `round ${round}` : undefined,
    streak !== undefined && streak.failures < STUCK_AFTER ? `check failed ${streak.failures} of ${STUCK_AFTER} tries` : undefined,
    reworks > 0 ? `${reworks} rework${reworks === 1 ? '' : 's'}` : undefined,
    jev === 'off' ? undefined : `Jev ${jev}`,
  ].filter((one): one is string => one !== undefined)
}

type Look = { color?: string; bold?: true; dimColor?: true }

/** The terminal's accent, for the stage the task is in. */
export const ACCENT = 'cyan'

/** Working and Done recede, a stage under way takes the accent, a wait for approval or proof stands out, Ready is go. */
export const statusLook: Record<FlowStatus, Look> = {
  working: { dimColor: true },
  progress: { color: ACCENT },
  waiting: { color: 'yellow', bold: true },
  proof: { color: 'magenta', bold: true },
  stuck: { color: 'red', bold: true },
  ready: { color: 'green', bold: true },
  done: { dimColor: true },
}

export const STATUS_GLYPH: Record<FlowStatus, string> = { working: '…', progress: '●', waiting: '◆', proof: '◇', stuck: '!', ready: '●', done: '✓' }

/** The band's frame follows the status. */
export const STATUS_BORDER: Record<FlowStatus, { borderColor: string; borderDimColor?: boolean }> = {
  working: { borderColor: 'gray', borderDimColor: true },
  progress: { borderColor: ACCENT },
  waiting: { borderColor: 'yellow' },
  proof: { borderColor: 'magenta' },
  stuck: { borderColor: 'red' },
  ready: { borderColor: 'green' },
  done: { borderColor: 'gray', borderDimColor: true },
}

export const gateText = (gate: 'approved' | 'waiting' | 'ahead' | undefined) =>
  gate === 'approved' ? 'approved' : gate === 'waiting' ? 'needs approval' : gate === 'ahead' ? 'you approve' : undefined

/** What the board says beside its Stages heading: the workflow, and what the task runs on when set. */
export const subline = (task: FlowTask) =>
  [
    `${FLOWS[task.flow].label} workflow`,
    task.model === undefined && task.effort === undefined ? undefined : [task.model, task.effort].filter(Boolean).join(' at '),
  ]
    .filter(Boolean)
    .join(' · ')

/** Freeform has no rail: the skills that ran, latest last. */
export const skillsRun = (task: FlowTask) => task.history.slice(-10).map(step => step.skill)

/** Board rows: open tasks first, then up to five closed ones, each group in the order given. */
export const boardOrder = (tasks: FlowTask[]) => [
  ...tasks.filter(task => task.closedAt === undefined),
  ...tasks.filter(task => task.closedAt !== undefined).slice(0, 5),
]
