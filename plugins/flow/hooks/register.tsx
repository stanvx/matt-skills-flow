import type { Register } from 'claude-code'

import type { FlowTask, JevMode } from '../types'
import {
  allowPhase,
  approvePhase,
  GATED,
  PLANNING,
  createdUrl,
  editGate,
  gateArtifact,
  inside,
  isFlow,
  isStage,
  isTracked,
  skillName,
  nextAction,
  parseNew,
  recordEvent,
  scratchPointer,
  statusOf,
} from './flow'
import { STAGE_DONE_TOOL, registerAutonomy } from './autonomy'
import { registerDialog } from './dialog'
import { registerDoc } from './doc'
import { FLOWS, FLOW_NAMES, STATUS_LABEL } from './flows'
import { JEV_MODEL, JEV_URL, LOG_KEY, logSummary, parseLog } from './jev'
import { registerJudge } from './judge'
import { registerNoun } from './noun'
import { registerQuickbar } from './quickbar'
import { BUILD, isCode, leaveHold, needsEditStamp, seenIn, shipHold } from './proof'
import { checkIn, reminder, unsettledPr, withoutBodies } from './trail'
import { segmentsFor, stripLine } from './strip'
import { RAIL, commandLine, registerUi } from './ui'

const USAGE = [
  `Usage: /flow new [--workflow ${FLOW_NAMES.join('|')}] [--start ticket|idea|broken|foggy] [--model <model>] [--effort <effort>] [--no-pr] [--worktree] [--ui] <what are we doing>`,
  "/flow and /flow board open the board: every task, the open one's stages and what to do next. /flow switch <slug>, /flow use <workflow> changes the workflow",
  '/flow new with no text opens the new-task dialog; /flow doc [pointer] opens the artifact tab; /flow bar edits the quickbar',
  '/flow approve [path or link], /flow allow (lifts a planning edit hold, or waives the proof a build needs), /flow done',
  '/flow share <board artifact link> sends every task to a claude.ai board; /flow share off stops',
  '/flow jev shows what Jev judged lately',
].join('\n')

const BOARD_LINK = /^https:\/\/claude\.ai\/(code\/)?artifact\/[\w-]+$/

/** Origins a person stands behind: typed, or sent from their phone; the flow mod's own buttons are pressed by one. `sdk` is a host's own turn. */
const PERSON = ['composer', 'bridge']

/** The task in a few lines: what the person reads in the transcript and the model reads as context. */
const describe = (task: FlowTask) => {
  const status = statusOf(task, false)

  return [
    `${task.title} (${FLOWS[task.flow].label}, ${STATUS_LABEL[status].toLowerCase()}) .scratch/${task.slug}/task.json`,
    ...(task.flow === 'freeform' ? [] : [stripLine(segmentsFor(task, status))]),
    ...(task.model === undefined && task.effort === undefined ? [] : [`Runs on: ${[task.model, task.effort].filter(Boolean).join(' at ')}`]),
    ...(task.artifacts.length === 0 ? [] : [`Artifacts: ${task.artifacts.map(one => one.pointer).join(', ')}`]),
    `Next: ${commandLine(task)} (${nextAction(task).why})`,
  ].join('\n')
}

