// The artifact tab: the files a task's stages wrote, read in a pane, with
// the approve and revise actions that belong to a gate.
import type { On, PromptFillArgs } from 'claude-code'

import type { MattArtifact, MattTask } from '../types'
import { GATED, isApproved, nextAction } from './flow'
import { shortPointer } from './trail'

// The validator lists state reads per file, so each file spells its reference.
const current = { plugin: 'matt', key: 'task' } as const
const shown = { plugin: 'matt', key: 'doc' } as const

export const DOC = 'matt-doc'

/** What one Markdown element takes. */
export const CAP = 10_000

/** The artifacts that are files under the repo, newest first. */
export const fileArtifacts = (task: MattTask) =>
  [...task.artifacts]
    .reverse()
    .filter((one, at, all) => !one.pointer.startsWith('http') && all.findIndex(other => other.pointer === one.pointer) === at)

// ponytail: https only, since a Link refuses the rest; a plain Text row if
// an http issue tracker ever matters.
/** The issue and PR links, newest first. */
export const linkArtifacts = (task: MattTask) => [...task.artifacts].reverse().filter(one => one.pointer.startsWith('https://'))

/** The artifact the tab shows: the one `doc` names, else the latest file. */
export const pick = (task: MattTask, doc: string | null) => {
  const files = fileArtifacts(task)

  return files.find(one => one.pointer === doc) ?? files[0]
}

/** The artifact `/matt doc <text>` means: its pointer, or a file name ending it. */
export const match = (task: MattTask, text: string) =>
  fileArtifacts(task).find(one => one.pointer === text || one.pointer.endsWith(`/${text}`))

export const baseName = (pointer: string) => pointer.split('/').at(-1) ?? pointer

/** Approve shows only at an unapproved gate, for the artifact that phase made. */
export const canApprove = (task: MattTask, artifact: MattArtifact) =>
  task.phase in GATED && !isApproved(task) && artifact.phase === task.phase

/** A file as Markdown takes it: tabs and newlines the only control characters, at most CAP long. */
export const clip = (raw: string) => {
  const text = raw.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
  const cut = text.slice(0, CAP)
  // A high surrogate cut off from its pair would be drawn as U+FFFD.
  const head = /[\ud800-\udbff]$/.test(cut) ? cut.slice(0, -1) : cut

  return { head, rest: text.length - head.length }
}

/** The prompt text Revise writes: replaces an empty draft, follows a typed one. */
export const reviseFill = (draft: string, pointer: string): PromptFillArgs =>
  draft.trim() === ''
    ? { text: `Revise ${pointer}: `, mode: 'replace' }
    : { text: `\nRevise ${pointer}: `, mode: 'append' }

export const EMPTY = 'No artifacts yet. Stages write them under .scratch/<slug>/ and gh issue/pr create links land here too.'

export const registerDoc = (on: On) => {
  // /matt doc [pointer]: opens the tab on an artifact, the latest by default.
  on('command.run', { command: 'matt' }, async ($, e, next) => {
    const [, verb = '', rest = ''] = /^(\S*)\s*([\s\S]*)$/.exec(e.args.trim()) ?? []
    if (verb !== 'doc') {
      return next(e)
    }
    const task = await $.matt.task()
    if (task === null) {
      return { text: 'No open task. /matt new <what are we doing>' }
    }
    const want = rest.trim()
    const artifact = want === '' ? pick(task, null) : match(task, want)
    if (artifact === undefined) {
      return { text: want === '' ? EMPTY : `No artifact matches ${want}. /matt doc lists the latest.` }
    }
    await $.state.set(shown, artifact.pointer)
    const { isPlaced } = await $.ui.open({ id: DOC, title: baseName(artifact.pointer) })

    return { text: `${isPlaced ? 'Opened' : 'Could not place'} ${baseName(artifact.pointer)} (${artifact.phase}).` }
  })

  on('ui.render', { component: 'Pane', requestId: DOC }, async ($, e) => {
    const { Box, Button, Link, Markdown, Text } = $.ui.resolve(e)
    // Mobile draws no Select: its files are a column of Buttons instead.
    const Select = e.surface === 'mobile' ? undefined : $.ui.resolve(e).Select
    const task = (await $.state.get(current)).value ?? null
    if (task === null) {
      return <Text dimColor>No open task. /matt new &lt;what are we doing&gt;</Text>
    }
    const files = fileArtifacts(task)
    const links = linkArtifacts(task)
    const artifact = pick(task, (await $.state.get(shown)).value ?? null)
    if (artifact === undefined) {
      return (
        <Box flexDirection="column">
          <Text dimColor>{EMPTY}</Text>
          {links.map(one => (
            <Link href={one.pointer} label={`${shortPointer(one.pointer)} (${one.phase})`} />
          ))}
        </Box>
      )
    }
    const root = await $.session.root()
    const path = `${root}/${artifact.pointer}`
    const read = await $.fs.read(path).then(
      text => ({ text }),
      (error: unknown) => ({ error: error instanceof Error ? error.message : String(error) }),
    )
    const body = 'text' in read ? clip(read.text) : undefined
    const open = async (pointer: string) => {
      await $.state.set(shown, pointer)
      await $.ui.open({ id: DOC, title: baseName(pointer) })
    }
    const label = (one: MattArtifact) => `${shortPointer(one.pointer)} (${one.phase})`

    return (
      <Box flexDirection="column">
        {Select === undefined ? (
          files.map(one => (
            <Button key={`file:${one.pointer}`} label={label(one)} plain dimColor={one !== artifact} onPress={() => open(one.pointer)} />
          ))
        ) : (
          <Select
            key="file"
            label="File"
            options={files.map(one => ({ value: one.pointer, label: label(one) }))}
            value={artifact.pointer}
            onSelect={value => open(value)}
          />
        )}
        <Box>
          {canApprove(task, artifact) && (
            <Button
              key="approve"
              label={`Approve ${GATED[task.phase]}`}
              hotkey="a"
              variant="primary"
              onPress={async () => {
                const moved = await $.matt.approve()
                $.ui.toast(moved === null ? 'Nothing to approve.' : `Approved ${task.phase}. Next: /${nextAction(moved).command}`)
              }}
            />
          )}
          <Button
            key="revise"
            label="Revise"
            hotkey="r"
            onPress={async () => {
              const filled = await $.prompt.fill(reviseFill((await $.prompt.read()).text, artifact.pointer))
              // No call hands the keys back; Esc does.
              $.ui.toast(filled.isFilled ? 'Finish the sentence in the prompt (Esc returns to it).' : `Type: Revise ${artifact.pointer}: `)
            }}
          />
          <Button
            key="copy"
            label="Copy path"
            hotkey="y"
            onPress={async press => {
              const { isCopied } = await $.ui.copy({ text: path, surface: press.surface })
              $.ui.toast(isCopied ? `Copied ${path}` : `Could not copy: ${path}`)
            }}
          />
          <Button key="close" label="Close" role="dismiss" onPress={() => $.ui.close({ id: DOC })} />
        </Box>
        <Text> </Text>
        {body === undefined ? (
          <Text dimColor>{`Could not read ${artifact.pointer}: ${'error' in read ? read.error : ''}`}</Text>
        ) : (
          <Box flexDirection="column">
            <Markdown key="text" text={body.head} />
            {body.rest > 0 && (
              <Text dimColor>{`${body.rest} more characters in ${path}`}</Text>
            )}
          </Box>
        )}
        {links.length > 0 && <Text> </Text>}
        {links.map(one => (
          <Link href={one.pointer} label={label(one)} />
        ))}
      </Box>
    )
  })
}
