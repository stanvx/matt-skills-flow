import type { On, RenderSurface } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Mounted } from 'claude-code/testing'

import { DIALOG } from '../hooks/dialog'
import { FLOW_NAMES } from '../hooks/flows'
import type { FlowTask } from '../types'
import { fakeRepo, flow } from './fake'

const SURFACES = ['terminal', 'desktop'] as const
const GRILL = { name: 'mattpocock-skills:grill-with-docs', description: 'grill', source: 'plugin' as const }
const IMPLEMENT = { name: 'mattpocock-skills:implement', description: 'implement', source: 'plugin' as const }
const GH_ISSUE = JSON.stringify({ title: 'Retry failed payments', body: 'It should retry.', url: 'https://github.com/o/r/issues/123' })

const pane = <P extends RenderSurface>(surface: P, bodyColumns = 100) => ({
  plugin: 'flow',
  surface,
  component: 'Pane' as const,
  requestId: DIALOG,
  props: { title: 'New task', isFocused: true, bodyColumns, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 24 }, view: {} },
})

// Events this file answers itself; fakeRepo's answers for them are left out so the two never collide.
const OURS = ['ui.open', 'process.run', 'session.surfaces', 'session.model', 'command.list', 'command.run', 'ui.close']
const leaving = (on: On): On =>
  ((name: string, ...rest: unknown[]) =>
    OURS.includes(name) ? undefined : (on as unknown as (...args: unknown[]) => unknown)(name, ...rest)) as unknown as On

type GhAnswer = { exitCode: number; stdout: string; stderr: string }

