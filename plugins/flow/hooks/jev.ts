// Jev, TypeSafe's System One model: typed questions about a little state,
// typed answers and probabilities back. Facts stay in code (the proof gate,
// the workflow chain); Jev reads the two things only language carries: what
// the person's prompt says about earlier work, and how far a turn's evidence
// goes. Pure: the questions, the thresholds and the policy as data, and the
// request and its parser. noun.ts sends it.
import type { FlowStatus, FlowTask, JevAnswers, JevChoice, JevMode, JevNoul, JevQuestion, JevScore } from '../types'

export type JevConfig = { mode: JevMode; apiKey: string; baseUrl: string; model: string }

export const JEV_URL = 'https://api.typesafe.ai'
// Pinned: an alias moves, and the thresholds below were set against this version.
export const JEV_MODEL = 'jev-1.13.0'

export const noul = (instructions: string, criteria?: JevNoul['criteria']): JevNoul => ({
  type: 'noul',
  instructions,
  ...(criteria === undefined ? {} : { criteria }),
})
export const choice = <Option extends string>(instructions: string, criteria: Record<Option, string | null>): JevChoice<Option> => ({
  type: 'choice',
  instructions,
  criteria,
})
export const score = (instructions: string, criteria: readonly string[]): JevScore => ({ type: 'score', instructions, criteria })

/** What `$.http.fetch` takes for one request. */
export const request = (config: JevConfig, state: unknown, questions: Record<string, JevQuestion>) => ({
  url: `${config.baseUrl.replace(/\/+$/, '')}/v1/systemone`,
  init: {
    method: 'POST',
    headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: config.model, state, questions }),
  },
})

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isShare = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 1

/** One answer narrowed to its question's type, or undefined when it is not that. */
const readOne = (question: JevQuestion, answer: unknown) => {
  if (!isRecord(answer)) {
    return undefined
  }
  if (question.type === 'noul') {
    return isShare(answer.noul) ? { noul: answer.noul } : undefined
  }
  if (!isShare(answer.confidence)) {
    return undefined
  }
  if (question.type === 'choice') {
    return typeof answer.choice === 'string' && Object.hasOwn(question.criteria, answer.choice)
      ? { choice: answer.choice, confidence: answer.confidence }
      : undefined
  }

  return typeof answer.score === 'number' ? { score: answer.score, confidence: answer.confidence } : undefined
}

/** The response body's answers, each narrowed to its question; undefined when any is missing or malformed. */
export const read = <Questions extends Record<string, JevQuestion>>(text: string, questions: Questions): JevAnswers<Questions> | undefined => {
  const body = (() => {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return undefined
    }
  })()
  const answers = isRecord(body) && isRecord(body.answers) ? body.answers : undefined
  if (answers === undefined) {
    return undefined
  }
  const entries = Object.entries(questions).map(([id, question]) => [id, readOne(question, answers[id])] as const)

  // The mapped type over the questions is what each entry was narrowed to above.
  return entries.every(([, answer]) => answer !== undefined) ? (Object.fromEntries(entries) as JevAnswers<Questions>) : undefined
}

const clip = (text: string, length: number) => text.slice(0, length)
const tail = (text: string, length: number) => text.slice(-length)

// ---- The turn call: what the person's prompt says about the work so far.

export const TURN = {
  rework: noul(
    'Does `prompt` say that work the agent already did in this task is wrong, broken, incomplete or not what was asked for?',
    {
      true: 'It reports a defect in, or dissatisfaction with, output the agent already produced.',
      false: 'It asks for new work or a next step, answers a question, or approves, with no complaint about earlier output.',
    },
  ),
  kind: choice('What is `prompt` mainly doing?', {
    defect: 'Reports that something the agent built does not work: an error, a crash, a failing check, a pasted log, "still broken".',
    mismatch: 'Says the agent built something other than what was asked for: wrong place, wrong behaviour, off spec.',
    polish: 'Asks for a refinement of taste to work that functions: wording, spacing, colour, naming, "more options".',
    new_work: 'Asks for new work, a next step, a commit, a review or information, with no complaint about earlier output.',
    reply: 'Answers a question the agent asked, or is a bare go-ahead such as "yes", "continue" or "the second one".',
  }),
  lesson: noul(
    'Does `prompt` state a rule or preference about how the agent should work in general, beyond this one change?',
    {
      true: 'It says always, never, from now on, stop doing, or otherwise states a standing rule or habit the agent should keep.',
      false: 'It is only about this change.',
    },
  ),
} as const

export type TurnAnswers = JevAnswers<typeof TURN>

/** Prompts Jev never sees: a command, or a bare reply of a few words while a stage is under way. */
export const isJudgedPrompt = (text: string) => !text.trimStart().startsWith('/') && text.trim().split(/\s+/).length > 3

export const turnState = (input: { task: FlowTask; status: FlowStatus; lastAnswer: string; prompt: string }) => ({
  task: { title: input.task.title, phase: input.task.phase, status: input.status },
  last_answer: tail(input.lastAnswer, 1500),
  prompt: clip(input.prompt, 2000),
})

// ponytail: starting points from a small labelled set (evals/jev.eval.ts), not operating points
// measured on real prompts; tune them on the shadow log.
export const THRESHOLD = { rework: 0.8, lesson: 0.7, claim: 0.7, awaits: 0.5, confidence: 0.6 } as const

/** `lesson`: no complaint about this change, only a standing rule for the retro to encode. */
export type Rework = { kind: 'defect' | 'mismatch' | 'polish' | 'lesson'; isLesson: boolean; context?: string }

