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

// ponytail: runners and task names by pattern, not a shell parser; the `checks` option names what these miss.
const ENV = '(?:\\w+=\\S+\\s+)*'
const WRAP = '(?:(?:timeout\\s+\\S+|time)\\s+)?'
const RUNNER = new RegExp(
  `^${ENV}${WRAP}(?:npx|pnpm|npm|yarn|bun|bunx|deno|cargo|go|flutter|dart|uv|poetry|bundle|python[\\d.]*|make|just|\\./gradlew|gradle|mvn|dotnet|swift|claude|turbo|nx)\\s+(.*)$`,
)
const TOOL = new RegExp(`^${ENV}${WRAP}(?:\\S*/)?(?:vitest|jest|pytest|tsc|eslint|biome|ruff|mypy|phpunit|rspec|shellcheck)\\b`)
// A task a runner runs: `test`, `lint`, `test:unit`, `check-types`, `:app:testDebugUnitTest`; the
// keyword ends there, so `checkbox`, `testdata` and `test-app` are not one.
const TASK = /^:?(?:[\w.]+[:-])*(?:check-types|type-check|typecheck|tests?|lint|check|clippy|analy[sz]e|tsc|vet|verify|validate|unittest|rspec|vitest|jest|pytest|eslint|biome)(?![a-z_-])/
const NOT_A_RUN = /^(?:install|add|remove|uninstall|i|init|create|update|upgrade)$/

/** Whether one command segment runs a check: a known tool, a runner with a check task, or one the `checks` option names. */
const isCheck = (part: string, extra: readonly string[]) => {
  if (extra.some(one => part.includes(one)) || TOOL.test(part)) {
    return true
  }
  // Flags, paths and file names are arguments, never the task.
  const words = (RUNNER.exec(part)?.[1] ?? '').split(/\s+/).filter(word => !word.startsWith('-') && !word.includes('/') && !/\.\w+$/.test(word))

  return words[0] !== undefined && !NOT_A_RUN.test(words[0]) && words.some(word => TASK.test(word))
}

/**
 * The check a Bash command runs, and whether what follows it hides its exit status (a pipe, an
 * `||`, or a later command), so that the command succeeding says nothing about the check.
 */
export const checkIn = (command: string, extra: readonly string[] = []) => {
  const parts = withoutBodies(command).split(/(&&|\|\||;|\n|\|)/)
  const at = parts.findIndex((part, index) => index % 2 === 0 && isCheck(part.trim(), extra))
  if (at === -1) {
    return undefined
  }
  const own = (parts[at] ?? '').trim()
  // Anywhere after the check: a pipe or an `||`, or a `;` or newline with a command after it. `&&` passes a failure on.
  const isHidden = parts.slice(at + 1).some((part, index, rest) => {
    const isSeparator = index % 2 === 0

    return isSeparator && (part === '|' || part === '||' || ((part === ';' || part === '\n') && rest.slice(index + 1).some((later, after) => after % 2 === 0 && later.trim() !== '')))
  })
  // The same check reads the same however its output was redirected or grouped.
  const shown = own
    .replace(/\s*\d?>&?\s*\S+/g, '')
    .replace(/^\(+\s*|\s*\)+$/g, '')
    .replace(/\s*&$/, '')
    .trim()

  return { command: shown.slice(0, 80), isMasked: isHidden || /&$/.test(own) }
}

/** The part of a Bash command that runs a check worth keeping as evidence, or undefined. */
export const checkOf = (command: string, extra: readonly string[] = []) => checkIn(command, extra)?.command

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
          'Proof gate: this stage is recorded as finished only once every check run since the last code edit passes, so run the checks and show the change working before the closing review. Run a check on its own or after `&&`: piped into another command (`| tail`) or followed by `|| true`, its result is not counted. Pushes and pull requests wait until then.',
          'Work in small units that each end verifiable, and prove each on the real thing, not a proxy (skills: principle-sequence-verifiable-units, principle-prove-it-works).',
        ]
      : []),
    ...(BUILD.includes(name) && task.ui === true
      ? [
          `This task has a UI, so its proof is the change seen working: run the repo's verify skill (create-verification-skill makes one if there is none), or save a screenshot or what you observed as .scratch/${task.slug}/proof.md.`,
        ]
      : []),
    ...(task.ui === true && (PLANNING.includes(name) || BUILD.includes(name))
      ? ['Choose the experience over implementation convenience (skill: principle-experience-first); where a look needs seeing to settle, use /prototype before building it.']
      : []),
    ...(name === 'diagnosing-bugs' || task.log.some(one => one.kind === 'rework' && one.phase === task.phase)
      ? ['Trace each symptom to its root cause and fix it there, not at the symptom (skill: principle-fix-root-causes).']
      : []),
    ...(name === 'retro'
      ? [
          'A lesson worth keeping becomes structure: a check, a hook, a lint or a rule, not another note (skill: principle-encode-lessons-in-structure); write any CLAUDE.md or AGENTS.md change with writing-for-agents.',
        ]
      : []),
    ...(['to-spec', 'to-tickets', 'pr', 'retro'].includes(name) ? ['Cut AI tells from the prose you write here (skill: unslop).'] : []),
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
