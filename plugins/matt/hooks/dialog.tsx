// The new-task dialog: /matt new with no text opens it as a pane. The fields
// live in the `draft` state; draft.ts holds what typing and picking do to it.
import { update } from 'claude-code'
import type { On } from 'claude-code'

import type { MattDraft } from '../types'
import {
  blankDraft,
  blocker,
  createFrom,
  effortOf,
  flowLabels,
  flowOfLabel,
  githubRef,
  guessed,
  issueOf,
  picked,
  preview,
  slugPath,
  typed,
} from './draft'
import type { Issue } from './draft'
import { nextAction } from './flow'
import { EFFORTS, FLOWS, FLOW_NAMES } from './flows'
import { RAIL } from './ui'

// The validator lists state reads per file, so each file spells its reference.
const draft = { plugin: 'matt', key: 'draft' } as const

export const DIALOG = 'matt-new'

// Body rows the form wants inline above the prompt.
const ROWS = 24
// Below this many columns the four workflow buttons stack 2x2.
const NARROW = 48

const MODELS = ['opus', 'sonnet', 'haiku', 'fable']

const WORKTREE_WHY = {
  never: 'Edits happen in this checkout.',
  now: 'The task gets its own git worktree, so this checkout stays clean.',
} as const

export const registerDialog = (on: On) => {
  // No text and no flags opens the form; a surface without fields, and anything else, is the main hook's.
  on('command.run', { command: 'matt' }, async ($, e, next) => {
    if (e.args.trim() !== 'new' || !(await $.session.surfaces()).some(surface => surface !== 'mobile')) {
      return next(e)
    }
    await $.state.set(draft, blankDraft())
    const opened = await $.ui.open({ id: DIALOG, title: 'New task', focus: true, closeOnEscape: true, holdToasts: true, rows: ROWS })

    return { text: opened.isPlaced ? 'New task dialog opened.' : `Could not seat the new task dialog: ${opened.reason}` }
  })

  // Esc and the close mark end the draft too.
  on('ui.close', { id: DIALOG }, async ($, e, next) => {
    const closed = await next(e)
    await $.state.set(draft, null)

    return closed
  })

  on('ui.render', { component: 'Pane', requestId: DIALOG }, async ($, e) => {
    const current = (await $.state.get(draft)).value ?? null
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)

      return <Text dimColor>The new task dialog needs a field to type in. Use /matt new &lt;what are we doing&gt;.</Text>
    }
    const { Box, Button, Input, Select, Text } = $.ui.resolve(e)
    if (current === null) {
      return <Text dimColor>Closed. /matt new opens it again.</Text>
    }
    const d: MattDraft = current
    const session = await $.session.model().catch(() => '')
    const why = blocker(d)
    const edit = (change: (from: MattDraft) => MattDraft) => update($, draft, from => (from ? change(from) : null))
    // Moving the ring is a nicety: a pane that closed meanwhile is no failure.
    const focus = (key: string) => $.ui.focus({ requestId: DIALOG, key }).catch(() => undefined)
    // The ui.close hook clears the draft for Esc; a close the dialog makes clears it here as well.
    const close = async () => {
      await $.ui.close({ id: DIALOG })
      await $.state.set(draft, null)
    }

    // Enter on the description: refine the guessed workflow, unless picked, and move on to the name.
    const submitWhat = async (text: string) => {
      await focus('name')
      if (text.trim() === '' || githubRef(text) !== undefined || d.isFlowPicked) {
        return
      }
      const label = await $.model.classify(text, flowLabels, { model: 'haiku' }).catch(() => undefined)
      const flow = flowOfLabel(label)
      if (flow !== undefined) {
        await edit(from => guessed(from, flow))
      }
    }

    const create = async () => {
      const now = (await $.state.get(draft)).value ?? null
      if (now === null || blocker(now) !== undefined) {
        return
      }
      const ref = githubRef(now.text)
      let issue: Issue | undefined
      if (ref !== undefined) {
        const cwd = await $.session.root()
        const ran = await $.process
          .run(['gh', 'issue', 'view', ref, '--json', 'title,body,url'], { cwd })
          .catch((error: unknown) => (error instanceof Error ? error.message : 'gh did not run'))
        const read = typeof ran === 'string' ? ran : issueOf(ran)
        if (typeof read === 'string') {
          $.ui.toast(`matt could not read issue ${ref}: ${read}`)

          return
        }
        issue = read
      }
      await close()
      const { task } = await $.matt.create(createFrom(now, issue))
      await $.ui.open({ id: RAIL, title: 'matt' })
      if (task.phase !== 'new') {
        $.ui.toast(`Resumed ${task.title} (${task.phase})`)

        return
      }
      $.ui.toast(`Opened ${task.title}: starting /${nextAction(task).command}`)
      await $.matt.run()
    }

    const flowButtons = FLOW_NAMES.map((name, at) => (
      <Button
        key={`flow-${name}`}
        label={FLOWS[name].label}
        hotkey={String(at + 1)}
        variant={d.flow === name ? 'primary' : 'secondary'}
        onPress={() => edit(from => picked(from, name))}
      />
    ))
    const flowRows = e.props.bodyColumns < NARROW ? [flowButtons.slice(0, 2), flowButtons.slice(2)] : [flowButtons]
    // Pressing w (or clicking) on the option not chosen switches to it.
    const worktree = (value: MattDraft['worktree'], label: string) => (
      <Button
        key={`worktree-${value}`}
        label={label}
        hotkey={d.worktree === value ? undefined : 'w'}
        variant={d.worktree === value ? 'primary' : 'secondary'}
        onPress={() => edit(from => ({ ...from, worktree: value }))}
      />
    )

    return (
      <Box flexDirection="column">
        <Text bold>What</Text>
        <Input
          key="what"
          autoFocus
          value={d.text}
          placeholder="Describe what to build, or paste a GitHub issue URL or #123"
          submitLabel="name it"
          onInput={text => edit(from => typed(from, text))}
          onSubmit={text => void submitWhat(text)}
        />
        <Text bold>Name</Text>
        <Input
          key="name"
          value={d.title}
          placeholder="A short name for the task"
          submitLabel="next"
          onInput={title => edit(from => ({ ...from, title }))}
          onSubmit={() => void focus('create')}
        />
        <Text dimColor>{slugPath(d)}</Text>
        <Text> </Text>
        <Text bold>Workflow (1-4)</Text>
        {flowRows.map(row => (
          <Box gap={1}>{row}</Box>
        ))}
        <Text dimColor>{FLOWS[d.flow].blurb}</Text>
        <Text dimColor>{preview(d)}</Text>
        <Text> </Text>
        <Button
          key="pr"
          label={`${d.openPr ? '[x]' : '[ ]'} Open a PR when done`}
          hotkey="p"
          plain
          onPress={() => edit(from => ({ ...from, openPr: !from.openPr }))}
        />
        <Text> </Text>
        <Text bold>Worktree (w)</Text>
        <Box gap={1}>
          {worktree('never', 'This checkout')}
          {worktree('now', 'Own worktree')}
        </Box>
        <Text dimColor>{WORKTREE_WHY[d.worktree]}</Text>
        <Text> </Text>
        <Select
          key="model"
          label="Model"
          value={d.model}
          options={[
            { value: '', label: session === '' ? 'Session default' : `Session default (${session})` },
            ...MODELS.map(value => ({ value })),
          ]}
          onSelect={model => edit(from => ({ ...from, model }))}
        />
        <Select
          key="effort"
          label="Effort"
          value={d.effort}
          options={[{ value: '', label: 'Session default' }, ...EFFORTS.map(value => ({ value }))]}
          onSelect={value => edit(from => ({ ...from, effort: effortOf(value) }))}
        />
        <Text> </Text>
        <Box gap={1}>
          <Button key="cancel" label="Cancel" role="dismiss" onPress={() => void close()} />
          <Button key="create" label="Create task" hotkey="c" variant="primary" onPress={() => void create()} />
        </Box>
        <Text dimColor>{why ?? 'Tab moves between fields, Esc cancels.'}</Text>
      </Box>
    )
  })
}
