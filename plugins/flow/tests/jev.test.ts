import type { Engine } from 'claude-code/testing'
import { expect, test } from 'claude-code/testing'

import { createTask, recordEvent, recordSkill, statusOf } from '../hooks/flow'
import { PROOF, TURN, isJudgedPrompt, judgedOf, logSummary, read, request, requiredEvidence, reworkOf } from '../hooks/jev'
import type { ProofAnswers, TurnAnswers } from '../hooks/jev'
import { ranOf } from '../hooks/judge'
import { judgedGap } from '../hooks/proof'
import { holdNote } from '../hooks/status'
import { corrections, reminder } from '../hooks/trail'
import type { FlowTask } from '../types'
import { fakeRepo, flow } from './fake'

const config = { mode: 'on', apiKey: 'k', baseUrl: 'https://api.typesafe.ai/', model: 'jev-1.13.0' } as const

const turn = (rework: number, kind: TurnAnswers['kind']['choice'], lesson = 0.03, confidence = 0.9): TurnAnswers => ({
  rework: { noul: rework },
  kind: { choice: kind, confidence },
  lesson: { noul: lesson },
})
const proof = (score: number, confidence = 0.95, claims = 0.9, awaits = 0.02): ProofAnswers => ({
  claims_verified: { noul: claims },
  awaits_user: { noul: awaits },
  evidence: { score, confidence },
})
/** A response body as the API writes one. */
const body = (answers: TurnAnswers | ProofAnswers) =>
  JSON.stringify({
    model: 'jev-1.13.0',
    answers: Object.fromEntries(Object.entries(answers).map(([id, answer]) => [id, { type: 'x', probabilities: {}, ...answer }])),
    usage: { input_tokens: 700, output_tokens: 0 },
  })

test('the request is one POST with the key as a bearer and the questions as written', () => {
  const { url, init } = request(config, { prompt: 'x' }, TURN)
  expect(url).toBe('https://api.typesafe.ai/v1/systemone')
  expect(init.headers.authorization).toBe('Bearer k')
  expect(JSON.parse(init.body)).toEqual({ model: 'jev-1.13.0', state: { prompt: 'x' }, questions: TURN })
})

test('answers are narrowed per question, and anything malformed reads as no answer', () => {
  expect(read(body(turn(0.97, 'defect')), TURN)).toEqual(turn(0.97, 'defect'))
  expect(read('not json', TURN)).toBeUndefined()
  expect(read('{"answers":{}}', TURN)).toBeUndefined()
  // An option the question never offered, and a probability out of range.
  expect(read(body({ ...turn(0.9, 'defect'), kind: { choice: 'ship' as 'defect', confidence: 1 } }), TURN)).toBeUndefined()
  expect(read(body(turn(1.4, 'defect')), TURN)).toBeUndefined()
  expect(read(body(proof(2)), PROOF)).toEqual(proof(2))
})

test('commands and bare replies never reach Jev', () => {
  expect(isJudgedPrompt('/pr')).toBe(false)
  expect(isJudgedPrompt('yes')).toBe(false)
  expect(isJudgedPrompt('the second one')).toBe(false)
  expect(isJudgedPrompt('it is still broken on my phone')).toBe(true)
})

test('a defect or a mismatch needs the prompt to read as a complaint; polish and a lesson are kept without one', () => {
  expect(reworkOf(turn(0.97, 'defect'))).toMatchObject({ kind: 'defect', isLesson: false })
  expect(reworkOf(turn(0.97, 'defect'))?.context).toContain('diagnosing-bugs')
  expect(reworkOf(turn(0.95, 'mismatch'))?.context).toContain('restate what was asked')
  expect(reworkOf(turn(0.37, 'mismatch'))).toBeUndefined()
  expect(reworkOf(turn(0.04, 'polish'))).toEqual({ kind: 'polish', isLesson: false })
  expect(reworkOf(turn(0.04, 'polish', 0.03, 0.4))).toBeUndefined()
  expect(reworkOf(turn(0.02, 'new_work'))).toBeUndefined()
  expect(reworkOf(turn(0.02, 'reply'))).toBeUndefined()
  expect(reworkOf(turn(0.25, 'new_work', 0.98))).toEqual({ kind: 'lesson', isLesson: true })
  expect(reworkOf(turn(0.6, 'polish', 0.98, 0.4))).toEqual({ kind: 'polish', isLesson: true })
})

test('evidence is enough at the level the task needs, and a spread answer withholds nothing', () => {
  const task = createTask('Dark mode', 0)
  expect(requiredEvidence(task)).toBe(2)
  expect(requiredEvidence({ ...task, ui: true })).toBe(3)
  expect(judgedOf(proof(2), 2)).toMatchObject({ ok: true, detail: 'tests ran', isFalseClaim: false, isAwaiting: false })
  expect(judgedOf(proof(1), 2)).toMatchObject({ ok: false, detail: 'only static checks ran; no test covers the change yet' })
  expect(judgedOf(proof(2), 3)).toMatchObject({ ok: false, detail: 'tests ran; the change has not been seen working' })
  expect(judgedOf(proof(3), 3).ok).toBe(true)
  expect(judgedOf(proof(1, 0.4), 2).ok).toBe(true)
  expect(judgedOf(proof(0.08), 2).isFalseClaim).toBe(true)
  expect(judgedOf(proof(0, 0.95, 0.04), 2).isFalseClaim).toBe(false)
  expect(judgedOf(proof(2, 0.9, 0.9, 0.86), 2).isAwaiting).toBe(true)
})

