import { expect, test } from 'claude-code/testing'

import {
  approvePhase,
  createTask,
  editGate,
  nextAction,
  parseNew,
  rail,
  recordArtifact,
  recordSkill,
  statusOf,
  withDefaults,
} from '../hooks/flow'

const stops = (task: Parameters<typeof rail>[0]) => rail(task).map(stop => `${stop.state} ${stop.stage}`)

const run = (task: Parameters<typeof rail>[0], ...skills: string[]) =>
  skills.reduce((moved, skill, at) => recordSkill(moved, skill, at + 1), task)

test('each flow draws its own rail from new', () => {
  expect(stops(createTask('Retry checkout', 0, { flow: 'oneshot' }))).toEqual(['ahead implement', 'ahead pr', 'ahead retro'])
  expect(stops(createTask('Retry checkout', 0, { flow: 'grill' }))).toEqual([
    'ahead grill-with-docs',
    'ahead implement',
    'ahead pr',
    'ahead retro',
  ])
  expect(stops(createTask('Retry checkout', 0, { flow: 'spec' }))).toEqual([
    'ahead grill-with-docs',
    'ahead to-spec',
    'ahead to-tickets',
    'ahead implement-spec',
    'ahead pr',
    'ahead retro',
  ])
  expect(stops(createTask('Retry checkout', 0, { flow: 'freeform' }))).toEqual([])
  expect(stops(createTask('Retry checkout', 0, { flow: 'oneshot', openPr: false }))).toEqual(['ahead implement', 'ahead retro'])
})

test('a new task guesses its flow from where it joins, and the guess can be overridden', () => {
  expect(createTask('#123', 0).flow).toBe('oneshot')
  expect(createTask('checkout crashes on submit', 0).flow).toBe('oneshot')
  expect(createTask('greenfield billing service', 0).flow).toBe('spec')
  expect(createTask('retry failed checkout payments', 0).flow).toBe('grill')
  expect(createTask('retry failed checkout payments', 0, { flow: 'spec' }).flow).toBe('spec')

  const named = createTask('a long description\nwith more lines', 0, { title: 'Retry payments', model: 'opus', effort: 'high' })
  expect(named).toMatchObject({ title: 'Retry payments', slug: 'retry-payments', model: 'opus', effort: 'high', openPr: true, worktree: 'never' })
})

test('on-ramps replace the first stage: a bug starts at diagnosing-bugs, a foggy effort at wayfinder', () => {
  const broken = createTask('checkout crashes on submit', 0)
  expect(stops(broken)).toEqual(['ahead diagnosing-bugs', 'ahead pr', 'ahead retro'])
  expect(nextAction(broken)).toMatchObject({ command: 'diagnosing-bugs', args: 'checkout crashes on submit' })
  expect(recordSkill(broken, 'diagnosing-bugs', 1).phase).toBe('diagnosing-bugs')

  const foggy = createTask('greenfield billing service', 0)
  expect(stops(foggy)[0]).toBe('ahead wayfinder')
  const charted = recordSkill(foggy, 'wayfinder', 1)
  expect(nextAction(charted)).toEqual({ command: 'wayfinder', why: 'next frontier ticket; /to-spec once the map clears' })
})

test('the next action walks each flow to done', () => {
  const oneshot = createTask('#12 fix the retry', 0)
  expect(nextAction(oneshot).command).toBe('implement')
  expect(nextAction(run(oneshot, 'implement'))).toEqual({ command: 'pr', why: 'open the pull request, with the checks as evidence' })
  expect(nextAction(run(oneshot, 'implement', 'pr')).command).toBe('retro')
  expect(nextAction(run(oneshot, 'implement', 'pr', 'retro'))).toEqual({ command: 'matt', args: 'done', why: 'close the task' })

  const grill = createTask('Retry checkout', 0)
  expect(nextAction(grill)).toEqual({ command: 'grill-with-docs', args: 'Retry checkout', why: 'start here: sharpen the idea and settle the decisions first' })
  expect(nextAction(run(grill, 'grill-with-docs')).command).toBe('implement')

  const spec = createTask('Retry checkout', 0, { flow: 'spec' })
  expect(nextAction(run(spec, 'grill-with-docs')).command).toBe('to-spec')
  const specced = run(spec, 'grill-with-docs', 'to-spec')
  expect(nextAction(specced)).toMatchObject({ command: 'matt', args: 'approve' })
  expect(nextAction(approvePhase(specced, 9)).command).toBe('to-tickets')
})

