// Autonomy: the model reports a stage finished, the mod advances when that is
// safe, tells the person when a gate waits, and runs the task on its own
// model and effort. The noun's run enters a task's worktree.
import type { On, ToolSpec } from 'claude-code'

import type { FlowEffort, FlowTask } from '../types'
import { GATED, gateArtifact, isApproved, nextAction } from './flow'
import { MODELS } from './flows'
import { isProven, judgedGap, proofGap, stuckReason } from './proof'
import { DOC, baseName } from './doc'
import { commandLine } from './ui'

// The validator lists state reads per file, so each file spells its reference.
const current = { plugin: 'flow', key: 'task' } as const
const advance = { plugin: 'flow', key: 'advance' } as const
const shownDoc = { plugin: 'flow', key: 'doc' } as const

export const STAGE_DONE = 'mcp__flow__stage_done'

/** The tool the model calls when a stage's work is finished. register.tsx registers it at session.start: one hook per event. */
export const STAGE_DONE_TOOL: ToolSpec = {
  name: 'stage_done',
  description:
    "Call this once when the work of the current flow stage is finished (not after each question), with a one-line summary of what was done. The flow mod records it and answers with the task's next step. A build stage is recorded only once its checks pass. Call it with outcome 'blocked' when you cannot finish without the person.",
  inputSchema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One line: what this stage did, or what blocks it.' },
      outcome: { type: 'string', enum: ['done', 'blocked'], description: 'done (the default), or blocked: the stage cannot finish without the person.' },
    },
    required: ['summary'],
  },
}

/** Finished phases whose next stage may start on its own: building and closing, never planning. */
export const AUTO_FROM: readonly string[] = ['implement', 'implement-spec', 'diagnosing-bugs', 'pr']

/** Whether the stage after the task's finished phase may start without a person: a stage, not a gate or the close. */
export const canAutoAdvance = (task: FlowTask) =>
  AUTO_FROM.includes(task.phase) && nextAction(task).command !== 'flow' && isProven(task) && judgedGap(task) === undefined && stuckReason(task) === undefined

/** What stage_done answers in place of recording, while a build stage's edits are unproven. */
export const unprovenAnswer = (task: FlowTask) => {
  const gap = proofGap(task)

  return gap === undefined
    ? undefined
    : [
        `flow: not recorded. ${task.phase} is not proven: ${gap}.`,
        'Run the project checks (tests, typecheck, lint) and show the change working, then call this tool again. A check piped into another command or followed by `|| true` is not counted.',
        'If a check fails, reproduce it and fix the root cause (diagnosing-bugs) before patching.',
        "If you ran this repo's check and it passed but was not counted, call this tool with outcome 'blocked' and name the command, so the person can add it to the checks option or allow.",
      ].join(' ')
}

