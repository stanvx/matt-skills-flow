// The busy flag and the band above the prompt; the task pane and the board
// pane draw in ui-pane.tsx and ui-board.tsx.
import type { On } from 'claude-code'

import { isWaiting, nextAction, skillName, statusOf } from './flow'
import { railView } from './board'
import { FLOWS, STATUS_LABEL, stageLabel } from './flows'
import { FLOW_COLOR, STATUS_BORDER, STATUS_GLYPH, badgeText, bandRows, commandLine, statusLook } from './status'
import { BAR_KEY, bandKeys, labelOf, parsePhrases, rowOf, shown, slashOf, type Phrase } from './quickbar'
import { compactChips, segmentsOf, stripChips } from './strip'
import { registerBoard } from './ui-board'
import { registerPane } from './ui-pane'

export { BOARD, RAIL, commandLine } from './status'

const current = { plugin: 'flow', key: 'task' } as const
const busy = { plugin: 'flow', key: 'busy' } as const

export const registerUi = (on: On, clearAt: number) => {
  // Busy follows the main loop's turns; a subagent's turn ends without a start.
  on('turn.start', async ($, e, next) => {
    await $.state.set(busy, true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await $.state.set(busy, false)
      // The next step as ghost text: Tab takes it, Enter runs it.
      const task = (await $.state.get(current)).value ?? null
      if (task !== null && task.closedAt === undefined) {
        await $.prompt.suggest({ text: commandLine(task) }).catch(() => undefined)
      }
    }

    return next(e)
  })

  // The engine's own guess at the next prompt gives way to the flow's next step while a task is open.
  on('prompt.suggest', async ($, e, next) => {
    const task = (await $.state.get(current)).value ?? null
    if (task === null || task.closedAt !== undefined || e.origin.kind === 'plugin') {
      return next(e)
    }

    return next({ ...e, text: commandLine(task) })
  })

  // The band: a framed panel (the workflow, the task and its status; the stages; the next step and
  // the phase's buttons), then the phrases saved with /flow bar; one line where the bottom slot has
  // too few rows for the panel, and only the saved phrases while no task is open.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const task = (await $.state.get(current)).value ?? null
    const percent = task === null ? 0 : ((await $.session.usage()).context.percent ?? 0)
    const saved = rowOf(task, parsePhrases(await $.store.get(BAR_KEY)), percent, clearAt)
    if (task === null && saved.length === 0) {
      return next(e)
    }
    const below = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const press = async (phrase: Phrase) => {
      if (phrase.mode === 'fill') {
        // Ahead of whatever the person already typed.
        const draft = await $.prompt.read()
        await $.prompt.fill({ text: `${phrase.text} ${draft.text}`, mode: 'replace' })

        return
      }
      // The engine refuses a submit from inside a press, so both wait a tick. A
      // prompt sent mid-turn queues and starts its own turn once the session is idle.
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
    // The phase's buttons draw as bordered chips so they read as actions without a hover; the
    // person's own phrases stay plain text.
    const phraseButtons = (phrases: Phrase[], first: number, plain = true) =>
      phrases.map((phrase, at) => (
        <Button
          key={`bar-${first + at}`}
          label={plain ? labelOf(phrase) : `${first + at} ${labelOf(phrase)}`}
          hotkey={String(first + at)}
          {...(plain ? { plain: true as const } : {})}
          onPress={() => press(phrase)}
        />
      ))
    const savedRow =
      saved.length === 0 ? null : (
        <Box flexWrap="wrap" columnGap={2}>
          {phraseButtons(saved, bandKeys(task, percent, clearAt) + 1)}
        </Box>
      )
    if (task === null) {
      return (
        <Box flexDirection="column">
          {below}
          {savedRow}
        </Box>
      )
    }
    const status = statusOf(task, (await $.state.get(busy)).value ?? false)
    const step = nextAction(task)
    const segments = segmentsOf(railView(task))
    // The frame and its padding take four columns.
    const rows = stripChips(segments, e.props.bodyColumns - 4)
    const why =
      percent >= clearAt ? (
        <Text color="yellow">{` context ${Math.round(percent)}%: /clear first, the task survives it`}</Text>
      ) : (
        <Text dimColor>{` ${step.why} · Tab fills it`}</Text>
      )
    // The next step is 1, pressed from an empty prompt, and drawn as a bordered chip. At a
    // waiting gate 1 reads the artifact instead, and approving takes n once the band has the focus.
    const gate = isWaiting(task)
    const primary = (
      <Button
        key="next"
        label={`${gate ? 'n' : '1'} ${commandLine(task)}`}
        hotkey={gate ? 'n' : '1'}
        variant="primary"
        onPress={() => $.flow.run()}
      />
    )
    const buttons = phraseButtons(shown(task, percent, clearAt), gate ? 1 : 2, false)

    if (e.props.maxRows < bandRows(rows.length)) {
      return (
        <Box flexDirection="column">
          <Box flexWrap="wrap">
            <Text dimColor>flow · </Text>
            <Text inverse>{` ${badgeText(FLOWS[task.flow].label, task)} `}</Text>
            <Text> </Text>
            {compactChips(segments).map(chip => (
              <Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor}>
                {chip.text}
              </Text>
            ))}
            <Text dimColor>{` ${task.phase === 'new' ? 'not started' : stageLabel(task.phase)} · `}</Text>
            <Text {...statusLook[status]}>{STATUS_LABEL[status]}</Text>
            <Text> </Text>
            {primary}
            {why}
            {buttons.length > 0 && (
              <Box columnGap={2} marginLeft={2}>
                {buttons}
              </Box>
            )}
          </Box>
          {below}
          {savedRow}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="column" borderStyle="round" {...STATUS_BORDER[status]} paddingX={1}>
          <Box justifyContent="space-between">
            <Box flexShrink={1}>
              <Text backgroundColor={FLOW_COLOR[task.flow]} color="black" bold>
                {` ${badgeText(FLOWS[task.flow].label, task).toUpperCase()} `}
              </Text>
              <Text bold wrap="truncate-end">{`  ${task.title}`}</Text>
            </Box>
            <Text {...statusLook[status]}>{`  ${STATUS_GLYPH[status]} ${STATUS_LABEL[status]}`}</Text>
          </Box>
          {rows.length === 0 ? (
            <Text dimColor>{`Freeform: ${task.history.length} skill runs so far`}</Text>
          ) : (
            rows.map(row => (
              <Box>
                {row.map(chip => (
                  <Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor}>
                    {chip.text}
                  </Text>
                ))}
              </Box>
            ))
          )}
          <Box flexWrap="wrap" justifyContent="space-between" columnGap={2}>
            <Box flexShrink={1}>
              {primary}
              {why}
            </Box>
            {buttons.length > 0 && <Box columnGap={2}>{buttons}</Box>}
          </Box>
        </Box>
        {below}
        {savedRow}
      </Box>
    )
  })

  registerPane(on)
  registerBoard(on)
}
