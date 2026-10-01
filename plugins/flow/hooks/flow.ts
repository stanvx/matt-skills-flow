// The flow as ask-matt draws it: stages move a task, steps only record.
// Stage skills are user-invoked, so only a person can move a task; a
// model-invoked skill counts as a stage only where the task's flow has it.
import type { FlowCreate, FlowEffort, FlowEntry, FlowEvent, FlowWorkflow, FlowNext, FlowStatus, FlowTask } from '../types'
import { EFFORTS, FLOWS, FLOW_NAMES, FLOW_OF, LEGACY_FLOW, ONRAMP, WHY, commandOf } from './flows'
import { isProven, proofGap, stuckReason } from './proof'

export const STAGES = [
  'grill-with-docs',
  'wayfinder',
  'wayfinder-clear',
  'to-spec',
  'to-tickets',
  'implement',
  'implement-spec',
  'retro',
]

export const STEPS = [
  'grilling',
  'domain-modeling',
  'prototype',
  'research',
  'tdd',
  'code-review',
  'pr',
  'wizard',
  'handoff',
  'diagnosing-bugs',
]

/** Phases that shape the work: code edits wait for /implement. */
export const PLANNING = ['grill-with-docs', 'wayfinder', 'wayfinder-clear', 'to-spec', 'to-tickets']

/** Phases whose artifact waits for a person's approval, and what it is called. */
export const GATED: Record<string, string> = { 'to-spec': 'spec', 'to-tickets': 'tickets' }

const ENTRY_WORDS: Record<string, FlowEntry> = {
  ticket: 'ticket',
  implement: 'ticket',
  idea: 'idea',
  grill: 'idea',
  broken: 'broken',
  diagnose: 'broken',
  foggy: 'foggy',
  wayfind: 'foggy',
  wayfinder: 'foggy',
}

/** `mattpocock-skills:to-spec` and `to-spec` are the same skill. */
export const skillName = (name: string) => name.slice(name.lastIndexOf(':') + 1)

// ponytail: keyword heuristic, `--start` overrides it; a $.model.complete
// classifier if the guesses keep missing.
export const inferEntry = (text: string): FlowEntry => {
  if (/(^|\s)(#\d+|https?:\/\/\S+\/(issues|pull)\/\d+|[A-Z][A-Z0-9]+-\d+)(\s|$)/.test(text)) {
    return 'ticket'
  }
  if (/\b(bug|broken|crash(es|ing)?|failing|errors?|regression|flaky)\b/i.test(text)) {
    return 'broken'
  }
  if (/\b(greenfield|foggy|from scratch|rewrite)\b/i.test(text)) {
    return 'foggy'
  }

  return 'idea'
}

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '') || 'task'

type NewOptions = Omit<FlowCreate, 'text'>

const FLAG = /^--(start|workflow|model|effort)[= ](\S+)\s*|^--(no-pr|worktree)(?:\s+|$)/

export const isFlow = (word: string): word is FlowWorkflow => (FLOW_NAMES as readonly string[]).includes(word)
const isEffort = (word: string): word is FlowEffort => (EFFORTS as readonly string[]).includes(word)

/** One flag's options, or undefined when its value is not one it takes. */
const flagOptions = (name: string, value: string): NewOptions | undefined => {
  switch (name) {
    case 'start':
      return ENTRY_WORDS[value] === undefined ? undefined : { start: ENTRY_WORDS[value] }
    case 'workflow':
      return isFlow(value) ? { flow: value } : undefined
    case 'effort':
      return isEffort(value) ? { effort: value } : undefined
    case 'model':
      return { model: value }
    case 'no-pr':
      return { openPr: false }
    default:
      return { worktree: 'now' }
  }
}

/**
 * Parses `/flow new [--workflow f] [--start e] [--model m] [--effort e] [--no-pr]
 * [--worktree] <what are we doing>`; `bad` names the first flag it refused.
 */
export const parseNew = (args: string, options: NewOptions = {}): { text: string; options: NewOptions; bad?: string } => {
  const text = args.trim()
  const match = FLAG.exec(text)
  if (match === null) {
    return { text, options }
  }
  const [spelled, valued, value = '', bare] = match
  const name = valued ?? bare ?? ''
  const found = flagOptions(name, value)

  return found === undefined
    ? { text, options, bad: `--${name} ${value}` }
    : parseNew(text.slice(spelled.length), { ...options, ...found })
}

