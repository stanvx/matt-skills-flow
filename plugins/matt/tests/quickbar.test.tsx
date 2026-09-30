import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, PromptFillArgs, PromptSubmitArgs } from 'claude-code'

import { createTask } from '../hooks/flow'
import { barCommand, defaults, labelOf, parseAdd, parsePhrases, rowOf, slashOf } from '../hooks/quickbar'
import { fakeRepo, matt } from './fake'

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

test('the defaults follow the phase', () => {
  const at = (phase: string) => ({ ...createTask('Retry checkout', 0), phase })
  expect(defaults(null, 0, 50)).toEqual([])
  expect(texts(defaults(at('new'), 0, 50))).toEqual([])
  expect(texts(defaults(at('grill-with-docs'), 0, 50))).toEqual(['continue'])
  expect(texts(defaults(at('to-spec'), 0, 50))).toEqual(['/matt doc'])
  const approved = { ...at('to-spec'), log: [{ kind: 'approve' as const, phase: 'to-spec', at: 1 }] }
  expect(texts(defaults(approved, 0, 50))).toEqual(['continue'])
  expect(texts(defaults(at('implement'), 0, 50))).toEqual(['continue', '/code-review', 'run the checks'])
  expect(texts(defaults(at('diagnosing-bugs'), 0, 50))).toEqual(['continue', '/code-review', 'run the checks'])
  expect(texts(defaults(at('pr'), 0, 50))).toEqual(['/retro'])
  expect(texts(defaults(at('implement-spec'), 50, 50))).toEqual(['continue', '/code-review', 'run the checks', '/clear'])
})

test('saved phrases follow the defaults, nine in all, without repeats', () => {
  const task = { ...createTask('Retry checkout', 0), phase: 'implement' }
  const saved = Array.from({ length: 9 }, (_, at) => ({ text: at === 0 ? 'continue' : `phrase ${at}`, mode: 'send' as const }))
  const row = rowOf(task, saved, 0, 50)
  expect(row).toHaveLength(9)
  expect(texts(row).slice(0, 4)).toEqual(['continue', '/code-review', 'run the checks', 'phrase 1'])
  expect(rowOf(null, saved, 0, 50)).toHaveLength(9)
})

test('labels, slash phrases and stored values are read defensively', () => {
  expect(labelOf({ text: 'explain', mode: 'fill' })).toBe('explain…')
  expect(labelOf({ text: 'explain', label: 'why', mode: 'send' })).toBe('why')
  expect(labelOf({ text: 'x'.repeat(40), mode: 'send' })).toHaveLength(28)
  expect(slashOf('/matt approve')).toEqual({ command: 'matt', args: 'approve' })
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
    $.ui.mount({ plugin: 'matt', surface, component: 'AbovePrompt', requestId: `bar-${(mounts += 1)}`, props: props(survey) })
  const labels = async (ui: Awaited<ReturnType<typeof mountBar>>) =>
    (await ui.findAll({ type: 'Button' }))
      .filter(one => one.key?.startsWith('bar-'))
      .map(one => `${one.props.hotkey} ${one.props.label}`)

  test(`${surface}: the row shows the defaults of the phase, then the saved phrases`, async ($, on) => {
    fakeRepo(on)
    engineBand(on)
    const empty = await mountBar($)
    expect(await labels(empty)).toEqual([])

    await $.command.run(matt('new Retry failed checkout payments'))
    await $.skill.prompt({ skill: 'to-spec', text: 'spec' })
    await $.command.run(matt('bar add --fill --label Why explain why'))
    const ui = await mountBar($)
    expect(await labels(ui)).toEqual(['1 /matt doc', '2 Why…'])

    await $.command.run(matt('approve'))
    await $.skill.prompt({ skill: 'implement', text: 'go' })
    expect(await labels(await mountBar($))).toEqual(['1 continue', '2 /code-review', '3 run the checks', '4 Why…'])

    expect(await labels(await mountBar($, true))).toEqual([])
  })

  test(`${surface}: /clear joins the row once the context is full`, async ($, on) => {
    fakeRepo(on, 80)
    engineBand(on)
    await $.command.run(matt('new Retry failed checkout payments'))
    await $.skill.prompt({ skill: 'pr', text: 'pr' })
    expect(await labels(await mountBar($))).toEqual(['1 /retro', '2 /clear'])
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
    await $.command.run(matt('new Retry failed checkout payments'))
    await $.skill.prompt({ skill: 'implement', text: 'go' })
    await $.command.run(matt('bar add --fill --label Why explain why'))
    await $.command.run(matt('bar add /matt doc'))
    const ui = await mountBar($)
    ran.length = 0

    await ui.press({ key: 'bar-1' })
    expect(submitted).toEqual([])
    await clock.advance(0)
    expect(submitted.map(one => one.text)).toEqual(['continue'])

    await ui.press({ key: 'bar-2' })
    await clock.advance(0)
    expect(ran).toEqual([{ command: 'mattpocock-skills:code-review', args: '' }])

    await ui.press({ key: 'bar-5' })
    await clock.advance(0)
    expect(ran.at(-1)).toEqual({ command: 'matt', args: 'doc' })

    await ui.press({ key: 'bar-4' })
    expect(filled).toMatchObject([{ text: 'explain why half a thought', mode: 'replace' }])
    expect(submitted).toHaveLength(1)
  })
}

test('/matt bar adds, lists, removes and clears through the store', async ($, on) => {
  fakeRepo(on)
  expect((await $.command.run(matt('bar'))).text).toContain('No saved phrases.')
  expect((await $.command.run(matt('bar add /retro'))).text).toBe('Saved 1: /retro')
  expect((await $.command.run(matt('bar add --fill --label Why explain why'))).text).toBe('Saved 2: explain why')
  expect((await $.command.run(matt('bar add /retro'))).text).toBe('Already saved: /retro')
  expect((await $.command.run(matt('bar add'))).text).toContain('Nothing to save.')
  expect((await $.command.run(matt('bar'))).text).toBe('1. /retro\n2. explain why  (fill)  as "Why"')
  expect((await $.command.run(matt('bar rm 3'))).text).toContain('No phrase 3')
  expect((await $.command.run(matt('bar rm x'))).text).toContain('No phrase x')
  expect((await $.command.run(matt('bar rm 1'))).text).toBe('Removed 1: /retro')
  expect((await $.command.run(matt('bar'))).text).toBe('1. explain why  (fill)  as "Why"')
  expect((await $.command.run(matt('bar wat'))).text).toContain('Usage: /matt bar')
  expect((await $.command.run(matt('bar clear'))).text).toBe('Removed 1 phrase.')
  expect((await $.command.run(matt('bar clear'))).text).toBe('No saved phrases.')
})

test('the other /matt verbs still reach the main command', async ($, on) => {
  fakeRepo(on)
  expect((await $.command.run(matt('new Retry failed checkout payments'))).text).toContain('Opened')
})
