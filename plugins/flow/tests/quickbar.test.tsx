import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, PromptFillArgs, PromptSubmitArgs } from 'claude-code'

import { createTask } from '../hooks/flow'
import { bandKeys, barCommand, extras, labelOf, parseAdd, parsePhrases, rowOf, slashOf } from '../hooks/quickbar'
import { fakeRepo, flow } from './fake'

const props = (hasSurvey = false) => ({
  hasSurvey,
  isWorking: false,
  maxRows: 5,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 5 },
  view: {},
})

const engineBand = (on: On) => on('ui.render', () => ({ type: 'Box', props: {}, children: [] }))

const texts = (phrases: { text: string }[]) => phrases.map(one => one.text)

test('the extras the board offers follow the phase', () => {
  const at = (phase: string) => ({ ...createTask('Retry checkout', 0), phase })
  expect(extras(null)).toEqual([])
  expect(texts(extras(at('new')))).toEqual([])
  expect(texts(extras(at('grill-with-docs')))).toEqual(['continue'])
  expect(texts(extras(at('to-spec')))).toEqual(['continue'])
  expect(texts(extras(at('implement')))).toEqual(['continue', '/code-review', 'run the checks'])
  expect(texts(extras(at('diagnosing-bugs')))).toEqual(['continue', '/code-review', 'run the checks'])
  expect(texts(extras(at('pr')))).toEqual([])
})

test('saved phrases take the keys after the band keeps 1, nine in all', () => {
  const task = createTask('Retry checkout', 0)
  const saved = Array.from({ length: 9 }, (_, at) => ({ text: `phrase ${at}`, mode: 'send' as const }))
  expect(bandKeys(task)).toBe(1)
  expect(rowOf(task, saved)).toHaveLength(8)
  expect(bandKeys(null)).toBe(0)
  expect(rowOf(null, saved)).toHaveLength(9)
})

test('labels, slash phrases and stored values are read defensively', () => {
  expect(labelOf({ text: 'explain', mode: 'fill' })).toBe('explain…')
  expect(labelOf({ text: 'explain', label: 'why', mode: 'send' })).toBe('why')
  expect(labelOf({ text: 'x'.repeat(40), mode: 'send' })).toHaveLength(28)
  expect(slashOf('/flow approve')).toEqual({ command: 'flow', args: 'approve' })
  expect(slashOf('/clear')).toEqual({ command: 'clear', args: '' })
  expect(slashOf('continue')).toBeUndefined()
  expect(parsePhrases([{ text: 'a', mode: 'send' }, { text: '', mode: 'send' }, { text: 'b', mode: 'nope' }, 3, null])).toEqual([
    { text: 'a', mode: 'send' },
  ])
  expect(parsePhrases('junk')).toEqual([])
})

test('add takes flags before the text and refuses bad input', () => {
  expect(parseAdd('--fill --label "Why" explain why')).toEqual({ text: 'explain why', mode: 'fill', label: 'Why' })
  expect(parseAdd('--label ok /retro')).toEqual({ text: '/retro', mode: 'send', label: 'ok' })
  expect(parseAdd('')).toBe('Nothing to save.')
  expect(parseAdd('--fill')).toBe('Nothing to save.')
  expect(parseAdd('--label')).toBe('--label needs a label.')
  expect(parseAdd('--wat x')).toBe('--wat is not an option.')
  expect(parseAdd('x'.repeat(501))).toContain('under 500')
  expect(parseAdd(`--label ${'l'.repeat(25)} x`)).toContain('under 24')
  expect(barCommand(Array.from({ length: 9 }, (_, at) => ({ text: `p${at}`, mode: 'send' as const })), 'add more').text).toContain('Already 9')
})

