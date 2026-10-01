// The board pane: every task to pick from, the open one's stages and what to
// do next; before the first task, the workflows to choose between. /flow and
// /flow board open it.
import type { On, RenderViewport } from 'claude-code'

import type { JevMode } from '../types'

import { railView } from './board'
import { DIALOG_OPEN } from './dialog'
import { DOC, baseName } from './doc'
import { blankDraft } from './draft'
import { GATED, editGate, gateArtifact, nextAction, skillName, stagesOf, statusOf } from './flow'
import { FLOWS, FLOW_NAMES, STATUS_LABEL, stageLabel } from './flows'
import { LOG_KEY, lastDecision, parseLog } from './jev'
import { extras, labelOf, reviews, slashOf } from './quickbar'
import { PROVE, seenWorking } from './proof'
import { RAIL, STATUS_GLYPH, actionLabel, artifactLabel, boardOrder, fit, gateText, holdNote, keyed as keyLabel, proofText, readLabel, skillsRun, statusLook, subline, tally } from './status'
import { GATE, GLYPH, PROOF, PROOF_LOOK, STAGE_LOOK, segmentsFor } from './strip'
import { evidence } from './trail'

// The validator lists state reads per file, so each file spells its reference.
const current = { plugin: 'flow', key: 'task' } as const
const busy = { plugin: 'flow', key: 'busy' } as const
const draft = { plugin: 'flow', key: 'draft' } as const
const shownDoc = { plugin: 'flow', key: 'doc' } as const

/** Whether a surface this size docks a pane beside the transcript: the terminal's fullscreen layout from 110 columns. */
export const docksAt = (viewport: RenderViewport | undefined) => viewport?.isFullscreen === true && viewport.columns >= 110

/** A workflow's stages as one line, gates marked. */
const stagesLine = (flow: keyof typeof FLOWS) =>
  stagesOf({ flow, entry: 'idea', openPr: true })
    .map(stage => `${stageLabel(stage)}${stage in GATED ? ` ${GATE}` : ''}`)
    .join(' → ')

