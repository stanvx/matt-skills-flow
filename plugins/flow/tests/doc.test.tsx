import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { CAP, baseName, canApprove, clip, fileArtifacts, pick, reviseFill } from '../hooks/doc'
import { approvePhase, createTask, recordArtifact, recordSkill } from '../hooks/flow'
import { fakeRepo, flow } from './fake'

const DIR = '.scratch/retry-failed-checkout-payments'
const props = { title: 'spec.md', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} } as const

// A task at the spec gate: notes from the grill, the spec, and an issue link.
const write = ($: Engine, pointer: string) =>
  $.tool.call({ tool: 'Edit', file_path: `/repo/${pointer}`, old_string: 'a', new_string: 'b' })

const atGate = async ($: Engine, on: On) => {
  // Registered first, so it answers before the fake repo's own tool.call.
  on('tool.call', { tool: 'Bash' }, () => ({ result: 'ok', text: 'https://github.com/o/r/issues/12\n' }))
  const repo = fakeRepo(on)
  await $.command.run(flow('new --workflow spec Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })
  await write($, `${DIR}/notes.md`)
  await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
  await write($, `${DIR}/spec.md`)
  await $.tool.call({ tool: 'Bash', command: 'gh issue create --title x' })
  repo.files.set(`/repo/${DIR}/notes.md`, '# Notes\nthe grill')
  repo.files.set(`/repo/${DIR}/spec.md`, '# Spec\nretry three times')

  return repo
}

test('artifacts are files newest first, and Approve belongs to the gated phase', () => {
  const grilled = recordArtifact(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1), '.scratch/r/notes.md', 2)
  const specced = recordArtifact(recordArtifact(recordSkill(grilled, 'to-spec', 3), '.scratch/r/spec.md', 4), 'https://github.com/o/r/issues/3', 5)
  expect(fileArtifacts(specced).map(one => one.pointer)).toEqual(['.scratch/r/spec.md', '.scratch/r/notes.md'])
  expect(pick(specced, '.scratch/r/notes.md')?.phase).toBe('grill-with-docs')
  expect(pick(specced, 'gone.md')?.pointer).toBe('.scratch/r/spec.md')
  expect(pick(createTask('Retry checkout', 0), null)).toBeUndefined()
  const [spec, notes] = fileArtifacts(specced)
  expect(spec && canApprove(specced, spec)).toBe(true)
  expect(notes && canApprove(specced, notes)).toBe(false)
  expect(spec && canApprove(approvePhase(specced, 6), spec)).toBe(false)
  expect(baseName('.scratch/r/spec.md')).toBe('spec.md')
})

test('a long file is cut at the cap and Revise keeps a typed draft', () => {
  expect(clip('a\r\nb\u0007c')).toEqual({ head: 'a\nb c', rest: 0 })
  expect(clip('x'.repeat(CAP + 25))).toEqual({ head: 'x'.repeat(CAP), rest: 25 })
  expect(clip(`${'x'.repeat(CAP - 1)}\u{1F600}`).head).toHaveLength(CAP - 1)
  expect(reviseFill('  ', 'a/spec.md')).toEqual({ text: 'Revise a/spec.md: ', mode: 'replace' })
  expect(reviseFill('draft', 'a/spec.md')).toEqual({ text: '\nRevise a/spec.md: ', mode: 'append' })
})

test('/flow doc answers without a task or artifacts, and opens the tab on the latest', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: 'ok', text: 'https://github.com/o/r/issues/7\n' }))
  fakeRepo(on)
  expect((await $.command.run(flow('doc'))).text).toContain('No open task')
  await $.command.run(flow('new --workflow spec Retry failed checkout payments'))
  expect((await $.command.run(flow('doc'))).text).toContain('No artifacts yet')
  // Links alone (tickets published as issues) still open the tab.
  await $.tool.call({ tool: 'Bash', command: 'gh issue create --title x' })
  expect((await $.command.run(flow('doc'))).text).toBe('Opened the links.')

  await write($, `${DIR}/notes.md`)
  await write($, `${DIR}/spec.md`)
  expect((await $.command.run(flow('doc'))).text).toBe('Opened spec.md (new).')
  expect((await $.command.run(flow('doc notes.md'))).text).toBe('Opened notes.md (new).')
  expect((await $.command.run(flow('doc nope.md'))).text).toContain('No artifact matches nope.md')
  // Other verbs still reach the main command.
  expect((await $.command.run(flow('done'))).text).toContain('Closed')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`the tab reads the file and lists the artifacts on ${surface}`, async ($, on) => {
    await atGate($, on)
    await $.command.run(flow('doc'))
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow-doc', props })

    expect((await ui.find({ type: 'Markdown' }))?.text).toBe('# Spec\nretry three times')
    const select = await ui.find({ key: 'file' })
    expect(select?.props.options).toEqual([
      { value: `${DIR}/spec.md`, label: `${DIR.split('/').at(-1)}/spec.md (to-spec)` },
      { value: `${DIR}/notes.md`, label: `${DIR.split('/').at(-1)}/notes.md (grill-with-docs)` },
    ])
    expect(await ui.find({ type: 'Link', text: 'issue #12 (to-spec)' })).toBeDefined()

    await ui.select({ key: 'file', value: `${DIR}/notes.md` })
    expect((await ui.find({ type: 'Markdown' }))?.text).toBe('# Notes\nthe grill')
    expect(await ui.find({ key: 'approve' })).toBeUndefined()
  })

  test(`Approve shows only at the unapproved gate and approves on ${surface}`, async ($, on) => {
    const { files } = await atGate($, on)
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow-doc', props })

    const approve = await ui.find({ key: 'approve' })
    expect(approve?.props.label).toBe(surface === 'terminal' ? 'a Approve the spec' : 'Approve the spec')
    expect(approve?.props.variant).toBe('primary')
    expect(approve?.props.hotkey).toBe('a')
    await ui.press({ key: 'approve' })
    expect(JSON.parse(files.get(`/repo/${DIR}/task.json`) ?? '{}').log.at(-1).kind).toBe('approve')
    expect(await ui.find({ key: 'approve' })).toBeUndefined()
  })

  test(`Revise fills the prompt, keeping a typed draft, on ${surface}`, async ($, on) => {
    let draft = ''
    const fills: { text: string; mode?: string }[] = []
    on('prompt.read', () => ({ value: { text: draft, cursor: draft.length } }))
    on('prompt.fill', (_, e) => {
      fills.push(e)

      return { isFilled: true }
    })
    await atGate($, on)
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow-doc', props })

    await ui.press({ key: 'revise' })
    draft = 'half typed'
    await ui.press({ key: 'revise' })
    expect(fills).toMatchObject([
      { text: `Revise ${DIR}/spec.md: `, mode: 'replace' },
      { text: `\nRevise ${DIR}/spec.md: `, mode: 'append' },
    ])
  })

  test(`a long file is capped and a missing one says why on ${surface}`, async ($, on) => {
    const { files } = await atGate($, on)
    files.set(`/repo/${DIR}/spec.md`, 'y'.repeat(CAP + 30))
    const ui = await $.ui.mount({ plugin: 'flow', surface, component: 'Pane', requestId: 'flow-doc', props })

    expect((await ui.find({ type: 'Markdown' }))?.text).toHaveLength(CAP)
    expect(await ui.find({ type: 'Text', text: `30 more characters in /repo/${DIR}/spec.md` })).toBeDefined()

    files.delete(`/repo/${DIR}/spec.md`)
    await ui.select({ key: 'file', value: `${DIR}/notes.md` })
    await ui.select({ key: 'file', value: `${DIR}/spec.md` })
    expect(await ui.find({ type: 'Markdown' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^Could not read .*spec\.md: \S/ })).toBeDefined()
  })
}

test('the empty tab says where artifacts come from, and mobile lists files as buttons', async ($, on) => {
  fakeRepo(on)
  await $.command.run(flow('new Retry failed checkout payments'))
  const empty = await $.ui.mount({ plugin: 'flow', surface: 'terminal', component: 'Pane', requestId: 'flow-doc', props })
  expect(await empty.find({ type: 'Text', text: 'No artifacts yet.' })).toBeDefined()
  await write($, `${DIR}/spec.md`)
  const mobile = await $.ui.mount({ plugin: 'flow', surface: 'mobile', component: 'Pane', requestId: 'flow-doc', props })
  expect(await mobile.find({ key: `file:${DIR}/spec.md` })).toBeDefined()
  expect(await mobile.find({ key: 'file' })).toBeUndefined()
})
