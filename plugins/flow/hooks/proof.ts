// The proof gate: a build stage's work counts as finished once every check
// run since its last code edit passes, not on the model's word. Pure.
import type { FlowEvent, FlowTask } from '../types'

/** Phases that change code. */
export const BUILD = ['implement', 'implement-spec', 'diagnosing-bugs']

/** The same check failing this many times in a row is a loop a person should break. */
export const STUCK_AFTER = 3

/** Whether an edit to repo-relative `rel` is code: markdown and the task's own folder never need proof. */
export const isCode = (rel: string | undefined) => rel !== undefined && !rel.startsWith('.scratch/') && !rel.endsWith('.md')

const isGated = (task: FlowTask, phase: string) => task.flow !== 'freeform' && BUILD.includes(phase)

/** A build phase's events are every build phase's: an unproven edit follows the task from Build into Diagnose and back. */
const eventsOf = (task: FlowTask, phase: string) => task.log.filter(one => (BUILD.includes(phase) ? BUILD.includes(one.phase) : one.phase === phase))

/** The phase's events after its last code edit, or undefined when it has none. */
const sinceEdit = (task: FlowTask, phase: string) => {
  const events = eventsOf(task, phase)
  const edited = events.findLastIndex(one => one.kind === 'edit')

  return edited === -1 ? undefined : events.slice(edited + 1)
}

/** Whether the phase's code was edited at all. */
export const hasEdits = (task: FlowTask, phase = task.phase) => isGated(task, phase) && sinceEdit(task, phase) !== undefined

/**
 * What the phase's code edits still lack, in words, or undefined when they are proven: every
 * check run since the last edit passes (and one ran), a task with a UI was also seen working, or
 * a person waived it with /flow allow.
 */
export const proofGap = (task: FlowTask, phase = task.phase) => {
  const since = isGated(task, phase) ? sinceEdit(task, phase) : undefined
  if (since === undefined || since.some(one => one.kind === 'allow')) {
    return undefined
  }
  // Each check's latest run: a later run of the same command replaces the earlier one.
  const latest = [...new Map(since.filter(one => one.kind === 'check').map(one => [one.detail ?? '', one])).values()]
  const failing = latest.find(one => one.ok !== true)

  if (latest.length === 0) {
    return 'no check has passed since the last code edit'
  }
  if (failing !== undefined) {
    return `\`${failing.detail ?? 'a check'}\` is failing (run that same command again once it is fixed)`
  }

  // A change a person sees is proven by seeing it: the repo's verify skill, or what was observed, saved.
  return task.ui === true && !since.some(one => one.kind === 'seen')
    ? `the change has not been seen working: run the verify skill, or save what you observed to .scratch/${task.slug}/proof.md`
    : undefined
}

