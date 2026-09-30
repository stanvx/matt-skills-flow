// The task pane: the workflow badge, the phases, the one next action and the
// recent activity; or directions to open a task when none is open.
import type { On } from 'claude-code'

import { railView } from './board'
import { editGate, nextAction, statusOf } from './flow'
import { FLOWS, FLOW_NAMES, STATUS_LABEL, commandOf, stageLabel } from './flows'
import { shortPointer, timeline } from './trail'
import {
  ACCENT,
  BOARD,
  RAIL,
  commandLine,
  fitsOneLine,
  gateText,
  glyph,
  keyHints,
  skillsRun,
  statusLook,
  subline,
} from './status'
import { COLUMN_PX, LEGEND, segmentsOf, stripAlt, stripChips, stripSvg } from './strip'

// The validator lists state reads per file, so each file spells its reference.
const current = { plugin: 'matt', key: 'task' } as const
const busy = { plugin: 'matt', key: 'busy' } as const

export const registerPane = (on: On) => {
  on('ui.render', { component: 'Pane', requestId: RAIL }, async ($, e) => {
    const task = (await $.state.get(current)).value ?? null
    const isBusy = (await $.state.get(busy)).value ?? false
    const { Box, Button, Text } = $.ui.resolve(e)

    if (task === null) {
      return (
        <Box flexDirection="column">
          <Text bold>No open task</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>1. /matt new opens the new-task dialog (or {'/matt new <what> [--flow ...]'})</Text>
            <Text>2. Pick a workflow: {FLOW_NAMES.map(flow => FLOWS[flow].label).join(', ')}</Text>
            <Text>3. Press n to run each stage; gates wait for /matt approve</Text>
          </Box>
          <Text dimColor>/matt board lists every task</Text>
          <Box marginTop={1}>
            <Button
              key="new"
              label="New task"
              hotkey="n"
              variant="primary"
              onPress={() => $.command.run({ command: 'matt', args: 'new' })}
            />
          </Box>
        </Box>
      )
    }
    const status = statusOf(task, isBusy)
    const step = nextAction(task)
    const line = commandLine(task)
    const stops = railView(task)
    const ci = task.log.filter(one => one.kind === 'ci').at(-1)
    const recent = timeline(task).slice(-5)
    const isOneLine = fitsOneLine(e.props.bodyColumns, line, step.why)
    const segments = segmentsOf(stops)
    const sessions = task.history.filter(one => one.skill === 'wayfinder-clear').length
    // The stages at a glance: colored chips on the terminal, a picture where the surface draws SVG.
    const strip = (() => {
      if (segments.length === 0) {
        return null
      }
      if (e.surface === 'terminal') {
        return (
          <Box flexDirection="column" marginTop={1}>
            {stripChips(segments, e.props.bodyColumns).map(row => (
              <Box>
                {row.map(chip => (
                  <Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor}>
                    {chip.text}
                  </Text>
                ))}
              </Box>
            ))}
          </Box>
        )
      }
      const { Svg } = $.ui.resolve(e)

      return (
        <Box marginTop={1}>
          <Svg source={stripSvg(segments, e.props.bodyColumns * COLUMN_PX)} alt={stripAlt(segments)} />
        </Box>
      )
    })()

    return (
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Box flexShrink={1}>
            <Text inverse bold>{` ${FLOWS[task.flow].label} `}</Text>
            <Text bold wrap="truncate-end">{` ${task.title}`}</Text>
          </Box>
          <Text {...statusLook[status]}>{` ${STATUS_LABEL[status]}`}</Text>
        </Box>
        <Text dimColor wrap="truncate-end">{subline(task)}</Text>
        {strip}

        <Box flexDirection="column" marginTop={1}>
          {task.flow === 'freeform' ? (
            <Box flexDirection="column">
              <Text bold>Skills run</Text>
              {skillsRun(task).length === 0 && <Text dimColor>none yet</Text>}
              {skillsRun(task).map(skill => (
                <Text dimColor>{`  ${skill}`}</Text>
              ))}
            </Box>
          ) : (
            stops.map((stop, at) => (
              <Box flexDirection="column">
                <Box>
                  <Text
                    bold={stop.state === 'now'}
                    color={stop.state === 'now' ? ACCENT : undefined}
                    dimColor={stop.state !== 'now'}
                  >{`${at + 1}. ${glyph[stop.state]} ${stageLabel(stop.stage)}`}</Text>
                  <Text dimColor>{`  /${commandOf(stop.stage)}`}</Text>
                  {gateText(stop.gate) !== undefined && (
                    <Text color={stop.gate === 'approved' ? 'green' : 'yellow'}>{`  ${gateText(stop.gate)}`}</Text>
                  )}
                </Box>
                {stop.stage === 'wayfinder-clear' && sessions > 0 && (
                  <Text dimColor>{`     ${sessions} ticket session${sessions === 1 ? '' : 's'} so far`}</Text>
                )}
                {stop.artifacts.map(pointer => (
                  <Text dimColor>{`     ${shortPointer(pointer)}`}</Text>
                ))}
              </Box>
            ))
          )}
          {task.flow !== 'freeform' && <Text dimColor>{LEGEND}</Text>}
          {ci !== undefined && <Text color={ci.ok ? 'green' : 'red'}>{`CI ${ci.ok ? 'passed' : 'failed'}`}</Text>}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Box flexDirection={isOneLine ? 'row' : 'column'}>
            <Button key="next" label={line} hotkey="n" variant="primary" onPress={() => $.matt.run()} />
            <Text dimColor>{isOneLine ? ` ${step.why}` : step.why}</Text>
          </Box>
          <Box flexWrap="wrap" gap={2}>
            {step.alt !== undefined && (
              <Button
                key="alt"
                label={`${step.alt.label}: /${step.alt.command}`}
                hotkey="m"
                onPress={() => $.matt.run({ alt: true })}
              />
            )}
            {task.artifacts.length > 0 && (
              <Button
                key="doc"
                label="Open artifact"
                hotkey="o"
                onPress={() => $.command.run({ command: 'matt', args: 'doc' })}
              />
            )}
            {editGate(task, 'src') !== undefined && (
              <Button key="allow" label="Allow edits" hotkey="e" onPress={() => $.matt.allow()} />
            )}
            <Button key="board" label="Board" hotkey="b" onPress={() => $.ui.open({ id: BOARD, title: 'matt board' })} />
          </Box>
        </Box>

        {recent.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Recent activity</Text>
            {recent.map(text => (
              <Text dimColor wrap="truncate-end">{text}</Text>
            ))}
          </Box>
        )}
        <Box marginTop={1}>
          <Text dimColor>{keyHints(task)}</Text>
        </Box>
      </Box>
    )
  })
}
