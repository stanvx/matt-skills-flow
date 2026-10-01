import { expect, test } from 'claude-code/testing'

import { createTask, recordArtifact, recordEvent, recordSkill } from '../hooks/flow'
import { actionLabel, boardOrder, commandName, gateText, ghostOf, subline } from '../hooks/status'
import { fakeRepo, flow } from './fake'

const SURFACES = ['terminal', 'desktop'] as const

const scroll = { offset: 0, bodyRows: 40 }
const pane = { title: 'flow', isFocused: true, bodyColumns: 90, placement: 'dock', scroll, view: {} } as const
const band = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll, view: {} } as const

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

const turn = (turnId: string, agentId?: string) => ({
  answer: '',
  durationMs: 1,
  isAborted: false,
  turnId,
  reason: 'answer' as const,
  ...(agentId === undefined ? {} : { agentId }),
})

test('the words the band and board use come from the task', () => {
  const fresh = createTask('Retry checkout', 0, { flow: 'grill' })
  expect(actionLabel(fresh)).toBe('Settle decisions')
  expect(commandName(fresh)).toBe('/grill-with-docs')
  expect(ghostOf(fresh, 'ready')).toBe('/grill-with-docs Retry checkout')
  const grilling = recordSkill(fresh, 'grill-with-docs', 1)
  // Under way, the engine's guess at a reply is the better ghost.
  expect(ghostOf(grilling, 'progress')).toBeUndefined()
  expect(ghostOf(grilling, 'working')).toBeUndefined()
  expect(actionLabel(recordEvent(grilling, { kind: 'done' }, 2))).toBe('Build')

  const specced = recordArtifact(recordSkill(createTask('Retry checkout', 0, { flow: 'spec' }), 'to-spec', 1), '.scratch/retry-checkout/spec.md', 2)
  expect(ghostOf(specced, 'waiting')).toBe('/flow doc')
  expect(commandName(specced)).toBe('/flow approve')
  expect(subline({ ...specced, model: 'opus', effort: 'high' })).toBe('Spec · opus at high · .scratch/retry-checkout')
  expect(gateText('waiting')).toBe('waiting for you')
  expect(gateText('ahead')).toBe('you approve')
  expect(gateText(undefined)).toBeUndefined()

  const closed = Array.from({ length: 7 }, (_, at) => ({ ...fresh, slug: `old-${at}`, closedAt: at }))
  expect(boardOrder([...closed, specced]).map(one => one.slug)).toEqual(['retry-checkout', 'old-0', 'old-1', 'old-2', 'old-3', 'old-4'])
})

