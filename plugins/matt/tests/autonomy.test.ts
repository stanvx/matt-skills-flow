import type { HookStream, On, TurnStepChunk, TurnStepResult } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { expect, test } from 'claude-code/testing'

import { canAutoAdvance, gateNotice, modelId, overrideLabel, overrideOf } from '../hooks/autonomy'
import { approvePhase, createTask, recordArtifact, recordSkill } from '../hooks/flow'
import { reminder } from '../hooks/trail'
import { fakeRepo, matt } from './fake'

const STAGE_DONE = 'mcp__matt__stage_done'
const at = (task: ReturnType<typeof createTask>, ...skills: string[]) =>
  skills.reduce((moved, skill, index) => recordSkill(moved, skill, index + 1), task)

test('only a finished build or closing stage may start the next stage on its own', () => {
  const oneshot = createTask('Retry checkout', 0, { flow: 'oneshot' })
  expect(canAutoAdvance(at(oneshot, 'implement'))).toBe(true)
  expect(canAutoAdvance(at(oneshot, 'implement', 'pr'))).toBe(true)
  expect(canAutoAdvance(at(oneshot, 'implement', 'pr', 'retro'))).toBe(false)
  expect(canAutoAdvance(oneshot)).toBe(false)

  const spec = createTask('Retry checkout', 0, { flow: 'spec' })
  expect(canAutoAdvance(at(spec, 'grill-with-docs'))).toBe(false)
  expect(canAutoAdvance(at(spec, 'grill-with-docs', 'to-spec'))).toBe(false)
  expect(canAutoAdvance(approvePhase(at(spec, 'to-tickets'), 9))).toBe(false)
  expect(canAutoAdvance(at(spec, 'implement-spec'))).toBe(true)
  expect(canAutoAdvance(at(createTask('Retry checkout', 0, { flow: 'freeform' }), 'implement'))).toBe(false)
  expect(canAutoAdvance(at(createTask('Checkout crashes', 0), 'diagnosing-bugs'))).toBe(true)
})

test('a gated phase announces its artifact until approved', () => {
  const specced = at(createTask('Retry checkout', 0, { flow: 'spec' }), 'to-spec')
  expect(gateNotice(specced)).toBe('matt: the spec is ready. Read .scratch/retry-checkout/, then /matt approve')
  const written = recordArtifact(specced, '.scratch/retry-checkout/spec.md', 3)
  expect(gateNotice(written)).toBe('matt: the spec is ready. Read .scratch/retry-checkout/spec.md, then /matt approve')
  expect(gateNotice(approvePhase(written, 4))).toBeUndefined()
  expect(gateNotice(at(specced, 'implement'))).toBeUndefined()
})

test('turn.step needs a full model id: known aliases map to theirs, other words only to the session model', () => {
  expect(modelId('claude-sonnet-5-5', 'claude-opus-5')).toBe('claude-sonnet-5-5')
  expect(modelId('sonnet', 'claude-opus-5')).toBe('claude-sonnet-5-5')
  expect(modelId('opus-5', 'claude-opus-5')).toBe('claude-opus-5')
  expect(modelId('mythos', 'claude-opus-5')).toBeUndefined()

  const task = createTask('Retry checkout', 0, { model: 'mythos', effort: 'high' })
  expect(overrideOf(task, 'claude-opus-5')).toEqual({ effort: 'high', unresolved: 'mythos' })
  expect(overrideOf(createTask('Retry checkout', 0), 'claude-opus-5')).toEqual({})
  expect(overrideLabel('claude-opus-5', 'high')).toBe('matt: claude-opus-5 at high')
  expect(overrideLabel(undefined, 'high')).toBe('matt: high effort')
  expect(overrideLabel(undefined, undefined)).toBeUndefined()
})

test('a stage skill reminds the model to report when its stage is finished', () => {
  const task = at(createTask('Retry checkout', 0), 'grill-with-docs')
  expect(reminder(task, 'grill-with-docs', 'feature')).toContain('call mcp__matt__stage_done with a one-line summary')
  expect(reminder(task, 'tdd', 'feature')).not.toContain('stage_done')
})

