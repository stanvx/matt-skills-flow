// The quickbar's phrases: the open task's phase-aware defaults, which the
// band draws on its action row, and the ones the person saved with /flow bar,
// drawn in a row under it and numbered after the band's keys. ui.tsx draws both.
import type { On } from 'claude-code'

import type { FlowTask } from '../types'
import { GATED, PLANNING, isWaiting, nextAction } from './flow'

/** One button: a slash command or prose to send, or text to put in the prompt box. */
export type Phrase = { text: string; label?: string; mode: 'send' | 'fill' }

export const BAR_KEY = 'bar'
const MAX_PHRASES = 9
const MAX_DEFAULTS = 4
const MAX_TEXT = 500
const MAX_LABEL = 24
const SHOWN = 28
const BUILD = ['implement', 'implement-spec', 'diagnosing-bugs']

const USAGE = 'Usage: /flow bar [add [--fill] [--label <label>] <text> | rm <n> | clear]'

const isPhrase = (value: unknown): value is Phrase =>
  typeof value === 'object' &&
  value !== null &&
  'text' in value &&
  typeof value.text === 'string' &&
  value.text !== '' &&
  'mode' in value &&
  (value.mode === 'send' || value.mode === 'fill') &&
  (!('label' in value) || value.label === undefined || typeof value.label === 'string')

/** The saved phrases as the store holds them; anything malformed is dropped. */
export const parsePhrases = (value: unknown): Phrase[] => (Array.isArray(value) ? value.filter(isPhrase).slice(0, MAX_PHRASES) : [])

/** Up to four buttons the open task's phase calls for, and `/clear` once the context is full. */
export const defaults = (task: FlowTask | null, percent: number, clearAt: number): Phrase[] => {
  if (task === null) {
    return []
  }
  const byPhase =
    isWaiting(task)
      ? ['/flow doc']
      : task.phase === 'wayfinder' || task.phase === 'wayfinder-clear'
        ? ['/clear']
        : PLANNING.includes(task.phase)
          ? ['continue']
          : BUILD.includes(task.phase)
            ? ['continue', '/code-review', 'run the checks']
            : []
  // The step a person may take instead of the next one: `Map is clear` while clearing a map.
  const alt = nextAction(task).alt
  const texts = [...new Set([...byPhase, ...(percent >= clearAt ? ['/clear'] : [])])]

  return [
    ...(alt === undefined ? [] : [{ text: `/${alt.command}`, label: alt.label, mode: 'send' as const }]),
    ...texts.map((text): Phrase => ({
      text,
      mode: 'send',
      // At a gate, say what the button opens.
      ...(text === '/flow doc' && GATED[task.phase] !== undefined ? { label: `Read the ${GATED[task.phase]}` } : {}),
    })),
  ].slice(0, MAX_DEFAULTS)
}

/** Digit keys the band takes: 1 for the next step unless a gate waits (approving takes a focused n), then one per default. */
export const bandKeys = (task: FlowTask | null, percent: number, clearAt: number) =>
  task === null ? 0 : (isWaiting(task) ? 0 : 1) + defaults(task, percent, clearAt).length

/** The row under the band: saved phrases the defaults do not repeat, in the keys the band leaves. */
export const rowOf = (task: FlowTask | null, saved: Phrase[], percent: number, clearAt: number): Phrase[] => {
  const base = defaults(task, percent, clearAt)

  return saved.filter(one => !base.some(known => known.text === one.text)).slice(0, MAX_PHRASES - bandKeys(task, percent, clearAt))
}

/** What a button says; a fill button ends in an ellipsis because the person finishes it. */
export const labelOf = (phrase: Phrase) => {
  const shown = phrase.label ?? phrase.text
  const cut = shown.length > SHOWN ? `${shown.slice(0, SHOWN - 1)}…` : shown

  return phrase.mode === 'fill' && !cut.endsWith('…') ? `${cut}…` : cut
}