for (const surface of ['terminal', 'desktop'] as const) {
  // The engine's own AbovePrompt draws nothing, so the bottom of the chain is an empty box.
  let mounts = 0
  const mountBar = ($: Engine, survey = false) =>
    $.ui.mount({ plugin: 'flow', surface, component: 'AbovePrompt', requestId: `bar-${(mounts += 1)}`, props: props(survey) })
  const labels = async (ui: Awaited<ReturnType<typeof mountBar>>) =>
    (await ui.findAll({ type: 'Button' }))
      .filter(one => one.key?.startsWith('bar-'))
      .map(one => one.props.label)

  test(`${surface}: saved phrases keep their digits whatever the phase, and give way to a survey`, async ($, on) => {
    fakeRepo(on)
    engineBand(on)
    await $.command.run(flow('bar add --fill --label Why explain why'))
    const keys = async (ui: Awaited<ReturnType<typeof mountBar>>) =>
      (await ui.findAll({ type: 'Button' })).filter(one => one.key?.startsWith('bar-')).map(one => one.props.hotkey)
    // No task open: the band keeps no key, so the phrase takes 1.
    expect(await keys(await mountBar($))).toEqual(['1'])

    await $.command.run(flow('new Retry failed checkout payments'))
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
    expect(await keys(await mountBar($))).toEqual(['2'])
    await $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-failed-checkout-payments/spec.md', content: 'x' })
    expect(await labels(await mountBar($))).toEqual(['Why…'])
    expect(await keys(await mountBar($))).toEqual(['2'])

    expect(await labels(await mountBar($, true))).toEqual([])
  })

  test(`${surface}: a full context puts /clear beside the next step, not inside a stage`, async ($, on) => {
    fakeRepo(on, 80)
    engineBand(on)
    await $.command.run(flow('new Retry failed checkout payments'))
    expect(await (await mountBar($)).find({ key: 'clear' })).toBeDefined()
    expect(await (await mountBar($)).find({ type: 'Text', text: /context 80%/ })).toBeDefined()
    await $.skill.prompt({ skill: 'pr', text: 'pr' })
    expect(await (await mountBar($)).find({ key: 'clear' })).toBeUndefined()
  })

  test(`${surface}: a press sends prose, runs a slash command, or fills the prompt`, async ($, on) => {
    const ran: { command: string; args?: string }[] = []
    const submitted: PromptSubmitArgs[] = []
    const filled: PromptFillArgs[] = []
    on('command.list', () => ({
      value: [{ name: 'mattpocock-skills:code-review', description: 'review', source: 'plugin' as const }],
    }))
    on('command.run', (_, e) => {
      ran.push({ command: e.command, args: e.args })

      return { text: '' }
    })
    on('prompt.submit', (_, e) => {
      submitted.push(e)

      return { text: e.text }
    })
    on('prompt.read', () => ({ value: { text: 'half a thought', cursor: 14 } }))
    on('prompt.fill', (_, e) => {
      filled.push(e)

      return { isFilled: true }
    })
    const { clock } = fakeRepo(on)
    engineBand(on)
    await $.command.run(flow('new Retry failed checkout payments'))
    await $.skill.prompt({ skill: 'implement', text: 'go' })
    await $.command.run(flow('bar add continue'))
    await $.command.run(flow('bar add /code-review'))
    await $.command.run(flow('bar add --fill --label Why explain why'))
    await $.command.run(flow('bar add /flow doc'))
    const ui = await mountBar($)
    ran.length = 0

    await ui.press({ key: 'bar-2' })
    expect(submitted).toEqual([])
    await clock.advance(0)
    expect(submitted.map(one => one.text)).toEqual(['continue'])

    await ui.press({ key: 'bar-3' })
    await clock.advance(0)
    expect(ran).toEqual([{ command: 'mattpocock-skills:code-review', args: '' }])

    await ui.press({ key: 'bar-5' })
    await clock.advance(0)
    expect(ran.at(-1)).toEqual({ command: 'flow', args: 'doc' })

    await ui.press({ key: 'bar-4' })
    expect(filled).toMatchObject([{ text: 'explain why half a thought', mode: 'replace' }])
    expect(submitted).toHaveLength(1)
  })
}

test('/flow bar adds, lists, removes and clears through the store', async ($, on) => {
  fakeRepo(on)
  expect((await $.command.run(flow('bar'))).text).toContain('No saved phrases.')
  expect((await $.command.run(flow('bar add /retro'))).text).toBe('Saved 1: /retro')
  expect((await $.command.run(flow('bar add --fill --label Why explain why'))).text).toBe('Saved 2: explain why')
  expect((await $.command.run(flow('bar add /retro'))).text).toBe('Already saved: /retro')
  expect((await $.command.run(flow('bar add'))).text).toContain('Nothing to save.')
  expect((await $.command.run(flow('bar'))).text).toBe('1. /retro\n2. explain why  (fill)  as "Why"')
  expect((await $.command.run(flow('bar rm 3'))).text).toContain('No phrase 3')
  expect((await $.command.run(flow('bar rm x'))).text).toContain('No phrase x')
  expect((await $.command.run(flow('bar rm 1'))).text).toBe('Removed 1: /retro')
  expect((await $.command.run(flow('bar'))).text).toBe('1. explain why  (fill)  as "Why"')
  expect((await $.command.run(flow('bar wat'))).text).toContain('Usage: /flow bar')
  expect((await $.command.run(flow('bar clear'))).text).toBe('Removed 1 phrase.')
  expect((await $.command.run(flow('bar clear'))).text).toBe('No saved phrases.')
})

test('the other /flow verbs still reach the main command', async ($, on) => {
  fakeRepo(on)
  expect((await $.command.run(flow('new Retry failed checkout payments'))).text).toContain('Opened')
})
