// The busy flag and the band above the prompt; the task pane and the board
// pane draw in ui-pane.tsx and ui-board.tsx.
import type { On } from 'claude-code'

import { nextAction, statusOf } from './flow'
import { railView } from './board'
import { FLOWS, STATUS_LABEL, stageLabel } from './flows'
import { FLOW_COLOR, STATUS_BORDER, STATUS_GLYPH, badgeText, bandRows, commandLine, statusLook } from './status'
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
    }

    return next(e)
  })

  // The band: a framed panel (the workflow, the task and its status; the stages; the next step)
  // with the quickbar under it; one line where the bottom slot has too few rows for the panel.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const task = (await $.state.get(current)).value ?? null
    if (task === null || e.props.hasSurvey) {
      return next(e)
    }
    const below = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const status = statusOf(task, (await $.state.get(busy)).value ?? false)
    const step = nextAction(task)
    const percent = (await $.session.usage()).context.percent ?? 0
    const segments = segmentsOf(railView(task))
    // The frame and its padding take four columns.
    const rows = stripChips(segments, e.props.bodyColumns - 4)
    const why =
      percent >= clearAt ? (
        <Text color="yellow">{` context ${Math.round(percent)}%: /clear first, the task survives it`}</Text>
      ) : (
        <Text dimColor>{` ${step.why}`}</Text>
      )
    const primary = (
      <Button key="next" label={commandLine(task)} hotkey="n" variant="primary" onPress={() => $.flow.run()} />
    )

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
          </Box>
          {below}
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
          <Box flexWrap="wrap">
            {primary}
            {why}
          </Box>
        </Box>
        {below}
      </Box>
    )
  })

  registerPane(on)
  registerBoard(on)
}