export const createTask = (text: string, at: number, options: NewOptions = {}): FlowTask => {
  const title = (options.title ?? text.split('\n')[0] ?? '').trim().slice(0, 72)
  const entry = options.start ?? inferEntry(text)

  return {
    slug: slugify(title),
    title,
    entry,
    flow: options.flow ?? FLOW_OF[entry],
    openPr: options.openPr ?? true,
    worktree: options.worktree ?? 'never',
    ...(options.model === undefined || options.model === '' ? {} : { model: options.model }),
    ...(options.effort === undefined ? {} : { effort: options.effort }),
    phase: 'new',
    history: [],
    artifacts: [],
    log: [],
    createdAt: at,
  }
}

/** A task read from disk; older files lack the later fields. */
export const withDefaults = (
  task: Partial<FlowTask> & Omit<FlowTask, 'artifacts' | 'log' | 'flow' | 'openPr' | 'worktree'>,
): FlowTask => ({
  ...task,
  flow: task.flow ?? LEGACY_FLOW[task.entry],
  openPr: task.openPr ?? true,
  worktree: task.worktree ?? 'never',
  artifacts: task.artifacts ?? [],
  log: task.log ?? [],
})

/** `implement` and `implement-spec` build the same thing: either fills the other's place in a flow. */
const slot = (stage: string) => (stage === 'implement-spec' ? 'implement' : stage)

const hasSlot = (stages: readonly string[], stage: string) => stages.some(one => slot(one) === slot(stage))

/** The stages the task's flow runs, in order, with its on-ramp and without `pr` when no PR is wanted. */
export const stagesOf = (task: Pick<FlowTask, 'flow' | 'entry' | 'openPr'>): string[] => {
  const [first, ...rest] = FLOWS[task.flow].stages
  const onramp = ONRAMP[task.entry]
  const stages = first === undefined ? [] : [onramp ?? first, ...rest]

  return task.openPr ? stages : stages.filter(one => one !== 'pr')
}

export const isStage = (skill: string, task: FlowTask) => STAGES.includes(skill) || stagesOf(task).includes(skill)

/** The task in the smallest bigger flow that runs `stage`, when its own flow lacks it. */
const grow = (task: FlowTask, stage: string, at: number): FlowTask => {
  if (task.flow === 'freeform' || task.flow === 'wayfind' || hasSlot(stagesOf(task), stage)) {
    return task
  }
  const bigger = FLOW_NAMES.slice(FLOW_NAMES.indexOf(task.flow) + 1, FLOW_NAMES.indexOf('freeform')).find(flow =>
    hasSlot(stagesOf({ ...task, flow }), stage),
  )

  return bigger === undefined ? task : recordEvent({ ...task, flow: bigger }, { kind: 'flow', detail: bigger }, at)
}

/** Whether the task records `rawSkill` at all. */
export const isTracked = (rawSkill: string, task: FlowTask) =>
  isStage(skillName(rawSkill), task) || STEPS.includes(skillName(rawSkill))

/** The task after `skill` ran, or the same task when the skill is not ours. */
export const recordSkill = (task: FlowTask, rawSkill: string, at: number): FlowTask => {
  const skill = skillName(rawSkill)
  if (!isTracked(skill, task)) {
    return task
  }
  const grown = isStage(skill, task) ? grow(task, skill, at) : task
  const stage = stageFor(grown, skill)

  return {
    ...grown,
    phase: isStage(stage, grown) ? stage : grown.phase,
    history: [...grown.history, { skill: stage, at }].slice(-200),
  }
}

/** The stage a skill run fills: a /wayfinder after the map was charted clears it. */
const stageFor = (task: FlowTask, skill: string) =>
  skill === 'wayfinder' &&
  stagesOf(task).includes('wayfinder-clear') &&
  task.history.some(step => step.skill === 'wayfinder' || step.skill === 'wayfinder-clear')
    ? 'wayfinder-clear'
    : skill

/** The map a Wayfind task charted: a local map file, else the first issue the charting created. */
export const mapOf = (task: FlowTask) => {
  const charted = task.artifacts.filter(one => one.phase === 'wayfinder')

  return (
    task.artifacts.find(one => one.pointer.endsWith('/map.md'))?.pointer ??
    charted.find(one => /\/issues\/\d+$/.test(one.pointer))?.pointer
  )
}

