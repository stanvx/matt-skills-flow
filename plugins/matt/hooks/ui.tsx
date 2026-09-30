// The band above the prompt, the rail pane for the open task, and the board
// pane for every task in the repo.
import type { On } from 'claude-code'

import type { MattTask } from '../types'
import { PLANNING, editGate, nextAction, rail } from './flow'

// The validator lists state reads per file, so each file spells its reference.
const current = { plugin: 'matt', key: 'task' } as const

export const RAIL = 'matt'
export const BOARD = 'matt-board'

const MARK = { done: 'x', now: '>', ahead: '-' } as const

export const commandLine = (task: MattTask) => {
  const step = nextAction(task)

  return [`/${step.command}`, step.args].filter(Boolean).join(' ')
}

/** Board rows: open tasks first by phase order, then closed ones. */
const boardOrder = (tasks: MattTask[]) => {
  const rank = (task: MattTask) =>
    task.closedAt !== undefined ? 99 : task.phase === 'new' ? -1 : [...PLANNING, 'implement', 'implement-spec', 'retro'].indexOf(task.phase)

  return [...tasks].sort((a, b) => rank(a) - rank(b))
}

export const registerUi = (on: On, clearAt: number) => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const task = (await $.state.get(current)).value ?? null
    if (task === null || e.props.hasSurvey) {
      return next(e)
    }
    const below = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const step = nextAction(task)
    const last = task.history.at(-1)
    const doing = last !== undefined && last.skill !== task.phase ? ` (${last.skill})` : ''
    const percent = (await $.session.usage()).context.percent ?? 0

    return (
      <Box flexDirection="column">
        {below}
        <Box>
          <Text dimColor>
            matt · {task.title} · {task.phase}
            {doing} · next{' '}
          </Text>
          <Button key="next" label={commandLine(task)} hotkey="n" variant="primary" onPress={() => $.matt.run()} />
          {percent >= clearAt ? (
            <Text color="yellow"> context {Math.round(percent)}%: /clear first, the task survives it</Text>
          ) : (
            <Text dimColor> {step.why}</Text>
          )}
        </Box>
      </Box>
    )
  })

  // The rail: stages behind and ahead, each with what it produced, and the
  // one next action.
  on('ui.render', { component: 'Pane', requestId: RAIL }, async ($, e) => {
    const task = (await $.state.get(current)).value ?? null
    const { Box, Button, Text } = $.ui.resolve(e)
    if (task === null) {
      return <Text dimColor>No open task. /matt new &lt;what are we doing&gt;, or /matt board</Text>
    }
    const step = nextAction(task)
    const isHeld = editGate(task, 'src') !== undefined
    const ci = task.log.filter(one => one.kind === 'ci').at(-1)

    return (
      <Box flexDirection="column">
        <Text bold>{task.title}</Text>
        <Text dimColor>
          {task.entry} · .scratch/{task.slug}/task.json
        </Text>
        <Text> </Text>
        {rail(task).map(stop => (
          <Box flexDirection="column">
            <Text bold={stop.state === 'now'} dimColor={stop.state !== 'now'}>
              {MARK[stop.state]} {stop.stage}
            </Text>
            {task.artifacts
              .filter(one => one.phase === stop.stage)
              .map(one => (
                <Text dimColor>{`    ${one.pointer}`}</Text>
              ))}
          </Box>
        ))}
        {ci !== undefined && <Text color={ci.ok ? 'green' : 'red'}>CI {ci.ok ? 'passed' : 'failed'}</Text>}
        <Text> </Text>
        <Box>
          <Button key="next" label={commandLine(task)} hotkey="n" variant="primary" onPress={() => $.matt.run()} />
          <Text dimColor> {step.why}</Text>
        </Box>
        {isHeld && (
          <Box>
            <Button key="allow" label="Allow code edits" hotkey="a" onPress={() => $.matt.allow()} />
            <Text dimColor> code edits wait for /implement in {task.phase}</Text>
          </Box>
        )}
      </Box>
    )
  })

  // The board: every task under .scratch/ by phase; a digit switches to it.
  on('ui.render', { component: 'Pane', requestId: BOARD }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const open = (await $.state.get(current)).value ?? null
    const tasks = boardOrder(await $.matt.all())
    if (tasks.length === 0) {
      return <Text dimColor>No tasks under .scratch/ yet. /matt new &lt;what are we doing&gt;</Text>
    }

    return (
      <Box flexDirection="column">
        {tasks.map((task, at) => (
          <Box>
            <Button
              key={`switch-${task.slug}`}
              label={task.slug === open?.slug ? `> ${task.title}` : task.title}
              hotkey={at < 9 ? String(at + 1) : undefined}
              plain
              onPress={() => $.command.run({ command: 'matt', args: `switch ${task.slug}` })}
            />
            <Text dimColor> {task.closedAt === undefined ? task.phase : 'closed'}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
