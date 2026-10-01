// Where Jev sits in the flow: it reads the person's prompt for rework, and a
// build turn's end for how far the evidence goes. Both calls fail open, and
// neither refuses anything: the proof gate's facts do that. In `shadow` they
// only log; in `on` a rework prompt carries context for the model, and short
// evidence keeps the band from reading Ready.
import type { On } from 'claude-code'

import type { JevMode } from '../types'
import { PLANNING, statusOf } from './flow'
import { LOG_KEY, LOG_SIZE, PROOF, TURN, isJudgedPrompt, judgedOf, parseLog, proofState, requiredEvidence, reworkOf, turnState } from './jev'
import type { JevEntry, Ran } from './jev'
import { hasEdits, isCode, isProven } from './proof'

const busy = { plugin: 'flow', key: 'busy' } as const

/** Origins a person stands behind. */
const PERSON = ['composer', 'bridge']

const TURN_TIMEOUT_MS = 800

/** A tool call worth showing Jev as evidence: a command, or a tool that drives or looks at the running thing. */
export const ranOf = (e: { tool: string; [argument: string]: unknown }, passed: boolean): Ran | undefined => {
  if (e.tool === 'Bash') {
    return typeof e.command === 'string' ? { command: e.command, passed } : undefined
  }
  if (!/^mcp__|screenshot|computer|browser/i.test(e.tool) || e.tool.startsWith('mcp__flow__')) {
    return undefined
  }
  // The tool's name and a one-word action, never its arguments: those can be a message or a page.
  const action = typeof e.action === 'string' && /^\w{1,24}$/.test(e.action) ? e.action : ''

  return { command: `${e.tool} ${action}`.trim(), passed }
}

// What the main loop last said, and what ran and changed since the last code edit: this module's
// own, since a function that takes `on` hands nothing back. Lost on a reload, where the next
// judgment just sees less.
let isJudging = false
let lastAnswer = ''
let ran: readonly Ran[] = []
let changed: readonly string[] = []
let isFresh = false
let slug = ''

/** Another task's reply and commands are not this one's evidence. */
const forTask = (open: string) => {
  // The first task seen keeps what was observed before it was known.
  if (open !== slug && slug !== '') {
    lastAnswer = ''
    ran = []
    changed = []
    isFresh = false
  }
  slug = open
}

/** What register.tsx's one tool.call hook tells the judge: the call, whether it went through, and the repo-relative path it wrote. */
export const observe = (e: { tool: string; [argument: string]: unknown }, passed: boolean, rel: string | undefined) => {
  if (!isJudging) {
    return
  }
  if (passed && isCode(rel) && rel !== undefined) {
    // New code makes what ran before it stale as evidence.
    ran = []
    changed = [...changed.filter(one => one !== rel), rel].slice(-20)
    isFresh = true
  }
  const one = ranOf(e, passed)
  if (one !== undefined) {
    ran = [...ran, one].slice(-30)
    isFresh = true
  }
}

export const registerJudge = (on: On, mode: JevMode) => {
  isJudging = mode !== 'off'
  slug = ''
  lastAnswer = ''
  ran = []
  changed = []
  isFresh = false
  if (mode === 'off') {
    return
  }
  // The shadow log with one more decision; the hook writes it, since `$` stays at the call site.
  const kept = (stored: unknown, entry: JevEntry) => [...parseLog(stored), entry].slice(-LOG_SIZE)

  on('prompt.submit', async ($, e, next) => {
    const task = await $.flow.task()
    const isJudged = task !== null && task.phase !== 'new' && !PLANNING.includes(task.phase) && PERSON.includes(e.origin.kind) && isJudgedPrompt(e.text)
    if (!isJudged) {
      return next(e)
    }
    forTask(task.slug)
    const started = await $.clock.now()
    const status = statusOf(task, (await $.state.get(busy)).value ?? false)
    const answers = await $.flow.judge({ state: turnState({ task, status, lastAnswer, prompt: e.text }), questions: TURN, timeoutMs: TURN_TIMEOUT_MS })
    if (answers === null) {
      return next(e)
    }
    const found = reworkOf(answers)
    const turnEntry: JevEntry = {
      at: started,
      call: 'turn',
      ms: (await $.clock.now()) - started,
      slug: task.slug,
      phase: task.phase,
      answers,
      ...(found === undefined ? {} : { note: `rework ${found.kind}${found.isLesson ? ' lesson' : ''}` }),
    }
    await $.store.set(LOG_KEY, kept(await $.store.get(LOG_KEY), turnEntry)).catch(() => undefined)
    // Shadow only logs: an event on the task would change what later stages are told.
    if (found === undefined || mode !== 'on') {
      return next(e)
    }
    // The event is the metric, and what the retro encodes.
    await $.flow.note({ kind: 'rework', detail: `${found.kind}${found.isLesson && found.kind !== 'lesson' ? ' lesson' : ''}: ${e.text.trim().slice(0, 200)}` })

    return found.context !== undefined ? next({ ...e, context: [...(e.context ?? []), found.context] }) : next(e)
  })

  // After the answer, so it never delays the turn: it only changes what the band says next.
  on('turn.complete', { reason: 'answer' }, async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined) {
      return done
    }
    const task = await $.flow.task()
    forTask(task?.slug ?? '')
    lastAnswer = e.answer
    // Only once the facts hold: an unproven build already reads Needs proof.
    if (task === null || !isFresh || !hasEdits(task) || !isProven(task)) {
      return done
    }
    isFresh = false
    const started = await $.clock.now()
    const answers = await $.flow.judge({ state: proofState({ task, ticket: '', changed, ran, answer: e.answer }), questions: PROOF })
    if (answers === null) {
      return done
    }
    const judged = judgedOf(answers, requiredEvidence(task))
    const detail = `${judged.detail}${judged.isFalseClaim ? '; the message says it was verified' : ''}`
    const proofEntry: JevEntry = {
      at: started,
      call: 'proof',
      ms: (await $.clock.now()) - started,
      slug: task.slug,
      phase: task.phase,
      answers,
      note: `${judged.ok ? 'enough' : 'short'}: ${detail}`,
    }
    await $.store.set(LOG_KEY, kept(await $.store.get(LOG_KEY), proofEntry)).catch(() => undefined)
    if (mode === 'on') {
      await $.flow.note({ kind: 'judged', ok: judged.ok, detail })
      await $.flow.suggest()
    }

    return done
  })
}
