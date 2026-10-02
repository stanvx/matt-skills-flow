// The new-task dialog: /flow new with no text opens it as a pane. The fields
// live in the `draft` state; draft.ts holds what typing and picking do to it.
import { update } from 'claude-code'
import type { On } from 'claude-code'

import type { FlowDraft } from '../types'
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
  previewLegend,
  slugPath,
  typed,
} from './draft'
import type { Issue } from './draft'
import { nextAction } from './flow'
import { EFFORTS, FLOWS, FLOW_NAMES, MODELS } from './flows'
import { COLUMN_PX, GATE, PROOF, stripAlt, stripSvg } from './strip'
import { SHORT } from './ux'
import { RAIL_OPEN, keyed as keyLabel } from './status'

// The validator lists state reads per file, so each file spells its reference.
const draft = { plugin: 'flow', key: 'draft' } as const

export const DIALOG = 'flow-new'

/** How the form opens: it takes the keys, Esc cancels it, and it asks for the rows it needs inline above the prompt. */
export const DIALOG_OPEN = { id: DIALOG, title: 'New task', focus: true, closeOnEscape: true, holdToasts: true, rows: 26 } as const

export const registerDialog = (on: On) => {
  // No text and no flags opens the form; a surface without fields, and anything else, is the main hook's.
  on('command.run', { command: 'flow' }, async ($, e, next) => {
    if (e.args.trim() !== 'new' || !(await $.session.surfaces()).some(surface => surface !== 'mobile')) {
      return next(e)
    }
    await $.state.set(draft, blankDraft())
    const opened = await $.ui.open(DIALOG_OPEN)

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

      return <Text dimColor>The new task dialog needs a field to type in. Use /flow new &lt;what are we doing&gt;.</Text>
    }
    const { Box, Button, Input, Select, Text } = $.ui.resolve(e)
    const keyed = (key: string, label: string) => keyLabel(e.surface, key, label)
    if (current === null) {
      return <Text dimColor>Closed. /flow new opens it again.</Text>
    }
    const d: FlowDraft = current
    const session = await $.session.model().catch(() => '')
    const why = blocker(d)
    const stages = preview(d)
    const legend = previewLegend(stages, d.ui)
    // Surfaces that draw SVG get the strip as a picture.
    const svgOf = (segments: typeof stages) => {
      if (e.surface === 'terminal') {
        return null
      }
      const { Svg } = $.ui.resolve(e)

      return <Svg source={stripSvg(segments, e.props.bodyColumns * COLUMN_PX)} alt={stripAlt(segments)} />
    }
    const edit = (change: (from: FlowDraft) => FlowDraft) => update($, draft, from => (from ? change(from) : null))
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
          $.ui.toast(`flow could not read issue ${ref}: ${read}`)

          return
        }
        issue = read
      }
      await close()
      const { task } = await $.flow.create(createFrom(now, issue))
      // Beside the transcript the board keeps the stages in view; inline it would only crowd the prompt.
      if (e.props.placement === 'dock') {
        await $.ui.open(RAIL_OPEN)
      }
      if (task.phase !== 'new') {
        $.ui.toast(`Resumed ${task.title} (${task.phase})`)

        return
      }
      $.ui.toast(`Opened ${task.title}: starting /${nextAction(task).command}`)
      await $.flow.run()
    }

    // Each workflow on its own row in plain words; the one picked opens into its stages as cards.
    // As a Mermaid flowchart would draw them: one direction, short labels, and colour only where it
    // means something: a gate you approve, and the build that needs proof.
    const cards = (
      <Box flexWrap="wrap" alignItems="center">
        {stages.map((one, at) => (
          <Box key={`card-${one.stage}`} alignItems="center">
            {at === 0 ? null : <Text dimColor>{' → '}</Text>}
            <Box borderStyle="round" borderColor={one.gate !== undefined ? 'warning' : one.proof !== undefined ? 'permission' : 'inactive'} paddingX={1}>
              <Text>
                {SHORT[one.stage] ?? one.label}
                {one.gate !== undefined ? <Text color="warning">{` ${GATE}`}</Text> : null}
                {one.proof !== undefined ? <Text color="permission">{` ${PROOF.ahead}`}</Text> : null}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    )
    // What the folded options are set to, in words.
    const summary = [
      d.openPr ? 'Opens a PR' : 'No PR',
      d.worktree === 'now' ? 'own worktree' : undefined,
      d.ui ? 'proof is seeing it work' : undefined,
      d.model === '' ? 'session model' : (MODELS.find(one => one.alias === d.model)?.label ?? d.model),
      d.effort === '' ? undefined : `${d.effort} effort`,
    ]
      .filter(Boolean)
      .join(' · ')
    // The picked workflow leads, with its stages as cards; the others wait in one quiet row.
    const flowButton = (name: (typeof FLOW_NAMES)[number], at: number) => (
      <Button
        key={`flow-${name}`}
        label={`${d.flow === name ? '▸ ' : ''}${FLOWS[name].label}`}
        hotkey={String(at + 1)}
        plain
        dimColor={d.flow !== name}
        onPress={() => edit(from => picked(from, name))}
      />
    )
    const flowRows = (
      <Box flexDirection="column">
        <Box columnGap={2}>
          <Box flexShrink={0}>{flowButton(d.flow, FLOW_NAMES.indexOf(d.flow))}</Box>
          {d.isFlowPicked ? null : <Text color="claude" bold>Suggested</Text>}
          <Text bold wrap="wrap">{`${FLOWS[d.flow].blurb}.`}</Text>
        </Box>
        {e.surface === 'terminal' && stages.length > 0 ? (
          <Box flexDirection="column" borderStyle="round" borderColor="inactive" borderDimColor paddingX={1}>
            <Text dimColor>{`${FLOWS[d.flow].label.toUpperCase()} WORKFLOW`}</Text>
            {cards}
            {legend === undefined ? null : <Text dimColor>{legend}</Text>}
          </Box>
        ) : null}
        <Box flexWrap="wrap" columnGap={2}>
          <Text dimColor>Or run it as:</Text>
          {FLOW_NAMES.map((name, at) => (name === d.flow ? null : flowButton(name, at)))}
        </Box>
      </Box>
    )
    return (
      <Box flexDirection="column">
        <Text color="claude">Describe the task, pick how to run it, then press c to start.</Text>
        <Text> </Text>
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
        <Text bold>Workflow</Text>
        {flowRows}
        {stages.length === 0 ? (
          <Text dimColor>No fixed stages: every skill you run is recorded.</Text>
        ) : e.surface === 'terminal' ? null : (
          svgOf(stages)
        )}
        {legend !== undefined && e.surface !== 'terminal' && <Text dimColor>{legend}</Text>}
        <Text> </Text>
        {/* The options fold into one line of what they are set to: the form leads with what and how. */}
        <Box columnGap={2}>
          <Button
            key="options"
            label={d.isOptionsOpen === true ? 'Hide options' : 'Options'}
            hotkey="o"
            plain
            onPress={() => edit(from => ({ ...from, isOptionsOpen: from.isOptionsOpen !== true }))}
          />
          {d.isOptionsOpen === true ? null : <Text dimColor wrap="truncate-end">{summary}</Text>}
        </Box>
        {d.isOptionsOpen === true ? (
          <Box flexDirection="column">
            <Box flexWrap="wrap" columnGap={3}>
              <Button
                key="pr"
                label={`${d.openPr ? '[x]' : '[ ]'} Open a PR when done`}
                hotkey="p"
                plain
                onPress={() => edit(from => ({ ...from, openPr: !from.openPr }))}
              />
              <Button
                key="worktree"
                label={`${d.worktree === 'now' ? '[x]' : '[ ]'} Work in its own git worktree`}
                hotkey="w"
                plain
                onPress={() => edit(from => ({ ...from, worktree: from.worktree === 'now' ? 'never' : 'now' }))}
              />
              <Button
                key="ui"
                label={`${d.ui ? '[x]' : '[ ]'} Has a UI: proof is the change seen working`}
                hotkey="u"
                plain
                onPress={() => edit(from => ({ ...from, ui: !from.ui }))}
              />
            </Box>
            <Box flexWrap="wrap" columnGap={3}>
              <Select
                key="model"
                label="Model"
                value={d.model}
                options={[
                  { value: '', label: session === '' ? 'Session default' : `Session default (${session})` },
                  ...MODELS.map(one => ({ value: one.alias, label: one.label })),
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
            </Box>
          </Box>
        ) : null}
        <Text> </Text>
        {/* One action: Esc and the close mark cancel, as the line under it says. */}
        <Box gap={1}>
          <Button key="create" label={keyed('c', 'Create task')} hotkey="c" variant="primary" onPress={() => void create()} />
        </Box>
        <Text dimColor>{why ?? 'Tab: next field · Enter: confirm · Esc: cancel'}</Text>
      </Box>
    )
  })
}
