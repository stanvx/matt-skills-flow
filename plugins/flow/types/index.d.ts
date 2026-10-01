/** Where a task joins the flow: ask-matt's main flow or one of its on-ramps. */
export type FlowEntry = 'ticket' | 'idea' | 'broken' | 'foggy'

/**
 * How a task proceeds, picked when it is created: a fixed chain of stages
 * (oneshot, grill, spec), or none (freeform).
 */
export type FlowWorkflow = 'oneshot' | 'grill' | 'spec' | 'wayfind' | 'freeform'

export type FlowEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/**
 * Where the task stands for a person: a turn runs, a stage is under way between turns,
 * a gate waits for approval, a build's code edits have no passing check yet, a loop needs a
 * person to break it, the next stage is ready, or the task is closed.
 */
export type FlowStatus = 'working' | 'progress' | 'waiting' | 'proof' | 'stuck' | 'ready' | 'done'

/** One skill that ran while the task was open. */
export type FlowStep = { skill: string; at: number }

/** What a phase produced: a repo-relative path under `.scratch/`, or an issue or PR URL. */
export type FlowArtifact = { phase: string; pointer: string; at: number }

/**
 * One thing that happened to the task, for gates, evidence and the retro:
 * a person approved a phase or lifted its edit gate, the gate held an edit,
 * a check ran, a PR's CI settled, the task grew into a bigger flow, the
 * model reported a stage finished or blocked, or a build stage's code was
 * edited (kept once per run of edits, so a later check can prove them).
 */
export type FlowEvent = {
  kind: 'approve' | 'allow' | 'held' | 'check' | 'ci' | 'flow' | 'done' | 'edit' | 'blocked'
  phase: string
  at: number
  /** The held or edited path, the check's command, the PR URL, the flow the task grew into, or what blocks the stage. */
  detail?: string
  /** For a check or CI: whether it passed. */
  ok?: boolean
}

export type FlowTask = {
  slug: string
  title: string
  entry: FlowEntry
  flow: FlowWorkflow
  /** Whether the flow ends in a pull request (the `pr` stage). */
  openPr: boolean
  /** `now`: the task works in its own git worktree. */
  worktree: 'now' | 'never'
  /** The model the task's turns run on; absent keeps the session's. */
  model?: string
  /** The effort the task's turns run at; absent keeps the session's. */
  effort?: FlowEffort
  /** The last stage skill that ran, or `new` before the first. */
  phase: string
  history: FlowStep[]
  /** Oldest first; a later artifact wins over an earlier one. */
  artifacts: FlowArtifact[]
  /** Oldest first. */
  log: FlowEvent[]
  createdAt: number
  closedAt?: number
}

/**
 * The one recommended next command, without its slash, the stage it runs when it runs one,
 * and the step a person may take instead.
 */
export type FlowNext = {
  command: string
  args?: string
  stage?: string
  why: string
  alt?: { command: string; args?: string; label: string }
}

/** What a new task is made from: `/flow new` or the new-task dialog. */
export type FlowCreate = {
  text: string
  /** The task's name; the first line of `text` when absent. */
  title?: string
  start?: FlowEntry
  flow?: FlowWorkflow
  openPr?: boolean
  worktree?: 'now' | 'never'
  model?: string
  effort?: FlowEffort
  /**
   * The ticket to keep at `.scratch/<slug>/ticket.md`, which the first stage reads.
   * Multi-line `text` is kept the same way when this is absent.
   */
  ticket?: string
}

/** The new-task dialog's fields while it is open. */
export type FlowDraft = {
  text: string
  title: string
  flow: FlowWorkflow
  /** Whether the person picked the flow, so a later guess never overrides it. */
  isFlowPicked: boolean
  openPr: boolean
  worktree: 'now' | 'never'
  /** Empty keeps the session's. */
  model: string
  effort: FlowEffort | ''
}

