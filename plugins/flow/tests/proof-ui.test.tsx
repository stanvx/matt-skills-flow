import { expect, test } from 'claude-code/testing'

import { fakeRepo, flow } from './fake'

const scroll = { offset: 0, bodyRows: 40 }
const pane = { title: 'flow', isFocused: true, bodyColumns: 90, placement: 'dock', scroll, view: {} } as const
const band = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll, view: {} } as const

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: a build with unproven edits says Needs proof and offers to prove it`, async ($, on) => {
    on('ui.render', () => ({ type: 'Text' as const, props: {}, children: [] }))
    on('command.list', () => ({ value: [] }))
    const sent: string[] = []
    on('prompt.submit', (_, e) => {
      sent.push(e.text)

      return { text: e.text }
    })
    const { clock } = fakeRepo(on)
    await $.command.run(flow('new --workflow oneshot Retry checkout'))
    await $.skill.prompt({ skill: 'implement', text: 'build' })
    await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'a', new_string: 'b' })

    const above = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    expect((await above.find({ type: 'Text', text: '◇ Needs proof' }))?.props).toMatchObject({ color: 'magenta' })
    expect(await above.find({ type: 'Text', text: 'no check has passed since the last code edit' })).toBeDefined()
    expect(await above.find({ type: 'Text', text: ' ◇' })).toBeDefined()
    // No digit: a reply may start with one.
    expect((await above.find({ key: 'prove' }))?.props.hotkey).toBeUndefined()
    expect(await above.find({ key: 'next' })).toBeUndefined()
    await above.press({ key: 'prove' })
    await clock.advance(0)
    expect(sent).toEqual(['prove it works: run the checks and show the change working'])

    const board = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    expect((await board.find({ type: 'Text', text: '  ◇ needs proof' }))?.props).toMatchObject({ color: 'magenta' })
    expect((await board.find({ key: 'prove' }))?.props).toMatchObject({ variant: 'primary', autoFocus: true })
    expect(await board.find({ type: 'Text', text: /^Not proven: no check has passed/ })).toBeDefined()
  })

  test(`${surface}: once the checks pass the board shows the build proven, with its evidence`, async ($, on) => {
    on('ui.render', () => ({ type: 'Text' as const, props: {}, children: [] }))
    on('command.list', () => ({ value: [] }))
    fakeRepo(on)
    await $.command.run(flow('new --workflow oneshot Retry checkout'))
    await $.skill.prompt({ skill: 'implement', text: 'build' })
    await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'a', new_string: 'b' })
    await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
    const proven = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    expect((await proven.find({ type: 'Text', text: '  ◈ proven' }))?.props).toMatchObject({ color: 'green' })
    expect(await proven.find({ type: 'Text', text: /pnpm test.*passed/ })).toBeDefined()
  })
}
