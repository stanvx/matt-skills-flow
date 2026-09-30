// $.matt: every read and write of the task goes through this noun, so other
// plugins can read the task and hook `matt.enter` or `matt.save`.
import type { On, Timer } from 'claude-code'

import type { MattCreate, MattEvent, MattTask } from '../types'
import {
  allowPhase,
  approvePhase,
  createTask,
  nextAction,
  recordArtifact,
  recordEvent,
  recordSkill,
  skillName,
  withDefaults,
} from './flow'
import { boardDoc, boardId, boardVersion, repoName } from './board'
import { ciOutcome } from './trail'

const current = { plugin: 'matt', key: 'task' } as const

const taskPath = (root: string, slug: string) => `${root}/.scratch/${slug}/task.json`
const pointerKey = (root: string) => `current:${root}`
const openOnly = (task: MattTask | null) => (task?.closedAt === undefined ? task : null)

const BOARD_KEY = 'board'
// Changes within this window reach the board as one write.
const BOARD_SYNC_MS = 3_000

const CI_POLL_MS = 60_000
// Right after `gh pr create` a PR has no checks yet: wait this many polls for some.
const CI_EMPTY_POLLS = 5

export const registerNoun = (on: On) => {
  on('engine.create', async (_, e, next) => {
    const built = await next(e)
    // ponytail: one CI watch at a time, the latest PR; a map by URL if tasks ever run PRs side by side.
    let watching: Timer | undefined
    // Tasks saved since the last board write, by slug.
    let unsent: Record<string, MattTask> = {}
    let sending: Timer | undefined

    // Tasks live in the main working tree: inside a worktree `session.root()` moves, the repo's root does not.
    const home = async () => (await built.session.repo().catch(() => null))?.root ?? (await built.session.root())

    const task = async () => (await built.state.get(current)).value ?? null

    const load = async ({ slug }: { slug: string }) => {
      const root = await home()
      const text = await built.fs.read(taskPath(root, slug)).catch(() => undefined)

      return typeof text === 'string' ? withDefaults(JSON.parse(text) as MattTask) : null
    }

    const save = async (saved: MattTask) => {
      const root = await home()
      await built.fs.write(taskPath(root, saved.slug), `${JSON.stringify(saved, null, 2)}\n`)
      if (saved.closedAt === undefined) {
        await built.store.set(pointerKey(root), saved.slug)
      } else {
        await built.store.delete(pointerKey(root))
      }
      await built.state.set(current, openOnly(saved))
      if ((await board()) !== null) {
        unsent = { ...unsent, [saved.slug]: saved }
        sending?.cancel()
        sending = built.clock.after(BOARD_SYNC_MS, () => {
          const tasks = Object.values(unsent)
          unsent = {}
          void sync({ tasks })
        })
      }
    }

    const board = async () => {
      const url = await built.store.get(BOARD_KEY)

      return typeof url === 'string' ? url : null
    }

    const sync = async ({ tasks }: { tasks?: MattTask[] } = {}) => {
      const url = await board()
      const open = await task()
      const sent = tasks ?? (open === null ? [] : [open])
      if (url === null || sent.length === 0) {
        return 0
      }
      const repo = repoName(await home())
      const at = await built.clock.now()
      // A write over an existing document must name the version it replaces.
      const versionOf = async (doc_id: string) => {
        const got = await built.tool.call({ tool: 'ArtifactData', action: 'get', url, collection: 'tasks', doc_id })

        return got.deny === undefined ? boardVersion(got.text ?? '') : undefined
      }
      const writes = await Promise.all(
        sent.slice(0, 50).map(async one => {
          const doc_id = boardId(repo, one.slug)
          const version = await versionOf(doc_id)

          return {
            op: 'set' as const,
            collection: 'tasks',
            doc_id,
            data: boardDoc(one, repo, at),
            ...(version === undefined ? {} : { if_version: version }),
          }
        }),
      )
      const ran = await built.tool.call({ tool: 'ArtifactData', action: 'batch', url, writes })
      if (ran.deny !== undefined || ran.isError === true) {
        built.ui.toast(`matt could not update the board: ${ran.deny ?? ran.text ?? 'no reason given'}`)

        return 0
      }

      return writes.length
    }

    const change = async (move: (open: MattTask, at: number) => MattTask) => {
      const open = await task()
      if (open === null) {
        return null
      }
      const moved = move(open, await built.clock.now())
      if (moved !== open) {
        await save(moved)
      }

      return moved
    }

    const note = (event: Omit<MattEvent, 'phase' | 'at'>) => change((open, at) => recordEvent(open, event, at))

    const create = async ({ text, ticket, ...options }: MattCreate) => {
      const at = await built.clock.now()
      const fresh = createTask(text, at, options)
      const existing = await load({ slug: fresh.slug })
      const { closedAt: _closedAt, ...resumed } = existing ?? fresh
      // A ticket (or a multi-line brief) is kept beside task.json while the phase is still `new`,
      // so nextAction hands it to the first stage.
      const body = (ticket ?? (text.includes('\n') ? text : '')).trim()
      const pointer = `.scratch/${fresh.slug}/ticket.md`
      if (existing === null && body !== '') {
        await built.fs.write(`${await built.session.root()}/${pointer}`, `${body}\n`)
      }
      const opened = existing === null && body !== '' ? recordArtifact(resumed, pointer, at) : resumed
      await save(opened)

      return { task: opened, isNew: existing === null }
    }

    return {
      ...built,
      matt: {
        task,
        create,
        load,
        save,
        note,
        board,
        sync,
        share: async ({ url }: { url: string | null }) => {
          if (url === null) {
            await built.store.delete(BOARD_KEY)
          } else {
            await built.store.set(BOARD_KEY, url)
          }
        },
        all: async () => {
          const root = await home()
          const dirs = await built.fs.list(`${root}/.scratch`).catch(() => [])
          const tasks = await Promise.all(dirs.filter(one => one.kind === 'dir').map(one => load({ slug: one.name })))

          return tasks.filter((one): one is MattTask => one !== null).sort((a, b) => b.createdAt - a.createdAt)
        },
        next: async () => {
          const open = await task()

          return open === null ? null : nextAction(open)
        },
        run: async () => {
          const open = await task()
          if (open === null) {
            return
          }
          const step = nextAction(open)
          const found = (await built.command.list()).find(one => skillName(one.name) === step.command)
          if (found === undefined) {
            built.ui.toast(`/${step.command} is not installed`)

            return
          }
          await built.command.run({ command: found.name, args: step.args })
        },
        enter: ({ skill }: { skill: string }) => change((open, at) => recordSkill(open, skill, at)),
        produce: ({ pointer }: { pointer: string }) => change((open, at) => recordArtifact(open, pointer, at)),
        approve: () => change(approvePhase),
        allow: () => change(allowPhase),
        watch: async ({ url }: { url: string }) => {
          watching?.cancel()
          let polls = 0
          const poll = async () => {
            polls += 1
            const ran = await built.process.run(['gh', 'pr', 'checks', url, '--json', 'bucket']).catch(() => undefined)
            const outcome = ran === undefined ? undefined : ciOutcome(ran.stdout)
            if (outcome === 'pending' || (outcome === undefined && polls < CI_EMPTY_POLLS)) {
              return
            }
            watching?.cancel()
            watching = undefined
            if (outcome !== undefined) {
              await note({ kind: 'ci', detail: url, ok: outcome === 'pass' })
              built.ui.toast(`CI ${outcome === 'pass' ? 'passed' : 'failed'}: ${url}`)
            }
          }
          watching = built.clock.every(CI_POLL_MS, () => void poll())
        },
        resume: async () => {
          const slug = await built.store.get(pointerKey(await home()))
          const open = openOnly(typeof slug === 'string' ? await load({ slug }) : null)
          await built.state.set(current, open)

          return open
        },
      },
    }
  })
}
