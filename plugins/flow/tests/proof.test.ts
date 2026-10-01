import { expect, test } from 'claude-code/testing'

import { canAutoAdvance, endsOnQuestion, unprovenAnswer } from '../hooks/autonomy'
import { railView } from '../hooks/board'
import { allowPhase, createTask, parseNew, recordEvent, recordSkill, statusOf } from '../hooks/flow'
import { failStreak, isCode, isProven, leaveHold, needsEditStamp, proofGap, rounds, seenIn, shipHold, ships, stuckReason } from '../hooks/proof'
import { reviews } from '../hooks/quickbar'
import { ghostOf, holdNote, tally } from '../hooks/status'
import { segmentsFor, stripAlt, stripLine } from '../hooks/strip'
import { checkIn, checkOf, reminder } from '../hooks/trail'
import type { FlowEvent, FlowTask } from '../types'
import { fakeRepo, flow } from './fake'

const STAGE_DONE = 'mcp__flow__stage_done'

const building = () => recordSkill(createTask('Retry checkout', 0, { flow: 'oneshot' }), 'implement', 1)
const then = (task: FlowTask, ...events: Omit<FlowEvent, 'phase' | 'at'>[]) =>
  events.reduce((moved, event, index) => recordEvent(moved, event, 10 + index), task)
const edit = { kind: 'edit', detail: 'src/a.ts' } as const
const check = (detail: string, ok: boolean) => ({ kind: 'check', detail, ok }) as const

test('a build with no code edit needs no proof, and one edit needs a passing check after it', () => {
  const task = building()
  expect(proofGap(task)).toBeUndefined()
  expect(proofGap(then(task, check('pnpm test', true), edit))).toBe('no check has passed since the last code edit')
  expect(isProven(then(task, edit, check('pnpm test', true)))).toBe(true)
  // A later edit asks for the checks again.
  expect(isProven(then(task, edit, check('pnpm test', true), edit))).toBe(false)
})

test('every check run since the last edit must pass in its latest run', () => {
  const task = building()
  expect(proofGap(then(task, edit, check('pnpm typecheck', true), check('pnpm test', false)))).toContain('`pnpm test` is failing')
  expect(proofGap(then(task, edit, check('pnpm test', false), check('pnpm test', true)))).toBeUndefined()
})

test('planning, freeform and non-code edits are never held for proof', () => {
  expect(proofGap(then(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1), edit))).toBeUndefined()
  expect(proofGap(then(recordSkill(createTask('Retry checkout', 0, { flow: 'freeform' }), 'implement', 1), edit))).toBeUndefined()
  expect(isCode('src/a.ts')).toBe(true)
  expect(isCode('docs/a.md')).toBe(false)
  expect(isCode('.scratch/retry-checkout/notes.txt')).toBe(false)
  expect(isCode(undefined)).toBe(false)
})

test('only the first of a run of edits is stamped', () => {
  const task = building()
  expect(needsEditStamp(task)).toBe(true)
  expect(needsEditStamp(then(task, edit))).toBe(false)
  expect(needsEditStamp(then(task, edit, check('pnpm test', true)))).toBe(true)
  expect(needsEditStamp(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1))).toBe(false)
})

test('a person waives the proof for the edits so far, and a later edit needs it again', () => {
  const unproven = then(building(), edit)
  const waived = allowPhase(unproven, 20)
  expect(waived.log.at(-1)?.kind).toBe('allow')
  expect(isProven(waived)).toBe(true)
  expect(allowPhase(waived, 21)).toBe(waived)
  expect(isProven(then(waived, edit))).toBe(false)
})

test('the status says Needs proof until the checks pass, and a report alone never makes it Ready', () => {
  const unproven = then(building(), edit)
  expect(statusOf(unproven, false)).toBe('proof')
  expect(statusOf(unproven, true)).toBe('working')
  expect(holdNote(unproven, 'proof')).toBe('no check has passed since the last code edit')
  expect(ghostOf(unproven, 'proof')).toBe('prove it works: run the checks and show the change working')
  expect(statusOf(then(unproven, { kind: 'done' }), false)).toBe('proof')
  const proven = then(unproven, check('pnpm test', true), { kind: 'done' })
  expect(statusOf(proven, false)).toBe('ready')
  // Rework after the report reopens the stage.
  expect(statusOf(then(proven, edit), false)).toBe('proof')
})