/** `/code-review foo` as a command and its arguments; undefined for prose. */
export const slashOf = (text: string) => {
  const found = /^\/(\S+)\s*([\s\S]*)$/.exec(text)

  return found === null ? undefined : { command: found[1] ?? '', args: found[2] ?? '' }
}

/** `add`'s arguments: leading --fill and --label "<label>" flags, then the text. */
export const parseAdd = (input: string, mode: Phrase['mode'] = 'send', label?: string): Phrase | string => {
  const text = input.trim()
  const fill = /^--fill(?:\s+|$)/.exec(text)
  if (fill !== null) {
    return parseAdd(text.slice(fill[0].length), 'fill', label)
  }
  const named = /^--label\s+(?:"([^"]+)"|(\S+))(?:\s+|$)/.exec(text)
  if (named !== null) {
    return parseAdd(text.slice(named[0].length), mode, named[1] ?? named[2])
  }
  if (text.startsWith('--')) {
    const flag = text.split(/\s/)[0]

    return flag === '--label' ? '--label needs a label.' : `${flag} is not an option.`
  }
  if (text === '') {
    return 'Nothing to save.'
  }
  if (text.length > MAX_TEXT) {
    return `Keep a phrase under ${MAX_TEXT} characters.`
  }
  if (label !== undefined && label.length > MAX_LABEL) {
    return `Keep a label under ${MAX_LABEL} characters.`
  }

  return { text, mode, ...(label === undefined ? {} : { label }) }
}

/** `/flow bar <args>` on the saved phrases: the answer, and the phrases to keep when they change. */
export const barCommand = (saved: Phrase[], args: string): { text: string; phrases?: Phrase[] } => {
  const [, sub = '', arg = ''] = /^(\S*)\s*([\s\S]*)$/.exec(args.trim()) ?? []

  if (sub === '') {
    return {
      text:
        saved.length === 0
          ? `No saved phrases.\n${USAGE}`
          : saved
              .map((one, at) => `${at + 1}. ${one.text}${one.mode === 'fill' ? '  (fill)' : ''}${one.label === undefined ? '' : `  as "${one.label}"`}`)
              .join('\n'),
    }
  }

  if (sub === 'add') {
    const phrase = parseAdd(arg)
    if (typeof phrase === 'string') {
      return { text: `${phrase}\n${USAGE}` }
    }
    if (saved.length >= MAX_PHRASES) {
      return { text: `Already ${MAX_PHRASES} saved phrases. /flow bar rm <n> first.` }
    }
    if (saved.some(one => one.text === phrase.text)) {
      return { text: `Already saved: ${phrase.text}` }
    }

    return { text: `Saved ${saved.length + 1}: ${phrase.text}`, phrases: [...saved, phrase] }
  }

  if (sub === 'rm') {
    const at = /^\d+$/.test(arg.trim()) ? Number(arg.trim()) : 0
    const gone = saved[at - 1]
    if (gone === undefined) {
      return { text: `No phrase ${arg.trim() || '(none given)'}. /flow bar lists them.` }
    }

    return { text: `Removed ${at}: ${gone.text}`, phrases: saved.filter((_one, index) => index !== at - 1) }
  }

  if (sub === 'clear') {
    return { text: saved.length === 0 ? 'No saved phrases.' : `Removed ${saved.length} phrase${saved.length === 1 ? '' : 's'}.`, phrases: [] }
  }

  return { text: USAGE }
}

export const registerQuickbar = (on: On) => {
  on('command.run', { command: 'flow' }, async ($, e, next) => {
    const [, verb = '', rest = ''] = /^(\S*)\s*([\s\S]*)$/.exec(e.args.trim()) ?? []
    if (verb !== 'bar') {
      return next(e)
    }
    const answer = barCommand(parsePhrases(await $.store.get(BAR_KEY)), rest)
    if (answer.phrases !== undefined) {
      await $.store.set(BAR_KEY, answer.phrases)
      $.ui.invalidate('ui.render')
    }

    return { text: answer.text }
  })
}