test('stage_done is registered at session start and records the event', async ($, on) => {
  const registered: string[] = []
  on('tool.register', (_, e) => {
    registered.push(e.name)

    return { value: { tool: `mcp__matt__${e.name}` } }
  })
  on('command.register', () => ({ value: { command: 'matt' } }))
  on('session.start', () => ({ cwd: '/repo' }))
  const { files } = fakeRepo(on)
  await $.session.start({ cwd: '/repo', surface: null, isInteractive: false })
  expect(registered).toEqual(['stage_done'])

  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'x' })).text).toBeUndefined()
  await $.command.run(matt('new Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
  const done = await $.tool.call({ tool: STAGE_DONE, summary: 'settled the retry policy' })
  expect(done.deny).toBeUndefined()
  expect(done.result).toContain('Next for the task: /implement')
  const log = JSON.parse(files.get('/repo/.scratch/retry-failed-checkout-payments/task.json') ?? '{}').log
  expect(log.at(-1)).toEqual({ kind: 'done', detail: 'settled the retry policy', phase: 'grill-with-docs', at: 1000 })
})

test('without autoAdvance, stage_done never runs a stage', async ($, on) => {
  const ran: string[] = []
  on('command.run', (_, e) => {
    ran.push(e.command)

    return { text: '' }
  })
  const { clock } = fakeRepo(on)
  await $.command.run(matt('new --flow oneshot Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })
  await $.tool.call({ tool: STAGE_DONE, summary: 'built' })
  await clock.advance(0)
  expect(ran).toEqual([])
})

const advances = async (
  $: Engine,
  on: On,
  flags: string,
  skills: string[],
  percent = 10,
  turnEnd: 'answer' | 'aborted' = 'answer',
) => {
  const ran: string[] = []
  on('command.list', () => ({
    value: ['pr', 'retro', 'implement', 'to-tickets'].map(name => ({ name: `mattpocock-skills:${name}`, description: name, source: 'plugin' as const })),
  }))
  on('command.run', (_, e) => {
    ran.push(e.command)

    return { text: '' }
  })
  on('turn.complete', () => ({ text: '' }))
  const { clock, toasts } = fakeRepo(on, percent)
  await $.command.run(matt(`new ${flags} Retry failed checkout payments`))
  for (const skill of skills) {
    await $.skill.prompt({ skill, text: skill })
  }
  await $.tool.call({ tool: STAGE_DONE, summary: 'done' })
  await clock.advance(0)
  // Nothing runs mid-turn: the next stage waits for the turn to answer.
  expect(ran).toEqual([])
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: turnEnd })
  await clock.advance(0)

  return { ran, toasts }
}

test('with autoAdvance a finished build stage runs the next one', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--flow oneshot', ['implement'])).ran).toEqual(['mattpocock-skills:pr'])
})

test('with autoAdvance an interrupted turn drops the advance', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--flow oneshot', ['implement'], 10, 'aborted')).ran).toEqual([])
})

test('with autoAdvance a finished pr stage runs the retro', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--flow oneshot', ['implement', 'pr'])).ran).toEqual(['mattpocock-skills:retro'])
})

test('autoAdvance never starts a build from planning, crosses a gate or runs past the retro', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--flow grill', ['grill-with-docs'])).ran).toEqual([])
})

test('autoAdvance stops at a gate', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--flow spec', ['grill-with-docs', 'to-spec'])).ran).toEqual([])
})

test('autoAdvance stops after the retro', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--flow oneshot', ['implement', 'pr', 'retro'])).ran).toEqual([])
})

test('a full context holds autoAdvance with a toast', { options: { autoAdvance: true } }, async ($, on) => {
  const { ran, toasts } = await advances($, on, '--flow oneshot', ['implement'], 80)
  expect(ran).toEqual([])
  expect(toasts).toEqual(['Context 80%: /clear, then /pr. The task survives /clear.'])
})