export const registerPane = (on: On, jev: JevMode) => {
  on('ui.render', { component: 'Pane', requestId: RAIL }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const open = (await $.state.get(current)).value ?? null
    const isBusy = (await $.state.get(busy)).value ?? false
    const tasks = boardOrder(await $.flow.all())
    const keyed = (key: string, label: string) => keyLabel(e.surface, key, label)
    const width = e.props.bodyColumns
    const isInline = e.props.placement === 'inline'
    // Starting work hands the screen back: inline, the board closes before it runs.
    const act = async (run: () => Promise<unknown>) => {
      if (isInline) {
        await $.ui.close({ id: RAIL }).catch(() => undefined)
      }
      await run()
    }
    const newTask = (isFirst: boolean) => (
      <Button
        key="new"
        label={keyed('c', 'New task')}
        hotkey="c"
        {...(isFirst ? { variant: 'primary' as const, autoFocus: true as const } : {})}
        onPress={() =>
          act(async () => {
            await $.state.set(draft, blankDraft())
            await $.ui.open(DIALOG_OPEN)
          })
        }
      />
    )
    // An extra is sent as a prompt, or run as its command; a press cannot submit until a tick later.
    const send = (text: string) => {
      const slash = slashOf(text)
      $.clock.after(0, () => {
        void (async () => {
          if (slash === undefined) {
            await $.prompt.submit({ text })

            return
          }
          const found = (await $.command.list().catch(() => [])).find(one => skillName(one.name) === slash.command)
          await $.command.run({ command: found?.name ?? slash.command, args: slash.args })
        })().catch(() => $.ui.toast(`${text} did not run`))
      })
    }
    // Inline the board is a dialog, where the arrows walk its buttons; docked they scroll it.
    const footer = (
      <Box marginTop={1}>
        <Text dimColor>
          {!e.props.isFocused
            ? 'click, or ctrl+x tab, to use the board'
            : isInline
              ? 'tab ↑↓ move · enter selects · esc closes'
              : 'tab moves · enter selects · ↑↓ scroll · esc back'}
        </Text>
      </Box>
    )

    // Before the first task: the workflows a task can follow, and the button that starts one.
    if (tasks.length === 0) {
      return (
        <Box flexDirection="column">
          <Text bold>Start a task</Text>
          <Text dimColor>A task follows one workflow. Each stage is a slash command, and the band offers the next.</Text>
          <Box flexDirection="column" marginTop={1}>
            {FLOW_NAMES.map(name => (
              <Box>
                <Box width={10} flexShrink={0}>
                  <Text bold>{FLOWS[name].label}</Text>
                </Box>
                <Box flexDirection="column" flexShrink={1}>
                  <Text>{FLOWS[name].blurb}</Text>
                  {stagesLine(name) !== '' && <Text dimColor>{stagesLine(name)}</Text>}
                </Box>
              </Box>
            ))}
          </Box>
          <Text dimColor>{`${GATE} waits for your approval · ${PROOF.needed} a build is finished once its checks pass (${PROOF.proven} proven)`}</Text>
          <Box marginTop={1}>{newTask(true)}</Box>
          {footer}
        </Box>
      )
    }

    const list = (
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold>Tasks</Text>
          <Box columnGap={2}>
            <Button key="recall" label={keyed('r', 'Catch me up')} hotkey="r" plain onPress={() => act(async () => send(`/recall ${open?.title ?? ''}`.trim()))} />
            {newTask(false)}
          </Box>
        </Box>
        {tasks.map(task => {
          const isOpen = task.slug === open?.slug
          const status = statusOf(task, isOpen && isBusy)
          // The marker and glyph take four cells, the status its own plus a gap.
          const room = width - 4 - STATUS_LABEL[status].length - 2

          return (
            <Box justifyContent="space-between">
              <Box flexShrink={1}>
                <Text {...statusLook[status]}>{`${isOpen ? '›' : ' '} ${STATUS_GLYPH[status]} `}</Text>
                <Button
                  key={`switch-${task.slug}`}
                  label={fit(task.title, room)}
                  plain
                  dimColor={task.closedAt !== undefined}
                  onPress={async () => {
                    if (isOpen) {
                      return
                    }
                    // Opening a task reopens a closed one; its file stays where it is.
                    const fresh = await $.flow.load({ slug: task.slug })
                    if (fresh !== null) {
                      const { closedAt: _, ...reopened } = fresh
                      await $.flow.save(reopened)
                      await $.flow.suggest()
                    }
                  }}
                />
              </Box>
              <Text {...(status === 'waiting' || status === 'proof' || status === 'stuck' ? statusLook[status] : { dimColor: true })}>{` ${STATUS_LABEL[status]}`}</Text>
            </Box>
          )
        })}
      </Box>
    )

    if (open === null) {
      return (
        <Box flexDirection="column">
          {list}
          <Box marginTop={1}>
            <Text dimColor>No task is open: pick one above, or start a new one.</Text>
          </Box>
          {footer}
        </Box>
      )
    }

    const status = statusOf(open, isBusy)
    const step = nextAction(open)
    // The tab takes the keys, so the arrows scroll and a approves.
    const read = (pointer: string) =>
      act(async () => {
        await $.state.set(shownDoc, pointer)
        await $.ui.open({ id: DOC, title: baseName(pointer), focus: true })
      })
    const approve = async () => {
      const moved = await $.flow.approve()
      if (moved !== null) {
        await $.ui.close({ id: DOC }).catch(() => undefined)
        $.ui.toast(`Approved the ${GATED[open.phase] ?? 'stage'}. Next: ${actionLabel(moved)}`)
        await $.flow.suggest()
      }
    }
    const made = gateArtifact(open)
    // Moving on means another stage; a gate still writing its artifact has none to offer yet.
    const isMovable = status === 'progress' && step.stage !== undefined && step.stage !== open.phase
    const view = railView(open)
    const segments = segmentsFor(open, status)
    const latest = [...open.artifacts].reverse().find(one => !one.pointer.startsWith('http'))
    const sessions = open.history.filter(one => one.skill === 'wayfinder-clear').length
    const ci = open.log.filter(one => one.kind === 'ci').at(-1)
    const checks = evidence(open)
    const hold = holdNote(open, status)
    // Jev's mode and its latest read of this task close the stages, after the counts.
    const decided = jev === 'off' ? undefined : lastDecision(parseLog(await $.store.get(LOG_KEY).catch(() => undefined)), open.slug)
    const counts = [...tally(open, 'off'), `Jev ${jev}${decided === undefined ? '' : `, last ${decided}`}`].join(' · ')

    const stages =
      segments.length === 0 ? (
        <Text dimColor>{`Skills run: ${skillsRun(open).join(', ') || 'none yet'}`}</Text>
      ) : (
        segments.map((one, at) => {
          const stop = view[at]
          const command = ` /${stop?.command ?? one.stage}`
          const words = gateText(one.gate)
          // Too narrow for the words: the gate keeps its glyph.
          const gate =
            words === undefined
              ? undefined
              : [...`${GLYPH[one.state]} ${one.label}  ${GATE} ${words}${command}`].length > width
                ? `  ${GATE}`
                : `  ${GATE} ${words}`

          return (
            <Box flexDirection="column">
              <Box justifyContent="space-between">
                <Box flexShrink={1}>
                  <Text {...STAGE_LOOK[one.state]}>{`${GLYPH[one.state]} ${one.label}`}</Text>
                  {gate !== undefined && (
                    <Text {...(one.gate === 'approved' ? { color: 'green' } : one.gate === 'waiting' ? { color: 'yellow' } : { dimColor: true })}>
                      {gate}
                    </Text>
                  )}
                  {one.proof !== undefined && <Text {...PROOF_LOOK[one.proof]}>{`  ${PROOF[one.proof]} ${proofText(one.proof)}`}</Text>}
                </Box>
                <Text dimColor>{command}</Text>
              </Box>
              {one.stage === 'wayfinder-clear' && sessions > 0 && (
                <Text dimColor>{`  └ ${sessions} ticket session${sessions === 1 ? '' : 's'} so far`}</Text>
              )}
              {one.proof !== undefined && one.state === 'now' && checks.map(line => <Text dimColor wrap="truncate-end">{`  └ ${line}`}</Text>)}
              {one.proof !== undefined && one.state === 'now' && seenWorking(open) !== undefined && (
                <Text dimColor wrap="truncate-start">{`  └ seen working: ${artifactLabel(open, seenWorking(open) ?? '')}`}</Text>
              )}
              {(stop?.artifacts ?? []).map(pointer => (
                <Text dimColor wrap="truncate-start">{`  └ ${artifactLabel(open, pointer)}`}</Text>
              ))}
              {ci !== undefined && ci.phase === one.stage && (
                <Text color={ci.ok === true ? 'green' : 'red'}>{`  └ CI ${ci.ok === true ? 'passed' : 'failed'}`}</Text>
              )}
            </Box>
          )
        })
      )

    // The one thing to do now leads and takes Enter; the rest follow.
    const actions = [
      status === 'ready' && (
        <Button
          key="next"
          label={keyed('n', actionLabel(open))}
          hotkey="n"
          variant="primary"
          autoFocus
          onPress={() => act(() => $.flow.run())}
        />
      ),
      status === 'waiting' && (
        <Button
          key="read"
          label={keyed('o', readLabel(open))}
          hotkey="o"
          variant="primary"
          autoFocus
          onPress={() => (made === undefined ? undefined : read(made.pointer))}
        />
      ),
      status === 'proof' && (
        <Button key="prove" label={keyed('v', 'Prove it')} hotkey="v" variant="primary" autoFocus onPress={() => act(async () => send(PROVE))} />
      ),
      status === 'waiting' && <Button key="approve" label={keyed('a', 'Approve')} hotkey="a" onPress={approve} />,
      isMovable && (
        <Button key="next" label={keyed('n', actionLabel(open))} hotkey="n" onPress={() => act(() => $.flow.run())} />
      ),
      step.alt !== undefined && status !== 'working' && (
        <Button key="alt" label={keyed('m', step.alt.label)} hotkey="m" onPress={() => act(() => $.flow.run({ alt: true }))} />
      ),
      status !== 'waiting' && latest !== undefined && (
        <Button
          key="doc"
          label={keyed('o', `Open ${baseName(latest.pointer)}`)}
          hotkey="o"
          onPress={() => read(latest.pointer)}
        />
      ),
      // Only a planning stage under way holds code edits that matter.
      status === 'progress' && editGate(open, 'src') !== undefined && (
        <Button key="allow" label={keyed('e', 'Allow edits')} hotkey="e" onPress={() => $.flow.allow()} />
      ),
    ].filter(Boolean)
    // The why of each step reads as a sentence here.
    const sentence = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
    const note =
      status === 'progress'
        ? isMovable
          ? 'Under way: reply in the conversation, or move on once it is done.'
          : sentence(step.why)
        : status === 'working'
          ? 'Claude is working on it.'
          : status === 'ready'
            ? sentence(step.why)
            : status === 'proof'
              ? `Not proven: ${hold}. Run the checks and show the change working; /flow allow waives it.`
              : status === 'stuck'
                ? `Needs you: ${hold}.`
                : undefined
    const also = status === 'progress' || status === 'proof' || status === 'stuck' ? extras(open) : status === 'ready' ? reviews(open) : []

    return (
      <Box flexDirection="column">
        {list}
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>Stages</Text>
            <Text dimColor wrap="truncate-end">{`  ${subline(open)}`}</Text>
          </Box>
          {stages}
          <Text dimColor wrap="truncate-end">{counts}</Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {actions.length > 0 && (
            <Box flexWrap="wrap" columnGap={1}>
              {actions}
            </Box>
          )}
          {note !== undefined && <Text dimColor>{note}</Text>}
          {also.length > 0 && (
            <Box flexWrap="wrap" columnGap={2}>
              <Text dimColor>also</Text>
              {also.map(phrase => (
                <Button
                  key={`also-${phrase.text}`}
                  label={labelOf(phrase)}
                  plain
                  dimColor
                  onPress={() => act(async () => send(phrase.text))}
                />
              ))}
            </Box>
          )}
        </Box>
        {footer}
      </Box>
    )
  })
}
