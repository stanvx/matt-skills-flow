// The one function hooks/mermaid.ts imports from the vendored bundle.
export interface AsciiRenderOptions {
  /** true = plain ASCII, false = Unicode box drawing. */
  useAscii?: boolean
  paddingX?: number
  paddingY?: number
  boxBorderPadding?: number
  colorMode?: 'none' | 'ansi16' | 'ansi256' | 'truecolor' | 'html' | 'auto'
}

/** Mermaid source to text art; throws on source it cannot parse. */
export function renderMermaidAscii(text: string, options?: AsciiRenderOptions): string