test('what the turn ran is shown to Jev as commands', () => {
  expect(ranOf({ tool: 'Bash', command: 'pnpm test' }, true)).toEqual({ command: 'pnpm test', passed: true })
  expect(ranOf({ tool: 'mcp__claude-in-chrome__computer', action: 'screenshot' }, true)).toEqual({ command: 'mcp__claude-in-chrome__computer screenshot', passed: true })
  expect(ranOf({ tool: 'Read', file_path: '/repo/a.ts' }, true)).toBeUndefined()
  expect(ranOf({ tool: 'mcp__flow__stage_done', summary: 'x' }, true)).toBeUndefined()
})

const built = () =>
  [
    { kind: 'edit', detail: 'src/a.ts' } as const,
    { kind: 'check', detail: 'pnpm test', ok: true } as const,
    { kind: 'done' } as const,
  ].reduce<FlowTask>((task, event, index) => recordEvent(task, event, 10 + index), recordSkill(createTask('Dark mode', 0, { flow: 'oneshot' }), 'implement', 1))

test('short evidence keeps a proven build from reading Ready until it is judged enough or waived', () => {
  expect(statusOf(built(), false)).toBe('ready')
  const short = recordEvent(built(), { kind: 'judged', ok: false, detail: 'tests ran; the change has not been seen working' }, 20)
  expect(judgedGap(short)).toBe('tests ran; the change has not been seen working')
  expect(statusOf(short, false)).toBe('proof')
  expect(holdNote(short, 'proof')).toBe('tests ran; the change has not been seen working')
  expect(statusOf(recordEvent(short, { kind: 'judged', ok: true, detail: 'the change was seen working' }, 21), false)).toBe('ready')
  expect(statusOf(recordEvent(short, { kind: 'allow' }, 21), false)).toBe('ready')
})

test('the retro reads the corrections the person made', () => {
  const task = recordEvent(built(), { kind: 'rework', detail: 'mismatch: no, the toggle goes in the header' }, 60_000)
  expect(corrections(task)).toEqual(['+1m mismatch: no, the toggle goes in the header'])
  expect(reminder(task, 'retro', 'feature')).toContain('Corrections the person made in this task')
  expect(reminder(built(), 'retro', 'feature')).not.toContain('Corrections')
})

test('the log reads as a few lines', () => {
  expect(logSummary([])).toBe('No Jev decisions logged yet.')
  const text = logSummary([
    { at: 1, call: 'turn', ms: 250, slug: 'a', phase: 'implement', answers: {}, note: 'rework defect' },
    { at: 2, call: 'turn', ms: 300, slug: 'a', phase: 'implement', answers: {} },
    { at: 3, call: 'proof', ms: 270, slug: 'a', phase: 'implement', answers: {}, note: 'short: only static checks ran' },
  ])
  expect(text).toContain('3 decisions, median 270 ms.')
  expect(text).toContain('Prompts judged: 2; rework: 1 (defect 1, mismatch 0, polish 0).')
  expect(text).toContain('Turn ends judged: 1; evidence short: 1.')
})

const prompt = (text: string, from: 'composer' | 'plugin' = 'composer') =>
  ({ text, wait: false, origin: from === 'plugin' ? ({ kind: 'plugin', name: 'other' } as const) : ({ kind: 'composer' } as const) })
