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

/** A task as the board artifact reads it: one document in its `tasks` collection. */
export type MattBoardTask = {
  repo: string
  slug: string
  title: string
  entry: MattEntry
  phase: string
  isOpen: boolean
  next: MattNext
  rail: {
    stage: string
    state: 'done' | 'now' | 'ahead'
    /** For the spec and tickets stages: whether a person approved them. */
    gate?: 'approved' | 'waiting' | 'ahead'
    artifacts: string[]
  }[]
  evidence: string[]
  ci?: { ok: boolean; url: string }
  journey: { at: number; kind: string; what: string; ok?: boolean }[]
  createdAt: number
  updatedAt: number
  closedAt?: number
}

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
  /** Sets the board artifact every task is sent to (a claude.ai artifact URL), or clears it with null. */
  share: (input: { url: string | null }) => Promise<void>
  /** The board artifact's URL, or null when none is set. */
  board: () => Promise<string | null>
  /** Sends these tasks (default: the open one) to the board now; resolves to how many went. */
  sync: (input?: { tasks?: MattTask[] }) => Promise<number>
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
