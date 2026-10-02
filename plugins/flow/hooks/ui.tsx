// The busy flag, the adaptive view and the next step offered as ghost text in
// the empty prompt. While a stage works, the metro line sits under the prompt;
// at a decision the band above the prompt draws it with the choices forking
// off the stage. The board pane draws in ui-pane.tsx.
import type { Elements, On } from 'claude-code'

import type { JevMode } from '../types'

import { DOC, baseName } from './doc'
import { gateArtifact, skillName, statusOf } from './flow'
import { FLOWS, STATUS_LABEL } from './flows'
import { BAR_KEY, bandKeys, labelOf, parsePhrases, rowOf, slashOf } from './quickbar'
import type { Phrase } from './quickbar'
import { STATUS_GLYPH, ghostOf, holdNote, keyed as keyLabel, statusLook, tally, THEME } from './status'
import { segmentsFor } from './strip'
import type { Chip } from './strip'
import { docksAt, registerPane } from './ui-pane'
import { DECIDES, HERE, KIND_OF, RETRIES, SHORT, doing, cardWidth, centres, choices, forkAt, forkLines, metro, pillWidth } from './ux'
import type { Choice } from './ux'

export { RAIL, commandLine } from './status'

/** One Text per line of chips, so a narrow site cuts the line at its end instead of wrapping inside a stage. */
const chipLine = (Text: Elements['terminal']['Text'], chips: readonly Chip[]) => (
  <Text wrap="truncate-end">
    {chips.map(chip => (
      <Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor} backgroundColor={chip.backgroundColor}>
        {chip.text}
      </Text>
    ))}
  </Text>
)

const current = { plugin: 'flow', key: 'task' } as const
const busy = { plugin: 'flow', key: 'busy' } as const
const shownDoc = { plugin: 'flow', key: 'doc' } as const

// ponytail: the permission mode in module state, read at start and on each prompt; a shift+tab shows at the next prompt.
let mode: string | undefined