test('a check that keeps failing, or a blocked report, needs a person', () => {
  const failing = then(building(), edit, check('pnpm test', false), check('pnpm test', false))
  expect(stuckReason(failing)).toBeUndefined()
  const stuck = then(failing, check('pnpm test', false))
  expect(stuckReason(stuck)).toBe('`pnpm test` failed 3 times in a row')
  expect(statusOf(stuck, false)).toBe('stuck')
  expect(stuckReason(then(stuck, check('pnpm test', true)))).toBeUndefined()

  const blocked = then(building(), { kind: 'blocked', detail: 'needs the staging API key' })
  expect(stuckReason(blocked)).toBe('blocked: needs the staging API key')
  expect(statusOf(blocked, false)).toBe('stuck')
  expect(stuckReason(then(blocked, edit))).toBeUndefined()
})

test('the tally counts rounds, a failing check\'s tries and reworks, and names Jev while it is not off', () => {
  expect(tally(building(), 'off')).toEqual([])
  expect(tally(then(building(), edit, check('pnpm test', true)), 'off')).toEqual([])
  const failing = then(building(), edit, check('pnpm test', true), edit, check('pnpm test', false), check('pnpm test', false))
  expect(rounds(failing)).toBe(2)
  expect(failStreak(failing)).toEqual({ command: 'pnpm test', failures: 2 })
  expect(tally(failing, 'off')).toEqual(['round 2', 'check failed 2 of 3 tries'])
  // At the cap the status says it, so the tally does not say it twice.
  expect(tally(then(failing, check('pnpm test', false)), 'shadow')).toEqual(['round 2', 'Jev shadow'])
  expect(failStreak(then(failing, check('pnpm test', true)))).toBeUndefined()
  expect(tally(then(building(), { kind: 'rework', detail: 'defect: still broken' }, { kind: 'rework', detail: 'polish: more space' }), 'on')).toEqual(['2 reworks', 'Jev on'])
  // A planning stage has no build to count.
  expect(tally(recordSkill(createTask('Retry checkout', 0, { flow: 'grill' }), 'grill-with-docs', 1), 'off')).toEqual([])
})

test('unproven work does not ship or advance', () => {
  const unproven = then(building(), edit)
  expect(shipHold(unproven, 'git push -u origin feature')).toContain('not proven')
  expect(shipHold(unproven, 'gh pr create --fill')).toContain('/flow allow')
  expect(shipHold(unproven, 'git commit -m "wip"')).toBeUndefined()
  expect(ships('pnpm test && git -C ../app push origin main')).toBe(true)
  expect(ships('gh pr merge 12 --squash')).toBe(true)
  // Naming a push is not pushing.
  expect(ships('echo "then run git push"')).toBe(false)
  expect(ships('git log --grep "gh pr create"')).toBe(false)
  expect(ships('gh pr view 12')).toBe(false)
  expect(ships('FOO=1 git --no-pager push')).toBe(true)
  expect(ships('gh -R o/r pr create --fill')).toBe(true)
  expect(shipHold(unproven, '', 'mcp__claude_ai_github__create_pull_request')).toContain('not proven')
  expect(shipHold(unproven, '', 'mcp__claude_ai_github__list_issues')).toBeUndefined()
  expect(shipHold(then(unproven, check('pnpm test', true)), 'git push')).toBeUndefined()
  expect(leaveHold(unproven)).toContain('Do not open or update a pull request yet')
  expect(leaveHold(building())).toBeUndefined()
  expect(unprovenAnswer(unproven)).toContain('flow: not recorded. implement is not proven')
  expect(canAutoAdvance(then(unproven, { kind: 'done' }))).toBe(false)
  expect(canAutoAdvance(then(unproven, check('pnpm test', true), { kind: 'done' }))).toBe(true)
})

test('a turn that ends on a question holds the advance', () => {
  expect(endsOnQuestion('Built it. Should the retry also cover refunds?')).toBe(true)
  expect(endsOnQuestion('Which one do you want?**')).toBe(true)
  expect(endsOnQuestion('Built it and the tests pass.')).toBe(false)
})

test('the strip and the rail mark a build stage whose edits need proof', () => {
  const unproven = then(building(), edit)
  expect(railView(building())[0]?.proof).toBeUndefined()
  expect(railView(unproven)[0]?.proof).toBe('needed')
  expect(stripLine(segmentsFor(unproven, 'proof'))).toBe('● Build ◇ → ○ Open the PR → ○ Look back')
  const proven = then(unproven, check('pnpm test', true))
  expect(stripLine(segmentsFor(proven, 'progress'))).toBe('● Build ◈ → ○ Open the PR → ○ Look back')
  expect(stripAlt(segmentsFor(unproven, 'proof'))).toContain('Build (current, needs proof)')
})