const answerTurn = { answer: 'Added the toggle. Tests pass.', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

/** The engine with Jev answering: what was asked, and the answers to give. */
const withJev = (on: Parameters<typeof fakeRepo>[0], answers: { turn?: TurnAnswers; proof?: ProofAnswers }, status = 200) => {
  const asked: { url: string; state: Record<string, unknown>; ids: string[] }[] = []
  on('http.fetch', (_, e) => {
    const sent = JSON.parse(typeof e.init?.body === 'string' ? e.init.body : '{}') as { state: Record<string, unknown>; questions: Record<string, unknown> }
    const ids = Object.keys(sent.questions)
    asked.push({ url: e.url, state: sent.state, ids })
    const answer = ids.includes('rework') ? answers.turn : answers.proof

    return { value: { status, ok: status === 200, headers: {}, text: answer === undefined ? '{}' : body(answer) } }
  })
  on('prompt.submit', (_, e) => ({ text: e.text, ...(e.context === undefined ? {} : { context: e.context }) }))
  on('turn.complete', () => ({ text: '' }))

  return asked
}

const building = async ($: Engine) => {
  await $.command.run(flow('new --workflow oneshot Add a dark mode toggle'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })
}

test('off: nothing is asked', async ($, on) => {
  const asked = withJev(on, { turn: turn(0.97, 'defect') })
  fakeRepo(on)
  await building($)
  await $.prompt.submit(prompt('it is still broken, the toggle does nothing'))
  expect(asked).toEqual([])
  expect((await $.command.run(flow('jev'))).text).toBe('Jev is off.\nNo Jev decisions logged yet.')
})

test('shadow: a rework prompt is logged and noted, and the model reads nothing more', { options: { jevMode: 'shadow', jevApiKey: 'k' } }, async ($, on) => {
  const asked = withJev(on, { turn: turn(0.97, 'defect') })
  const { files } = fakeRepo(on)
  await building($)
  const sent = await $.prompt.submit(prompt('it is still broken, the toggle does nothing'))
  expect(asked).toHaveLength(1)
  expect(asked[0]?.url).toBe('https://api.typesafe.ai/v1/systemone')
  expect(asked[0]?.state.prompt).toBe('it is still broken, the toggle does nothing')
  expect('context' in sent ? sent.context : undefined).toBeUndefined()
  const log = (JSON.parse(files.get('/repo/.scratch/add-a-dark-mode-toggle/task.json') ?? '{}') as FlowTask).log
  expect(log.at(-1)).toMatchObject({ kind: 'rework', detail: 'defect: it is still broken, the toggle does nothing' })
  expect((await $.command.run(flow('jev'))).text).toContain('Prompts judged: 1; rework: 1 (defect 1')

  // A command, a bare reply and a prompt nobody typed are not judged.
  await $.prompt.submit(prompt('/pr'))
  await $.prompt.submit(prompt('yes'))
  await $.prompt.submit(prompt('it is still broken, the toggle does nothing', 'plugin'))
  expect(asked).toHaveLength(1)
})

test('on: a rework prompt carries a note for the model', { options: { jevMode: 'on', jevApiKey: 'k' } }, async ($, on) => {
  withJev(on, { turn: turn(0.97, 'defect') })
  fakeRepo(on)
  await building($)
  const sent = await $.prompt.submit(prompt('it is still broken, the toggle does nothing'))
  expect('context' in sent ? sent.context?.at(-1) : undefined).toContain('diagnosing-bugs')
})

test('on: a refused or late answer passes the prompt through untouched', { options: { jevMode: 'on', jevApiKey: 'k' } }, async ($, on) => {
  const asked = withJev(on, { turn: turn(0.97, 'defect') }, 529)
  const { files } = fakeRepo(on)
  await building($)
  const sent = await $.prompt.submit(prompt('it is still broken, the toggle does nothing'))
  expect(asked).toHaveLength(1)
  expect(sent).toEqual({ text: 'it is still broken, the toggle does nothing' })
  expect((JSON.parse(files.get('/repo/.scratch/add-a-dark-mode-toggle/task.json') ?? '{}') as FlowTask).log.some(one => one.kind === 'rework')).toBe(false)
})

test('on: a proven build whose evidence is short reads Needs proof, and Jev is not asked before the checks pass', { options: { jevMode: 'on', jevApiKey: 'k' } }, async ($, on) => {
  const asked = withJev(on, { proof: proof(1) })
  const { files } = fakeRepo(on)
  const task = () => JSON.parse(files.get('/repo/.scratch/add-a-dark-mode-toggle/task.json') ?? '{}') as FlowTask
  await building($)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/settings.tsx', old_string: 'a', new_string: 'b' })
  await $.turn.complete(answerTurn)
  expect(asked).toEqual([])

  await $.tool.call({ tool: 'Bash', command: 'pnpm typecheck' })
  await $.turn.complete(answerTurn)
  expect(asked).toHaveLength(1)
  expect(asked[0]?.state).toMatchObject({ changed_files: ['src/settings.tsx'], ran: [{ command: 'pnpm typecheck', passed: true }], final_message: 'Added the toggle. Tests pass.' })
  expect(task().log.at(-1)).toMatchObject({ kind: 'judged', ok: false, detail: 'only static checks ran; no test covers the change yet' })
  expect(statusOf(task(), false)).toBe('proof')

  // Nothing new ran: the same evidence is not judged twice.
  await $.turn.complete(answerTurn)
  expect(asked).toHaveLength(1)
})

test('shadow: the evidence is judged and logged, and the status stands on the facts', { options: { jevMode: 'shadow', jevApiKey: 'k' } }, async ($, on) => {
  withJev(on, { proof: proof(1) })
  const { files } = fakeRepo(on)
  await building($)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/settings.tsx', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'pnpm typecheck' })
  await $.turn.complete(answerTurn)
  const task = JSON.parse(files.get('/repo/.scratch/add-a-dark-mode-toggle/task.json') ?? '{}') as FlowTask
  expect(task.log.some(one => one.kind === 'judged')).toBe(false)
  expect((await $.command.run(flow('jev'))).text).toContain('Turn ends judged: 1; evidence short: 1.')
})
