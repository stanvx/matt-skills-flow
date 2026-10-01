// $.flow: every read and write of the task goes through this noun, so other
// plugins can read the task and hook `flow.enter` or `flow.save`.
import type { On, Timer } from 'claude-code'

import type { FlowCreate, FlowEvent, FlowTask, JevAnswers, JevQuestion } from '../types'
import {
  allowPhase,
  approvePhase,
  createTask,
  nextAction,
  recordArtifact,
  recordEvent,
  recordSkill,
  skillName,
  statusOf,
  withDefaults,
} from './flow'
import { boardDoc, boardId, boardVersion, repoName } from './board'
import { read, request } from './jev'
import type { JevConfig } from './jev'
import { needsEditStamp, proofGap } from './proof'
import { RAIL, ghostOf } from './status'
import { ciOutcome } from './trail'

const current = { plugin: 'flow', key: 'task' } as const
const busy = { plugin: 'flow', key: 'busy' } as const

const taskPath = (root: string, slug: string) => `${root}/.scratch/${slug}/task.json`
const pointerKey = (root: string) => `current:${root}`
const openOnly = (task: FlowTask | null) => (task?.closedAt === undefined ? task : null)

const BOARD_KEY = 'board'
// Changes within this window reach the board as one write.
const BOARD_SYNC_MS = 3_000

// Body rows the board asks for inline above the prompt.
const BOARD_ROWS = 24

const CI_POLL_MS = 60_000
// Right after `gh pr create` a PR has no checks yet: wait this many polls for some.
const CI_EMPTY_POLLS = 5

