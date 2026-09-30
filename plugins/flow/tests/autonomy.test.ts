import type { HookStream, On, TurnStepChunk, TurnStepResult } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { expect, test } from 'claude-code/testing'

import { canAutoAdvance, gateNotice, modelId, overrideLabel, overrideOf } from '../hooks/autonomy'
import { approvePhase, createTask, recordArtifact, recordSkill } from '../hooks/flow'
import { reminder } from '../hooks/trail'
import type { FlowTask } from '../types'
import { fakeRepo, flow } from './fake'

const STAGE_DONE = 'mcp__flow__stage_done'
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
  expect(gateNotice(specced)).toBe('flow: the spec is ready. Read .scratch/retry-checkout/, then /flow approve')
  const written = recordArtifact(specced, '.scratch/retry-checkout/spec.md', 3)
  expect(gateNotice(written)).toBe('flow: the spec is ready. Read .scratch/retry-checkout/spec.md, then /flow approve')
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
  expect(overrideLabel('claude-opus-5', 'high')).toBe('flow: claude-opus-5 at high')
  expect(overrideLabel(undefined, 'high')).toBe('flow: high effort')
  expect(overrideLabel(undefined, undefined)).toBeUndefined()
})

test('a stage skill reminds the model to report when its stage is finished', () => {
  const task = at(createTask('Retry checkout', 0), 'grill-with-docs')
  expect(reminder(task, 'grill-with-docs', 'feature')).toContain('call mcp__flow__stage_done with a one-line summary')
  expect(reminder(task, 'tdd', 'feature')).not.toContain('stage_done')
})

test('stage_done is registered at session start and records the event', async ($, on) => {
  const registered: string[] = []
  on('tool.register', (_, e) => {
    registered.push(e.name)

    return { value: { tool: `mcp__flow__${e.name}` } }
  })
  on('command.register', () => ({ value: { command: 'flow' } }))
  on('session.start', () => ({ cwd: '/repo' }))
  const { files } = fakeRepo(on)
  await $.session.start({ cwd: '/repo', surface: null, isInteractive: false })
  expect(registered).toEqual(['stage_done'])

  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'x' })).text).toBeUndefined()
  await $.command.run(flow('new Retry failed checkout payments'))
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
  await $.command.run(flow('new --workflow oneshot Retry failed checkout payments'))
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
  await $.command.run(flow(`new ${flags} Retry failed checkout payments`))
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
  expect((await advances($, on, '--workflow oneshot', ['implement'])).ran).toEqual(['mattpocock-skills:pr'])
})

test('with autoAdvance an interrupted turn drops the advance', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--workflow oneshot', ['implement'], 10, 'aborted')).ran).toEqual([])
})

test('with autoAdvance a finished pr stage runs the retro', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--workflow oneshot', ['implement', 'pr'])).ran).toEqual(['mattpocock-skills:retro'])
})

test('autoAdvance never starts a build from planning, crosses a gate or runs past the retro', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--workflow grill', ['grill-with-docs'])).ran).toEqual([])
})

test('autoAdvance stops at a gate', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--workflow spec', ['grill-with-docs', 'to-spec'])).ran).toEqual([])
})

test('autoAdvance stops after the retro', { options: { autoAdvance: true } }, async ($, on) => {
  expect((await advances($, on, '--workflow oneshot', ['implement', 'pr', 'retro'])).ran).toEqual([])
})

test('a full context holds autoAdvance with a toast', { options: { autoAdvance: true } }, async ($, on) => {
  const { ran, toasts } = await advances($, on, '--workflow oneshot', ['implement'], 80)
  expect(ran).toEqual([])
  expect(toasts).toEqual(['Context 80%: /clear, then /pr. The task survives /clear.'])
})