test('a build stage is told about the proof gate', () => {
  expect(reminder(building(), 'implement', 'feature')).toContain('Proof gate')
  expect(reminder(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1), 'grill-with-docs', 'feature')).not.toContain('Proof gate')
})

test('through the engine: an edit holds stage_done, the push and /pr until a check passes', async ($, on) => {
  let isFailing = false
  on('tool.call', { tool: 'Bash' }, () => (isFailing ? { result: 'failed', text: '1 failed', isError: true } : { result: 'ok', text: 'ok' }))
  const { files } = fakeRepo(on)
  const log = () => (JSON.parse(files.get('/repo/.scratch/retry-failed-checkout-payments/task.json') ?? '{}') as FlowTask).log
  await $.command.run(flow('new --workflow oneshot Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })

  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'b', new_string: 'c' })
  expect(log().filter(one => one.kind === 'edit')).toHaveLength(1)

  const refused = await $.tool.call({ tool: STAGE_DONE, summary: 'built the retry' })
  expect(refused.result).toContain('flow: not recorded')
  expect(log().some(one => one.kind === 'done')).toBe(false)
  expect((await $.tool.call({ tool: 'Bash', command: 'git push -u origin feature' })).deny).toContain('not proven')
  expect((await $.skill.prompt({ skill: 'pr', text: 'open the pr' })).text).toContain('Do not open or update a pull request yet')

  isFailing = true
  await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'built the retry' })).result).toContain('`pnpm test` is failing')

  isFailing = false
  await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'built the retry' })).result).toContain('Next for the task: /pr')
  expect((await $.tool.call({ tool: 'Bash', command: 'git push -u origin feature' })).deny).toBeUndefined()
})

test('through the engine: a blocked report is recorded and /flow allow waives the proof', async ($, on) => {
  const { files, toasts } = fakeRepo(on)
  const task = () => JSON.parse(files.get('/repo/.scratch/retry-failed-checkout-payments/task.json') ?? '{}') as FlowTask
  await $.command.run(flow('new --workflow oneshot Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })
  expect((await $.command.run(flow('allow'))).text).toBe('Nothing is held in implement.')

  await $.tool.call({ tool: 'Write', file_path: '/repo/src/retry.ts', content: 'x' })
  const blocked = await $.tool.call({ tool: STAGE_DONE, summary: 'needs the staging API key', outcome: 'blocked' })
  expect(blocked.result).toContain('recorded that the stage is blocked')
  expect(toasts.at(-1)).toBe('flow: implement is blocked: needs the staging API key')
  expect(statusOf(task(), false)).toBe('stuck')

  expect((await $.command.run(flow('allow'))).text).toBe('Proof waived for the edits so far in implement; the retro will see it.')
  expect(statusOf(task(), false)).toBe('progress')
  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'built' })).result).toContain('Next for the task: /pr')
})

test('a task with a UI is proven only once the change was seen working', () => {
  expect(parseNew('--ui Dark mode toggle')).toEqual({ text: 'Dark mode toggle', options: { ui: true } })
  const task = recordSkill(createTask('Dark mode toggle', 0, { flow: 'oneshot', ui: true }), 'implement', 1)
  expect(task.ui).toBe(true)
  const checked = then(task, edit, check('pnpm test', true))
  expect(proofGap(checked)).toBe(
    'the change has not been seen working: run the verify skill, or save what you observed to .scratch/dark-mode-toggle/proof.md',
  )
  expect(isProven(then(checked, { kind: 'seen', detail: 'verify' }))).toBe(true)
  // Seeing the old code proves nothing about the new.
  expect(isProven(then(checked, { kind: 'seen', detail: 'verify' }, edit, check('pnpm test', true)))).toBe(false)
  expect(isProven(then(building(), edit, check('pnpm test', true)))).toBe(true)
})

test('the verify skill, a proof file and a screenshot saved as one all count as seen', () => {
  expect(seenIn({ skill: 'verify' })).toBe('verify')
  expect(seenIn({ skill: 'tdd' })).toBeUndefined()
  expect(seenIn({ pointer: '.scratch/dark-mode-toggle/proof.md' })).toBe('.scratch/dark-mode-toggle/proof.md')
  expect(seenIn({ pointer: '.scratch/dark-mode-toggle/spec.md' })).toBeUndefined()
  expect(seenIn({ command: 'adb exec-out screencap -p > .scratch/dark-mode-toggle/proof-settings.png' })).toBe('.scratch/dark-mode-toggle/proof-settings.png')
  expect(seenIn({ command: 'pnpm test' })).toBeUndefined()
})

