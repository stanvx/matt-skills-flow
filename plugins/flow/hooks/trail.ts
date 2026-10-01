// What the task remembers for later stages: checks as PR evidence, the
// timeline for the retro, CI for the PR, and the reminder each skill reads.
import type { FlowTask } from '../types'
import { PLANNING, isAllowed, isStage, mapOf, skillName, stagesOf } from './flow'
import { FLOWS, commandOf, stageLabel } from './flows'
import { BUILD } from './proof'

/** The command without heredoc bodies or quoted text that spans lines: a PR body is prose, not a check. */
// ponytail: patterns, not a shell parser; a tokenizer if an escaped quote ever splits one.
export const withoutBodies = (command: string) =>
  command.replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2(?=\s|$)/g, '').replace(/"[^"]*\n[^"]*"|'[^']*\n[^']*'/g, '""')

/** The part of a Bash command that runs a check worth keeping as evidence, or undefined. */
// ponytail: word match per segment; a project list in userConfig if it misses.
export const checkOf = (command: string) =>
  withoutBodies(command)
    .split(/&&|\|\||;|\n|\|/)
    .map(part => part.trim())
    .find(part => /\b(test|tests|vitest|jest|pytest|typecheck|tsc|lint)\b/.test(part) && !/^(gh|git)\s/.test(part))
    ?.slice(0, 80)

const since = (task: FlowTask, at: number) => `+${Math.max(0, Math.round((at - task.createdAt) / 60_000))}m`

/** Each check's first failure and latest run, for the PR's before and after. */
export const evidence = (task: FlowTask) => {
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

/** Everything that happened to the task in order, the latest 80. */
export const journey = (task: FlowTask) =>
  [
    ...task.history.map(step => ({ at: step.at, kind: isStage(step.skill, task) ? 'stage' : 'step', what: step.skill })),
    ...task.artifacts.map(one => ({ at: one.at, kind: 'artifact', what: one.pointer })),
    ...task.log.map(one => ({
      at: one.at,
      kind: one.kind,
      what: [one.phase, one.detail].filter(Boolean).join(' '),
      ...(one.ok === undefined ? {} : { ok: one.ok }),
    })),
  ]
    .sort((a, b) => a.at - b.at)
    .slice(-80)

/** The journey as lines, minutes from the task's start. */
export const timeline = (task: FlowTask) =>
  journey(task).map(
    one =>
      `${since(task, one.at)} ${[one.kind, one.what, 'ok' in one ? (one.ok ? 'passed' : 'failed') : undefined]
        .filter(Boolean)
        .join(' ')}`,
  )

/** A pointer as a person reads it: `PR #7`, `issue #12`, or the last two path segments. */
export const shortPointer = (pointer: string) => {
  const numbered = /\/(pull|issues)\/(\d+)$/.exec(pointer)
  if (numbered !== null) {
    return `${numbered[1] === 'pull' ? 'PR' : 'issue'} #${numbered[2]}`
  }

  return pointer.split('/').slice(-2).join('/')
}

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
export const unsettledPr = (task: FlowTask | null) => {
  const pr = task?.artifacts.filter(one => /\/pull\/\d+$/.test(one.pointer)).at(-1)?.pointer

  return pr !== undefined && !task?.log.some(one => one.kind === 'ci' && one.detail === pr) ? pr : undefined
}

/** What the person had to say about work already done, oldest first: what the retro encodes. */
export const corrections = (task: FlowTask) => task.log.filter(one => one.kind === 'rework').map(one => `${since(task, one.at)} ${one.detail ?? ''}`)

/** What the model reads after a tracked skill's prompt; `branch` is the repo's current one. */
export const reminder = (task: FlowTask, skill: string, branch: string) => {
  const name = skillName(skill)
  const proof = evidence(task)

  return [
    `flow: this runs inside the task "${task.title}" (.scratch/${task.slug}/task.json), phase ${task.phase}.`,
    task.flow === 'freeform'
      ? 'Workflow Freeform: no fixed phases.'
      : `Workflow ${FLOWS[task.flow].label}: ${stagesOf(task)
          .map(stage => `${stageLabel(stage)} (/${commandOf(stage)})`)
          .join(' -> ')}.`,
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
    ...(BUILD.includes(name) && task.flow !== 'freeform'
      ? [
          'Proof gate: this stage is recorded as finished only once every check run since the last code edit passes, so run the checks and show the change working before the closing review. Pushes and pull requests wait until then.',
        ]
      : []),
    ...(name === 'pr' && proof.length > 0
      ? ['Checks this task ran, for the Evidence section (minutes from the task start):', ...proof]
      : []),
    ...(name === 'wayfinder' && task.phase === 'wayfinder'
      ? [
          `Charting the map: label it wayfinder:map (on a local tracker, write it to .scratch/${task.slug}/map.md); the flow mod keeps it as this task's map.`,
        ]
      : []),
    ...(name === 'wayfinder' && task.phase === 'wayfinder-clear'
      ? [
          `Clearing the map ${mapOf(task) ?? "(ask the user for the map's link)"}: resolve one frontier ticket this session. When no ticket is left, tell the user the map is clear so they can move on to /to-spec.`,
        ]
      : []),
    ...(name === 'to-spec'
      ? ['Include one mermaid diagram of the key flow in the spec (a flowchart LR or a sequenceDiagram): the flow mod draws it in the artifact tab.']
      : []),
    ...(name === 'to-tickets'
      ? [
          `Include a mermaid flowchart LR of the tickets and their blocking edges where the tickets are published (the first ticket, or an overview under .scratch/${task.slug}/): the flow mod draws it.`,
        ]
      : []),
    ...(isStage(name, task)
      ? ["When this stage's work is finished (not after each question), call mcp__flow__stage_done with a one-line summary."]
      : []),
    ...(name === 'retro' ? ['Timeline of this task, minutes from its start:', ...timeline(task)] : []),
    ...(name === 'retro' && corrections(task).length > 0
      ? [
          'Corrections the person made in this task (kind, then their words). A rule, or anything said twice, becomes a check, a hook or a line in CLAUDE.md, not a note:',
          ...corrections(task),
        ]
      : []),
  ].join('\n')
}