test('a gate that gets its artifact, or is reported done, toasts once', async ($, on) => {
  const { toasts } = fakeRepo(on)
  await $.command.run(flow('new --workflow spec Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
  expect(toasts).toEqual([])

  const dir = '.scratch/retry-failed-checkout-payments'
  await $.tool.call({ tool: 'Write', file_path: `/repo/${dir}/spec.md`, content: 'spec' })
  expect(toasts).toEqual([`flow: the spec is ready. Read ${dir}/spec.md, then /flow approve`])
  await $.tool.call({ tool: STAGE_DONE, summary: 'spec written' })
  await $.tool.call({ tool: 'Write', file_path: `/repo/${dir}/spec-2.md`, content: 'more' })
  expect(toasts).toHaveLength(1)

  await $.command.run(flow('approve'))
  await $.skill.prompt({ skill: 'to-tickets', text: 'tickets' })
  await $.tool.call({ tool: STAGE_DONE, summary: 'tickets written' })
  expect(toasts).toEqual([
    `flow: the spec is ready. Read ${dir}/spec.md, then /flow approve`,
    `flow: the tickets is ready. Read ${dir}/, then /flow approve`,
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

  await $.command.run(flow('new --model claude-sonnet-5-5 --effort high Retry failed checkout payments'))
  await drain($.turn.step(step()))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-sonnet-5-5', effort: 'high' })
  expect(statuses.at(-1)).toBe('flow: claude-sonnet-5-5 at high')

  await drain($.turn.step(step({ agentId: 'a1' })))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'medium', agentId: 'a1' })

  await $.command.run(flow('done'))
  await drain($.turn.step(step()))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'medium' })
  expect(statuses.at(-1)).toBeUndefined()
})

test('an unknown model word keeps the session model, applies the effort and says so once', async ($, on) => {
  const { toasts } = fakeRepo(on)
  const { seen } = stepper(on)
  await $.command.run(flow('new --model mythos --effort low Retry failed checkout payments'))
  await drain($.turn.step(step()))
  await drain($.turn.step(step()))
  expect(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'low' })
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('"mythos" is not a full model id')
})

const pane = { title: 'flow', isFocused: true, bodyColumns: 90, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } as const

test('a worktree task runs each stage in its worktree, entered once, with the task files linked in', async ($, on) => {
  on('command.list', () => ({ value: [{ name: 'mattpocock-skills:implement', description: 'implement', source: 'plugin' as const }] }))
  const ran: string[] = []
  on('command.run', (_, e) => {
    ran.push(e.command)

    return { text: '' }
  })
  const { files, calls, runs } = fakeRepo(on)
  const entered = () => calls.filter(call => call.tool === 'EnterWorktree')

  await $.command.run(flow('new --worktree --workflow oneshot Add webhook retries'))
  expect(entered()).toEqual([])
  const ui = await $.ui.mount({ plugin: 'flow', surface: 'terminal', component: 'Pane', requestId: 'flow', props: pane })
  await ui.press({ key: 'next' })
  expect(entered()).toMatchObject([{ tool: 'EnterWorktree', name: 'add-webhook-retries' }])
  expect(runs).toContainEqual(['ln', '-s', '/repo/.scratch', '/repo/.claude/worktrees/add-webhook-retries/.scratch'])
  expect(ran).toEqual(['mattpocock-skills:implement'])
  expect([...files.keys()]).toContain('/repo/.scratch/add-webhook-retries/task.json')

  await ui.press({ key: 'next' })
  expect(entered()).toHaveLength(1)
  expect(ran).toHaveLength(2)
})

test('two changes at once both land: the noun runs them one at a time', async ($, on) => {
  const { files } = fakeRepo(on)
  await $.command.run(flow('new --workflow spec Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
  await Promise.all([
    $.tool.call({ tool: STAGE_DONE, summary: 'specced' }),
    $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-failed-checkout-payments/spec.md', content: '# Spec' }),
  ])
  const saved = JSON.parse(files.get('/repo/.scratch/retry-failed-checkout-payments/task.json') ?? '{}') as FlowTask
  expect(saved.log.some(one => one.kind === 'done')).toBe(true)
  expect(saved.artifacts.map(one => one.pointer)).toContain('.scratch/retry-failed-checkout-payments/spec.md')
})