export const registerUi = (on: On, clearAt: number, jev: JevMode) => {
  // The engine draws its mode label left of the hint row: the line steps back over it to sit flush left.
  on('classic.SessionStart', async ($, e, next) => {
    mode = e.permission_mode ?? mode

    return next(e)
  })
  on('classic.UserPromptSubmit', async ($, e, next) => {
    mode = e.permission_mode ?? mode
    await $.ui.invalidate('ui.render')

    return next(e)
  })

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

  // Under the prompt: the metro line while a stage works, or the way in while no task is open.
  // At a decision the band carries the line, and the engine's own hint stands.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (e.props.isDraft) {
      return next(e)
    }
    const task = (await $.state.get(current)).value ?? null
    const status = task === null ? undefined : statusOf(task, (await $.state.get(busy)).value ?? false)
    if (status !== undefined && (DECIDES.includes(status) || status === 'done')) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const chipText = (chips: readonly Chip[]) => chipLine(Text, chips)
    const docks = docksAt(e.viewport)
    const pill = e.surface === 'terminal' ? pillWidth(mode) : null
    // What the row may take: the whole width once it steps back over the label, else what the label leaves.
    const columns = (e.viewport?.columns ?? 100) - 2 - (pill === null ? 30 : 0)
    // The engine's line keeps its row, the flow's sits under it, stepped back over the mode label
    // to the left edge. Label width unknown (no prompt sent yet): the row stays under the label.
    const flush = (row: ReturnType<typeof Box>) => (
      <Box flexDirection="column">
        <Text dimColor wrap="truncate-end">{e.props.hint}</Text>
        {pill === null || pill === 0 ? (
          row
        ) : (
          <Box position="relative" height={1}>
            <Box position="absolute" left={-pill} top={0} width={columns}>
              {row}
            </Box>
          </Box>
        )}
      </Box>
    )
    if (task === null || status === undefined) {
      return flush(
        <Box columnGap={2}>
          <Text dimColor>○ Decide ─── ○ Build ─── ○ PR ─── ○ Look back</Text>
          <Text>No task yet. Type <Text color={THEME.accent} bold>/flow new</Text> to start one.</Text>
        </Box>,
      )
    }
    const segments = segmentsFor(task, status)
    const label = doing(task, status)
    const line = segments.length === 0 ? [{ text: `Freeform · ${task.history.length} skill runs`, dimColor: true as const }] : metro(segments, status, columns - [...label].length - 'Open detail'.length - 3 * 2)
    const counts = tally(task, jev)

    // The line and the status keep the first row; the buttons wrap under them when the row runs out.
    return flush(
      <Box columnGap={3} flexWrap="wrap">
        {chipText(line)}
        <Text color={status === 'progress' ? THEME.wait : THEME.accent} bold>{label}</Text>
        {counts.length === 0 ? null : <Text dimColor>{counts.join(' · ')}</Text>}
        <Button key="board" label="Open detail" plain onPress={() => $.flow.show({ docks })} />
      </Box>,
    )
  })

  // Above the prompt: nothing but the saved phrases while a stage works; at a decision, the task,
  // why it waits, the metro line, and the choices forking off the stage, recommended first.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const task = (await $.state.get(current)).value ?? null
    const saved = rowOf(task, parsePhrases(await $.store.get(BAR_KEY)))
    const below = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const keyed = (key: string, label: string) => keyLabel(e.surface, key, label)
    const chipText = (chips: readonly Chip[]) => chipLine(Text, chips)
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
            <Button key={`bar-${first + at}`} label={labelOf(phrase)} hotkey={String(first + at)} plain onPress={() => press(phrase)} />
          ))}
        </Box>
      )
    const status = task === null ? undefined : statusOf(task, (await $.state.get(busy)).value ?? false)
    // While a stage works, and while no task is open, the line under the prompt says it all.
    if (task === null || status === undefined || !DECIDES.includes(status)) {
      return savedRow === null ? below : (
        <Box flexDirection="column">
          {below}
          {savedRow}
        </Box>
      )
    }

    const percent = (await $.session.usage()).context.percent ?? 0
    const options = choices(task, status)
    const act = async (choice: Choice) => {
      switch (choice.act) {
        case 'run':
          return $.flow.run()
        case 'alt':
          return $.flow.run({ alt: true })
        case 'read': {
          const made = gateArtifact(task)
          if (made !== undefined) {
            await $.state.set(shownDoc, made.pointer)
            await $.ui.open({ id: DOC, title: baseName(made.pointer), focus: true })
          }

          return undefined
        }
        case 'prove':
          return press({ text: choice.command ?? '', mode: 'send' })
        default:
          return press({ text: `/${choice.command ?? ''}`, mode: 'send' })
      }
    }
    const inner = e.props.bodyColumns - 2
    const segments = segmentsFor(task, status)
    const line = metro(segments, status, inner)
    const x = Math.min(forkAt(line), Math.max(0, inner - 50))
    const counts = tally(task, jev)
    // What holds the task, beside its status: the choices below are what to do about it.
    const hold = holdNote(task, status)
    const cramped = e.props.maxRows < options.length + 5
    // The cards: each stage a card, the current one bold in the status colour, and the choices as the
    // next cards, forking from it. Short of rows or columns, the line with a text fork stands in.
    const hotAt = Math.max(segments.findIndex(one => one.state === 'next'), segments.findIndex(one => one.state === 'now'))
    const hot = statusLook[status].color ?? THEME.accent
    // Ready with nothing marked next: every stage is done, the last one included.
    const here = status === 'ready' && !segments.some(one => one.state === 'next') ? HERE.done : HERE[status]
    // The frame takes four columns: its border and padding.
    const framed = inner - 4
    const cardW = cardWidth(segments.length, framed)
    const optGap = 1
    const optW = Math.min(30, Math.floor((framed - (options.length - 1) * optGap) / Math.max(1, options.length)))
    const isCards = segments.length > 0 && hotAt >= 0 && e.props.maxRows >= 18 && cardW >= 12 && optW >= 18
    const [stem, rail] = forkLines(centres(segments.length, cardW, 3)[hotAt] ?? 0, centres(options.length, optW, optGap))

    return (
      <Box flexDirection="column">
        <Box flexDirection="column" paddingX={1}>
          <Box flexWrap="wrap" columnGap={2}>
            <Text bold wrap="truncate-end">{task.title}</Text>
            <Text {...statusLook[status]}>{`${STATUS_GLYPH[status]} ${STATUS_LABEL[status]}`}</Text>
            {hold === undefined ? null : <Text {...statusLook[status]} bold={false}>{hold}</Text>}
            {counts.length === 0 ? null : <Text dimColor>{counts.join(' · ')}</Text>}
            {percent >= clearAt && (status === 'ready' || status === 'waiting') ? (
              <Box>
                <Text color={THEME.wait}>{`context ${Math.round(percent)}%: `}</Text>
                <Button key="clear" label="/clear" plain onPress={() => press({ text: '/clear', mode: 'send' })} />
                <Text color={THEME.wait}> first; the task survives it</Text>
              </Box>
            ) : null}
          </Box>
          {isCards ? (
            // One frame round the stages and the choices, labelled with the workflow, so the fork never crosses a border.
            <Box flexDirection="column" borderStyle="round" borderColor={THEME.quiet} borderDimColor paddingX={1}>
              <Text dimColor>{`${FLOWS[task.flow].label.toUpperCase()} WORKFLOW`}</Text>
              <Box alignItems="center">
                {segments.map((one, at) => {
                  const isHot = at === hotAt
                  const isDone = one.state === 'done'

                  return (
                    <Box key={`card-${one.stage}`} alignItems="center">
                      {at === 0 ? null : <Text dimColor>{' → '}</Text>}
                      <Box flexDirection="column" width={cardW} borderStyle={isHot ? 'bold' : 'round'} borderColor={isHot ? hot : isDone ? THEME.ok : THEME.quiet} borderDimColor={!isHot} paddingX={1}>
                        <Text bold={isHot} dimColor={!isHot} wrap="truncate-end">{SHORT[one.stage] ?? one.label}</Text>
                        <Text color={isHot ? hot : isDone ? THEME.ok : undefined} dimColor={!isHot} wrap="truncate-end">
                          {isHot ? here : isDone ? '✓ Done' : one.gate === undefined ? ' ' : '◆ Approve'}
                        </Text>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
              <Text color={hot}>{stem}</Text>
              <Text color={hot}>{rail}</Text>
              <Box columnGap={optGap}>
                {options.map((choice, at) => (
                  <Box key={`option-${choice.key}`} flexDirection="column" width={optW} borderStyle={at === 0 ? 'double' : 'round'} borderColor={at === 0 ? THEME.accent : THEME.quiet} paddingX={1}>
                    {at === 0 ? (
                      <Button key={choice.act === 'run' ? 'next' : choice.act} label={keyed(choice.key, choice.label)} hotkey={choice.key} variant="primary" onPress={() => act(choice)} />
                    ) : (
                      <Button key={choice.act} label={choice.label} hotkey={choice.key} plain onPress={() => act(choice)} />
                    )}
                    {options.length > 1 && at === 0 ? (
                      <Text color={THEME.accent} bold>Recommended</Text>
                    ) : at > 0 || RETRIES.includes(choice.act) ? (
                      <Text dimColor>{KIND_OF[choice.act]}</Text>
                    ) : null}
                    <Text dimColor wrap="wrap">{choice.why}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}
          {!isCards && !cramped && segments.length > 0 ? chipText(line) : null}
          {isCards ? null : options.map((choice, at) => (
            <Box key={`fork-${choice.key}`} columnGap={1}>
              {cramped || segments.length === 0 ? null : (
                <Box flexShrink={0}>
                  <Text color={at === 0 ? THEME.accent : undefined} dimColor={at !== 0}>{`${' '.repeat(x)}${at === options.length - 1 ? '┗' : '┣'}━▶`}</Text>
                </Box>
              )}
              <Box flexShrink={0}>
                {at === 0 ? (
                  <Button key={choice.act === 'run' ? 'next' : choice.act} label={keyed(choice.key, choice.label)} hotkey={choice.key} variant="primary" onPress={() => act(choice)} />
                ) : (
                  <Button key={choice.act} label={choice.label} hotkey={choice.key} plain onPress={() => act(choice)} />
                )}
              </Box>
              <Text dimColor wrap="truncate-end">{choice.why}</Text>
            </Box>
          ))}
          {options.length > 1 && !isCards ? <Text dimColor>{`Type ${options[0]?.key ?? '1'} for the recommended step.`}</Text> : null}
        </Box>
        {below}
        {savedRow}
      </Box>
    )
  })

  registerPane(on, jev)
}
