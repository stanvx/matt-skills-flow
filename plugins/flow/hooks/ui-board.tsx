// The board pane: every task under .scratch/, open ones first; a digit
// switches to that task.
import type { On } from 'claude-code'

import { statusOf } from './flow'
import { FLOWS } from './flows'
import { BOARD, boardOrder, statusLook } from './status'

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
        {tasks.length === 0 && <Text dimColor>No tasks under .scratch/ yet. /flow new</Text>}
        {tasks.map((task, at) => {
          const isOpen = task.slug === open?.slug
          const status = statusOf(task, isOpen && isBusy)
          const isClosed = task.closedAt !== undefined

          return (
            <Box>
              <Text {...statusLook[status]}>{`${isOpen ? '>' : ' '} ● `}</Text>
              <Button
                key={`switch-${task.slug}`}
                label={task.title}
                hotkey={at < 9 ? String(at + 1) : undefined}
                plain
                dimColor={isClosed}
                onPress={() => $.command.run({ command: 'flow', args: `switch ${task.slug}` })}
              />
              <Text dimColor>{` ${FLOWS[task.flow].label} · ${isClosed ? 'closed' : task.phase}`}</Text>
              {status === 'waiting' && <Text color="yellow">{' waiting'}</Text>}
            </Box>
          )
        })}
      </Box>
    )
  })
}