/** A task as the board artifact reads it: one document in its `tasks` collection. */
export type FlowBoardTask = {
  repo: string
  slug: string
  title: string
  entry: FlowEntry
  flow: FlowWorkflow
  /** Where the task stands; the board never knows a turn runs, so never `working`. */
  status: FlowStatus
  /** Whether the flow ends in a pull request. */
  openPr: boolean
  /** The model and effort the task's turns run at, when set. */
  model?: string
  effort?: FlowEffort
  phase: string
  isOpen: boolean
  next: FlowNext
  rail: {
    stage: string
    state: 'done' | 'now' | 'ahead'
    /** For the spec and tickets stages: whether a person approved them. */
    gate?: 'approved' | 'waiting' | 'ahead'
    /** For a build stage whose code was edited: whether every check since the last edit passes. */
    proof?: 'proven' | 'needed'
    /** The stage in words (`Write the spec`); older documents lack it. */
    label?: string
    /** The command that runs the stage, when it differs from the stage (`wayfinder` for `wayfinder-clear`). */
    command?: string
    artifacts: string[]
  }[]
  evidence: string[]
  ci?: { ok: boolean; url: string }
  journey: { at: number; kind: string; what: string; ok?: boolean }[]
  createdAt: number
  updatedAt: number
  closedAt?: number
}

export type Flow = {
  /** The open task for this project, or null. */
  task: () => Promise<FlowTask | null>
  /** Opens a new task, or resumes the one with the same slug, and makes it the open one. */
  create: (input: FlowCreate) => Promise<{ task: FlowTask; isNew: boolean }>
  /** Every task under `.scratch/`, open or closed, newest first. */
  all: () => Promise<FlowTask[]>
  /** The recommended next command for the open task, or null. */
  next: () => Promise<FlowNext | null>
  /** Offers the open task's next step as ghost text in the empty prompt, when it has one to offer now. */
  suggest: () => Promise<void>
  /** Opens the board pane with the keyboard: docked beside the transcript, or inline as a dialog Esc closes. */
  show: (input: { docks: boolean }) => Promise<void>
  /**
   * Runs the recommended next command (or, with `alt`, the step a person may
   * take instead), in the task's worktree when it has one; with `expect`, only
   * while that task is still open in that phase. Toasts why it cannot.
   */
  run: (input?: { alt?: boolean; expect?: { slug: string; phase: string } }) => Promise<void>
  /** Records that a skill ran; stage skills move the task's phase. */
  enter: (input: { skill: string }) => Promise<FlowTask | null>
  /** Records an artifact for the current phase. */
  produce: (input: { pointer: string }) => Promise<FlowTask | null>
  /** Records something that happened in the current phase. */
  note: (input: Omit<FlowEvent, 'phase' | 'at'>) => Promise<FlowTask | null>
  /** Approves the current gated phase's artifact. */
  approve: () => Promise<FlowTask | null>
  /** Lifts the code-edit gate for the rest of the current planning phase, or waives the proof a build stage's edits still need. */
  allow: () => Promise<FlowTask | null>
  /** Polls a PR's checks until they settle, then notes the outcome. */
  watch: (input: { url: string }) => Promise<void>
  /** Sets the board artifact every task is sent to (a claude.ai artifact URL), or clears it with null. */
  share: (input: { url: string | null }) => Promise<void>
  /** The board artifact's URL, or null when none is set. */
  board: () => Promise<string | null>
  /** Sends these tasks (default: the open one) to the board now; resolves to how many went. */
  sync: (input?: { tasks?: FlowTask[] }) => Promise<number>
  /** Reads `.scratch/<slug>/task.json`, or null when there is none. */
  load: (input: { slug: string }) => Promise<FlowTask | null>
  /** Writes the task and makes it this project's open task, or clears it once closed. */
  save: (task: FlowTask) => Promise<void>
  /** Reopens this project's open task from disk at session start. */
  resume: () => Promise<FlowTask | null>
}

declare module 'claude-code' {
  interface EngineInterface {
    flow: Flow
  }
  interface PluginState {
    flow: {
      task: FlowTask | null
      /** Whether a model turn is running now. */
      busy: boolean
      /** The new-task dialog's fields while it is open. */
      draft: FlowDraft | null
      /** The artifact pointer the doc tab shows; null shows the latest. */
      doc: string | null
      /** Whether the next stage runs once the current turn answers (autoAdvance after stage_done). */
      advance: boolean
    }
  }
}
