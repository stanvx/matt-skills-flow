import { expect, test } from 'claude-code/testing'

import { boardDoc, boardVersion } from '../hooks/board'
import {
  allowPhase,
  approvePhase,
  createTask,
  createdUrl,
  editGate,
  inferEntry,
  inside,
  nextAction,
  parseNew,
  rail,
  recordArtifact,
  recordEvent,
  recordSkill,
  scratchPointer,
} from '../hooks/flow'
import { checkOf, ciOutcome, evidence, reminder, timeline, unsettledPr } from '../hooks/trail'
import { fakeRepo, flow } from './fake'

test('infers where a task joins the flow', () => {
  expect(inferEntry('#123')).toBe('ticket')
  expect(inferEntry('pick up ENG-42 today')).toBe('ticket')
  expect(inferEntry('checkout crashes on submit')).toBe('broken')
  expect(inferEntry('greenfield billing service')).toBe('foggy')
  expect(inferEntry('retry failed checkout payments')).toBe('idea')
})

test('parses --start and refuses an unknown one', () => {
  expect(parseNew('--start broken the thing')).toEqual({ text: 'the thing', options: { start: 'broken' } })
  expect(parseNew('--start nope x').bad).toBe('--start nope')
  expect(parseNew('just words').options.start).toBeUndefined()
})

test('stage skills move the phase, steps only record, others are ignored', () => {
  const task = createTask('Retry checkout', 0)
  expect(task.slug).toBe('retry-checkout')
  expect(nextAction(task).command).toBe('grill-with-docs')

  const grilled = recordSkill(task, 'mattpocock-skills:grill-with-docs', 1)
  expect(grilled.phase).toBe('grill-with-docs')
  expect(nextAction(grilled).command).toBe('implement')

  const prototyped = recordSkill(grilled, 'prototype', 2)
  expect(prototyped.phase).toBe('grill-with-docs')
  expect(prototyped.history.map(step => step.skill)).toEqual(['grill-with-docs', 'prototype'])

  expect(recordSkill(prototyped, 'commit', 3)).toBe(prototyped)
})

test('a model-invoked skill is a stage only where the task starts on it', () => {
  const idea = createTask('Retry checkout', 0)
  expect(recordSkill(idea, 'diagnosing-bugs', 1).phase).toBe('new')

  const broken = createTask('Checkout crashes', 0)
  expect(recordSkill(broken, 'diagnosing-bugs', 1).phase).toBe('diagnosing-bugs')
})

test('paths fold to the repo root and scratch files become artifacts', () => {
  expect(inside('/repo', '/repo/src/../.scratch/a/spec.md')).toBe('.scratch/a/spec.md')
  expect(inside('/repo', '/repo2/x.ts')).toBeUndefined()
  expect(inside('/repo', '/repo/../etc/passwd')).toBeUndefined()
  expect(scratchPointer('.scratch/a/spec.md')).toBe('.scratch/a/spec.md')
  expect(scratchPointer('.scratch/a/task.json')).toBeUndefined()
  expect(createdUrl('gh issue create --title x', 'https://github.com/o/r/issues/12\n')).toBe('https://github.com/o/r/issues/12')
  expect(createdUrl('gh issue list', 'https://github.com/o/r/issues/12')).toBeUndefined()
})

test('planning phases hold code edits until allowed', () => {
  const grilled = recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1)
  expect(editGate(grilled, 'src/pay.ts')).toContain('/flow allow')
  expect(editGate(grilled, 'docs/adr/0001.md')).toBeUndefined()
  expect(editGate(grilled, '.scratch/retry-checkout/notes.json')).toBeUndefined()
  expect(editGate(grilled, undefined)).toBeUndefined()
  expect(editGate(recordSkill(grilled, 'prototype', 2), 'src/proto.tsx')).toBeUndefined()
  expect(editGate(allowPhase(grilled, 2), 'src/pay.ts')).toBeUndefined()
  expect(editGate(recordSkill(grilled, 'implement', 2), 'src/pay.ts')).toBeUndefined()
})