export const register: Register = (on, options) => {
  const isAutoAdvance = options.autoAdvance === true
  const clearAt = typeof options.clearAt === 'number' ? options.clearAt : 50

  const text = (value: unknown, fallback: string) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback)
  // What else counts as a check here, beside the runners trail.ts knows: `make verify, scripts/ci.sh`.
  const checks = text(options.checks, '')
    .split(',')
    .map(one => one.trim())
    .filter(one => one !== '')
  const jevMode: JevMode = options.jevMode === 'shadow' || options.jevMode === 'on' ? options.jevMode : 'off'

  registerNoun(on, { mode: jevMode, apiKey: text(options.jevApiKey, ''), baseUrl: text(options.jevBaseUrl, JEV_URL), model: text(options.jevModel, JEV_MODEL) })
  registerJudge(on, jevMode)
  registerUi(on, clearAt)
  registerDialog(on)
  registerDoc(on)
  registerQuickbar(on)
  registerAutonomy(on, { isAutoAdvance, clearAt })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'flow',
      description: 'Track a task through the idea-to-ship flow',
      argumentHint: '[new [<what are we doing>] | board | switch <slug> | use <workflow> | doc [pointer] | bar | share <link> | jev | approve | allow | done]',
    })
    await $.tool.register(STAGE_DONE_TOOL)
    const pr = unsettledPr(await $.flow.resume())
    if (pr !== undefined) {
      await $.flow.watch({ url: pr })
    }
    const open = await $.flow.task()
    // With no task open the board is the way in. Opened unasked, it seats only where it docks beside the transcript.
    if (open === null) {
      await $.ui.open({ id: RAIL, title: 'flow' }).catch(() => undefined)
    }
    await $.flow.suggest()

    return next(e)
  })

  // A tracked skill moves or records the task, and its prompt carries the
  // task, the phase, the artifacts so far and what that skill can use.
  on('skill.prompt', async ($, e, next) => {
    // Unproven work does not move on: /pr, or any other stage, waits in the build stage, and the model is told what is missing.
    const before = await $.flow.task()
    const name = skillName(e.skill)
    const isLeaving = before !== null && name !== before.phase && (name === 'pr' || isStage(name, before))
    const held = before !== null && isLeaving ? leaveHold(before) : undefined
    if (held !== undefined) {
      return next({ ...e, text: held })
    }
    if (before !== null && BUILD.includes(before.phase) && seenIn({ skill: skillName(e.skill) }) !== undefined) {
      await $.flow.note({ kind: 'seen', detail: 'verify' })
    }
    const task = await $.flow.enter({ skill: e.skill })
    if (task === null || !isTracked(e.skill, task)) {
      return next(e)
    }
    const git = await $.process
      .run(['git', 'branch', '--show-current'], { cwd: await $.session.root() })
      .catch(() => undefined)

    return next({ ...e, text: `${e.text}\n\n${reminder(task, e.skill, git?.stdout.trim() ?? '')}` })
  })

  // Planning phases hold code edits until /implement; /flow allow lifts it.
  on('tool.call', { tool: ['Write', 'Edit', 'NotebookEdit'] }, async ($, e, next) => {
    const task = await $.flow.task()
    const path = e.tool === 'NotebookEdit' ? e.notebook_path : e.file_path
    // Typed per tool when the build's tool inputs are declared, unknown otherwise.
    const rel = task === null || typeof path !== 'string' ? undefined : inside(await $.session.root(), path)
    const deny = task === null ? undefined : editGate(task, rel)
    if (deny !== undefined) {
      await $.flow.note({ kind: 'held', detail: rel })

      return { deny }
    }
    const ran = await next(e)
    const isWritten = ran.deny === undefined && ran.isError === undefined
    const pointer = scratchPointer(rel)
    if (pointer !== undefined && isWritten) {
      await $.flow.produce({ pointer })
    }
    const seen = isWritten && task !== null && BUILD.includes(task.phase) ? seenIn({ pointer: rel }) : undefined
    if (seen !== undefined) {
      await $.flow.note({ kind: 'seen', detail: seen })
    }
    // A build stage's code edit needs a check after it: the first of a run of edits is stamped.
    // Read again: a check that ran beside this edit may have landed since the task was read.
    const now = isWritten && isCode(rel) ? await $.flow.task() : null
    if (now !== null && needsEditStamp(now)) {
      await $.flow.note({ kind: 'edit', detail: rel })
    }

    return ran
  })

  // Checks become PR evidence and a build's proof; a created issue or PR becomes
  // an artifact, and a PR's CI is watched until it settles. A push or a PR waits
  // while the build is unproven.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const command = typeof e.command === 'string' ? e.command : ''
    const open = await $.flow.task()
    const deny = open === null ? undefined : shipHold(open, withoutBodies(command))
    if (deny !== undefined) {
      return { deny }
    }
    const ran = await next(e)
    if (ran.deny !== undefined) {
      return ran
    }
    const check = checkIn(command, checks)
    // A failure is a failure; a success whose exit status was a pipe's or a later command's proves nothing.
    if (check !== undefined && (ran.isError === true || !check.isMasked)) {
      await $.flow.note({ kind: 'check', detail: check.command, ok: ran.isError !== true })
    }
    // A screenshot or output saved as the task's proof file counts as the change seen working.
    const seen = open !== null && BUILD.includes(open.phase) && ran.isError !== true ? seenIn({ command: withoutBodies(command) }) : undefined
    if (seen !== undefined) {
      await $.flow.note({ kind: 'seen', detail: seen })
    }
    const url = createdUrl(command, ran.text)
    if (url !== undefined) {
      await $.flow.produce({ pointer: url })
      if (url.includes('/pull/')) {
        await $.flow.watch({ url })
      }
    }

    return ran
  })

  on('command.run', { command: 'flow' }, async ($, e) => {
    const [, verb = '', rest = ''] = /^(\S*)\s*([\s\S]*)$/.exec(e.args.trim()) ?? []
    const open = await $.flow.task()

    // The board: the tasks, the open one's stages and what to do next.
    const docks = e.presentation.isFullscreen && e.presentation.columns >= 110
    if (verb === '') {
      await $.flow.show({ docks })

      return { text: open === null ? `No open task. /flow new <what are we doing> starts one.` : describe(open) }
    }

    if (verb === 'board') {
      await $.flow.show({ docks })
      const tasks = await $.flow.all()

      return {
        text:
          tasks.length === 0
            ? 'No tasks under .scratch/ yet.'
            : tasks
                .map(one => `${STATUS_LABEL[statusOf(one, false)]}  ${one.title}  (${one.slug})`)
                .join('\n'),
      }
    }

    if (verb === 'jev') {
      return { text: `Jev is ${jevMode}.\n${logSummary(parseLog(await $.store.get(LOG_KEY)))}` }
    }

    if (verb === 'share') {
      const link = rest.trim()
      if (link === '') {
        const url = await $.flow.board()

        return { text: url === null ? `No board yet.\n${USAGE}` : `Tasks go to ${url}` }
      }
      if (link === 'off') {
        await $.flow.share({ url: null })

        return { text: 'Stopped sending tasks to the board. What it shows stays until you delete the artifact.' }
      }
      if (!BOARD_LINK.test(link)) {
        return { text: 'That is not a claude.ai artifact link (https://claude.ai/.../artifact/...).' }
      }
      await $.flow.share({ url: link })
      const sent = await $.flow.sync({ tasks: await $.flow.all() })

      return { text: `Sent ${sent} task${sent === 1 ? '' : 's'} to ${link}. Each change follows a few seconds later.` }
    }

    const left = (task: FlowTask) => (open !== null && open.slug !== task.slug ? ` (${open.title} stays on disk)` : '')

    if (verb === 'new') {
      const { text, options, bad } = parseNew(rest)
      if (text === '' || bad !== undefined) {
        return { text: bad === undefined ? USAGE : `${bad} is not a value it takes.\n${USAGE}` }
      }
      const { task, isNew } = await $.flow.create({ text, ...options })
      if (docks) {
        await $.ui.open({ id: RAIL, title: 'flow' })
      }

      return { text: `${isNew ? 'Opened' : 'Resumed'}${left(task)}.\n${describe(task)}` }
    }

    if (verb === 'switch') {
      const existing = rest.trim() === '' ? null : await $.flow.load({ slug: rest.trim() })
      if (existing === null) {
        return { text: `No task at .scratch/${rest.trim()}/task.json. /flow board lists them.` }
      }
      const { closedAt: _, ...reopened } = existing
      await $.flow.save(reopened)
      await $.flow.suggest()

      return { text: `Switched to ${reopened.title}${left(reopened)}. Next: ${commandLine(reopened)}` }
    }

    if (!['done', 'approve', 'allow', 'use'].includes(verb)) {
      return { text: USAGE }
    }
    if (open === null) {
      return { text: 'No open task.' }
    }

    if (verb === 'use') {
      const flow = rest.trim()
      if (!isFlow(flow)) {
        return { text: `Usage: /flow use ${FLOW_NAMES.join('|')}` }
      }
      const moved = recordEvent({ ...open, flow }, { kind: 'flow', detail: flow }, await $.clock.now())
      await $.flow.save(moved)

      return { text: `${open.title} now follows ${FLOWS[flow].label}.\n${describe(moved)}` }
    }

    // Gates wait for a person: a notification, a schedule, a peer or another plugin cannot pass one.
    const isPerson = PERSON.includes(e.origin.kind) || (e.origin.kind === 'plugin' && e.origin.name === 'flow')
    if ((verb === 'approve' || verb === 'allow') && !isPerson) {
      return { text: `/flow ${verb} waits for a person; it was sent from ${e.origin.kind}.` }
    }

    if (verb === 'done') {
      await $.flow.save({ ...open, closedAt: await $.clock.now() })

      return { text: `Closed: ${open.title}` }
    }

    if (verb === 'allow') {
      if (allowPhase(open, 0) === open) {
        return { text: `Nothing is held in ${open.phase}.` }
      }
      await $.flow.allow()

      return {
        text: PLANNING.includes(open.phase)
          ? `Code edits allowed for the rest of ${open.phase}.`
          : `Proof waived for the edits so far in ${open.phase}; the retro will see it.`,
      }
    }

    if (approvePhase(open, 0) === open) {
      return { text: `Nothing waits for approval in ${open.phase}.` }
    }
    // A person may name what they read: a spec written where the mod could not see it.
    const named = rest.trim() === '' ? open : ((await $.flow.produce({ pointer: rest.trim() })) ?? open)
    if (gateArtifact(named) === undefined) {
      return { text: `No ${GATED[open.phase]} recorded for ${open.phase}. /flow approve <path or link> names the one you read.` }
    }
    const moved = await $.flow.approve()
    const upNext = moved === null ? '' : ` Next: ${commandLine(moved)}`
    const percent = (await $.session.usage()).context.percent ?? 0
    // A gate is a phase boundary: the cheapest moment to /clear, so say so once, here.
    if (percent >= clearAt) {
      $.ui.toast(`Context ${Math.round(percent)}%: /clear, then${upNext.replace(' Next:', '')}. The task survives /clear.`)
    } else if (isAutoAdvance) {
      // After this command answers: a command.run hook cannot run another command.
      const expect = moved === null ? undefined : { slug: moved.slug, phase: moved.phase }
      $.clock.after(0, () => void $.flow.run({ expect }))
    } else {
      await $.flow.suggest()
    }

    return { text: `Approved ${open.phase}.${upNext}` }
  })
}