test('each stage is pointed at the skill that fits it', () => {
  const ui = recordSkill(createTask('Dark mode toggle', 0, { flow: 'oneshot', ui: true }), 'implement', 1)
  const build = reminder(ui, 'implement', 'feature')
  expect(build).toContain('principle-sequence-verifiable-units, principle-prove-it-works')
  expect(build).toContain('.scratch/dark-mode-toggle/proof.md')
  expect(build).toContain('principle-experience-first')
  expect(reminder(building(), 'implement', 'feature')).not.toContain('principle-experience-first')
  expect(reminder(recordSkill(createTask('Checkout crashes', 0), 'diagnosing-bugs', 1), 'diagnosing-bugs', 'feature')).toContain('principle-fix-root-causes')
  expect(reminder(then(building(), { kind: 'rework', detail: 'defect: still broken' }), 'tdd', 'feature')).toContain('principle-fix-root-causes')
  const retro = reminder(recordSkill(building(), 'retro', 5), 'retro', 'feature')
  expect(retro).toContain('principle-encode-lessons-in-structure')
  expect(retro).toContain('unslop')
})

test('a proven build is offered its reviews before it ships', () => {
  expect(reviews(building()).map(one => one.text)).toEqual(['/code-review', '/codex:adversarial-review'])
  expect(reviews(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1))).toEqual([])
  expect(reviews(null)).toEqual([])
})

test('through the engine: a UI task needs the verify skill or a proof file after its checks', async ($, on) => {
  const { files } = fakeRepo(on)
  const task = () => JSON.parse(files.get('/repo/.scratch/dark-mode-toggle/task.json') ?? '{}') as FlowTask
  await $.command.run(flow('new --workflow oneshot --ui Dark mode toggle'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/settings.tsx', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'built' })).result).toContain('has not been seen working')
  await $.skill.prompt({ skill: 'verify', text: 'drive the settings page' })
  expect(task().log.at(-1)).toMatchObject({ kind: 'seen', detail: 'verify' })
  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'built' })).result).toContain('Next for the task: /pr')

  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/settings.tsx', old_string: 'b', new_string: 'c' })
  await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
  expect(statusOf(task(), false)).toBe('proof')
  await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/dark-mode-toggle/proof.md', content: 'Toggled dark mode on the emulator.' })
  expect(statusOf(task(), false)).toBe('ready')
})

test('a check is a runner with a check task or a known tool, not any command that names one', () => {
  for (const command of [
    'cargo clippy --all-targets',
    'cargo test',
    'flutter analyze',
    './gradlew :app:testDebugUnitTest',
    './gradlew lintDebug',
    'pnpm run check-types',
    'pnpm test:unit',
    'go vet ./...',
    'python3.13 -m pytest tests/',
    'biome check .',
    'claude plugin test plugins/flow',
    'CI=1 npx -p typescript@5 tsc -p plugins/flow --noEmit',
  ]) {
    expect(checkOf(command)).toBe(command)
  }
  for (const command of ['ls tests', 'cd tests', 'cat lint.md', 'npm install vitest@latest', 'pnpm add -D jest', 'npx prettier --write tests/a.ts', 'git checkout test-branch']) {
    expect(checkOf(command)).toBeUndefined()
  }
  expect(checkOf('scripts/ci.sh')).toBeUndefined()
  expect(checkOf('scripts/ci.sh', ['scripts/ci.sh'])).toBe('scripts/ci.sh')
})

test('a check whose exit status is hidden is not counted as passing', () => {
  expect(checkIn('pnpm test')?.isMasked).toBe(false)
  expect(checkIn('pnpm typecheck && pnpm test && echo OK')?.isMasked).toBe(false)
  expect(checkIn('pnpm test 2>&1 | tail -20')).toEqual({ command: 'pnpm test', isMasked: true })
  expect(checkIn('pnpm test || true')?.isMasked).toBe(true)
  expect(checkIn('pnpm test; echo done')?.isMasked).toBe(true)
  expect(checkIn('cd app; pnpm test')?.isMasked).toBe(false)
})

test('three failures stop counting once a person allows, and a proof file must be written, not named', () => {
  const stuck = then(building(), edit, check('pnpm test', false), check('pnpm test', false), check('pnpm test', false))
  expect(stuckReason(stuck)).toBeDefined()
  const allowed = allowPhase(stuck, 30)
  expect(stuckReason(allowed)).toBeUndefined()
  expect(statusOf(allowed, false)).toBe('progress')
  expect(seenIn({ command: 'ls .scratch/dark-mode-toggle/proof.png' })).toBeUndefined()
  expect(seenIn({ command: 'adb exec-out screencap -p > ".scratch/dark-mode-toggle/proof.png"' })).toBe('.scratch/dark-mode-toggle/proof.png')
})