for (const surface of SURFACES) {
  const keyed = (key: string, label: string) => (surface === 'terminal' ? `${key} ${label}` : label)

  test(`${surface}: before the first task the board lays out the workflows and starts one`, async ($, on) => {
    const ran = mockEngine(on)
    const { opened } = fakeRepo(on)
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    expect(await ui.find({ type: 'Text', text: 'Start a task' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Spec' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Write the spec ◆ → Split into tickets ◆/ })).toBeDefined()
    expect((await ui.find({ key: 'new' }))?.props).toMatchObject({ label: keyed('c', 'New task'), hotkey: 'c', variant: 'primary', autoFocus: true })

    await ui.press({ key: 'new' })
    expect(opened).toEqual(['flow-new focused'])
    expect(ran).toEqual([])
  })

  test(`${surface}: the board lists the tasks, walks the open one's stages and leads with what to do`, async ($, on) => {
    const ran = mockEngine(on)
    const { opened } = fakeRepo(on)
    await $.command.run(flow('new --workflow spec Old work'))
    await $.command.run(flow('done'))
    await $.command.run(flow('new --workflow spec Retry failed checkout payments'))
    await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-failed-checkout-payments/spec.md', content: 'x' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    // The list: open tasks first, the open one marked, a closed one dim, the gate's status called out.
    const rows = await ui.findAll({ type: 'Button', text: /Retry failed checkout payments|Old work/ })
    expect(rows.map(one => one.key)).toEqual(['switch-retry-failed-checkout-payments', 'switch-old-work'])
    expect(rows.map(one => one.props.hotkey)).toEqual([undefined, undefined])
    expect(rows[1]?.props.dimColor).toBe(true)
    expect(await ui.find({ type: 'Text', text: '› ◆ ' })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: ' Needs approval' }))?.props).toMatchObject({ color: 'yellow' })

    // The stages, each with its command, its gate and what it produced.
    expect(await ui.find({ type: 'Text', text: 'Spec' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '✓ Settle decisions' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '● Write the spec' })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: '  ◆ waiting for you' }))?.props).toMatchObject({ color: 'yellow' })
    expect(await ui.find({ type: 'Text', text: '  ◆ you approve' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' /to-spec' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '    retry-failed-checkout-payments/spec.md' })).toBeDefined()

    // At the gate, reading leads and takes Enter; approving is a separate key.
    expect((await ui.find({ key: 'read' }))?.props).toMatchObject({ label: keyed('o', 'Read the spec'), hotkey: 'o', autoFocus: true })
    expect((await ui.find({ key: 'approve' }))?.props).toMatchObject({ label: keyed('a', 'Approve'), hotkey: 'a' })
    expect(await ui.find({ key: 'next' })).toBeUndefined()
    expect(await ui.find({ key: 'allow' })).toBeUndefined()

    opened.length = 0
    await ui.press({ key: 'read' })
    expect(opened).toEqual(['flow-doc focused'])
    await ui.press({ key: 'approve' })
    expect(ran).toEqual([])
    expect(await ui.find({ type: 'Text', text: '  ◆ approved' })).toBeDefined()
    expect((await ui.find({ key: 'next' }))?.props).toMatchObject({ label: keyed('n', 'Split into tickets'), autoFocus: true })

    await ui.press({ key: 'switch-old-work' })
    expect(await ui.find({ type: 'Text', text: '› ● ' })).toBeDefined()
  })

  test(`${surface}: a clearing map loops on /wayfinder and offers Map is clear`, async ($, on) => {
    const ran = mockEngine(on, ['mattpocock-skills:wayfinder', 'mattpocock-skills:to-spec'])
    fakeRepo(on)
    await $.command.run(flow('new greenfield billing service'))
    await $.skill.prompt({ skill: 'wayfinder', text: 'chart' })
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/greenfield-billing-service/map.md', content: '# Map' })
    await $.skill.prompt({ skill: 'wayfinder', text: 'clear' })
    await $.tool.call({ tool: 'mcp__flow__stage_done', summary: 'one ticket' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    expect((await ui.find({ key: 'next' }))?.props.label).toBe(keyed('n', 'Clear the map'))
    expect(await ui.find({ type: 'Text', text: '    1 ticket session so far' })).toBeDefined()
    expect((await ui.find({ key: 'alt' }))?.props.label).toBe(keyed('m', 'Map is clear'))
    await ui.press({ key: 'alt' })
    expect(ran).toEqual(['mattpocock-skills:to-spec'])
    await ui.press({ key: 'next' })
    expect(ran.at(-1)).toBe('mattpocock-skills:wayfinder .scratch/greenfield-billing-service/map.md')
  })

  test(`${surface}: a stage under way offers moving on, its extras and Allow edits, with nothing on Enter`, async ($, on) => {
    const ran = mockEngine(on, ['mattpocock-skills:implement'])
    const { clock } = fakeRepo(on)
    on('prompt.submit', (_, e) => {
      ran.push(`prompt ${e.text}`)

      return { text: e.text }
    })
    await $.command.run(flow('new Retry checkout'))
    await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })

    expect((await ui.find({ key: 'next' }))?.props).toMatchObject({ label: keyed('n', 'Build') })
    expect((await ui.find({ key: 'next' }))?.props.autoFocus).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Under way: reply in the conversation/ })).toBeDefined()
    await ui.press({ key: 'also-continue' })
    await clock.advance(0)
    expect(ran).toEqual(['prompt continue'])
    await ui.press({ key: 'allow' })
    expect(await ui.find({ key: 'allow' })).toBeUndefined()

    // Reported done, the next stage leads and the extras go.
    await $.tool.call({ tool: 'mcp__flow__stage_done', summary: 'settled' })
    expect((await ui.find({ key: 'next' }))?.props).toMatchObject({ variant: 'primary', autoFocus: true })
    expect(await ui.find({ key: 'also-continue' })).toBeUndefined()
    await ui.press({ key: 'next' })
    expect(ran.at(-1)).toBe('mattpocock-skills:implement')
  })

  test(`${surface}: inline, the board closes before the work it starts`, async ($, on) => {
    mockEngine(on, ['mattpocock-skills:grill-with-docs'])
    fakeRepo(on)
    const closed: string[] = []
    on('ui.close', (_, e) => {
      closed.push(e.id)

      return { value: undefined }
    })
    await $.command.run(flow('new Retry checkout'))
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: { ...pane, placement: 'inline' } })
    await ui.press({ key: 'next' })
    expect(closed).toEqual(['flow'])
  })

  test(`${surface}: Freeform lists the skills run`, async ($, on) => {
    mockEngine(on)
    fakeRepo(on)
    await $.command.run(flow('new --workflow freeform Poke around'))
    await $.skill.prompt({ skill: 'research', text: 'r' })
    await $.skill.prompt({ skill: 'tdd', text: 't' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    expect(await ui.find({ type: 'Text', text: 'Skills run: research, tdd' })).toBeDefined()
    expect(await ui.find({ key: 'allow' })).toBeUndefined()
  })

  test(`${surface}: the band says what to do now, and only Ready and a waiting gate take the 1 key`, async ($, on) => {
    const ran = mockEngine(on, ['mattpocock-skills:grill-with-docs'])
    fakeRepo(on)
    await $.command.run(flow('new --workflow spec Retry checkout'))
    const mount = () => $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    const frame = async (ui: Awaited<ReturnType<typeof mount>>) =>
      (await ui.findAll({ type: 'Box' })).find(box => box.props.borderStyle === 'round')?.props.borderColor

    // Ready: the first stage leads, on 1, with its command beside it.
    const ready = await mount()
    expect(await frame(ready)).toBe('green')
    expect(await ready.find({ type: 'Text', text: 'Retry checkout' })).toBeDefined()
    expect((await ready.find({ type: 'Text', text: '● Ready' }))?.props).toMatchObject({ color: 'green', bold: true })
    expect((await ready.find({ key: 'next' }))?.props).toMatchObject({ label: keyed('1', 'Settle decisions'), hotkey: '1', variant: 'primary' })
    expect(await ready.find({ type: 'Text', text: ' /grill-with-docs' })).toBeDefined()
    await ready.press({ key: 'next' })
    expect(ran).toEqual(['mattpocock-skills:grill-with-docs Retry checkout'])
    await ready.press({ key: 'board' })

    // Under way: a digit typed into the empty prompt is the start of a reply, so nothing takes one.
    await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
    const progress = await mount()
    expect(await frame(progress)).toBe('cyan')
    expect(await progress.find({ type: 'Text', text: '● In progress' })).toBeDefined()
    expect(await progress.find({ type: 'Text', text: 'reply in the prompt, or move on' })).toBeDefined()
    expect((await progress.find({ key: 'next' }))?.props).toMatchObject({ label: 'Write the spec' })
    expect((await progress.find({ key: 'next' }))?.props.hotkey).toBeUndefined()

    // A gate still writing its spec offers no stage to move on to.
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
    const writing = await mount()
    expect(await writing.find({ type: 'Text', text: 'reply in the prompt' })).toBeDefined()
    expect(await writing.find({ key: 'next' })).toBeUndefined()

    // A waiting gate: 1 reads the spec; approving is never on a digit.
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-checkout/spec.md', content: 'x' })
    const gate = await mount()
    expect(await frame(gate)).toBe('yellow')
    expect(await gate.find({ type: 'Text', text: '◆ Needs approval' })).toBeDefined()
    expect((await gate.find({ key: 'read' }))?.props).toMatchObject({ label: keyed('1', 'Read the spec'), hotkey: '1' })
    expect(await gate.find({ key: 'approve' })).toBeUndefined()
    // The strip names the stage under way and the one after it, with the gates.
    expect(await gate.find({ type: 'Text', text: '● Write the spec' })).toBeDefined()
    expect(await gate.find({ type: 'Text', text: '○ Split into tickets' })).toBeDefined()

    // Working: nothing to press.
    await $.turn.start({ text: 'go', turnId: 't1' })
    const working = await mount()
    expect(await working.find({ type: 'Text', text: '… Working' })).toBeDefined()
    expect(await working.find({ key: 'read' })).toBeUndefined()
    // A subagent finishing does not end the main turn.
    await $.turn.complete(turn('t2', 'sub'))
    expect(await working.find({ type: 'Text', text: '… Working' })).toBeDefined()
    await $.turn.complete(turn('t1'))
    expect(await working.find({ type: 'Text', text: '◆ Needs approval' })).toBeDefined()

    // Too few rows for the frame: one line, the strip focused.
    const short = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: { ...band, maxRows: 3 } })
    expect((await short.findAll({ type: 'Box' })).some(box => box.props.borderStyle === 'round')).toBe(false)
    expect(await short.find({ key: 'read' })).toBeDefined()
  })

  test(`${surface}: once every stage is done, the band's 1 closes the task`, async ($, on) => {
    mockEngine(on)
    const { toasts } = fakeRepo(on)
    await $.command.run(flow('new --workflow oneshot --no-pr Retry checkout'))
    await $.skill.prompt({ skill: 'implement', text: 'go' })
    await $.skill.prompt({ skill: 'retro', text: 'look back' })
    await $.tool.call({ tool: 'mcp__flow__stage_done', summary: 'looked back' })
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    expect((await ui.find({ key: 'next' }))?.props.label).toBe(keyed('1', 'Close the task'))
    await ui.press({ key: 'next' })
    expect(toasts.at(-1)).toBe('Closed: Retry checkout')
    expect(await ui.find({ key: 'new' })).toBeDefined()
  })

  test(`${surface}: with no task open the band starts one, and it yields to a survey`, async ($, on) => {
    mockEngine(on)
    const { opened } = fakeRepo(on)
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    // No key: with no task open, a digit typed into the empty prompt is the person's own.
    expect((await ui.find({ key: 'new' }))?.props.hotkey).toBeUndefined()
    await ui.press({ key: 'new' })
    await ui.press({ key: 'board' })
    expect(opened).toEqual(['flow-new focused', 'flow focused'])

    await $.command.run(flow('new Retry checkout'))
    const survey = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: { ...band, hasSurvey: true } })
    expect(await survey.find({ key: 'next' })).toBeUndefined()
  })

  test(`${surface}: the next step is ghost text once there is one, and the engine's guess stands mid-stage`, async ($, on) => {
    mockEngine(on)
    const shown: string[] = []
    on('prompt.suggest', (_, e) => {
      shown.push(e.text)

      return { isShown: true }
    })
    fakeRepo(on)
    const guess = { text: 'yes, go on', origin: { kind: 'suggestion' as const } }
    await $.prompt.suggest(guess)
    expect(shown).toEqual(['yes, go on'])

    await $.command.run(flow('new --workflow spec Retry checkout'))
    await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
    await $.turn.start({ text: 'go', turnId: 't1' })
    await $.turn.complete(turn('t1'))
    await $.prompt.suggest(guess)
    expect(shown).toEqual(['yes, go on', 'yes, go on'])

    await $.tool.call({ tool: 'mcp__flow__stage_done', summary: 'settled' })
    await $.turn.complete(turn('t2'))
    expect(shown.at(-1)).toBe('/to-spec')
    await $.prompt.suggest(guess)
    expect(shown.at(-1)).toBe('/to-spec')

    // At a waiting gate the ghost reads the spec first.
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-checkout/spec.md', content: 'x' })
    await $.prompt.suggest(guess)
    expect(shown.at(-1)).toBe('/flow doc')
    await $.command.run(flow('approve'))
    expect(shown.at(-1)).toBe('/to-tickets')
  })
}