/** What a tool call or a skill shows of the change working, or undefined: the verify skill, or a proof file under the task's folder. */
export const seenIn = (input: { skill?: string; pointer?: string; command?: string }) =>
  input.skill === 'verify'
    ? 'verify'
    : input.pointer !== undefined && /^\.scratch\/.*\/proof[^/]*$/.test(input.pointer)
      ? input.pointer
      : // Written by the command, not merely named: a redirect, an output flag, or a screenshot's target.
        /(?:>|-o|--output|screencap(?:\s+-p)?|screenshot)\s*["']?(\S*\.scratch\/\S*\/proof[^/\s"']*)/.exec(input.command ?? '')?.[1]

/** What showed the change working since the phase's last code edit (`verify`, or the proof file's path), or undefined. */
export const seenWorking = (task: FlowTask, phase = task.phase) =>
  (isGated(task, phase) ? sinceEdit(task, phase) : undefined)?.findLast(one => one.kind === 'seen')?.detail

export const isProven = (task: FlowTask, phase = task.phase) => proofGap(task, phase) === undefined

/**
 * What a judge of the turn's evidence (Jev) still found short once the checks pass, in words, or
 * undefined. A judgment, so it only keeps the band from reading Ready: it never refuses anything.
 */
export const judgedGap = (task: FlowTask) => {
  const since = isGated(task, task.phase) ? sinceEdit(task, task.phase) : undefined
  const judged = since?.some(one => one.kind === 'allow') === true ? undefined : since?.findLast(one => one.kind === 'judged')

  return judged?.ok === false ? (judged.detail ?? 'the evidence is short') : undefined
}

/** Whether a code edit now needs a fresh `edit` event: only the first of a run of edits is kept. */
export const needsEditStamp = (task: FlowTask) => {
  const since = isGated(task, task.phase) ? sinceEdit(task, task.phase) : []

  return since === undefined || since.some(one => ['check', 'allow', 'done', 'judged', 'seen', 'blocked'].includes(one.kind))
}

/** The build's latest check and how many times in a row it has failed, or undefined while it passes: the loop a person may have to break. */
export const failStreak = (task: FlowTask) => {
  if (!isGated(task, task.phase)) {
    return undefined
  }
  const events = eventsOf(task, task.phase)
  // A person's allow answers the loop: only failures after it count.
  const checks = events.slice(events.findLastIndex(one => one.kind === 'allow') + 1).filter(one => one.kind === 'check')
  const last = checks.at(-1)
  const passedAt = checks.findLastIndex(one => one.ok === true || one.detail !== last?.detail)
  const failures = checks.length - 1 - passedAt

  return last === undefined || failures === 0 ? undefined : { command: last.detail ?? 'a check', failures }
}

/** How many runs of code edits the build has had: each one is a round of edit, then check. */
export const rounds = (task: FlowTask) => (isGated(task, task.phase) ? eventsOf(task, task.phase).filter(one => one.kind === 'edit').length : 0)

const MOVES: readonly FlowEvent['kind'][] = ['edit', 'check', 'done', 'allow', 'seen']

/**
 * Why the build stage needs a person, or undefined: the model reported it blocked and nothing
 * moved since, or the same check keeps failing.
 */
export const stuckReason = (task: FlowTask) => {
  // Any stage can report itself blocked; only a build stage loops on a check.
  const events = eventsOf(task, task.phase)
  const blocked = events.findLastIndex(one => one.kind === 'blocked')
  if (blocked !== -1 && !events.slice(blocked + 1).some(one => MOVES.includes(one.kind))) {
    return `blocked: ${events[blocked]?.detail ?? 'the model needs you'}`
  }
  if (!isGated(task, task.phase)) {
    return undefined
  }
  const streak = failStreak(task)

  return streak !== undefined && streak.failures >= STUCK_AFTER ? `\`${streak.command}\` failed ${streak.failures} times in a row` : undefined
}

/** What to do about a gap, as the model and the person are told. */
export const PROVE = 'prove it works: run the checks and show the change working'

// ponytail: the start of a command segment, not a shell parser; `sh -c "git push"` walks past it.
const SHIP = /^(?:\w+=\S+\s+)*(?:time\s+)?\(?\s*(?:git\s+(?:(?:-[cC]\s+\S+|--?[\w-]+(?:=\S+)?)\s+)*push|gh\s+(?:-R\s+\S+\s+)?pr\s+(?:create|merge))\b/

/** MCP tools that push or open or merge a pull request, whatever the server is called. */
const SHIP_TOOL = /^mcp__.*__(?:push_files|create_or_update_file|create_pull_request|merge_pull_request)$/

/** Whether a Bash command pushes or opens or merges a pull request, in any of its segments. */
export const ships = (command: string) =>
  command
    // What a quoted string says is not a command.
    .replace(/"[^"\n]*"|'[^'\n]*'/g, '""')
    .split(/&&|\|\||;|\n|\|/)
    .map(part => part.trim())
    .some(part => SHIP.test(part))

/** Why a Bash command that ships waits, or undefined: unproven work never leaves the machine. */
export const shipHold = (task: FlowTask, command: string, tool = 'Bash') => {
  const gap = (tool === 'Bash' ? ships(command) : SHIP_TOOL.test(tool)) ? proofGap(task) : undefined

  return gap === undefined
    ? undefined
    : [
        `flow: the task "${task.title}" is not proven (${gap}), so pushes and pull requests wait.`,
        'Run the project checks and show the change working; a local commit is fine.',
        'If a check fails, find the root cause before patching. Only the user can waive this, with /flow allow.',
      ].join(' ')
}

/** What the prompt of a stage that would leave an unproven build becomes, or undefined when it may run. */
export const leaveHold = (task: FlowTask) => {
  const gap = proofGap(task)

  return gap === undefined
    ? undefined
    : [
        `flow: the task "${task.title}" is still in ${task.phase} and is not proven (${gap}), so the next stage waits.`,
        'Do not open or update a pull request yet.',
        'Run the project checks and show the change working, then call mcp__flow__stage_done.',
        'If the user wants to ship anyway, they run /flow allow.',
      ].join(' ')
}