export const registerNoun = (on: On, jev: JevConfig) => {
  // Changes run one at a time: two hooks at once (a tool the model runs in parallel with another)
  // would each read the same task, and the later save would drop the earlier change. It lives
  // here, not in engine.create, which builds a fresh $ for each dispatch.
  // ponytail: one queue per plugin load, in this process; a lock file if two processes ever share a task.
  let queue: Promise<unknown> = Promise.resolve()

  on('engine.create', async (_, e, next) => {
    const built = await next(e)
    // ponytail: one CI watch at a time, the latest PR; a map by URL if tasks ever run PRs side by side.
    let watching: Timer | undefined
    // Tasks saved since the last board write, by slug.
    let unsent: Record<string, FlowTask> = {}
    let sending: Timer | undefined

    // Tasks live in the main working tree: inside a worktree `session.root()` moves, the repo's root does not.
    const home = async () => (await built.session.repo().catch(() => null))?.root ?? (await built.session.root())

    const task = async () => (await built.state.get(current)).value ?? null

    const load = async ({ slug }: { slug: string }) => {
      const root = await home()
      const text = await built.fs.read(taskPath(root, slug)).catch(() => undefined)

      return typeof text === 'string' ? withDefaults(JSON.parse(text) as FlowTask) : null
    }

    const save = async (saved: FlowTask) => {
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

    const sync = async ({ tasks }: { tasks?: FlowTask[] } = {}) => {
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
        built.ui.toast(`flow could not update the board: ${ran.deny ?? ran.text ?? 'no reason given'}`)

        return 0
      }

      return writes.length
    }

    const change = (move: (open: FlowTask, at: number) => FlowTask) => {
      const run = queue.then(async () => {
        // The file, not the state: a dispatch that began before the last save may still read the state it began with.
        const cached = await task()
        const open = cached === null ? null : ((await load({ slug: cached.slug })) ?? cached)
        if (open === null) {
          return null
        }
        const moved = move(open, await built.clock.now())
        if (moved !== open) {
          await save(moved)
        }

        return moved
      })
      queue = run.catch(() => undefined)

      return run
    }

    // A task that works in its own worktree runs each stage there: enter it (its existing one,
    // else a new one named after the slug) unless the session already left the main tree, and
    // link the main tree's .scratch in. False when it could not.
    const enterWorktree = async (open: FlowTask) => {
      const main = await home()
      if ((await built.session.root()) !== main) {
        return true
      }
      const listed = await built.process.run(['git', 'worktree', 'list', '--porcelain'], { cwd: main }).catch(() => undefined)
      const path = (listed?.stdout ?? '')
        .split('\n')
        .map(line => (line.startsWith('worktree ') ? line.slice('worktree '.length) : ''))
        .find(one => one !== main && one.split('/').at(-1) === open.slug)
      const entered = await built.tool.call(
        path === undefined ? { tool: 'EnterWorktree', name: open.slug } : { tool: 'EnterWorktree', path },
      )
      if (entered.deny !== undefined || entered.isError === true) {
        built.ui.toast(`flow could not enter the task's worktree: ${entered.deny ?? entered.text ?? 'no reason given'}`)

        return false
      }
      const root = await built.session.root()
      if (root !== main && !(await built.fs.exists(`${root}/.scratch`))) {
        await built.process.run(['ln', '-s', `${main}/.scratch`, `${root}/.scratch`])
      }

      return true
    }

    const note = (event: Omit<FlowEvent, 'phase' | 'at'>) => change((open, at) => recordEvent(open, event, at))

    const create = async ({ text, ticket, ...options }: FlowCreate) => {
      const at = await built.clock.now()
      const fresh = createTask(text, at, options)
      const existing = await load({ slug: fresh.slug })
      const { closedAt: _closedAt, ...resumed } = existing ?? fresh
      // A ticket (or a multi-line brief) is kept beside task.json while the phase is still `new`,
      // so nextAction hands it to the first stage.
      const body = (ticket ?? (text.includes('\n') ? text : '')).trim()
      const pointer = `.scratch/${fresh.slug}/ticket.md`
      if (existing === null && body !== '') {
        await built.fs.write(`${await home()}/${pointer}`, `${body}\n`)
      }
      const opened = existing === null && body !== '' ? recordArtifact(resumed, pointer, at) : resumed
      await save(opened)

      return { task: opened, isNew: existing === null }
    }

    // Fail-open by construction: off, no key, late, refused or unreadable all read as null.
    const judge = async <Questions extends Record<string, JevQuestion>>({
      state,
      questions,
      timeoutMs = 2_000,
    }: {
      state: unknown
      questions: Questions
      timeoutMs?: number
    }): Promise<JevAnswers<Questions> | null> => {
      if (jev.mode === 'off') {
        return null
      }
      try {
        const apiKey = jev.apiKey !== '' ? jev.apiKey : ((await built.env.get('TYPESAFE_API_KEY')) ?? '')
        if (apiKey === '') {
          return null
        }
        const { url, init } = request({ ...jev, apiKey }, state, questions)
        // fetch has no timeout of its own, so it races the clock.
        const answered = await Promise.race([built.http.fetch(url, init), built.clock.sleep(timeoutMs).then(() => undefined)])

        return answered?.ok === true ? (read(answered.text, questions) ?? null) : null
      } catch {
        return null
      }
    }

    return {
      ...built,
      flow: {
        task,
        create,
        judge,
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

          return tasks.filter((one): one is FlowTask => one !== null).sort((a, b) => b.createdAt - a.createdAt)
        },
        next: async () => {
          const open = await task()

          return open === null ? null : nextAction(open)
        },
        suggest: async () => {
          const open = await task()
          const text = open === null ? undefined : ghostOf(open, statusOf(open, (await built.state.get(busy)).value ?? false))
          if (text !== undefined) {
            await built.prompt.suggest({ text }).catch(() => undefined)
          }
        },
        // Docked beside the transcript the board stays open when Esc hands the keys back; inline
        // above the prompt it behaves as a dialog, which Esc closes.
        show: async ({ docks }: { docks: boolean }) => {
          await built.ui.open(
            docks
              ? { id: RAIL, title: 'flow', focus: true }
              : { id: RAIL, title: 'flow', focus: true, closeOnEscape: true, holdToasts: true, rows: BOARD_ROWS },
          )
        },
        run: async (input?: { alt?: boolean; expect?: { slug: string; phase: string } }) => {
          const open = await task()
          const isMoved = input?.expect !== undefined && (open?.slug !== input.expect.slug || open.phase !== input.expect.phase)
          if (open === null || isMoved) {
            return
          }
          const recommended = nextAction(open)
          const step = input?.alt === true && recommended.alt !== undefined ? recommended.alt : recommended
          // A build leaves its stage on proof: the next stage waits for a passing check, or a person's /flow allow.
          const gap = proofGap(open)
          if (gap !== undefined) {
            built.ui.toast(`Not proven yet: ${gap}. Run the checks, or /flow allow to move on anyway.`)

            return
          }
          // The mod's own verbs run here: a plugin's own $.command.run never reaches its own command hook.
          if (step.command === 'flow') {
            if (step.args === 'done') {
              await save({ ...open, closedAt: await built.clock.now() })
              built.ui.toast(`Closed: ${open.title}`)
            } else if (step.args === 'approve') {
              await change(approvePhase)
            }

            return
          }
          if (open.worktree === 'now' && !(await enterWorktree(open))) {
            return
          }
          const found = (await built.command.list()).find(one => skillName(one.name) === step.command)
          if (found === undefined) {
            built.ui.toast(`/${step.command} is not installed`)

            return
          }
          await built.command.run({ command: found.name, args: step.args })
        },
        enter: ({ skill }: { skill: string }) => change((open, at) => recordSkill(open, skill, at)),
        produce: ({ pointer }: { pointer: string }) => change((open, at) => recordArtifact(open, pointer, at)),
        // Decided on the file, inside the queue: a check that ran beside the edit has landed by then.
        edited: ({ path }: { path: string }) =>
          change((open, at) => (needsEditStamp(open) ? recordEvent(open, { kind: 'edit', detail: path }, at) : open)),
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
