// The flow as ask-matt draws it: stages move a task, steps only record.
// Stage skills are user-invoked, so only a person can move a task; a
// model-invoked skill counts as a stage only where the task starts on it.
import type { MattEntry, MattEvent, MattNext, MattTask } from '../types'

export const STAGES = [
  'grill-with-docs',
  'wayfinder',
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

export const START: Record<MattEntry, string> = {
  ticket: 'implement',
  idea: 'grill-with-docs',
  broken: 'diagnosing-bugs',
  foggy: 'wayfinder',
}

/** Phases that shape the work: code edits wait for /implement. */
export const PLANNING = ['grill-with-docs', 'wayfinder', 'to-spec', 'to-tickets']

/** Phases whose artifact waits for a person's approval, and what it is called. */
export const GATED: Record<string, string> = { 'to-spec': 'spec', 'to-tickets': 'tickets' }

/** The stage that follows each stage on the rail. */
const AFTER: Record<string, string> = {
  'grill-with-docs': 'to-spec',
  wayfinder: 'to-spec',
  'to-spec': 'to-tickets',
  'to-tickets': 'implement-spec',
  implement: 'retro',
  'implement-spec': 'retro',
  'diagnosing-bugs': 'retro',
}

const ENTRY_WORDS: Record<string, MattEntry> = {
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
export const inferEntry = (text: string): MattEntry => {
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

/** Parses `/matt new [--start <entry>] <what are we doing>`. */
export const parseNew = (args: string) => {
  const match = /^--start[= ](\S+)\s*/.exec(args)
  const start = match ? ENTRY_WORDS[match[1] ?? ''] : undefined
  const text = (match ? args.slice(match[0].length) : args).trim()

  return { text, start, isBadStart: match !== null && start === undefined }
}

export const createTask = (text: string, at: number, start?: MattEntry): MattTask => {
  const title = (text.split('\n')[0] ?? '').trim().slice(0, 72)

  return {
    slug: slugify(title),
    title,
    entry: start ?? inferEntry(text),
    phase: 'new',
    history: [],
    artifacts: [],
    log: [],
    createdAt: at,
  }
}

/** A task read from disk; files written before M2 lack the later lists. */
export const withDefaults = (task: Partial<MattTask> & Omit<MattTask, 'artifacts' | 'log'>): MattTask => ({
  ...task,
  artifacts: task.artifacts ?? [],
  log: task.log ?? [],
})

export const isStage = (skill: string, task: MattTask) =>
  STAGES.includes(skill) || skill === START[task.entry]

/** Whether the task records `rawSkill` at all. */
export const isTracked = (rawSkill: string, task: MattTask) =>
  isStage(skillName(rawSkill), task) || STEPS.includes(skillName(rawSkill))

/** The task after `skill` ran, or the same task when the skill is not ours. */
export const recordSkill = (task: MattTask, rawSkill: string, at: number): MattTask => {
  const skill = skillName(rawSkill)
  if (!isTracked(skill, task)) {
    return task
  }

  return {
    ...task,
    phase: isStage(skill, task) ? skill : task.phase,
    history: [...task.history, { skill, at }].slice(-200),
  }
}

/** The task with `pointer` as the current phase's latest artifact. */
export const recordArtifact = (task: MattTask, pointer: string, at: number): MattTask =>
  task.artifacts.at(-1)?.pointer === pointer
    ? task
    : {
        ...task,
        artifacts: [...task.artifacts.filter(one => one.pointer !== pointer), { phase: task.phase, pointer, at }].slice(-100),
      }

/** The task with `event` logged against its current phase. */
export const recordEvent = (task: MattTask, event: Omit<MattEvent, 'phase' | 'at'>, at: number): MattTask => ({
  ...task,
  log: [...task.log, { ...event, phase: task.phase, at }].slice(-200),
})

const hasEvent = (task: MattTask, kind: MattEvent['kind']) =>
  task.log.some(one => one.kind === kind && one.phase === task.phase)

export const isApproved = (task: MattTask) => hasEvent(task, 'approve')
export const isAllowed = (task: MattTask) => hasEvent(task, 'allow')

export const approvePhase = (task: MattTask, at: number) =>
  task.phase in GATED && !isApproved(task) ? recordEvent(task, { kind: 'approve' }, at) : task

export const allowPhase = (task: MattTask, at: number) =>
  PLANNING.includes(task.phase) && !isAllowed(task) ? recordEvent(task, { kind: 'allow' }, at) : task

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
export const editGate = (task: MattTask, rel: string | undefined) => {
  const isFine =
    rel === undefined ||
    !PLANNING.includes(task.phase) ||
    isAllowed(task) ||
    rel.startsWith('.scratch/') ||
    rel.endsWith('.md') ||
    task.history.at(-1)?.skill === 'prototype'
  if (isFine) {
    return undefined
  }

  return [
    `matt: the task "${task.title}" is in ${task.phase}, a planning phase, so code edits wait for /implement.`,
    'Markdown, .scratch/ and prototypes are fine now.',
    'If this edit belongs in planning, stop and ask the user to run /matt allow, which lifts the gate for the rest of this phase.',
  ].join(' ')
}

export const nextAction = (task: MattTask): MattNext => {
  const gated = GATED[task.phase]
  if (gated !== undefined && !isApproved(task)) {
    const made = task.artifacts.filter(one => one.phase === task.phase).at(-1)

    return {
      command: 'matt',
      args: 'approve',
      why: made === undefined ? `approve the ${gated} once it is published` : `read ${made.pointer}, then approve the ${gated}`,
    }
  }

  switch (task.phase) {
    case 'new':
      return {
        command: START[task.entry],
        args: task.title,
        why: `start here: ${task.entry === 'idea' ? 'sharpen the idea first' : `reads as ${task.entry}`}`,
      }
    case 'grill-with-docs':
      return {
        command: 'to-spec',
        why: 'multi-session: spec it before any /clear. One session? /implement here',
      }
    case 'wayfinder':
      return { command: 'wayfinder', why: 'next frontier ticket; /to-spec once the map clears' }
    case 'to-spec':
      return { command: 'to-tickets', why: 'split the spec into tracer-bullet tickets' }
    case 'to-tickets':
      return {
        command: 'implement-spec',
        why: 'build the whole graph, or /clear and /implement one ticket at a time',
      }
    case 'implement':
    case 'implement-spec':
    case 'diagnosing-bugs':
      return { command: 'retro', why: 'look back before you /clear; more tickets? /implement next' }
    default:
      return { command: 'matt', args: 'done', why: 'close the task' }
  }
}

export type RailStop = { stage: string; state: 'done' | 'now' | 'ahead' }

const onward = (stage: string | undefined, seen: string[] = []): string[] =>
  stage === undefined || seen.includes(stage) ? seen : onward(AFTER[stage], [...seen, stage])

/** Stages behind, the one the task is in, and the usual ones ahead. */
export const rail = (task: MattTask): RailStop[] => {
  const behind = [...new Set(task.history.map(step => step.skill).filter(skill => isStage(skill, task)))]
  const ahead = onward(task.phase === 'new' ? START[task.entry] : AFTER[task.phase])

  return [
    ...behind.filter(stage => stage !== task.phase).map(stage => ({ stage, state: 'done' as const })),
    ...(task.phase === 'new' ? [] : [{ stage: task.phase, state: 'now' as const }]),
    ...ahead.map(stage => ({ stage, state: 'ahead' as const })),
  ]
}
