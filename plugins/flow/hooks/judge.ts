// Where Jev sits in the flow: it reads the person's prompt for rework, and a
// build turn's end for how far the evidence goes. Both calls fail open, and
// neither refuses anything: the proof gate's facts do that. In `shadow` they
// only log; in `on` a rework prompt carries context for the model, and short
// evidence keeps the band from reading Ready.
import type { On } from 'claude-code'

import type { JevMode } from '../types'
import { PLANNING, inside, statusOf } from './flow'
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
  const said = [e.action, e.url, e.text].filter((one): one is string => typeof one === 'string').join(' ')

  return { command: `${e.tool} ${said}`.trim(), passed }
}

export const registerJudge = (on: On, mode: JevMode) => {
  if (mode === 'off') {
    return
  }
  // What the main loop last said, and what ran and changed since the last code edit. Lost on a
  // reload, where the next judgment just sees less.
  let lastAnswer = ''
  let ran: readonly Ran[] = []
  let changed: readonly string[] = []
  let isFresh = false

  // The shadow log with one more decision; the hook writes it, since `$` stays at the call site.
  const kept = (stored: unknown, entry: JevEntry) => [...parseLog(stored), entry].slice(-LOG_SIZE)

  on('tool.call', async ($, e, next) => {
    const done = await next(e)
    const passed = done.deny === undefined && done.isError !== true
    const path = e.tool === 'Write' || e.tool === 'Edit' ? e.file_path : e.tool === 'NotebookEdit' ? e.notebook_path : undefined
    const rel = typeof path === 'string' ? inside(await $.session.root(), path) : undefined
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

    return done
  })

  on('prompt.submit', async ($, e, next) => {
    const task = await $.flow.task()
    const isJudged = task !== null && task.phase !== 'new' && !PLANNING.includes(task.phase) && PERSON.includes(e.origin.kind) && isJudgedPrompt(e.text)
    if (!isJudged) {
      return next(e)
    }
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
    await $.store.set(LOG_KEY, kept(await $.store.get(LOG_KEY), turnEntry))
    if (found === undefined) {
      return next(e)
    }
    // The event is the metric and what the retro encodes, in either mode.
    await $.flow.note({ kind: 'rework', detail: `${found.kind}${found.isLesson && found.kind !== 'lesson' ? ' lesson' : ''}: ${e.text.trim().slice(0, 200)}` })

    return mode === 'on' && found.context !== undefined ? next({ ...e, context: [...(e.context ?? []), found.context] }) : next(e)
  })

  // After the answer, so it never delays the turn: it only changes what the band says next.
  on('turn.complete', { reason: 'answer' }, async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined) {
      return done
    }
    lastAnswer = e.answer
    const task = await $.flow.task()
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
    await $.store.set(LOG_KEY, kept(await $.store.get(LOG_KEY), proofEntry))
    if (mode === 'on') {
      await $.flow.note({ kind: 'judged', ok: judged.ok, detail })
      await $.flow.suggest()
    }

    return done
  })
}