/** A turn that ends on a question waits for its answer, whatever it reported. */
export const endsOnQuestion = (answer: string) => /\?["')\]*_`]*\s*$/.test(answer)

/** What a person should be told when a gated phase waits for them, or undefined when nothing waits. */
export const gateNotice = (task: FlowTask) => {
  const what = GATED[task.phase]
  if (what === undefined || isApproved(task)) {
    return undefined
  }
  const made = gateArtifact(task)?.pointer ?? `.scratch/${task.slug}/`

  return `flow: the ${what} ${what === 'tickets' ? 'are' : 'is'} ready. Read ${made}, then /flow approve`
}

/**
 * The model id a turn step can name. `turn.step` does not resolve aliases
 * (measured: `haiku` fails the request), so a full id passes, a known alias
 * becomes its id, and any other word resolves only to the session's own
 * model when it names that family.
 */
export const modelId = (wanted: string, session: string) =>
  wanted.includes('claude-')
    ? wanted
    : (MODELS.find(one => one.alias === wanted)?.id ?? (session.includes(wanted) ? session : undefined))

/** What to rewrite on a step, and the model that could not be resolved. */
export const overrideOf = (task: FlowTask, session: string): { model?: string; effort?: FlowEffort; unresolved?: string } => {
  const model = task.model === undefined ? undefined : modelId(task.model, session)

  return {
    ...(model === undefined ? {} : { model }),
    ...(task.effort === undefined ? {} : { effort: task.effort }),
    ...(task.model !== undefined && model === undefined ? { unresolved: task.model } : {}),
  }
}

/** The status line while a task overrides the session's model or effort. */
export const overrideLabel = (model: string | undefined, effort: FlowEffort | undefined) =>
  model === undefined && effort === undefined
    ? undefined
    : `flow: ${[model, effort === undefined ? undefined : model === undefined ? `${effort} effort` : `at ${effort}`].filter(Boolean).join(' ')}`

type Options = { isAutoAdvance: boolean; clearAt: number }

export const registerAutonomy = (on: On, { isAutoAdvance, clearAt }: Options) => {
  // Notices already shown, by task and phase. Lost on a reload, which shows one again at worst.
  let told: readonly string[] = []
  const firstTime = (key: string) => {
    if (told.includes(key)) {
      return false
    }
    told = [...told, key]

    return true
  }
  // The status line this hook drew, so it clears only its own.
  let shown: string | undefined

  on('tool.call', { tool: STAGE_DONE }, async ($, e) => {
    const summary = typeof e.summary === 'string' ? e.summary.trim().slice(0, 200) : ''
    const open = await $.flow.task()
    if (open !== null && e.outcome === 'blocked') {
      await $.flow.note({ kind: 'blocked', ...(summary === '' ? {} : { detail: summary }) })
      $.ui.toast(`flow: ${open.phase} is blocked${summary === '' ? '' : `: ${summary}`}`)

      return { result: 'The flow mod recorded that the stage is blocked. Stop here and tell the person what you need from them.' }
    }
    // A build stage is finished on evidence, not on the model's word: it is still mid-turn, so it can go and get it.
    const refusal = open === null ? undefined : unprovenAnswer(open)
    if (refusal !== undefined) {
      return { result: refusal }
    }
    const task = await $.flow.note({ kind: 'done', ...(summary === '' ? {} : { detail: summary }) })
    if (task === null) {
      return { result: 'flow: no task is open, so nothing was recorded.' }
    }
    const line = commandLine(task)
    const notice = gateNotice(task)
    if (notice !== undefined && firstTime(`${task.slug}:${task.phase}`)) {
      $.ui.toast(notice)
    }
    // A second report in the same phase never advances twice.
    const isFirst = task.log.filter(one => one.kind === 'done' && one.phase === task.phase).length === 1
    // The next stage waits for this turn to answer, so it never starts mid-turn.
    if (isAutoAdvance && isFirst && canAutoAdvance(task)) {
      await $.state.set(advance, true)
    }

    return {
      result: `The flow mod recorded that ${task.phase} is finished. Next for the task: ${line} (${nextAction(task).why}). The flow mod or the person runs it, not you.`,
    }
  })

  // A turn that answered runs the stage its stage_done left waiting; one aborted, refused or failed drops it.
  on('turn.complete', { reason: ['answer', 'aborted', 'refusal', 'error'] }, async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined || (await $.state.get(advance)).value !== true) {
      return done
    }
    await $.state.set(advance, false)
    const task = (await $.state.get(current)).value ?? null
    if (e.reason !== 'answer' || task === null || !canAutoAdvance(task) || endsOnQuestion(e.answer)) {
      return done
    }
    const percent = (await $.session.usage()).context.percent ?? 0
    if (percent >= clearAt) {
      $.ui.toast(`Context ${Math.round(percent)}%: /clear, then ${commandLine(task)}. The task survives /clear.`)
    } else {
      const expect = { slug: task.slug, phase: task.phase }
      $.clock.after(0, () => void $.flow.run({ expect }))
    }

    return done
  })

  // A gated phase that just got its artifact waits for a person: say so once, and put the artifact
  // beside the transcript. Opened unasked, the tab seats only where it docks, and never takes the keys.
  on('flow.produce', async ($, e, next) => {
    const ran = await next(e)
    const task = ran.deny === undefined ? ran.value : null
    const notice = task === null ? undefined : gateNotice(task)
    const made = task === null ? undefined : gateArtifact(task)
    if (task !== null && notice !== undefined && firstTime(`${task.slug}:${task.phase}`)) {
      $.ui.toast(notice)
      if (made !== undefined && !made.pointer.startsWith('http')) {
        await $.state.set(shownDoc, made.pointer)
        await $.ui.open({ id: DOC, title: baseName(made.pointer) }).catch(() => undefined)
      }
    }

    return ran
  })

  // The main loop runs on the open task's model and effort; subagents keep theirs.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) {
      return yield* next(e)
    }
    const task = (await $.state.get(current)).value ?? null
    const set = task === null ? {} : overrideOf(task, task.model === undefined ? '' : await $.session.model())
    const label = overrideLabel(set.model, set.effort)
    if (label !== shown) {
      shown = label
      $.ui.status(label)
    }
    if (set.unresolved !== undefined && task !== null && firstTime(`${task.slug}:model:${set.unresolved}`)) {
      $.ui.toast(
        `flow: "${set.unresolved}" is not a full model id, so this task keeps the session's model. Use an id like claude-sonnet-5-5.`,
      )
    }

    return yield* next({
      ...e,
      ...(set.model === undefined ? {} : { model: set.model }),
      ...(set.effort === undefined ? {} : { effort: set.effort }),
    })
  })
}
