import { expect, test } from 'claude-code/testing'

import { badgeText, boardOrder, fitsOneLine, gateText, keyHints, progress, skillsRun, stageText, subline } from '../hooks/status'
import { createTask, recordArtifact, recordSkill } from '../hooks/flow'
import { fakeRepo, flow } from './fake'

const SURFACES = ['terminal', 'desktop'] as const

const scroll = { offset: 0, bodyRows: 40 }
const pane = { title: 'flow', isFocused: true, bodyColumns: 90, placement: 'dock', scroll, view: {} } as const
const band = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 90, scroll, view: {} } as const

/** The engine calls the UI needs answered: the turn events, and a command list holding what the tests press. */
const mockEngine = (on: Parameters<typeof fakeRepo>[0], names: string[] = []) => {
  const ran: string[] = []
  // What the engine draws for the band when the plugin yields to it.
  on('ui.render', () => ({ type: 'Text' as const, props: {}, children: [] }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('command.list', () => ({ value: names.map(name => ({ name, description: name, source: 'plugin' as const })) }))
  // Below the plugin: only commands the plugin's own hook does not answer land here.
  on('command.run', (_, e) => {
    ran.push(`${e.command} ${e.args ?? ''}`.trim())

    return { text: '' }
  })

  return ran
}

test('the statuses, stage progress and key hints read from the task', () => {
  const spec = createTask('Retry checkout', 0, { flow: 'spec' })
  expect(progress(spec)).toEqual({ at: 0, of: 6 })
  expect(stageText(spec)).toBe('not started')
  const specced = recordSkill(recordSkill(spec, 'grill-with-docs', 1), 'to-spec', 2)
  expect(stageText(specced)).toBe('stage 2 of 6')
  expect(badgeText('Spec', specced)).toBe('Spec 2/6')
  expect(subline({ ...specced, model: 'opus', effort: 'high' })).toBe(
    '.scratch/retry-checkout · stage 2 of 6 · model opus · effort high',
  )

  const free = createTask('Poke around', 0, { flow: 'freeform' })
  expect(progress(free)).toBeUndefined()
  expect(badgeText('Freeform', free)).toBe('Freeform')
  expect(skillsRun(recordSkill(recordSkill(free, 'research', 1), 'tdd', 2))).toEqual(['research', 'tdd'])

  expect(gateText('waiting')).toBe('waiting for approval')
  expect(gateText('ahead')).toBeUndefined()
  expect(keyHints(specced)).toBe('n next · e allow edits · b board · ctrl+x tab focus · esc back')
  expect(keyHints(recordArtifact(specced, '.scratch/retry-checkout/spec.md', 3))).toContain('o artifact')
  expect(fitsOneLine(80, '/flow approve', 'read the spec')).toBe(true)
  expect(fitsOneLine(20, '/flow approve', 'read the spec')).toBe(false)
  expect(boardOrder([{ ...spec, closedAt: 5 }, specced, free]).map(one => one.slug)).toEqual([
    'retry-checkout',
    'poke-around',
    'retry-checkout',
  ])
})

for (const surface of SURFACES) {
  test(`${surface}: the empty pane gives directions and a New task button`, async ($, on) => {
    const ran = mockEngine(on)
    fakeRepo(on)
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    expect((await ui.find({ type: 'Text', text: /1\. \/flow new opens the new-task dialog/ }))?.type).toBe('Text')
    expect(await ui.find({ type: 'Text', text: /Pick a workflow: Oneshot, Grill, Spec, Wayfind, Freeform/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Press n to run each stage/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '/flow board lists every task' })).toBeDefined()
    const button = await ui.find({ key: 'new' })
    expect(button?.props).toMatchObject({ label: 'New task', hotkey: 'n', variant: 'primary' })

    // A plugin's own command calls land beneath its hooks, so the test's engine sees them.
    await ui.press({ key: 'new' })
    expect(ran).toEqual(['flow new'])
  })

  test(`${surface}: a Spec task at an unapproved to-spec waits for you and approves first`, async ($, on) => {
    mockEngine(on)
    fakeRepo(on)
    await $.command.run(flow('new --workflow spec Retry failed checkout payments'))
    await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-failed-checkout-payments/spec.md', content: 'x' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    expect((await ui.find({ type: 'Text', text: 'Waiting for you' }))?.props).toMatchObject({ color: 'yellow', bold: true })
    expect(await ui.find({ type: 'Text', text: ' Spec ' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\.scratch\/retry-failed-checkout-payments · stage 2 of 6/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2\. ● Write the spec/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '  /to-spec' })).toBeDefined()
    expect(await ui.find(surface === 'terminal' ? { type: 'Text', text: '● Write the spec' } : { type: 'Svg' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /waiting for approval/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /retry-failed-checkout-payments\/spec\.md/ })).toBeDefined()
    expect((await ui.find({ key: 'next' }))?.props).toMatchObject({ label: '/flow approve', hotkey: 'n', variant: 'primary' })
    expect(await ui.find({ key: 'doc' })).toBeDefined()
    expect(await ui.find({ key: 'board' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Recent activity/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^n next · o artifact · e allow edits/ })).toBeDefined()
  })

  test(`${surface}: a clearing map loops on /wayfinder and offers Map is clear`, async ($, on) => {
    const ran = mockEngine(on, ['mattpocock-skills:wayfinder', 'mattpocock-skills:to-spec'])
    fakeRepo(on)
    await $.command.run(flow('new greenfield billing service'))
    await $.skill.prompt({ skill: 'wayfinder', text: 'chart' })
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/greenfield-billing-service/map.md', content: '# Map' })
    await $.skill.prompt({ skill: 'wayfinder', text: 'clear' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    expect((await ui.find({ key: 'next' }))?.props.label).toBe('/wayfinder .scratch/greenfield-billing-service/map.md')
    expect(await ui.find({ type: 'Text', text: /2\. ● Clear the map/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '     1 ticket session so far' })).toBeDefined()
    expect((await ui.find({ key: 'alt' }))?.props.label).toBe('Map is clear: /to-spec')
    await ui.press({ key: 'alt' })
    expect(ran).toEqual(['mattpocock-skills:to-spec'])
  })

  test(`${surface}: pressing the primary button runs the next command`, async ($, on) => {
    const ran = mockEngine(on, ['mattpocock-skills:grill-with-docs'])
    fakeRepo(on)
    await $.command.run(flow('new --workflow grill Retry failed checkout payments'))
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    expect((await ui.find({ key: 'next' }))?.props.label).toBe('/grill-with-docs Retry failed checkout payments')
    await ui.press({ key: 'next' })
    expect(ran).toEqual(['mattpocock-skills:grill-with-docs Retry failed checkout payments'])
  })

  test(`${surface}: approving moves the pane on`, async ($, on) => {
    const ran = mockEngine(on, ['flow'])
    fakeRepo(on)
    await $.command.run(flow('new --workflow spec Retry checkout'))
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-checkout/spec.md', content: 'x' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    await ui.press({ key: 'next' })
    expect(ran).toEqual(['flow approve'])
    await $.command.run(flow('approve'))
    expect(await ui.find({ type: 'Text', text: /approved/ })).toBeDefined()
    expect((await ui.find({ key: 'next' }))?.props.label).toBe('/to-tickets')
    expect((await ui.find({ type: 'Text', text: 'Ready' }))?.props).toMatchObject({ color: 'green' })
  })

  test(`${surface}: the band shows the badge, progress and the next step`, async ($, on) => {
    mockEngine(on)
    fakeRepo(on)
    await $.command.run(flow('new --workflow spec Retry checkout'))
    await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })

    // No spec recorded yet: nothing waits, and 1 runs the stage again, drawn with its key on the terminal.
    const writing = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    expect(await writing.find({ type: 'Text', text: '  ● Ready' })).toBeDefined()
    expect((await writing.find({ key: 'next' }))?.props).toMatchObject({ label: '/to-spec', hotkey: '1', variant: 'primary' })
    expect((await writing.find({ key: 'next' }))?.props.plain).toBe(surface === 'terminal' ? true : undefined)
    expect(await writing.find({ type: 'Text', text: /no spec recorded yet: write it, or \/flow approve <path or link>/ })).toBeDefined()
    expect((await writing.find({ key: 'bar-2' }))?.props).toMatchObject({ label: 'continue', hotkey: '2', plain: true })
    await writing.unmount()

    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-checkout/spec.md', content: 'x' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })

    // A framed panel: the workflow chip, the task and its status, the stages in words, the next step.
    const frames = await ui.findAll({ type: 'Box' })
    expect(frames.some(box => box.props.borderStyle === 'round' && box.props.borderColor === 'yellow')).toBe(true)
    expect(await ui.find({ type: 'Text', text: ' SPEC 2/6 ' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '  Retry checkout' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '  ◆ Waiting for you' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '● Write the spec' })).toBeDefined()
    // Approving takes a focused n; 1 reads the spec.
    expect((await ui.find({ key: 'next' }))?.props).toMatchObject({ label: '/flow approve', hotkey: 'n', variant: 'primary' })
    expect((await ui.find({ key: 'next' }))?.props.plain).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: / read \.scratch\/retry-checkout\/spec\.md, then approve the spec/ })).toBeDefined()
    expect((await ui.find({ key: 'bar-1' }))?.props).toMatchObject({ label: 'Read the spec', hotkey: '1' })
    await ui.unmount()

    // Too few rows for the panel: one line.
    const short = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: { ...band, maxRows: 4 } })
    expect(await short.find({ type: 'Text', text: ' Spec 2/6 ' })).toBeDefined()
    expect(await short.find({ type: 'Text', text: ' Write the spec · ' })).toBeDefined()
    expect(await short.find({ type: 'Text', text: 'Waiting for you' })).toBeDefined()
    expect(await short.find({ key: 'bar-1' })).toBeDefined()
  })

  test(`${surface}: the band yields to a survey and nudges at a full context`, async ($, on) => {
    mockEngine(on)
    fakeRepo(on, 80)
    await $.command.run(flow('new Retry checkout'))
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    expect(await ui.find({ type: 'Text', text: /context 80%: \/clear first/ })).toBeDefined()

    const survey = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: { ...band, hasSurvey: true } })
    expect(await survey.find({ key: 'next' })).toBeUndefined()
  })

  test(`${surface}: a running turn shows Working in the pane, the band and the board`, async ($, on) => {
    mockEngine(on)
    fakeRepo(on)
    await $.command.run(flow('new Retry checkout'))
    const pane1 = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    const band1 = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    const board1 = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow-board', props: pane })
    expect(await pane1.find({ type: 'Text', text: 'Ready' })).toBeDefined()
    expect((await board1.find({ type: 'Text', text: '> ● ' }))?.props).toMatchObject({ color: 'green' })

    await $.turn.start({ text: 'go', turnId: 't1' })
    expect((await pane1.find({ type: 'Text', text: 'Working' }))?.props).toMatchObject({ dimColor: true })
    expect(await band1.find({ type: 'Text', text: 'Working' })).toBeDefined()
    expect((await board1.find({ type: 'Text', text: '> ● ' }))?.props).toMatchObject({ dimColor: true })

    // A subagent finishing does not end the main turn.
    await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't2', agentId: 'sub', reason: 'answer' })
    expect(await pane1.find({ type: 'Text', text: 'Working' })).toBeDefined()
    await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
    expect(await pane1.find({ type: 'Text', text: 'Ready' })).toBeDefined()
  })

  test(`${surface}: a planning task offers Allow edits, and Freeform lists the skills run`, async ($, on) => {
    mockEngine(on)
    fakeRepo(on)
    await $.command.run(flow('new Retry checkout'))
    await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    expect(await ui.find({ key: 'allow' })).toBeDefined()
    await ui.press({ key: 'allow' })
    expect(await ui.find({ key: 'allow' })).toBeUndefined()
    await ui.unmount()

    await $.command.run(flow('new --workflow freeform Poke around'))
    await $.skill.prompt({ skill: 'research', text: 'r' })
    await $.skill.prompt({ skill: 'tdd', text: 't' })
    const free = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    expect(await free.find({ type: 'Text', text: 'Skills run' })).toBeDefined()
    expect(await free.find({ type: 'Text', text: '  tdd' })).toBeDefined()
    expect(await free.find({ key: 'allow' })).toBeUndefined()
  })

  test(`${surface}: the board lists open tasks first, marks the open one and switches on a press`, async ($, on) => {
    const ran = mockEngine(on)
    fakeRepo(on)
    await $.command.run(flow('new --workflow spec Old work'))
    await $.command.run(flow('done'))
    await $.command.run(flow('new --workflow spec Retry checkout'))
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-checkout/spec.md', content: 'x' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow-board', props: pane })

    expect((await ui.find({ key: 'new' }))?.props).toMatchObject({ label: 'New task', hotkey: 'n' })
    const rows = await ui.findAll({ type: 'Button', text: /switch|Retry checkout|Old work/ })
    expect(rows.map(one => one.key)).toEqual(['switch-retry-checkout', 'switch-old-work'])
    expect(rows.map(one => one.props.hotkey)).toEqual(['1', '2'])
    expect(rows[1]?.props.dimColor).toBe(true)
    expect(await ui.find({ type: 'Text', text: '> ● ' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' waiting' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' Spec · closed' })).toBeDefined()

    await ui.press({ key: 'switch-old-work' })
    expect(ran).toEqual(['flow switch old-work'])
  })
}
