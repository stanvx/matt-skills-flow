// A fake repo for tests that drive the mod through the engine: files in a
// map, a clock, and the engine calls the mod makes answered.
import type { On } from 'claude-code'
import { mock } from 'claude-code/testing'

/** `/flow <args>` as the person types it. */
export const flow = (args: string) =>
  ({ command: 'flow', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } }) as const

/**
 * A repo at /repo whose files live in a map, with the engine calls the mod makes answered.
 * `worktree` starts the session inside a linked worktree; an EnterWorktree call moves it into one, as the tool does.
 */
export const fakeRepo = (on: On, percent = 10, worktree?: string) => {
  mock.store(on)
  const clock = mock.clock(on, { now: 1000 })
  const files = new Map<string, string>()
  // ponytail: one mutable root, the session's cwd as EnterWorktree moves it.
  let root = worktree ?? '/repo'
  on('session.root', () => ({ value: root }))
  on('session.repo', () => ({ value: { root: '/repo', remote: null, internal: false, name: null } }))
  on('skill.prompt', (_, e) => ({ text: e.text }))
  on('fs.list', (_, e) => {
    const names = [...files.keys()].filter(key => key.startsWith(`${e.path}/`)).map(key => key.slice(e.path.length + 1).split('/')[0] ?? '')

    return { value: [...new Set(names)].map(name => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const calls: { tool: string; [argument: string]: unknown }[] = []
  on('tool.call', (_, e) => {
    calls.push(e)
    if (e.tool === 'EnterWorktree') {
      root = typeof e.path === 'string' ? e.path : `/repo/.claude/worktrees/${String(e.name)}`
    }

    return { result: 'ok', text: 'ok' }
  })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000, percent }, rateLimits: [] } }))
  const runs: (readonly string[])[] = []
  on('process.run', (_, e) => {
    runs.push(e.argv)

    return { value: { exitCode: 0, stdout: 'feature\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('fs.exists', (_, e) => ({ value: [...files.keys()].some(key => key === e.path || key.startsWith(`${e.path}/`)) }))
  on('fs.write', (_, e) => {
    files.set(e.path, e.text)

    return { value: undefined }
  })
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('fs.read', (_, e) => {
    const text = files.get(e.path)
    if (text === undefined) {
      throw new Error(`ENOENT ${e.path}`)
    }

    return { value: text }
  })

  return { files, clock, calls, toasts, runs }
}
