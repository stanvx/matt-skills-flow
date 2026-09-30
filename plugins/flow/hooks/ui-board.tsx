// The board pane: every task under .scratch/, open ones first. Pressing a row
// (Enter or a click) opens that task; digits stay with the band. With no tasks
// it walks a new person through the first one.
import type { On } from 'claude-code'

import { statusOf } from './flow'
import { FLOWS } from './flows'
import { BOARD, WALKTHROUGH, boardOrder, commandLine, statusLook } from './status'

const current = { plugin: 'flow', key: 'task' } as const
const busy = { plugin: 'flow', key: 'busy' } as const

export const registerBoard = (on: On) => {
  on('ui.render', { component: 'Pane', requestId: BOARD }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const open = (await $.state.get(current)).value ?? null
    const isBusy = (await $.state.get(busy)).value ?? false
    const tasks = boardOrder(await $.flow.all())

    return (
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold>Tasks</Text>
          <Button
            key="new"
            label="New task"
            hotkey="n"
            variant="primary"
            onPress={() => $.command.run({ command: 'flow', args: 'new' })}
          />
        </Box>
        {tasks.length === 0 && (
          <Box flexDirection="column">
            <Text dimColor>No tasks yet. Three steps to your first:</Text>
            {WALKTHROUGH.map((line, at) => (
              <Text>{`  ${at + 1}. ${line}`}</Text>
            ))}
          </Box>
        )}
        {tasks.map(task => {
          const isOpen = task.slug === open?.slug
          const status = statusOf(task, isOpen && isBusy)
          const isClosed = task.closedAt !== undefined

          return (
            <Box>
              <Text {...statusLook[status]}>{`${isOpen ? '>' : ' '} ● `}</Text>
              <Button
                key={`switch-${task.slug}`}
                label={task.title}
                plain
                dimColor={isClosed}
                onPress={() => $.command.run({ command: 'flow', args: `switch ${task.slug}` })}
              />
              <Text dimColor>{` ${FLOWS[task.flow].label} · ${isClosed ? 'closed' : task.phase}`}</Text>
              {status === 'waiting' && <Text color="yellow">{' waiting'}</Text>}
              {!isClosed && <Text dimColor>{` · next ${commandLine(task)}`}</Text>}
            </Box>
          )
        })}
      </Box>
    )
  })
}