test('the ticket the task was made from is what the first stage reads', () => {
  const task = recordArtifact(createTask('Retry checkout', 0, { flow: 'oneshot' }), '.scratch/retry-checkout/ticket.md', 1)
  expect(nextAction(task)).toMatchObject({ command: 'implement', args: '.scratch/retry-checkout/ticket.md' })
})

test('implement and implement-spec fill the same slot, so either one moves a spec task on', () => {
  const spec = run(createTask('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 'to-spec', 'to-tickets', 'implement')
  expect(stops(spec)).toEqual([
    'done grill-with-docs',
    'done to-spec',
    'done to-tickets',
    'now implement',
    'ahead pr',
    'ahead retro',
  ])
})

test('a stage outside the flow grows it into the smallest flow that has it, and says so', () => {
  const oneshot = createTask('#12 fix the retry', 0)
  const grilled = run(oneshot, 'grill-with-docs')
  expect(grilled.flow).toBe('grill')
  expect(grilled.log.at(-1)).toMatchObject({ kind: 'flow', detail: 'grill' })

  const specced = run(grilled, 'to-spec')
  expect(specced.flow).toBe('spec')
  expect(nextAction(approvePhase(specced, 9)).command).toBe('to-tickets')

  expect(run(createTask('Retry checkout', 0, { flow: 'freeform' }), 'to-spec').flow).toBe('freeform')
  expect(run(createTask('Retry checkout', 0, { flow: 'spec' }), 'implement').flow).toBe('spec')
})

test('freeform records every stage, holds no edits and hands the choice to ask-matt', () => {
  const free = createTask('Retry checkout', 0, { flow: 'freeform' })
  expect(nextAction(free)).toEqual({ command: 'ask-matt', args: 'Retry checkout', why: 'freeform: ask-matt picks the skill' })
  const grilled = run(free, 'grill-with-docs')
  expect(stops(grilled)).toEqual(['now grill-with-docs'])
  expect(editGate(grilled, 'src/pay.ts')).toBeUndefined()
  expect(nextAction(grilled)).toEqual({ command: 'matt', args: 'done', why: 'freeform: run any skill, then close the task' })
})

test('status: working while a turn runs, waiting at an unapproved gate, ready otherwise, done once closed', () => {
  const specced = run(createTask('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 'to-spec')
  expect(statusOf(specced, true)).toBe('working')
  expect(statusOf(specced, false)).toBe('waiting')
  expect(statusOf(approvePhase(specced, 9), false)).toBe('ready')
  expect(statusOf({ ...specced, closedAt: 10 }, true)).toBe('done')
})

test('a task file written before flows keeps the rail it had', () => {
  const { flow: _, openPr: __, worktree: ___, ...old } = run(createTask('Retry checkout', 0), 'grill-with-docs')
  const read = withDefaults(old)
  expect(read).toMatchObject({ flow: 'spec', openPr: true, worktree: 'never' })
  expect(nextAction(read).command).toBe('to-spec')
})

test('/matt new takes flags for the flow, the start, the PR, the worktree, the model and the effort', () => {
  expect(parseNew('--flow spec --model opus --effort high retry payments')).toEqual({
    text: 'retry payments',
    options: { flow: 'spec', model: 'opus', effort: 'high' },
  })
  expect(parseNew('--start=broken --no-pr --worktree the thing')).toEqual({
    text: 'the thing',
    options: { start: 'broken', openPr: false, worktree: 'now' },
  })
  expect(parseNew('just words')).toEqual({ text: 'just words', options: {} })
  expect(parseNew('--flow nope x').bad).toBe('--flow nope')
  expect(parseNew('--effort extreme x').bad).toBe('--effort extreme')
  expect(parseNew('--start nope x').bad).toBe('--start nope')
})
