// The new-task dialog's draft as pure functions: what typing, picking and
// creating do to it. dialog.tsx draws it and writes it to state.
import type { FlowCreate, FlowDraft, FlowEffort, FlowWorkflow } from '../types'
import { GATED, inferEntry, slugify, stagesOf } from './flow'
import { EFFORTS, FLOWS, FLOW_NAMES, FLOW_OF, stageLabel } from './flows'
import { BUILD } from './proof'
import { GATE, PROOF } from './strip'
import type { Segment } from './strip'

export const blankDraft = (): FlowDraft => ({
  text: '',
  title: '',
  flow: 'grill',
  isFlowPicked: false,
  openPr: true,
  worktree: 'never',
  model: '',
  effort: '',
  ui: false,
})

/** The name a task gets from its text: the first line, as createTask cuts it. */
export const titleOf = (text: string) => (text.split('\n')[0] ?? '').trim().slice(0, 72)

/** The draft after the text changed: the name and the guessed flow follow it unless the person set them. */
export const typed = (draft: FlowDraft, text: string): FlowDraft => ({
  ...draft,
  text,
  // A name that still equals the old first line was never edited by hand.
  title: draft.title === titleOf(draft.text) ? titleOf(text) : draft.title,
  flow: draft.isFlowPicked ? draft.flow : FLOW_OF[inferEntry(text)],
})

export const picked = (draft: FlowDraft, flow: FlowWorkflow): FlowDraft => ({ ...draft, flow, isFlowPicked: true })

/** The draft with a classifier's guess, unless the person picked a flow in the meantime. */
export const guessed = (draft: FlowDraft, flow: FlowWorkflow): FlowDraft => (draft.isFlowPicked ? draft : { ...draft, flow })

/** The effort a Select value names; anything else keeps the session's. */
export const effortOf = (value: string): FlowEffort | '' => EFFORTS.find(one => one === value) ?? ''

/** The folder the task will live in, from the name it will get. */
export const slugPath = (draft: FlowDraft) => `.scratch/${slugify(draft.title.trim() || titleOf(draft.text))}/`

/** The flow a classifier label names; labels read `<flow>: <blurb>`. */
export const flowLabels = FLOW_NAMES.map(name => `${name}: ${FLOWS[name].blurb}`)
export const flowOfLabel = (label: string | undefined) => FLOW_NAMES.find(name => label?.startsWith(`${name}:`))

/** The stages the drafted workflow will run, all ahead, with the gates a person approves and the build's proof gate marked: what the dialog's strip draws. */
export const preview = (draft: FlowDraft): Segment[] =>
  stagesOf({ flow: draft.flow, entry: inferEntry(draft.text), openPr: draft.openPr }).map(stage => ({
    stage,
    label: stageLabel(stage),
    state: 'ahead' as const,
    ...(stage in GATED ? { gate: 'ahead' as const } : {}),
    ...(BUILD.includes(stage) ? { proof: 'ahead' as const } : {}),
  }))

/** What the preview's marks mean, for the marks it shows; undefined when it shows none. */
export const previewLegend = (stages: Segment[]) =>
  [
    stages.some(one => one.gate !== undefined) ? `${GATE} you approve` : undefined,
    stages.some(one => one.proof !== undefined) ? `${PROOF.ahead} finished once its checks pass` : undefined,
  ]
    .filter(Boolean)
    .join(' · ') || undefined

/** Why Create does nothing yet, or undefined when it can go ahead. */
export const blocker = (draft: FlowDraft) => (draft.text.trim() === '' ? 'Describe what to build first.' : undefined)

const ISSUE_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+\/?$/

/** What `gh issue view` takes for text that is only a GitHub issue reference, else undefined. */
export const githubRef = (text: string) => {
  const one = text.trim()

  return /^#\d+$/.test(one) ? one.slice(1) : ISSUE_URL.test(one) ? one : undefined
}

export type Issue = { title: string; url: string; body: string }

/** The issue `gh issue view --json title,body,url` printed, or why it could not be read. */
export const issueOf = (ran: { exitCode: number; stdout: string; stderr: string }): Issue | string => {
  if (ran.exitCode !== 0) {
    return ran.stderr.trim().split('\n')[0] || `gh exited ${ran.exitCode}`
  }
  try {
    const { title, url, body } = JSON.parse(ran.stdout) as Partial<Issue>

    return typeof title === 'string' && typeof url === 'string' ? { title, url, body: body ?? '' } : 'gh printed no issue'
  } catch {
    return 'gh printed no issue'
  }
}

/** What the dialog creates; an issue makes the task start at `ticket` and carry the issue as its ticket. */
export const createFrom = (draft: FlowDraft, issue?: Issue): FlowCreate => {
  // A name still equal to the text's first line, or empty, was never edited by hand.
  const isAuto = draft.title.trim() === '' || draft.title === titleOf(draft.text)
  const title = issue !== undefined && isAuto ? issue.title : draft.title.trim()

  return {
    text: draft.text.trim(),
    ...(title === '' ? {} : { title }),
    ...(issue === undefined ? {} : { start: 'ticket' as const, ticket: `# ${issue.title}\n\n${issue.url}\n\n${issue.body}`.trim() }),
    flow: draft.flow,
    openPr: draft.openPr,
    worktree: draft.worktree,
    ...(draft.model === '' ? {} : { model: draft.model }),
    ...(draft.effort === '' ? {} : { effort: draft.effort }),
    ...(draft.ui ? { ui: true } : {}),
  }
}
