import type { Register } from 'claude-code'

import type { MattTask } from '../types'
import {
  allowPhase,
  approvePhase,
  createTask,
  createdUrl,
  editGate,
  inside,
  isTracked,
  nextAction,
  parseNew,
  scratchPointer,
} from './flow'
import { registerNoun } from './noun'
import { checkOf, reminder, unsettledPr } from './trail'
import { BOARD, RAIL, commandLine, registerUi } from './ui'

const USAGE = [
  'Usage: /matt new [--start ticket|idea|broken|foggy] <what are we doing>',
  '/matt shows the task, /matt board lists every task, /matt switch <slug>',
  '/matt approve, /matt allow, /matt done',
  '/matt share <board artifact link> sends every task to a claude.ai board; /matt share off stops',
].join('\n')

const BOARD_LINK = /^https:\/\/claude\.ai\/(code\/)?artifact\/[\w-]+$/

const describe = (task: MattTask) =>
  [
    `Task: ${task.title}`,
    `File: .scratch/${task.slug}/task.json`,
    `Phase: ${task.phase}`,
    ...task.artifacts.map(one => `Artifact: ${one.pointer} (${one.phase})`),
    `Next: ${commandLine(task)}  (${nextAction(task).why})`,
  ].join('\n')

export const register: Register = (on, options) => {
  const isAutoAdvance = options.autoAdvance === true
  const clearAt = typeof options.clearAt === 'number' ? options.clearAt : 50

  registerNoun(on)
  registerUi(on, clearAt)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'matt',
      description: 'Track a task through the idea-to-ship flow',
      argumentHint: '[new <what are we doing> | board | switch <slug> | share <link> | approve | allow | done]',
    })
    const pr = unsettledPr(await $.matt.resume())
    if (pr !== undefined) {
      await $.matt.watch({ url: pr })
    }

    return next(e)
  })

  // A tracked skill moves or records the task, and its prompt carries the
  // task, the phase, the artifacts so far and what that skill can use.
  on('skill.prompt', async ($, e, next) => {
    const task = await $.matt.enter({ skill: e.skill })
    if (task === null || !isTracked(e.skill, task)) {
      return next(e)
    }
    const git = await $.process
      .run(['git', 'branch', '--show-current'], { cwd: await $.session.root() })
      .catch(() => undefined)

    return next({ ...e, text: `${e.text}\n\n${reminder(task, e.skill, git?.stdout.trim() ?? '')}` })
  })

  // Planning phases hold code edits until /implement; /matt allow lifts it.
  on('tool.call', { tool: ['Write', 'Edit', 'NotebookEdit'] }, async ($, e, next) => {
    const task = await $.matt.task()
    const path = e.tool === 'NotebookEdit' ? e.notebook_path : e.file_path
    // Typed per tool when the build's tool inputs are declared, unknown otherwise.
    const rel = task === null || typeof path !== 'string' ? undefined : inside(await $.session.root(), path)
    const deny = task === null ? undefined : editGate(task, rel)
    if (deny !== undefined) {
      await $.matt.note({ kind: 'held', detail: rel })

      return { deny }
    }
    const ran = await next(e)
    const pointer = scratchPointer(rel)
    if (pointer !== undefined && ran.deny === undefined && ran.isError === undefined) {
      await $.matt.produce({ pointer })
    }

    return ran
  })

  // Checks become PR evidence; a created issue or PR becomes an artifact,
  // and a PR's CI is watched until it settles.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined) {
      return ran
    }
    const command = typeof e.command === 'string' ? e.command : ''
    const check = checkOf(command)
    if (check !== undefined) {
      await $.matt.note({ kind: 'check', detail: check, ok: ran.isError !== true })
    }
    const url = createdUrl(command, ran.text)
    if (url !== undefined) {
      await $.matt.produce({ pointer: url })
      if (url.includes('/pull/')) {
        await $.matt.watch({ url })
      }
    }

    return ran
  })

  on('command.run', { command: 'matt' }, async ($, e) => {
    const [, verb = '', rest = ''] = /^(\S*)\s*([\s\S]*)$/.exec(e.args.trim()) ?? []
    const open = await $.matt.task()

    if (verb === '') {
      await $.ui.open({ id: RAIL, title: 'matt' })

      return { text: open === null ? `No open task.\n${USAGE}` : describe(open) }
    }

    if (verb === 'board') {
      await $.ui.open({ id: BOARD, title: 'matt board' })
      const tasks = await $.matt.all()

      return {
        text:
          tasks.length === 0
            ? 'No tasks under .scratch/ yet.'
            : tasks.map(one => `${one.closedAt === undefined ? one.phase : 'closed'}  ${one.title}  (${one.slug})`).join('\n'),
      }
    }

    if (verb === 'share') {
      const link = rest.trim()
      if (link === '') {
        const url = await $.matt.board()

        return { text: url === null ? `No board yet.\n${USAGE}` : `Tasks go to ${url}` }
      }
      if (link === 'off') {
        await $.matt.share({ url: null })

        return { text: 'Stopped sending tasks to the board. What it shows stays until you delete the artifact.' }
      }
      if (!BOARD_LINK.test(link)) {
        return { text: 'That is not a claude.ai artifact link (https://claude.ai/.../artifact/...).' }
      }
      await $.matt.share({ url: link })
      const sent = await $.matt.sync({ tasks: await $.matt.all() })

      return { text: `Sent ${sent} task${sent === 1 ? '' : 's'} to ${link}. Each change follows a few seconds later.` }
    }

    if (verb === 'new' || verb === 'switch') {
      const { text, start, isBadStart } = parseNew(rest)
      if (text === '' || isBadStart) {
        return { text: USAGE }
      }
      const fresh = createTask(text, await $.clock.now(), start)
      const existing = await $.matt.load({ slug: verb === 'switch' ? text : fresh.slug })
      if (verb === 'switch' && existing === null) {
        return { text: `No task at .scratch/${text}/task.json. /matt board lists them.` }
      }
      const { closedAt: _, ...reopened } = existing ?? fresh
      await $.matt.save(reopened)
      await $.ui.open({ id: RAIL, title: 'matt' })
      const verbed = existing === null ? 'Opened' : 'Resumed'
      const left = open !== null && open.slug !== reopened.slug ? ` (${open.title} stays on disk)` : ''

      return { text: `${verbed}${left}.\n${describe(reopened)}` }
    }

    if (!['done', 'approve', 'allow'].includes(verb)) {
      return { text: USAGE }
    }
    if (open === null) {
      return { text: 'No open task.' }
    }

    if (verb === 'done') {
      await $.matt.save({ ...open, closedAt: await $.clock.now() })

      return { text: `Closed: ${open.title}` }
    }

    if (verb === 'allow') {
      if (allowPhase(open, 0) === open) {
        return { text: `Code edits are not held in ${open.phase}.` }
      }
      await $.matt.allow()

      return { text: `Code edits allowed for the rest of ${open.phase}.` }
    }

    if (approvePhase(open, 0) === open) {
      return { text: `Nothing waits for approval in ${open.phase}.` }
    }
    const moved = await $.matt.approve()
    const upNext = moved === null ? '' : ` Next: ${commandLine(moved)}`
    const percent = (await $.session.usage()).context.percent ?? 0
    // A gate is a phase boundary: the cheapest moment to /clear, so say so once, here.
    if (percent >= clearAt) {
      $.ui.toast(`Context ${Math.round(percent)}%: /clear, then${upNext.replace(' Next:', '')}. The task survives /clear.`)
    } else if (isAutoAdvance) {
      // After this command answers: a command.run hook cannot run another command.
      $.clock.after(0, () => void $.matt.run())
    }

    return { text: `Approved ${open.phase}.${upNext}` }
  })
}