/** The task with `pointer` as the current phase's latest artifact. */
export const recordArtifact = (task: FlowTask, pointer: string, at: number): FlowTask =>
  task.artifacts.at(-1)?.pointer === pointer
    ? task
    : {
        ...task,
        artifacts: [...task.artifacts.filter(one => one.pointer !== pointer), { phase: task.phase, pointer, at }].slice(-100),
      }

/** The task with `event` logged against its current phase. */
export const recordEvent = (task: FlowTask, event: Omit<FlowEvent, 'phase' | 'at'>, at: number): FlowTask => ({
  ...task,
  log: [...task.log, { ...event, phase: task.phase, at }].slice(-200),
})

const hasEvent = (task: FlowTask, kind: FlowEvent['kind']) =>
  task.log.some(one => one.kind === kind && one.phase === task.phase)

export const isApproved = (task: FlowTask) => hasEvent(task, 'approve')

/** What a gate asks a person to read: the phase's latest artifact that is not a pull request. */
export const gateArtifact = (task: FlowTask) =>
  task.artifacts.filter(one => one.phase === task.phase && !/\/pull\/\d+$/.test(one.pointer)).at(-1)
export const isAllowed = (task: FlowTask) => hasEvent(task, 'allow')

/** Whether a gate waits on a person: an unapproved gated phase with something recorded to read. */
export const isWaiting = (task: FlowTask) => task.phase in GATED && !isApproved(task) && gateArtifact(task) !== undefined

export const approvePhase = (task: FlowTask, at: number) =>
  task.phase in GATED && !isApproved(task) ? recordEvent(task, { kind: 'approve' }, at) : task

/** A person's allow lifts a planning phase's edit gate, or waives the proof a build's edits still need. */
export const allowPhase = (task: FlowTask, at: number) =>
  (PLANNING.includes(task.phase) && !isAllowed(task)) || proofGap(task) !== undefined
    ? recordEvent(task, { kind: 'allow' }, at)
    : task

/** `path` relative to `root`, `.` and `..` folded; undefined outside it. */
// ponytail: lexical, symlinks not followed; the gate is advisory. $.fs.stat
// realPath of the nearest existing parent if a model ever walks around it.
export const inside = (root: string, path: string) => {
  const fold = (spelled: string) =>
    spelled.split('/').reduce<string[]>(
      (kept, part) => (part === '..' ? kept.slice(0, -1) : part === '' || part === '.' ? kept : [...kept, part]),
      [],
    )
  const base = fold(root)
  const parts = fold(path.startsWith('/') ? path : `${root}/${path}`)

  return base.every((part, at) => parts[at] === part) ? parts.slice(base.length).join('/') : undefined
}

/** The artifact pointer for a file a tool wrote under the repo, if it is one. */
export const scratchPointer = (rel: string | undefined) =>
  rel?.startsWith('.scratch/') && !rel.endsWith('/task.json') ? rel : undefined

/** The issue or PR URL a `gh issue create` or `gh pr create` printed, if any. */
export const createdUrl = (command: string, output: string | undefined) =>
  /\bgh\s+(issue|pr)\s+create\b/.test(command)
    ? /https:\/\/\S+\/(issues|pull)\/\d+/.exec(output ?? '')?.[0]
    : undefined

/** Why an edit to repo-relative `rel` waits in this phase, or undefined when it may go ahead. */
export const editGate = (task: FlowTask, rel: string | undefined) => {
  const isFine =
    rel === undefined ||
    task.flow === 'freeform' ||
    !PLANNING.includes(task.phase) ||
    isAllowed(task) ||
    rel.startsWith('.scratch/') ||
    rel.endsWith('.md') ||
    task.history.at(-1)?.skill === 'prototype'
  if (isFine) {
    return undefined
  }

  return [
    `flow: the task "${task.title}" is in ${task.phase}, a planning phase, so code edits wait for /implement.`,
    'Markdown, .scratch/ and prototypes are fine now.',
    'If this edit belongs in planning, stop and ask the user to run /flow allow, which lifts the gate for the rest of this phase.',
  ].join(' ')
}

export type RailStop = { stage: string; state: 'done' | 'now' | 'ahead' }