test('a gated phase waits for approval once its artifact is recorded, and the rail shows where the task is', () => {
  const specced = recordSkill(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1), 'to-spec', 2)
  expect(nextAction(specced)).toEqual({ command: 'to-spec', why: 'no spec recorded yet: write it, or /flow approve <path or link>' })

  const written = recordArtifact(specced, '.scratch/retry-checkout/spec.md', 3)
  expect(recordArtifact(written, '.scratch/retry-checkout/spec.md', 4)).toBe(written)
  expect(nextAction(written).why).toBe('read .scratch/retry-checkout/spec.md, then approve the spec')
  expect(nextAction(approvePhase(written, 4)).command).toBe('to-tickets')
  expect(approvePhase(approvePhase(written, 4), 5).log.filter(one => one.kind === 'approve')).toHaveLength(1)
  const implementing = recordSkill(written, 'implement', 5)
  expect(approvePhase(implementing, 6)).toBe(implementing)

  expect(rail(written).map(stop => `${stop.state} ${stop.stage}`)).toEqual([
    'done grill-with-docs',
    'now to-spec',
    'ahead to-tickets',
    'ahead implement-spec',
    'ahead pr',
    'ahead retro',
  ])
})

test('checks become before-and-after evidence and the retro gets a timeline', () => {
  expect(checkOf('pnpm test --run')).toBe('pnpm test --run')
  expect(checkOf('M=/x/flow; cd /tmp && npx tsc -p tsconfig.json && echo OK')).toBe('npx tsc -p tsconfig.json')
  expect(checkOf('git checkout test-branch')).toBeUndefined()
  expect(checkOf('ls')).toBeUndefined()
  // A PR body in a heredoc or a quote across lines is prose, not a check.
  expect(checkOf("gh pr create --title x --body \"$(cat <<'EOF'\n- `claude plugin test plugins/flow`: 15 pass\nEOF\n)\"")).toBeUndefined()
  expect(checkOf('git commit -m "fix: retries\n\n- run the tests"')).toBeUndefined()
  expect(checkOf('cat <<EOF > run.sh\nnpm test\nEOF\nbash run.sh && pnpm lint')).toBe('pnpm lint')

  const task = recordSkill(createTask('Retry checkout', 0), 'implement', 60_000)
  const failed = recordEvent(task, { kind: 'check', detail: 'pnpm test', ok: false }, 120_000)
  const passed = recordEvent(failed, { kind: 'check', detail: 'pnpm test', ok: true }, 600_000)
  expect(evidence(failed)).toEqual(['`pnpm test`: failed at +2m'])
  expect(evidence(passed)).toEqual(['`pnpm test`: failed at +2m, then passed at +10m'])
  expect(timeline(passed)).toEqual([
    '+1m stage implement',
    '+2m check implement pnpm test failed',
    '+10m check implement pnpm test passed',
  ])
  expect(reminder(passed, 'mattpocock-skills:pr', 'feature')).toContain('then passed at +10m')
  expect(reminder(passed, 'retro', 'feature')).toContain('+1m stage implement')
  expect(reminder(passed, 'implement', 'main')).toContain('The repo is on main')
  expect(reminder(passed, 'implement', 'feature')).not.toContain('The repo is on')
})

test('CI settles from gh pr checks, and an unsettled PR is found again', () => {
  expect(ciOutcome('[{"bucket":"pass"},{"bucket":"pending"}]')).toBe('pending')
  expect(ciOutcome('[{"bucket":"pass"},{"bucket":"skipping"}]')).toBe('pass')
  expect(ciOutcome('[{"bucket":"pass"},{"bucket":"fail"}]')).toBe('fail')
  expect(ciOutcome('[]')).toBeUndefined()
  expect(ciOutcome('no checks reported')).toBeUndefined()

  const url = 'https://github.com/o/r/pull/7'
  const opened = recordArtifact(createTask('Retry checkout', 0), url, 1)
  expect(unsettledPr(opened)).toBe(url)
  expect(unsettledPr(recordEvent(opened, { kind: 'ci', detail: url, ok: true }, 2))).toBeUndefined()
})