test('a gate that gets its artifact, or is reported done, toasts once', async ($, on) => {
  const { toasts } = fakeRepo(on)
  await $.command.run(matt('new --flow spec Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
  expect(toasts).toEqual([])

  const dir = '.scratch/retry-failed-checkout-payments'
  await $.tool.call({ tool: 'Write', file_path: `/repo/${dir}/spec.md`, content: 'spec' })
  expect(toasts).toEqual([`matt: the spec is ready. Read ${dir}/spec.md, then /matt approve`])
  await $.tool.call({ tool: STAGE_DONE, summary: 'spec written' })
  await $.tool.call({ tool: 'Write', file_path: `/repo/${dir}/spec-2.md`, content: 'more' })
  expect(toasts).toHaveLength(1)

  await $.command.run(matt('approve'))
  await $.skill.prompt({ skill: 'to-tickets', text: 'tickets' })
  await $.tool.call({ tool: STAGE_DONE, summary: 'tickets written' })
  expect(toasts).toEqual([
    `matt: the spec is ready. Read ${dir}/spec.md, then /matt approve`,
    `matt: the tickets is ready. Read ${dir}/, then /matt approve`,
  ])
})

const step = (overrides: { agentId?: string } = {}) => ({
  turnId: 't1',
  index: 0,
  model: 'claude-opus-5',
  effort: 'medium' as const,
  messageCount: 3,
  ...overrides,
})

const drain = async (stream: HookStream<TurnStepChunk, TurnStepResult>) => {
  for await (const chunk of stream) {
    void chunk
  }

  return stream.result
}

const stepper = (on: On) => {
  const seen: { model: string; effort?: string | number; agentId?: string }[] = []
  const statuses: (string | undefined)[] = []
  on('turn.step', async function* (_, e) {
    seen.push(e)

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('ui.status', (_, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  return { seen, statuses }
}

test('turn.step runs main-loop steps on the task model and effort, and leaves subagents alone', async ($, on) => {
  fakeRepo(on)
  const { seen, statuses } = stepper(on)

  await drain($.turn.step(step()))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'medium' })

  await $.command.run(matt('new --model claude-sonnet-5-5 --effort high Retry failed checkout payments'))
  await drain($.turn.step(step()))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-sonnet-5-5', effort: 'high' })
  expect(statuses.at(-1)).toBe('matt: claude-sonnet-5-5 at high')

  await drain($.turn.step(step({ agentId: 'a1' })))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'medium', agentId: 'a1' })

  await $.command.run(matt('done'))
  await drain($.turn.step(step()))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'medium' })
  expect(statuses.at(-1)).toBeUndefined()
})

test('an unknown model word keeps the session model, applies the effort and says so once', async ($, on) => {
  const { toasts } = fakeRepo(on)
  const { seen } = stepper(on)
  await $.command.run(matt('new --model mythos --effort low Retry failed checkout payments'))
  await drain($.turn.step(step()))
  await drain($.turn.step(step()))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'low' })
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('"mythos" is not a full model id')
})

test('a worktree task enters a worktree named after its slug, once, and keeps its file in the main tree', async ($, on) => {
  const { files, clock, calls, runs } = fakeRepo(on, 10, '/repo/.claude/worktrees/fix-the-flaky-webhook-retries')
  const entered = () => calls.filter(call => call.tool === 'EnterWorktree')

  await $.command.run(matt('new Retry failed checkout payments'))
  await clock.advance(0)
  expect(entered()).toEqual([])

  await $.command.run(matt('new --worktree Fix the flaky webhook retries'))
  expect(entered()).toEqual([])
  await clock.advance(0)
  expect(entered()).toMatchObject([{ tool: 'EnterWorktree', name: 'fix-the-flaky-webhook-retries' }])
  expect([...files.keys()]).toContain('/repo/.scratch/fix-the-flaky-webhook-retries/task.json')
  expect(runs).toContainEqual(['ln', '-s', '/repo/.scratch', '/repo/.claude/worktrees/fix-the-flaky-webhook-retries/.scratch'])

  await $.command.run(matt('new --worktree Fix the flaky webhook retries'))
  await clock.advance(0)
  expect(entered()).toHaveLength(1)
})
