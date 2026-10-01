// The busy flag, the band above the prompt, and the next step offered as
// ghost text in the empty prompt; the board pane draws in ui-pane.tsx.
import type { On } from 'claude-code'

import type { JevMode } from '../types'

import { DIALOG_OPEN } from './dialog'
import { DOC, baseName } from './doc'
import { blankDraft } from './draft'
import { gateArtifact, nextAction, skillName, statusOf } from './flow'
import { STATUS_LABEL } from './flows'
import { BAR_KEY, bandKeys, labelOf, parsePhrases, rowOf, slashOf } from './quickbar'
import type { Phrase } from './quickbar'
import { PROVE } from './proof'
import { STATUS_BORDER, STATUS_GLYPH, actionLabel, commandName, ghostOf, holdNote, keyed as keyLabel, readLabel, statusLook, tally, THEME } from './status'
import { fittedChips, focusedChips, segmentsFor, stripChips, stripWidth } from './strip'
import type { Chip } from './strip'
import { docksAt, registerPane } from './ui-pane'

export { RAIL, commandLine } from './status'

const current = { plugin: 'flow', key: 'task' } as const
const busy = { plugin: 'flow', key: 'busy' } as const
const draft = { plugin: 'flow', key: 'draft' } as const
const shownDoc = { plugin: 'flow', key: 'doc' } as const

// The band's link to the board, at the end of its first row.
const LINK = '/flow'