/** A repo where the dialog can open; records what the mod asked the engine to do. */
const dialogRepo = (on: On, options: { surfaces?: readonly RenderSurface[]; gh?: GhAnswer } = {}) => {
  const ran: { command: string; args: string }[] = []
  const opened: { id: string; title?: string; focus?: true; closeOnEscape?: true; holdToasts?: true; rows?: number }[] = []
  const argvs: (readonly string[])[] = []
  const gh = options.gh ?? { exitCode: 0, stdout: GH_ISSUE, stderr: '' }
  on('ui.open', (_, e) => {
    opened.push(e)

    return { value: { isPlaced: true as const } }
  })
  on('process.run', (_, e) => {
    argvs.push(e.argv)

    return { value: { ...(e.argv[0] === 'gh' ? gh : { exitCode: 0, stdout: 'feature\n', stderr: '' }), isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('session.surfaces', () => ({ value: options.surfaces ?? ['terminal'] }))
  on('session.model', () => ({ value: 'claude-opus-4-8' }))
  on('command.list', () => ({ value: [GRILL, IMPLEMENT] }))
  on('command.run', (_, e) => {
    ran.push({ command: e.command, args: e.args })

    return { text: '' }
  })
  on('ui.close', () => ({ value: undefined }))

  return { ...fakeRepo(leaving(on)), ran, opened, argvs }
}

const taskOn = (files: Map<string, string>, slug: string) => JSON.parse(files.get(`/repo/.scratch/${slug}/task.json`) ?? 'null') as FlowTask | null

type Form = Mounted<'terminal' | 'desktop', 'Pane'>

const flowOf = async (ui: Form) => {
  const marks = await Promise.all(FLOW_NAMES.map(async name => [name, (await ui.find({ key: `flow-${name}` }))?.props.label] as const))

  // The picked workflow is the row marked ▸.
  return marks.find(([, label]) => typeof label === 'string' && label.startsWith('▸'))?.[0]
}

test('/flow new opens the dialog as a focused pane, and text still opens a task', async ($, on) => {
  const { files, opened } = dialogRepo(on)

  await $.command.run(flow('new'))
  expect(opened.at(0)).toMatchObject({ id: DIALOG, title: 'New task', focus: true, closeOnEscape: true, holdToasts: true })
  expect(opened.at(0)?.rows).toBeGreaterThan(0)

  const made = await $.command.run(flow('new Retry failed checkout'))
  expect(made.text).toContain('Opened')
  expect(taskOn(files, 'retry-failed-checkout')?.title).toBe('Retry failed checkout')
  // Inline, the band shows the new task; only a docked layout opens the board beside the transcript.
  expect(opened.map(one => one.id)).toEqual([DIALOG])
})

test('a surface with no fields gets the usage text instead', async ($, on) => {
  const { opened } = dialogRepo(on, { surfaces: ['mobile'] })
  const answer = await $.command.run(flow('new'))
  expect(answer.text).toContain('Usage: /flow new')
  expect(opened).toEqual([])
})

test('the form fills in, and Create writes the task and starts the first stage', async ($, on) => {
  const { files, ran, opened } = dialogRepo(on)
  on('model.classify', () => ({ value: 'spec: A spec and tickets you approve, built across sessions' }))

  for (const surface of SURFACES) {
    await $.command.run(flow('new'))
    const ui = await $.ui.mount(pane(surface))
    expect(await ui.find({ key: 'what' })).toMatchObject({ props: { value: '' } })
    // The options fold into one line until o opens them.
    expect(await ui.find({ key: 'model' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'Opens a PR · session model' })).toBeDefined()
    await ui.press({ key: 'options' })
    expect((await ui.find({ key: 'model' }))?.props.options).toEqual([
      { value: '', label: 'Session default (claude-opus-4-8)' },
      { value: 'fable', label: 'Fable 5.1' },
      { value: 'opus', label: 'Opus 5.5' },
      { value: 'sonnet', label: 'Sonnet 5.5' },
      { value: 'haiku', label: 'Haiku 4.5' },
    ])

    await ui.input({ key: 'what', text: 'Retry failed checkout payments', kind: 'change' })
    expect(await ui.find({ key: 'name' })).toMatchObject({ props: { value: 'Retry failed checkout payments' } })
    expect((await ui.find({ type: 'Text', text: /\.scratch\// }))?.text).toBe('.scratch/retry-failed-checkout-payments/')
    expect(await flowOf(ui)).toBe('grill')
    expect(await ui.find({ type: 'Text', text: 'Suggested' })).toBeDefined()
    // The stages: cards on the terminal, a picture elsewhere.
    const stagesShown = async () =>
      surface === 'terminal'
        ? (await ui.findAll({ type: 'Text', text: /^(Decide|Build|PR|Look back)( ◇)?$/ })).map(card => card.text)
        : [(await ui.find({ type: 'Svg' }))?.props.alt]
    expect(await stagesShown()).toEqual(
      surface === 'terminal'
        ? ['Decide', 'Build ◇', 'PR', 'Look back']
        : ['Stages: Settle decisions (ahead), Build (ahead, held until proven), Open the PR (ahead), Look back (ahead)'],
    )

    await ui.press({ key: 'flow-oneshot' })
    expect(await flowOf(ui)).toBe('oneshot')
    expect((await stagesShown()).join(' ')).not.toContain('Settle decisions')

    await ui.press({ key: 'pr' })
    expect((await ui.find({ key: 'pr' }))?.props.label).toBe('[ ] Open a PR when done')
    await ui.press({ key: 'worktree' })
    expect((await ui.find({ key: 'worktree' }))?.props).toMatchObject({ label: '[x] Work in its own git worktree', hotkey: 'w' })
    await ui.press({ key: 'ui' })
    expect((await ui.find({ key: 'ui' }))?.props).toMatchObject({ label: '[x] Has a UI: proof is the change seen working', hotkey: 'u' })
    await ui.select({ key: 'model', value: 'sonnet' })
    await ui.select({ key: 'effort', value: 'high' })
    expect((await ui.find({ key: 'model' }))?.props.value).toBe('sonnet')
    await ui.input({ key: 'name', text: 'Retry payments', kind: 'change' })
    expect((await ui.find({ type: 'Text', text: /\.scratch\// }))?.text).toBe('.scratch/retry-payments/')
    // Typing on keeps a name set by hand.
    await ui.input({ key: 'what', text: 'Retry failed checkout payments now', kind: 'change' })
    expect(await ui.find({ key: 'name' })).toMatchObject({ props: { value: 'Retry payments' } })

    ran.length = 0
    opened.length = 0
    await ui.press({ key: 'create' })
    expect(taskOn(files, 'retry-payments')).toMatchObject({
      title: 'Retry payments',
      flow: 'oneshot',
      openPr: false,
      worktree: 'now',
      model: 'sonnet',
      effort: 'high',
      ui: true,
      phase: 'new',
    })
    expect(ran).toEqual([{ command: 'mattpocock-skills:implement', args: 'Retry payments' }])
    expect(opened).toEqual([])
    expect(await ui.find({ type: 'Text', text: /Closed/ })).toBeDefined()
    await ui.unmount()
    files.clear()
  }
})

test('Enter on the description refines a guessed flow, never a picked one', async ($, on) => {
  dialogRepo(on)
  const asked: { text: string; labels: readonly string[]; model?: string }[] = []
  on('model.classify', (_, e) => {
    asked.push({ text: e.text, labels: e.labels, model: e.options?.model })

    return { value: 'spec: A spec and tickets you approve, built across sessions' }
  })
  await $.command.run(flow('new'))
  const ui = await $.ui.mount(pane('terminal'))

  await ui.input({ key: 'what', text: 'Rework billing', kind: 'change' })
  await ui.input({ key: 'what', text: 'Rework billing' })
  expect(await flowOf(ui)).toBe('spec')
  expect(asked).toHaveLength(1)
  expect(asked[0]).toMatchObject({ text: 'Rework billing', model: 'haiku' })
  expect(asked[0]?.labels.map(label => label.split(':')[0])).toEqual(['oneshot', 'grill', 'spec', 'wayfind', 'freeform'])

  await ui.press({ key: 'flow-freeform' })
  await ui.input({ key: 'what', text: 'Rework billing' })
  expect(await flowOf(ui)).toBe('freeform')
  await ui.input({ key: 'what', text: '#12' })
  expect(asked).toHaveLength(1)
  await ui.input({ key: 'name', text: 'Billing' })
})

test('a failed classifier leaves the guess alone', async ($, on) => {
  dialogRepo(on)
  on('model.classify', () => {
    throw new Error('no quota')
  })
  await $.command.run(flow('new'))
  const ui = await $.ui.mount(pane('terminal'))
  await ui.input({ key: 'what', text: 'Rework billing' })
  expect(await flowOf(ui)).toBe('grill')
})

test('multi-line text is kept as ticket.md and handed to the first stage', async ($, on) => {
  const { files, ran } = dialogRepo(on)
  await $.command.run(flow('new'))
  const ui = await $.ui.mount(pane('desktop'))

  await ui.input({ key: 'what', text: 'Retry checkout\nKeep the cart\nCap at 3 tries', kind: 'change' })
  await ui.press({ key: 'create' })

  expect(files.get('/repo/.scratch/retry-checkout/ticket.md')).toBe('Retry checkout\nKeep the cart\nCap at 3 tries\n')
  expect(taskOn(files, 'retry-checkout')?.artifacts).toEqual([{ phase: 'new', pointer: '.scratch/retry-checkout/ticket.md', at: 1000 }])
  expect(ran).toEqual([{ command: 'mattpocock-skills:grill-with-docs', args: '.scratch/retry-checkout/ticket.md' }])
})

test('Create with no text shows why and does nothing; Esc is the way out', async ($, on) => {
  const { files, ran, opened } = dialogRepo(on)
  for (const surface of SURFACES) {
    await $.command.run(flow('new'))
    const ui = await $.ui.mount(pane(surface))

    expect((await ui.find({ type: 'Text', text: /Describe what to build first/ }))?.props.dimColor).toBe(true)
    await ui.press({ key: 'create' })
    expect(ran).toEqual([])
    expect(files.size).toBe(0)
    expect(await ui.find({ key: 'what' })).toBeDefined()

    // One action on the form: Esc and the close mark cancel, and the line under it says so.
    await ui.input({ key: 'what', text: 'Something', kind: 'change' })
    expect(await ui.find({ key: 'cancel' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'Tab: next field · Enter: confirm · Esc: cancel' })).toBeDefined()
    expect(ran).toEqual([])
    expect(files.size).toBe(0)
    await ui.unmount()
  }
  expect(opened.map(one => one.id)).toEqual([DIALOG, DIALOG])
})

// The keys of the Buttons in each Box row of a drawn tree.
const buttonRows = (tree: unknown): string[][] => {
  if (typeof tree !== 'object' || tree === null) {
    return []
  }
  const { children = [] } = tree as { children?: unknown[] }
  const keys = children.flatMap(one => {
    const { type, props } = (one ?? {}) as { type?: string; props?: { key?: string } }

    return type === 'Button' && props?.key !== undefined ? [props.key] : []
  })

  return [...(keys.length === 0 ? [] : [keys]), ...children.flatMap(buttonRows)]
}

test('the picked workflow leads with its stages as cards, and the others wait in one row', async ($, on) => {
  dialogRepo(on)
  await $.command.run(flow('new'))
  const ui = await $.ui.mount(pane('terminal', 100))
  expect((await ui.find({ key: 'flow-grill' }))?.props.label).toBe('▸ Grill')
  expect(await ui.find({ type: 'Text', text: 'Settle the decisions, then build in one session.' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Or run it as:' })).toBeDefined()
  expect((await ui.find({ key: 'flow-spec' }))?.props).toMatchObject({ label: 'Spec', hotkey: '3', dimColor: true })
  // The picked one (Grill, the guess for an idea) draws a card per stage; the build needs proof.
  // Inside one dim frame labelled with the workflow.
  expect(await ui.find({ type: 'Text', text: 'GRILL WORKFLOW' })).toBeDefined()
  const cards = (await ui.findAll({ type: 'Box' })).filter(box => box.props.borderStyle === 'round' && box.props.borderDimColor !== true)
  expect(cards.map(box => box.props.borderColor)).toEqual(['inactive', 'permission', 'inactive', 'inactive'])
})

test('a GitHub issue reference is fetched and becomes the ticket', async ($, on) => {
  const { files, ran, argvs } = dialogRepo(on)
  await $.command.run(flow('new'))
  const ui = await $.ui.mount(pane('terminal'))

  await ui.input({ key: 'what', text: '#123', kind: 'change' })
  await ui.press({ key: 'create' })

  expect(argvs.filter(one => one[0] === 'gh')).toEqual([['gh', 'issue', 'view', '123', '--json', 'title,body,url']])
  expect(taskOn(files, 'retry-failed-payments')).toMatchObject({ title: 'Retry failed payments', entry: 'ticket', flow: 'oneshot' })
  expect(files.get('/repo/.scratch/retry-failed-payments/ticket.md')).toBe(
    '# Retry failed payments\n\nhttps://github.com/o/r/issues/123\n\nIt should retry.\n',
  )
  expect(ran).toEqual([{ command: 'mattpocock-skills:implement', args: '.scratch/retry-failed-payments/ticket.md' }])
})

test('a GitHub failure toasts the reason and keeps the dialog open', async ($, on) => {
  const { files, ran, toasts } = dialogRepo(on, {
    gh: { exitCode: 1, stdout: '', stderr: 'Could not resolve to an issue\n' },
  })
  await $.command.run(flow('new'))
  const ui = await $.ui.mount(pane('terminal'))

  await ui.input({ key: 'what', text: 'https://github.com/o/r/issues/9', kind: 'change' })
  await ui.press({ key: 'create' })

  expect(toasts.join('\n')).toContain('Could not resolve to an issue')
  expect(files.size).toBe(0)
  expect(ran).toEqual([])
  expect(await ui.find({ key: 'what' })).toMatchObject({ props: { value: 'https://github.com/o/r/issues/9' } })
})

test('mobile draws a pointer to the command instead of fields', async ($, on) => {
  dialogRepo(on, { surfaces: ['mobile'] })
  const ui = await $.ui.mount(pane('mobile'))
  expect(await ui.find({ type: 'Text', text: /\/flow new/ })).toBeDefined()
})
