// Mermaid diagrams in an artifact, drawn as text art for the artifact tab:
// each closed ```mermaid fence becomes a ```text fence of its art. Pure but
// for the render cache.
import { renderMermaidAscii } from './vendor/mermaid-ascii.js'

// A fence opened and closed at the same indent; the source keeps its lines.
const FENCE = /^([ \t]*)```mermaid[ \t]*\n([\s\S]*?)\n\1```[ \t]*$/gm

const MAX_SOURCE = 12_000

// paddingY 0 garbles branching graphs; 1 with no inner padding stays compact and whole.
const OPTIONS = { colorMode: 'none', paddingX: 2, paddingY: 1, boxBorderPadding: 0 } as const

// ponytail: module cache, lost on a reload, which only costs a re-render.
const cache = new Map<string, string | null>()

const render = (source: string): string | null => {
  const hit = cache.get(source)
  if (hit !== undefined) {
    return hit
  }
  const art = (() => {
    try {
      return renderMermaidAscii(source, OPTIONS)
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/^\n+|\n+$/g, '')
    } catch {
      return null
    }
  })()
  cache.set(source, art === '' ? null : art)

  return cache.get(source) ?? null
}

/** The widest line of `art`, in characters. */
export const widthOf = (art: string) => Math.max(0, ...art.split('\n').map(line => [...line].length))

/** A flowchart's source turned the other way (LR and TD), or undefined for any other diagram. */
export const flipped = (source: string) => {
  const found = /^(\s*(?:flowchart|graph)\s+)(LR|RL|TD|TB|BT)\b/.exec(source)
  if (found === null) {
    return undefined
  }
  const turned = found[2] === 'LR' || found[2] === 'RL' ? 'TD' : 'LR'

  return `${found[1]}${turned}${source.slice(found[0].length)}`
}

/**
 * The art for one diagram, turned where the other direction fits `columns`
 * better; `isWide` when neither fits. Undefined when it will not draw.
 */
export const drawDiagram = (source: string, columns: number): { art: string; isWide: boolean } | undefined => {
  if (source.length > MAX_SOURCE) {
    return undefined
  }
  const art = render(source)
  if (art === null) {
    return undefined
  }
  if (widthOf(art) <= columns) {
    return { art, isWide: false }
  }
  const other = flipped(source)
  const turned = other === undefined ? null : render(other)
  const best = turned !== null && widthOf(turned) < widthOf(art) ? turned : art

  return { art: best, isWide: widthOf(best) > columns }
}

/** Markdown with each mermaid fence drawn as text art; a diagram that will not draw keeps its fence. */
export const withDiagrams = (markdown: string, columns: number) =>
  markdown.replace(FENCE, (fence: string, indent: string, body: string) => {
    const source = body
      .split('\n')
      .map(line => (line.startsWith(indent) ? line.slice(indent.length) : line))
      .join('\n')
    const drawn = drawDiagram(source, columns)
    if (drawn === undefined) {
      return fence
    }
    const art = drawn.art
      .split('\n')
      .map(line => `${indent}${line}`)
      .join('\n')

    return [
      `${indent}\`\`\`text`,
      art,
      `${indent}\`\`\``,
      ...(drawn.isWide ? [`${indent}_Wider than the pane: widen it, or open the file._`] : []),
    ].join('\n')
  })