test('the version of a board document is read from the tool text', () => {
  const text = [
    '1 document from collection "tasks":',
    '{"id":"shop--x","data":{"title":"a \\"version\\":9 title"},"version":3,"updatedAt":"2026-09-30T13:11:43.458654Z"}',
  ].join('\n')
  expect(boardVersion(text)).toBe(3)
  expect(boardVersion('No document "tasks"/"shop--x".')).toBeUndefined()
})

test('the board document carries the rail, gates and next step', () => {
  const specced = recordArtifact(
    recordSkill(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1), 'to-spec', 2),
    '.scratch/retry-checkout/spec.md',
    3,
  )
  const doc = boardDoc(specced, 'shop', 9)
  expect(doc.rail.map(stop => [stop.stage, stop.state, stop.gate ?? '-'])).toEqual([
    ['grill-with-docs', 'done', '-'],
    ['to-spec', 'now', 'waiting'],
    ['to-tickets', 'ahead', 'ahead'],
    ['implement-spec', 'ahead', '-'],
    ['pr', 'ahead', '-'],
    ['retro', 'ahead', '-'],
  ])
  expect(doc.rail[1]?.artifacts).toEqual(['.scratch/retry-checkout/spec.md'])
  expect(doc.next.args).toBe('approve')
  expect(boardDoc(approvePhase(specced, 4), 'shop', 9).rail[1]?.gate).toBe('approved')
})

