/** Where a task joins the flow: ask-matt's main flow or one of its on-ramps. */
export type MattEntry = 'ticket' | 'idea' | 'broken' | 'foggy'

/** One skill that ran while the task was open. */
export type MattStep = { skill: string; at: number }

/** What a phase produced: a repo-relative path under `.scratch/`, or an issue or PR URL. */
export type MattArtifact = { phase: string; pointer: string; at: number }

/**
 * One thing that happened to the task, for gates, evidence and the retro:
 * a person approved a phase or lifted its edit gate, the gate held an edit,
 * a check ran, or a PR's CI settled.
 */
export type MattEvent = {
  kind: 'approve' | 'allow' | 'held' | 'check' | 'ci'
  phase: string
  at: number
  /** The held path, the check's command, or the PR URL. */
  detail?: string
  /** For a check or CI: whether it passed. */
  ok?: boolean
}

export type MattTask = {
  slug: string
  title: string
  entry: MattEntry
  /** The last stage skill that ran, or `new` before the first. */
  phase: string
  history: MattStep[]
  /** Oldest first; a later artifact wins over an earlier one. */
  artifacts: MattArtifact[]
  /** Oldest first. */
  log: MattEvent[]
  createdAt: number
  closedAt?: number
}

/** The one recommended next command, without its slash. */
export type MattNext = { command: string; args?: string; why: string }

export type Matt = {
  /** The open task for this project, or null. */
  task: () => Promise<MattTask | null>
  /** Every task under `.scratch/`, open or closed, newest first. */
  all: () => Promise<MattTask[]>
  /** The recommended next command for the open task, or null. */
  next: () => Promise<MattNext | null>
  /** Runs the recommended next command, or toasts why it cannot. */
  run: () => Promise<void>
  /** Records that a skill ran; stage skills move the task's phase. */
  enter: (input: { skill: string }) => Promise<MattTask | null>
  /** Records an artifact for the current phase. */
  produce: (input: { pointer: string }) => Promise<MattTask | null>
  /** Records something that happened in the current phase. */
  note: (input: Omit<MattEvent, 'phase' | 'at'>) => Promise<MattTask | null>
  /** Approves the current gated phase's artifact. */
  approve: () => Promise<MattTask | null>
  /** Lifts the code-edit gate for the rest of the current planning phase. */
  allow: () => Promise<MattTask | null>
  /** Polls a PR's checks until they settle, then notes the outcome. */
  watch: (input: { url: string }) => Promise<void>
  /** Reads `.scratch/<slug>/task.json`, or null when there is none. */
  load: (input: { slug: string }) => Promise<MattTask | null>
  /** Writes the task and makes it this project's open task, or clears it once closed. */
  save: (task: MattTask) => Promise<void>
  /** Reopens this project's open task from disk at session start. */
  resume: () => Promise<MattTask | null>
}

declare module 'claude-code' {
  interface EngineInterface {
    matt: Matt
  }
  interface PluginState {
    matt: { task: MattTask | null }
  }
}