/** Stages behind, the one the task is in, and the ones its flow runs after the furthest it reached. */
export const rail = (task: FlowTask): RailStop[] => {
  const stages = stagesOf(task)
  const now = task.phase === 'new' ? [] : [task.phase]
  const behind = [...new Set(task.history.map(step => step.skill).filter(skill => isStage(skill, task)))].filter(
    stage => stage !== task.phase,
  )
  const reached = Math.max(-1, ...[...behind, ...now].map(stage => stages.findIndex(one => slot(one) === slot(stage))))
  const ahead = stages.slice(reached + 1).filter(stage => !hasSlot([...behind, ...now], stage))

  return [
    ...behind.map(stage => ({ stage, state: 'done' as const })),
    ...now.map(stage => ({ stage, state: 'now' as const })),
    ...ahead.map(stage => ({ stage, state: 'ahead' as const })),
  ]
}

export const nextAction = (task: FlowTask): FlowNext => {
  const gated = GATED[task.phase]
  if (gated !== undefined && !isApproved(task)) {
    const made = gateArtifact(task)

    // Nothing recorded yet: there is nothing to approve, so the stage's own command comes first.
    return made === undefined
      ? { command: commandOf(task.phase), stage: task.phase, why: `no ${gated} recorded yet: write it, or /flow approve <path or link>` }
      : { command: 'flow', args: 'approve', why: `read ${made.pointer}, then approve the ${gated}` }
  }
  // The ticket the task was made from, else its title: what the first stage reads.
  const ticket = task.artifacts.find(one => one.phase === 'new')?.pointer ?? task.title

  if (task.flow === 'freeform') {
    return task.phase === 'new'
      ? { command: 'ask-matt', args: ticket, why: 'freeform: ask-matt picks the skill' }
      : { command: 'flow', args: 'done', why: 'freeform: run any skill, then close the task' }
  }
  const upNext = rail(task).find(stop => stop.state === 'ahead')?.stage
  const map = mapOf(task)
  // Clearing the map loops, one ticket per session, until the person says it is clear.
  if (task.phase === 'wayfinder-clear') {
    return {
      command: 'wayfinder',
      ...(map === undefined ? {} : { args: map }),
      stage: 'wayfinder-clear',
      why: map === undefined ? "next frontier ticket: pass the map's link" : 'next frontier ticket, one per session; /clear between',
      ...(upNext === undefined ? {} : { alt: { command: commandOf(upNext), label: 'Map is clear' } }),
    }
  }
  if (upNext === undefined) {
    return { command: 'flow', args: 'done', why: 'close the task' }
  }
  if (upNext === 'wayfinder-clear') {
    return map === undefined
      ? { command: 'wayfinder', stage: upNext, why: 'clear the map: pass its link; one frontier ticket per session' }
      : { command: 'wayfinder', args: map, stage: upNext, why: WHY[upNext] ?? '' }
  }
  const why = WHY[upNext] ?? `run /${upNext}`
  const command = commandOf(upNext)

  return task.phase === 'new'
    ? { command, args: ticket, stage: upNext, why: `start here: ${why}` }
    : { command, stage: upNext, why }
}

/**
 * Whether the model reported the current stage finished since that stage last started. A build
 * stage also needs its proof: a code edit after the report reopens it.
 */
export const isFinished = (task: FlowTask) => {
  const started = task.history.filter(step => step.skill === task.phase).at(-1)?.at ?? Number.NEGATIVE_INFINITY

  return isProven(task) && task.log.some(one => one.kind === 'done' && one.phase === task.phase && one.at >= started)
}

/**
 * Where the task stands for a person; `busy` is whether a model turn runs now. Between turns a
 * stage is under way until the model reports it finished, its gate is approved, or it has not
 * started; only then is the next stage the thing to do. A build stage whose edits lack a passing
 * check needs proof first, and one that loops or is blocked needs a person.
 */
export const statusOf = (task: FlowTask, busy: boolean): FlowStatus => {
  if (task.closedAt !== undefined) {
    return 'done'
  }
  if (busy) {
    return 'working'
  }
  if (isWaiting(task)) {
    return 'waiting'
  }
  if (stuckReason(task) !== undefined) {
    return 'stuck'
  }
  if (!isProven(task)) {
    return 'proof'
  }
  // A gate is settled by approval alone: reported done with nothing recorded, it still needs the artifact named.
  const isSettled = task.flow === 'freeform' || task.phase === 'new' || (task.phase in GATED ? isApproved(task) : isFinished(task))

  return isSettled ? 'ready' : 'progress'
}
