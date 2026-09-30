// What the task remembers for later stages: checks as PR evidence, the
// timeline for the retro, CI for the PR, and the reminder each skill reads.
import type { MattTask } from '../types'
import { PLANNING, isAllowed, isStage, skillName } from './flow'

/** Whether a Bash command is a check worth keeping as evidence. */
// ponytail: word match on the command; a project list in userConfig if it misses.
export const isCheck = (command: string) =>
  /\b(test|tests|vitest|jest|pytest|typecheck|tsc|lint)\b/.test(command) && !/\b(gh|git)\s/.test(command)

const since = (task: MattTask, at: number) => `+${Math.max(0, Math.round((at - task.createdAt) / 60_000))}m`

/** Each check's first failure and latest run, for the PR's before and after. */
export const evidence = (task: MattTask) => {
  const checks = task.log.filter(one => one.kind === 'check')

  return [...new Set(checks.map(one => one.detail ?? ''))].map(command => {
    const runs = checks.filter(one => one.detail === command)
    const failed = runs.find(one => one.ok === false)
    const last = runs.at(-1)
    const latest = last === undefined ? '' : `${last.ok ? 'passed' : 'failed'} at ${since(task, last.at)}`

    return failed === undefined || failed === last
      ? `\`${command}\`: ${latest}`
      : `\`${command}\`: failed at ${since(task, failed.at)}, then ${latest}`
  })
}

/** Everything that happened to the task in order, minutes from its start. */
export const timeline = (task: MattTask) =>
  [
    ...task.history.map(step => ({ at: step.at, what: `${isStage(step.skill, task) ? 'stage' : 'step'} ${step.skill}` })),
    ...task.artifacts.map(one => ({ at: one.at, what: `artifact ${one.pointer}` })),
    ...task.log.map(one => ({
      at: one.at,
      what: [one.kind, one.phase, one.detail, one.ok === undefined ? undefined : one.ok ? 'passed' : 'failed']
        .filter(Boolean)
        .join(' '),
    })),
  ]
    .sort((a, b) => a.at - b.at)
    .slice(-80)
    .map(one => `${since(task, one.at)} ${one.what}`)

/** `pass`, `fail` or `pending` from `gh pr checks --json bucket`; undefined when there is nothing to read. */
export const ciOutcome = (stdout: string) => {
  const buckets = (() => {
    try {
      const parsed: unknown = JSON.parse(stdout)

      return Array.isArray(parsed) ? parsed.map((one: { bucket?: unknown }) => one.bucket) : []
    } catch {
      return []
    }
  })()
  if (buckets.length === 0) {
    return undefined
  }
  if (buckets.includes('pending')) {
    return 'pending'
  }

  return buckets.some(bucket => bucket === 'fail' || bucket === 'cancel') ? 'fail' : 'pass'
}

/** The latest PR the task opened whose CI has not settled yet. */
export const unsettledPr = (task: MattTask | null) => {
  const pr = task?.artifacts.filter(one => /\/pull\/\d+$/.test(one.pointer)).at(-1)?.pointer

  return pr !== undefined && !task?.log.some(one => one.kind === 'ci' && one.detail === pr) ? pr : undefined
}

/** What the model reads after a tracked skill's prompt; `branch` is the repo's current one. */
export const reminder = (task: MattTask, skill: string, branch: string) => {
  const name = skillName(skill)
  const proof = evidence(task)

  return [
    `matt: this runs inside the task "${task.title}" (.scratch/${task.slug}/task.json), phase ${task.phase}.`,
    `If the issue tracker is local markdown, use "${task.slug}" as the feature slug.`,
    ...(task.artifacts.length === 0
      ? []
      : [
          `Artifacts so far, oldest first: ${task.artifacts.map(one => `${one.pointer} (${one.phase})`).join(', ')}.`,
          'A later artifact wins over an earlier one, and live code beats any document.',
        ]),
    ...(PLANNING.includes(task.phase) && !isAllowed(task)
      ? ['Planning phase: code edits wait for /implement; markdown, .scratch/ and prototypes are fine.']
      : []),
    ...((name === 'implement' || name === 'implement-spec') && ['main', 'master'].includes(branch)
      ? [`The repo is on ${branch}: make a branch or a worktree (EnterWorktree) before the first edit.`]
      : []),
    ...(name === 'pr' && proof.length > 0
      ? ['Checks this task ran, for the Evidence section (minutes from the task start):', ...proof]
      : []),
    ...(name === 'retro' ? ['Timeline of this task, minutes from its start:', ...timeline(task)] : []),
  ].join('\n')
}