test('/flow walks a task from new through a gated spec to done', async ($, on) => {
  const { files } = fakeRepo(on)

  const opened = await $.command.run(flow('new --workflow spec Retry failed checkout payments'))
  expect(opened.text).toContain(
    'Workflow: Spec: Settle decisions > Write the spec > Split into tickets > Build the tickets > Open the PR > Look back',
  )
  expect(opened.text).toContain('Next: /grill-with-docs Retry failed checkout payments')

  const path = '/repo/.scratch/retry-failed-checkout-payments/task.json'
  await $.skill.prompt({ skill: 'mattpocock-skills:grill-with-docs', text: 'grill' })
  expect(JSON.parse(files.get(path) ?? '{}').phase).toBe('grill-with-docs')
  expect((await $.command.run(flow(''))).text).toContain('Next: /to-spec')

  const edit = (file_path: string) => $.tool.call({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b' })
  expect((await edit('/repo/src/pay.ts')).deny).toContain('/flow allow')
  expect(JSON.parse(files.get(path) ?? '{}').log.at(-1)).toEqual({ kind: 'held', detail: 'src/pay.ts', phase: 'grill-with-docs', at: 1000 })
  expect((await edit('/repo/GLOSSARY.md')).deny).toBeUndefined()

  const prompt = await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
  expect(prompt.text).toContain('use "retry-failed-checkout-payments" as the feature slug')
  await edit('/repo/.scratch/retry-failed-checkout-payments/spec.md')
  expect((await $.command.run(flow(''))).text).toContain(
    'Next: /flow approve  (read .scratch/retry-failed-checkout-payments/spec.md, then approve the spec)',
  )
  expect((await $.command.run(flow('approve'))).text).toBe('Approved to-spec. Next: /to-tickets')
  expect((await $.command.run(flow('approve'))).text).toBe('Nothing waits for approval in to-spec.')
  expect((await $.command.run(flow('allow'))).text).toBe('Code edits allowed for the rest of to-spec.')
  expect((await edit('/repo/src/pay.ts')).deny).toBeUndefined()

  await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
  expect(JSON.parse(files.get(path) ?? '{}').log.at(-1)).toMatchObject({ kind: 'check', detail: 'pnpm test', ok: true })
  expect((await $.command.run(flow('board'))).text).toBe('to-spec  Retry failed checkout payments  (retry-failed-checkout-payments)')

  const closed = await $.command.run(flow('done'))
  expect(closed.text).toBe('Closed: Retry failed checkout payments')
  expect((await $.command.run(flow(''))).text).toContain('No open task')
  expect(JSON.parse(files.get(path) ?? '{}').closedAt).toBe(1000)
})

test('only a person can pass a gate, and only once there is something to read', async ($, on) => {
  const { files } = fakeRepo(on)
  await $.command.run(flow('new --workflow spec Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'to-spec', text: 'spec' })

  const queued = await $.command.run({ ...flow('approve'), origin: { kind: 'task-notification' } })
  expect(queued.text).toBe('/flow approve waits for a person; it was sent from task-notification.')
  // A host's own turn (claude -p, the Agent SDK) is not a person either.
  expect((await $.command.run({ ...flow('approve'), origin: { kind: 'sdk' } })).text).toContain('waits for a person')
  const path = '/repo/.scratch/retry-failed-checkout-payments/task.json'
  expect(JSON.parse(files.get(path) ?? '{}').log.some((one: { kind: string }) => one.kind === 'approve')).toBe(false)
  const missing = 'No spec recorded for to-spec. /flow approve <path or link> names the one you read.'
  expect((await $.command.run(flow('approve'))).text).toBe(missing)
  // A pull request is never the spec.
  expect((await $.command.run(flow('approve https://github.com/o/r/pull/3'))).text).toBe(missing)
  // Naming what the person read records it, then approves.
  expect((await $.command.run(flow('approve .scratch/retry-failed-checkout-payments/spec.md'))).text).toBe('Approved to-spec. Next: /to-tickets')
  expect(JSON.parse(files.get(path) ?? '{}').artifacts.at(-1)).toMatchObject({ phase: 'to-spec', pointer: '.scratch/retry-failed-checkout-payments/spec.md' })
})

test('auto-advance runs the next stage after approval, unless the context is full', { options: { autoAdvance: true } }, async ($, on) => {
  const ran: string[] = []
  on('command.list', () => ({
    value: [{ name: 'mattpocock-skills:to-tickets', description: 'tickets', source: 'plugin' as const }],
  }))
  on('command.run', (_, e) => {
    ran.push(e.command)

    return { text: '' }
  })
  const { clock } = fakeRepo(on)

  await $.command.run(flow('new Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
  await $.command.run(flow('approve .scratch/retry-failed-checkout-payments/spec.md'))
  expect(ran).toEqual([])
  await clock.advance(0)
  expect(ran).toEqual(['mattpocock-skills:to-tickets'])
})

test('a full context holds auto-advance at the gate', { options: { autoAdvance: true } }, async ($, on) => {
  const ran: string[] = []
  on('command.run', (_, e) => {
    ran.push(e.command)

    return { text: '' }
  })
  const { clock } = fakeRepo(on, 80)

  await $.command.run(flow('new Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
  expect((await $.command.run(flow('approve .scratch/retry-failed-checkout-payments/spec.md'))).text).toBe('Approved to-spec. Next: /to-tickets')
  await clock.advance(0)
  expect(ran).toEqual([])
})

test('/flow share sends every task to the board, and later changes follow', async ($, on) => {
  const { clock, calls } = fakeRepo(on)
  const url = 'https://claude.ai/code/artifact/0b1c2d3e-aaaa-bbbb-cccc-123456789abc'
  const boardWrites = () => calls.filter(call => call.tool === 'ArtifactData' && call.action === 'batch')

  await $.command.run(flow('new Retry failed checkout payments'))
  expect((await $.command.run(flow('share not-a-link'))).text).toContain('not a claude.ai artifact link')
  expect((await $.command.run(flow(`share ${url}`))).text).toBe(`Sent 1 task to ${url}. Each change follows a few seconds later.`)
  expect(boardWrites()).toHaveLength(1)
  expect(boardWrites()[0]).toMatchObject({
    action: 'batch',
    url,
    writes: [{ op: 'set', collection: 'tasks', doc_id: 'repo--retry-failed-checkout-payments' }],
  })

  await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
  await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
  expect(boardWrites()).toHaveLength(1)
  await clock.advance(3_000)
  expect(boardWrites()).toHaveLength(2)
  expect(boardWrites()[1]).toMatchObject({ writes: [{ data: { phase: 'to-spec', next: { command: 'to-spec' } } }] })

  expect((await $.command.run(flow('share off'))).text).toContain('Stopped sending')
  await $.command.run(flow('done'))
  await clock.advance(3_000)
  expect(boardWrites()).toHaveLength(2)
})
