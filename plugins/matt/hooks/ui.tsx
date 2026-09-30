// The busy flag and the band above the prompt; the task pane and the board
// pane draw in ui-pane.tsx and ui-board.tsx.
import type { On } from 'claude-code'

import { nextAction, statusOf } from './flow'
import { FLOWS, STATUS_LABEL } from './flows'
import { badgeText, commandLine, statusLook } from './status'
import { registerBoard } from './ui-board'
import { registerPane } from './ui-pane'

export { BOARD, RAIL, commandLine } from './status'

const current = { plugin: 'matt', key: 'task' } as const
const busy = { plugin: 'matt', key: 'busy' } as const

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

    return (
      <Box flexDirection="column">
        {below}
        <Box flexWrap="wrap">
          <Text dimColor>matt · </Text>
          <Text inverse>{` ${badgeText(FLOWS[task.flow].label, task)} `}</Text>
          <Text dimColor>{` ${task.phase} · `}</Text>
          <Text {...statusLook[status]}>{STATUS_LABEL[status]}</Text>
          <Text> </Text>
          <Button
            key="next"
            label={commandLine(task)}
            hotkey="n"
            variant="primary"
            onPress={() => $.matt.run()}
          />
          {percent >= clearAt ? (
            <Text color="yellow"> context {Math.round(percent)}%: /clear first, the task survives it</Text>
          ) : (
            <Text dimColor> {step.why}</Text>
          )}
        </Box>
      </Box>
    )
  })

  registerPane(on)
  registerBoard(on)
}