export const registerUi = (on: On, clearAt: number, jev: JevMode) => {
  // Busy follows the main loop's turns; a subagent's turn ends without a start.
  on('turn.start', async ($, e, next) => {
    await $.state.set(busy, true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    await $.state.set(busy, false)
    const done = await next(e)
    await $.flow.suggest()

    return done
  })

  // The engine's own guess at the next prompt gives way to the flow's next step once there is one;
  // while a stage is under way the guess at a reply stands.
  on('prompt.suggest', async ($, e, next) => {
    const task = (await $.state.get(current)).value ?? null
    const text = task === null || e.origin.kind === 'plugin' ? undefined : ghostOf(task, statusOf(task, (await $.state.get(busy)).value ?? false))

    return next(text === undefined ? e : { ...e, text })
  })

  // The band: a framed panel with the task, its stages and the one thing to do now, then the
  // phrases saved with /flow bar; one line when the bottom slot is too short for the panel, and a
  // row that starts a task while none is open.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const task = (await $.state.get(current)).value ?? null
    const saved = rowOf(task, parsePhrases(await $.store.get(BAR_KEY)))
    const below = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const keyed = (key: string, label: string) => keyLabel(e.surface, key, label)
    const docks = docksAt(e.viewport)
    // A fill goes into the prompt box ahead of what the person typed, a slash phrase runs its command,
    // anything else is sent. The engine refuses a submit from inside a press, so both wait a tick.
    const press = async (phrase: Phrase) => {
      if (phrase.mode === 'fill') {
        const draft = await $.prompt.read()
        await $.prompt.fill({ text: `${phrase.text} ${draft.text}`, mode: 'replace' })

        return
      }
      const slash = slashOf(phrase.text)
      if (slash === undefined) {
        $.clock.after(0, () => void $.prompt.submit({ text: phrase.text }))

        return
      }
      $.clock.after(0, () => {
        void (async () => {
          // Skills are namespaced by their plugin: match the typed name, then the bare one.
          const known = await $.command.list().catch(() => [])
          const found = known.find(one => one.name === slash.command) ?? known.find(one => skillName(one.name) === slash.command)
          await $.command.run({ command: found?.name ?? slash.command, args: slash.args })
        })().catch(() => $.ui.toast(`/${slash.command} did not run`))
      })
    }
    const first = bandKeys(task) + 1
    const savedRow =
      saved.length === 0 ? null : (
        <Box flexWrap="wrap" columnGap={2}>
          {saved.map((phrase, at) => (
            <Button
              key={`bar-${first + at}`}
              label={labelOf(phrase)}
              hotkey={String(first + at)}
              plain
              onPress={() => press(phrase)}
            />
          ))}
        </Box>
      )

    if (task === null) {
      return (
        <Box flexDirection="column">
          <Box columnGap={2}>
            <Text dimColor>flow</Text>
            <Button
              key="new"
              label="New task"
              onPress={async () => {
                await $.state.set(draft, blankDraft())
                await $.ui.open(DIALOG_OPEN)
              }}
            />
            <Button key="board" label="Tasks" onPress={() => $.flow.show({ docks })} />
          </Box>
          {below}
          {savedRow}
        </Box>
      )
    }

    const status = statusOf(task, (await $.state.get(busy)).value ?? false)
    const percent = (await $.session.usage()).context.percent ?? 0
    const step = nextAction(task)
    const segments = segmentsFor(task, status)
    // One Text per strip, so a narrow band cuts the line at its end instead of wrapping inside a stage.
    const chipText = (chips: Chip[]) => (
      <Text wrap="truncate-end">
        {chips.map(chip => (
          <Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor}>
            {chip.text}
          </Text>
        ))}
      </Text>
    )
    // The frame and its padding take four columns; the title, a gap and the link share the first row.
    const inner = e.props.bodyColumns - 4
    const room = inner - [...task.title].length - 3 - LINK.length - 2
    const isFocused = stripWidth(segments) > room
    // Freeform has no stages to draw: what ran stands in for the strip.
    const runs = `Freeform · ${task.history.length} skill run${task.history.length === 1 ? '' : 's'}`
    const isShared = segments.length === 0 ? runs.length <= room : stripWidth(segments, isFocused) <= room
    const stripRow =
      segments.length === 0 ? (
        <Text dimColor>{runs}</Text>
      ) : (
        chipText(fittedChips(segments, inner))
      )
    const link = <Button key="board" label={LINK} plain dimColor onPress={() => $.flow.show({ docks })} />

    const nudge =
      percent >= clearAt && (status === 'ready' || status === 'waiting') ? (
        <Box>
          <Text color={THEME.wait}>{`context ${Math.round(percent)}%: `}</Text>
          <Button key="clear" label="/clear" plain onPress={() => press({ text: '/clear', mode: 'send' })} />
          <Text color={THEME.wait}> first; the task survives it</Text>
        </Box>
      ) : null
    // Rounds, a failing check's tries, reworks and Jev's mode: shown only while there is one to show.
    const counts = tally(task, jev)
    const tallied = counts.length === 0 ? null : <Text dimColor>{counts.join(' · ')}</Text>
    const label = <Text {...statusLook[status]}>{`${STATUS_GLYPH[status]} ${STATUS_LABEL[status]}`}</Text>
    // The one thing to do now. Only Ready and a waiting gate take the 1 key: while a stage is under
    // way a digit typed into the empty prompt is the start of a reply, so nothing there takes one.
    const actions = (() => {
      switch (status) {
        case 'ready':
          return [
            <Box>
              <Button key="next" label={keyed('1', actionLabel(task))} hotkey="1" variant="primary" onPress={() => $.flow.run()} />
              <Text dimColor>{` ${commandName(task)}`}</Text>
            </Box>,
            step.alt === undefined ? null : (
              <Button key="alt" label={step.alt.label} onPress={() => $.flow.run({ alt: true })} />
            ),
          ]
        case 'waiting':
          // Read first: the tab it opens is where approving happens.
          return [
            <Button
              key="read"
              label={keyed('1', readLabel(task))}
              hotkey="1"
              variant="primary"
              onPress={async () => {
                const made = gateArtifact(task)
                if (made !== undefined) {
                  await $.state.set(shownDoc, made.pointer)
                  await $.ui.open({ id: DOC, title: baseName(made.pointer), focus: true })
                }
              }}
            />,
            <Text dimColor>then approve it there</Text>,
          ]
        case 'proof':
          // What is missing, and the ask that gets it; no digit, since a reply may start with one.
          return [
            <Text dimColor>{holdNote(task, status)}</Text>,
            <Button key="prove" label="Prove it" onPress={() => press({ text: PROVE, mode: 'send' })} />,
          ]
        case 'stuck':
          return [<Text dimColor>{`${holdNote(task, status)}: your call, reply in the prompt`}</Text>]
        case 'progress':
          // Moving on means another stage; a gate still writing its artifact has none to offer yet.
          return step.stage === undefined || step.stage === task.phase
            ? [<Text dimColor>reply in the prompt</Text>]
            : [
                <Text dimColor>reply in the prompt, or move on</Text>,
                <Button key="next" label={actionLabel(task)} onPress={() => $.flow.run()} />,
              ]
        default:
          return []
      }
    })()

    const rows = 2 + 1 + (isShared ? 0 : 1) + 1 + (savedRow === null ? 0 : 1)
    if (e.props.maxRows < rows) {
      return (
        <Box flexDirection="column">
          <Box flexWrap="wrap" columnGap={1}>
            <Text bold wrap="truncate-end">{task.title}</Text>
            {segments.length > 0 && chipText(fittedChips(segments, inner))}
            {label}
            {actions}
          </Box>
          {below}
          {savedRow}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="column" borderStyle="round" {...STATUS_BORDER[status]} paddingX={1}>
          <Box justifyContent="space-between" columnGap={2}>
            <Box flexShrink={1}>
              <Text bold wrap="truncate-end">{task.title}</Text>
              {isShared && <Text>{'   '}</Text>}
              {isShared &&
                (segments.length === 0 ? (
                  <Text dimColor>{runs}</Text>
                ) : (
                  chipText(isFocused ? focusedChips(segments) : (stripChips(segments, inner)[0] ?? []))
                ))}
            </Box>
            {link}
          </Box>
          {!isShared && stripRow}
          <Box flexWrap="wrap" columnGap={2}>
            {label}
            {actions}
            {tallied}
            {nudge}
          </Box>
        </Box>
        {below}
        {savedRow}
      </Box>
    )
  })

  registerPane(on, jev)
}
