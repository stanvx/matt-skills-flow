// The adaptive view, as data: the metro line of stages, and the choices a
// decision offers. While a stage works the line sits under the prompt; at a
// decision the band above the prompt draws the same line with the choices
// forking off the stage. Pure: ui.tsx draws it.
import type { FlowStatus, FlowTask } from '../types'
import { GATED, gateArtifact, nextAction } from './flow'
import { commandOf } from './flows'
import { PROVE, failStreak } from './proof'
import { THEME, actionLabel, readLabel } from './status'
import type { Chip, Segment } from './strip'

/** Each stage in a word or two, so a whole workflow fits on one line. */
export const SHORT: Record<string, string> = {
  'grill-with-docs': 'Decide',
  wayfinder: 'Map',
  'wayfinder-clear': 'Clear',
  'diagnosing-bugs': 'Diagnose',
  'to-spec': 'Spec',
  'to-tickets': 'Tickets',
  implement: 'Build',
  'implement-spec': 'Build',
  pr: 'PR',
  retro: 'Look back',
}

const NODE = { done: '●', now: '◉', next: '◎', ahead: '○' } as const

/** The decision moments: the band expands at these, and stays out of the way otherwise. */
export const DECIDES: readonly FlowStatus[] = ['ready', 'waiting', 'proof', 'stuck']

/** The colour of the stage the task stands on: the accent while it works, the status colour when it holds. */
const hotColor = (status: FlowStatus) =>
  status === 'proof' ? THEME.ask : status === 'stuck' ? THEME.stop : status === 'waiting' ? THEME.wait : status === 'ready' ? THEME.ok : THEME.accent

const cells = (chips: readonly Chip[]) => chips.reduce((sum, chip) => sum + [...chip.text].length, 0)

/**
 * The stages as one line of nodes and track: the stage under way (or next) named on a coloured
 * tile, done track solid and green, the rest thin and dim. `isNamed` false leaves the quiet
 * stages as nodes alone, for a line that would not fit.
 */
const lineOf = (segments: readonly Segment[], status: FlowStatus, isNamed: boolean): Chip[] =>
  segments.flatMap((one, at) => {
    const isHot = one.state === 'now' || one.state === 'next'
    const look = one.state === 'done' ? { color: THEME.ok } : isHot ? { color: hotColor(status) } : { dimColor: true as const }
    const label = SHORT[one.stage] ?? one.label
    const after = segments[at + 1]
    const isLit = after !== undefined && after.state !== 'ahead'

    return [
      { text: NODE[one.state], ...look },
      ...(isHot ? [{ text: ' ' }, { text: ` ${label} `, color: 'inverseText', backgroundColor: hotColor(status), bold: true as const }] : isNamed ? [{ text: ` ${label}`, ...look }] : []),
      ...(after === undefined ? [] : [isLit ? { text: ' ━━━ ', color: THEME.ok } : { text: ' ─── ', dimColor: true as const }]),
    ]
  })

/** The metro line in at most `columns` cells: every stage named, or, `isQuiet` or short of room, only the one that matters. */
export const metro = (segments: readonly Segment[], status: FlowStatus, columns: number, isQuiet = false): Chip[] => {
  const full = lineOf(segments, status, true)

  return !isQuiet && cells(full) <= columns ? full : lineOf(segments, status, false)
}

/** Cells before the hot stage's node: where a decision's fork hangs from the line. */
export const forkAt = (chips: readonly Chip[]) => {
  const at = chips.findIndex(chip => chip.backgroundColor !== undefined)

  return at <= 1 ? 0 : cells(chips.slice(0, at - 2))
}

export type ChoiceAct = 'run' | 'alt' | 'read' | 'redo' | 'prove' | 'diagnose'

/** One way on from a decision: its digit, what it does in words, and why. The first is the recommended one. */
export type Choice = { key: string; act: ChoiceAct; label: string; why: string; command?: string }

/** Digits the band keeps for its choices whenever a task is open, so saved phrases keep theirs. */
export const CHOICE_KEYS = 3

const redo = (task: FlowTask, why: string): Omit<Choice, 'key'> | undefined =>
  task.flow === 'freeform' || task.phase === 'new' ? undefined : { act: 'redo', label: `Redo ${GATED[task.phase] === undefined ? (SHORT[task.phase] ?? task.phase) : `the ${GATED[task.phase]}`}`, why, command: commandOf(task.phase) }

/**
 * What a decision offers, recommended first, each on a digit: move on, read what waits for
 * approval, prove or diagnose what holds the build, and always a way to redo the stage or retry.
 * Approving stays in the artifact tab: no digit approves.
 */