test('through the engine: a piped pass is not proof, a piped failure still fails, and no stage leaves an unproven build', async ($, on) => {
  let isFailing = false
  on('tool.call', { tool: 'Bash' }, () => (isFailing ? { result: 'failed', text: '1 failed', isError: true } : { result: 'ok', text: 'ok' }))
  const { files } = fakeRepo(on)
  const task = () => JSON.parse(files.get('/repo/.scratch/retry-failed-checkout-payments/task.json') ?? '{}') as FlowTask
  await $.command.run(flow('new --workflow oneshot Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'a', new_string: 'b' })

  await $.tool.call({ tool: 'Bash', command: 'pnpm test 2>&1 | tail -20' })
  expect(task().log.some(one => one.kind === 'check')).toBe(false)
  expect(statusOf(task(), false)).toBe('proof')

  // /retro is a stage too: it waits, and the task stays where it is.
  expect((await $.skill.prompt({ skill: 'retro', text: 'look back' })).text).toContain('the next stage waits')
  expect(task().phase).toBe('implement')
  // A step is not a stage: it runs.
  expect((await $.skill.prompt({ skill: 'tdd', text: 'red green' })).text).toContain('red green')

  isFailing = true
  await $.tool.call({ tool: 'Bash', command: 'pnpm test 2>&1 | tail -20' })
  expect(task().log.at(-1)).toMatchObject({ kind: 'check', ok: false })
})

test('review fixes: later separators, look-alike tasks, redirects, quoted pushes and a stuck stage a person can end', () => {
  for (const command of ['pnpm test && echo ok; git status', 'pnpm test && pnpm build || true', 'pnpm test &']) {
    expect(checkIn(command)?.isMasked).toBe(true)
  }
  for (const command of ['npx shadcn@latest add checkbox', 'python3 analyze_data.py', 'make testdata', 'npx create-vite test-app']) {
    expect(checkOf(command)).toBeUndefined()
  }
  for (const command of ['mvn verify', 'bundle exec rspec', 'python -m unittest', 'timeout 60 pnpm test', './node_modules/.bin/vitest run', 'claude plugin validate . --strict']) {
    expect(checkOf(command)).toBe(command)
  }
  // A failure and its rerun are the same check however the output was sent.
  expect(checkOf('pnpm test 2>&1')).toBe('pnpm test')
  expect(checkOf('(cd app && pnpm test)')).toBe('pnpm test')
  expect(ships('git commit -m "fix; git push hold"')).toBe(false)
  expect(ships("echo 'a | gh pr create'")).toBe(false)

  // Stuck with nothing owed: allow still ends it.
  const lint = then(building(), check('pnpm lint', false), check('pnpm lint', false), check('pnpm lint', false))
  expect(statusOf(lint, false)).toBe('stuck')
  expect(statusOf(allowPhase(lint, 30), false)).toBe('progress')
  // A blocked report is answered by the next edit, which is stamped.
  expect(needsEditStamp(then(building(), edit, { kind: 'blocked', detail: 'x' }))).toBe(true)
  // Any stage can be blocked.
  expect(statusOf(then(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1), { kind: 'blocked', detail: 'needs a decision' }), false)).toBe('stuck')
})

test('the build stages share one account: an unproven edit follows the task into Diagnose', () => {
  const broken = recordSkill(createTask('Checkout crashes', 0, { flow: 'oneshot', start: 'broken' }), 'diagnosing-bugs', 1)
  const moved = recordSkill(then(broken, edit), 'implement', 20)
  expect(moved.phase).toBe('implement')
  expect(proofGap(moved)).toBe('no check has passed since the last code edit')
})

test('through the engine: an MCP pull request waits, and a move into Diagnose does not', async ($, on) => {
  const { calls } = fakeRepo(on)
  await $.command.run(flow('new --workflow oneshot --start broken Checkout crashes'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/checkout.ts', old_string: 'a', new_string: 'b' })
  expect((await $.tool.call({ tool: 'mcp__claude_ai_github__create_pull_request', title: 'x' })).deny).toContain('not proven')
  expect(calls.some(one => one.tool === 'mcp__claude_ai_github__create_pull_request')).toBe(false)
  expect((await $.tool.call({ tool: 'mcp__claude_ai_github__list_issues' })).deny).toBeUndefined()
  expect((await $.skill.prompt({ skill: 'diagnosing-bugs', text: 'diagnose' })).text).toContain('diagnose')
  await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
  expect((await $.tool.call({ tool: 'mcp__claude_ai_github__create_pull_request', title: 'x' })).deny).toBeUndefined()
})
