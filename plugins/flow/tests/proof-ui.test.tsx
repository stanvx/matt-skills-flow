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
    // ponytail: one mutable flag, flipped to make the check fail.
    let isFailing = false
    on('tool.call', { tool: 'Bash' }, () => (isFailing ? { result: 'failed', text: '1 failed', isError: true } : { result: 'ok', text: 'ok' }))
    const { clock } = fakeRepo(on)
    // Before the first task the board explains both marks.
    const empty = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    expect(await empty.find({ type: 'Text', text: '◆ waits for your approval · ◇ a build is finished once its checks pass (◈ proven)' })).toBeDefined()
    await empty.unmount()
    await $.command.run(flow('new --workflow oneshot Retry checkout'))
    await $.skill.prompt({ skill: 'implement', text: 'build' })
    await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'a', new_string: 'b' })

    const above = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    expect((await above.find({ type: 'Text', text: '◇ Needs proof' }))?.props).toMatchObject({ color: 'permission' })
    expect(await above.find({ type: 'Text', text: 'no check has passed since the last code edit' })).toBeDefined()
    // A decision: the line forks into Prove it on 1, the recommended step.
    expect(await above.find({ type: 'Text', text: ' Build ' })).toBeDefined()
    expect((await above.find({ key: 'prove' }))?.props).toMatchObject({ hotkey: '1', variant: 'primary' })
    expect(await above.find({ key: 'next' })).toBeUndefined()
    await above.press({ key: 'prove' })
    await clock.advance(0)
    expect(sent).toEqual(['prove it works: run the checks and show the change working'])

    const board = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    expect((await board.find({ type: 'Text', text: '  ◇ needs proof' }))?.props).toMatchObject({ color: 'permission' })
    expect((await board.find({ key: 'prove' }))?.props).toMatchObject({ variant: 'primary', autoFocus: true })
    expect(await board.find({ type: 'Text', text: /^No check has passed since the last code edit\. Prove it asks Claude/ })).toBeDefined()
    expect(await board.find({ type: 'Text', text: 'Jev off' })).toBeDefined()
    // Prove it is the one thing to do: no extras compete with it.
    expect(await board.find({ key: 'also-continue' })).toBeUndefined()
    // The terminal writes a plain button's key itself; a held task says what comes first.
    expect((await board.find({ key: 'recall' }))?.props).toMatchObject({ label: 'Catch me up', hotkey: 'r' })
    expect(await board.find({ type: 'Text', text: 'step 1 of 3' })).toBeDefined()
    expect((await $.command.run(flow('switch retry-checkout'))).text).toContain('Next: prove it (no check has passed since the last code edit), then Open the PR (/pr)')

    // A second round whose check fails twice: the band and the board count both.
    await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
    await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'b', new_string: 'c' })
    isFailing = true
    await above.unmount()
    await board.unmount()
    await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
    await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
    const again = await $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', props: band })
    expect(await again.find({ type: 'Text', text: 'round 2 · failed 2 of 3 tries' })).toBeDefined()
    const counted = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow', props: pane })
    expect(await counted.find({ type: 'Text', text: 'round 2 · failed 2 of 3 tries · Jev off' })).toBeDefined()
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
    expect((await proven.find({ type: 'Text', text: '  ◈ proven' }))?.props).toMatchObject({ color: 'success' })
    expect(await proven.find({ type: 'Text', text: /pnpm test.*passed/ })).toBeDefined()
  })
}