/** What a judged prompt means for the task: the rework it reports, if any, and what the model should read beside it. */
export const reworkOf = (answers: TurnAnswers): Rework | undefined => {
  const kind = answers.kind.choice
  // A refinement of taste is rework without being a complaint, so the choice alone carries it;
  // a defect or a mismatch also needs the prompt to read as one.
  const isLesson = answers.lesson.noul >= THRESHOLD.lesson
  if (kind !== 'defect' && kind !== 'mismatch' && kind !== 'polish') {
    return isLesson ? { kind: 'lesson', isLesson } : undefined
  }
  const isRework = kind === 'polish' ? answers.kind.confidence >= THRESHOLD.confidence : answers.rework.noul >= THRESHOLD.rework
  if (!isRework && !isLesson) {
    return undefined
  }
  const context =
    !isRework
      ? undefined
      : kind === 'defect'
      ? 'flow: this reads as a report that earlier work in this task failed. Reproduce it and find the root cause before changing code (Skill tool: diagnosing-bugs), fix it there, then run the checks again.'
      : kind === 'mismatch'
        ? 'flow: this reads as "not what was asked". Before changing code, restate what was asked against what was built, and say which part differs.'
        : undefined

  return { kind, isLesson, ...(context === undefined ? {} : { context }) }
}

// ---- The proof call: how far the turn's evidence goes.

export const EVIDENCE = [
  'Nothing in `ran` exercised the changed code: no command at all, or only reading files, git or installs.',
  'Static checks only: a typecheck, a lint or a build passed, and nothing ran the changed behaviour.',
  'Automated tests that plausibly cover the changed behaviour ran and passed.',
  'The real application, command or device was run and the changed behaviour was observed: a screenshot, a browser or emulator session, or the command output itself.',
] as const

export const PROOF = {
  claims_verified: noul('Does `final_message` say that tests, a build, a check or a manual run was carried out and passed?'),
  awaits_user: noul(
    'Does `final_message` end by asking the user a question, or for a decision, that must be answered before work continues?',
  ),
  evidence: score('How directly do the entries in `ran` show that the behaviour described in `task` works?', EVIDENCE),
} as const

export type ProofAnswers = JevAnswers<typeof PROOF>

/** One thing the turn ran: a Bash command or a tool, and whether it succeeded. */
export type Ran = { command: string; passed: boolean }

export const proofState = (input: { task: FlowTask; ticket: string; changed: readonly string[]; ran: readonly Ran[]; answer: string }) => ({
  task: clip(`${input.task.title}\n${input.ticket}`.trim(), 1500),
  changed_files: input.changed.slice(-20),
  ran: input.ran.slice(-30).map(one => ({ command: clip(one.command, 200), passed: one.passed })),
  final_message: tail(input.answer, 2000),
})

/** The evidence a task needs before it reads as proven: tests, or the change seen working when it has a UI. */
export const requiredEvidence = (task: FlowTask) => (task.ui === true ? 3 : 2)

const EVIDENCE_WORDS = ['nothing ran the changed code', 'only static checks ran', 'tests ran', 'the change was seen working'] as const

export type Judged = { ok: boolean; detail: string; isFalseClaim: boolean; isAwaiting: boolean }

/** What the proof answers mean for the task: whether the evidence is enough, in words, and what else the turn's end says. */
export const judgedOf = (answers: ProofAnswers, required: number): Judged => {
  const level = Math.max(0, Math.min(3, Math.round(answers.evidence.score)))
  // A spread distribution is no ground to withhold anything on.
  const isSure = answers.evidence.confidence >= THRESHOLD.confidence
  const isShort = isSure && level < required

  return {
    ok: !isShort,
    detail: isShort
      ? `${EVIDENCE_WORDS[level]}; ${required === 3 ? 'the change has not been seen working' : 'no test covers the change yet'}`
      : (EVIDENCE_WORDS[level] ?? ''),
    // The message says it was verified, and nothing that ran touched the change.
    isFalseClaim: isSure && level === 0 && answers.claims_verified.noul >= THRESHOLD.claim,
    isAwaiting: answers.awaits_user.noul >= THRESHOLD.awaits,
  }
}

/** One decision as the shadow log keeps it. */
export type JevEntry = { at: number; call: 'turn' | 'proof'; ms: number; slug: string; phase: string; answers: unknown; note?: string }

export const LOG_KEY = 'jev:log'
export const LOG_SIZE = 300

/** The log as stored, oldest first; anything else reads as empty. */
export const parseLog = (stored: unknown): JevEntry[] => (Array.isArray(stored) ? (stored as JevEntry[]) : [])

/** The log in a few lines, for `/flow jev`: how often each call ran, how fast, and what the turn call found. */
export const logSummary = (log: readonly JevEntry[]) => {
  if (log.length === 0) {
    return 'No Jev decisions logged yet.'
  }
  const turns = log.filter(one => one.call === 'turn')
  const proofs = log.filter(one => one.call === 'proof')
  const median = [...log.map(one => one.ms)].sort((a, b) => a - b)[Math.floor(log.length / 2)] ?? 0
  const noted = (entries: readonly JevEntry[], note: string) => entries.filter(one => one.note?.startsWith(note) === true).length

  return [
    `${log.length} decisions, median ${median} ms.`,
    `Prompts judged: ${turns.length}; rework: ${noted(turns, 'rework')} (defect ${noted(turns, 'rework defect')}, mismatch ${noted(turns, 'rework mismatch')}, polish ${noted(turns, 'rework polish')}).`,
    `Turn ends judged: ${proofs.length}; evidence short: ${noted(proofs, 'short')}.`,
    ...log.slice(-8).map(one => `  ${one.call} ${one.phase} ${one.ms}ms ${one.note ?? 'ok'}`),
  ].join('\n')
}