export const choices = (task: FlowTask, status: FlowStatus): Choice[] => {
  const step = nextAction(task)
  const all: (Omit<Choice, 'key'> | undefined)[] =
    status === 'ready'
      ? [
          { act: 'run', label: actionLabel(task), why: step.stage === undefined ? 'Every stage is done.' : 'Start the next stage.' },
          step.alt === undefined ? undefined : { act: 'alt', label: step.alt.label, why: `/${step.alt.command}` },
          redo(task, 'Run this stage again.'),
        ]
      : status === 'waiting'
        ? [
            { act: 'read', label: readLabel(task), why: gateArtifact(task) === undefined ? 'Then approve it there.' : 'Opens it beside the chat. Approve it there.' },
            redo(task, 'Write it again, with your notes in the prompt.'),
          ]
        : status === 'proof'
          ? [
              // A failing check is fixed before it proves anything: the label says so, and digging deeper is the other way.
              failStreak(task) === undefined
                ? { act: 'prove', label: 'Prove it', why: 'Run the checks and show the change working.', command: PROVE }
                : { act: 'prove', label: 'Fix and prove', why: 'Fix what fails, then run the checks again.', command: PROVE },
              // Digging deeper waits for a second failure: the first one is most often fixed in place.
              (failStreak(task)?.failures ?? 0) < 2 ? undefined : { act: 'diagnose', label: 'Diagnose', why: 'Stop and find the root cause first.', command: 'diagnosing-bugs' },
            ]
          : status === 'stuck'
            ? [
                { act: 'diagnose', label: 'Diagnose', why: 'Find the root cause before trying again.', command: 'diagnosing-bugs' },
                { act: 'prove', label: 'Try again', why: 'Run the checks once more.', command: PROVE },
              ]
            : []

  return all
    .filter((one): one is Omit<Choice, 'key'> => one !== undefined)
    .slice(0, CHOICE_KEYS)
    .map((one, at) => ({ ...one, key: String(at + 1) }))
}

/** The engine's permission-mode label left of the hint row, as it writes it. */
const MODE_LABEL: Record<string, string> = {
  bypassPermissions: '⏵⏵ bypass permissions on',
  auto: '⏵⏵ auto mode on',
  acceptEdits: '⏵⏵ accept edits on',
  plan: '⏸ plan mode on',
}

/** Cells the engine's mode label takes left of a hint tree, its ` · ` included; 0 with none, null when unknown. */
export const pillWidth = (mode: string | undefined) => {
  if (mode === 'default') {
    return 0
  }
  const label = mode === undefined ? undefined : MODE_LABEL[mode]

  return label === undefined ? null : [...label].length + 3
}

/** The state line on the card the task stands on, in words. */
export const HERE: Record<FlowStatus, string> = {
  ready: '○ Up next',
  waiting: '◆ Your call',
  proof: '✗ Unproven',
  stuck: '! Stuck',
  progress: '◉ Now',
  working: '◉ Now',
  done: '✓ Done',
}

/** Stage cards per row: as wide as the room allows, 12 to 15 cells with their border, an arrow of 3 between. */
export const cardWidth = (count: number, columns: number) => Math.min(15, Math.floor((columns - (count - 1) * 3) / Math.max(1, count)))

/** Centre column of each of `count` boxes `width` wide, `gap` apart. */
export const centres = (count: number, width: number, gap: number) => Array.from({ length: count }, (_, at) => at * (width + gap) + Math.floor(width / 2))

/** Two rows of box drawing: a stem down from column `from`, then a rail that drops to each of `to`. */
export const forkLines = (from: number, to: readonly number[]): [string, string] => {
  const lo = Math.min(from, ...to)
  const hi = Math.max(from, ...to)
  const cell = (pos: number) => {
    const isTo = to.includes(pos)
    if (pos === from) {
      return isTo ? (lo === hi ? '│' : pos === lo ? '├' : pos === hi ? '┤' : '┼') : pos === lo ? '└' : pos === hi ? '┘' : '┴'
    }
    if (isTo) {
      return pos === lo ? '┌' : pos === hi ? '┐' : '┬'
    }

    return '─'
  }

  return [`${' '.repeat(from)}│`, Array.from({ length: hi + 1 }, (_, pos) => (pos < lo ? ' ' : cell(pos))).join('')]
}

/** What a stage is doing, as the line under the prompt says it while it works. */
const DOING: Record<string, string> = {
  'grill-with-docs': 'Deciding',
  wayfinder: 'Mapping',
  'wayfinder-clear': 'Clearing the map',
  'diagnosing-bugs': 'Diagnosing',
  'to-spec': 'Writing the spec',
  'to-tickets': 'Splitting tickets',
  implement: 'Building',
  'implement-spec': 'Building',
  pr: 'Opening the PR',
  retro: 'Looking back',
}

/** The status under the prompt in words: what the stage is doing, or that the next word is the person's. */
export const doing = (task: FlowTask, status: FlowStatus) =>
  status === 'progress' ? 'Your turn' : `${DOING[task.phase] ?? 'Working'}…`

/** What a choice after the recommended one is, on its card: another way on, a step back, or a retry. */
export const KIND_OF: Record<ChoiceAct, string> = {
  run: 'Instead',
  alt: 'Instead',
  read: 'Instead',
  redo: '↺ Go back',
  prove: '↻ Retry',
  diagnose: 'Dig deeper',
}

/** The choices that redo or retry a stage: on their own they still say so. */
export const RETRIES: readonly ChoiceAct[] = ['redo', 'prove']
