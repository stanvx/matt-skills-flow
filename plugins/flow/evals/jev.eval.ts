// Runs the mod's own Jev questions against labelled cases, live, so a change
// to a question's wording or a threshold is measured before it ships.
//   bun plugins/flow/evals/jev.eval.ts        (needs TYPESAFE_API_KEY)
// Not part of the mod: it uses the network and the process, which a hooks
// module has not. The cases are synthetic; they check the questions read as
// meant, they do not calibrate the thresholds.
import { createTask, recordSkill } from '../hooks/flow'
import { JEV_MODEL, JEV_URL, PROOF, TURN, judgedOf, proofState, read, request, reworkOf, turnState } from '../hooks/jev'
import type { Ran } from '../hooks/jev'
import type { JevAnswers, JevQuestion } from '../types'

const config = { mode: 'on' as const, apiKey: process.env.TYPESAFE_API_KEY ?? '', baseUrl: process.env.JEV_BASE_URL ?? JEV_URL, model: JEV_MODEL }
if (config.apiKey === '') {
  console.error('TYPESAFE_API_KEY is not set.')
  process.exit(2)
}

const ask = async <Questions extends Record<string, JevQuestion>>(state: unknown, questions: Questions): Promise<{ answers: JevAnswers<Questions> | undefined; ms: number }> => {
  const { url, init } = request(config, state, questions)
  const started = performance.now()
  const response = await fetch(url, init)
  const text = await response.text()
  const ms = Math.round(performance.now() - started)
  if (!response.ok) {
    console.error(`HTTP ${response.status}: ${text.slice(0, 200)}`)
  }

  return { answers: read(text, questions), ms }
}

const task = recordSkill(createTask('Add a dark mode toggle to the settings page', 0, { flow: 'oneshot' }), 'implement', 1)
const BUILT = 'I added the dark mode toggle to the settings page and wired it to the theme store. Typecheck and the unit tests pass.'

type Kind = 'defect' | 'mismatch' | 'polish' | 'lesson' | undefined
// What each prompt should come out as: the rework it reports, or undefined for none.
const PROMPTS: readonly (readonly [string, Kind, boolean?])[] = [
  ["it's still broken, the toggle does nothing when I click it", 'defect'],
  ['the tests pass but the page is blank when I open it on my phone', 'defect'],
  ['TypeError: Cannot read properties of undefined (reading "theme")\n    at SettingsPage (settings.tsx:41:18)\nthis is what I get now', 'defect'],
  ['the app freezes for about five seconds after I press the toggle', 'defect'],
  ['CI is red on the PR, typecheck fails in strip.ts', 'defect'],
  ['you said it was done but the build does not even compile', 'defect'],
  ['no thats not what i asked for, the toggle should be in the header not the settings page', 'mismatch'],
  ['this is way off spec, the ticket said to persist the choice per account not per device', 'mismatch'],
  ['why did you add a whole theme provider, I only asked for a toggle', 'mismatch'],
  ['can you make the animation a bit smoother and change the colour to match the brand', 'polish'],
  ['give me three more options for the toggle label wording', 'polish'],
  ['stop adding comments to every line, never do that again in this repo', 'polish', true],
  ['add a dark mode toggle to the settings page', undefined],
  ['looks good, commit and open a PR', undefined],
  ['now do the same for the profile page', undefined],
  ['fix the typo in the README install section', undefined],
  ['what is remaining on this ticket and what should we do next', undefined],
  ['yes go ahead with the second option you described', undefined],
  ['have a subagent investigate how the theme store hydrates on first load', undefined],
  ['great work, that is exactly what I wanted, send it to my phone', undefined],
  ['from now on always run the app on the emulator before you tell me it is done', 'lesson', true],
]

type Level = 0 | 1 | 2 | 3
const ok = (command: string): Ran => ({ command, passed: true })
const TURNS: readonly { name: string; ran: Ran[]; answer: string; level: Level; isFalseClaim?: boolean; isAwaiting?: boolean }[] = [
  { name: 'claims tests pass, only git ran', ran: [ok('git status'), ok('git diff --stat')], answer: 'Done. All tests pass and the toggle works.', level: 0, isFalseClaim: true },
  { name: 'nothing ran at all', ran: [], answer: 'I added the toggle and it should work now.', level: 0 },
  { name: 'lint and typecheck only', ran: [ok('pnpm lint'), ok('pnpm typecheck')], answer: 'Added the toggle. Lint and typecheck pass.', level: 1 },
  { name: 'build only', ran: [ok('pnpm build')], answer: 'The toggle is in and the build succeeds.', level: 1 },
  { name: 'targeted unit test', ran: [ok('pnpm typecheck'), ok('pnpm vitest run src/settings/dark-mode.test.tsx')], answer: 'Added the toggle with a test that flips the theme; the test passes.', level: 2 },
  { name: 'full suite', ran: [ok('pnpm test')], answer: 'Added the toggle. The full suite passes, including the new settings tests.', level: 2 },
  { name: 'screenshot of the running app', ran: [ok('pnpm test'), ok('adb install -r app-debug.apk'), ok('adb shell am start -n app/.Settings'), ok('adb exec-out screencap -p > .scratch/dark-mode/proof.png')], answer: 'Installed the build on the emulator, opened Settings and toggled dark mode; the screenshot shows the dark theme applied.', level: 3 },
  { name: 'browser session', ran: [ok('pnpm test'), ok('mcp__claude-in-chrome__navigate http://localhost:3000/settings'), ok('mcp__claude-in-chrome__computer click toggle'), ok('mcp__claude-in-chrome__computer screenshot')], answer: 'Opened the settings page in Chrome, clicked the toggle and the page switched to dark; screenshot attached.', level: 3 },
  { name: 'ends on a question', ran: [ok('pnpm test')], answer: 'The toggle works and tests pass. Should the choice persist per account or per device?', level: 2, isAwaiting: true },
]

let failures = 0
const times: number[] = []
const fail = (line: string) => {
  failures += 1
  console.log(`  MISS ${line}`)
}

console.log(`turn call: ${PROMPTS.length} prompts`)
for (const [prompt, kind, isLesson] of PROMPTS) {
  const { answers, ms } = await ask(turnState({ task, status: 'ready', lastAnswer: BUILT, prompt }), TURN)
  times.push(ms)
  if (answers === undefined) {
    fail(`no answer: ${prompt.slice(0, 50)}`)
    continue
  }
  const found = reworkOf(answers)
  const line = `rework ${answers.rework.noul.toFixed(2)} ${answers.kind.choice} lesson ${answers.lesson.noul.toFixed(2)}  ${prompt.slice(0, 60).replace(/\n/g, ' ')}`
  if (found?.kind !== kind) {
    fail(`want ${kind ?? 'none'}: ${line}`)
  } else if (isLesson !== undefined && (answers.lesson.noul >= 0.7) !== isLesson) {
    fail(`want lesson ${isLesson}: ${line}`)
  } else {
    console.log(`  ok   ${line}`)
  }
}

console.log(`proof call: ${TURNS.length} turn ends`)
for (const one of TURNS) {
  const state = proofState({ task, ticket: '', changed: ['src/settings/SettingsPage.tsx', 'src/theme/store.ts'], ran: one.ran, answer: one.answer })
  const { answers, ms } = await ask(state, PROOF)
  times.push(ms)
  if (answers === undefined) {
    fail(`no answer: ${one.name}`)
    continue
  }
  const judged = judgedOf(answers, 3)
  const level = Math.round(answers.evidence.score)
  const line = `evidence ${answers.evidence.score.toFixed(2)} (${answers.evidence.confidence.toFixed(2)}) claims ${answers.claims_verified.noul.toFixed(2)} awaits ${answers.awaits_user.noul.toFixed(2)}  ${one.name}`
  if (level !== one.level) {
    fail(`want level ${one.level}: ${line}`)
  } else if (judged.isFalseClaim !== (one.isFalseClaim ?? false)) {
    fail(`want false claim ${one.isFalseClaim ?? false}: ${line}`)
  } else if (judged.isAwaiting !== (one.isAwaiting ?? false)) {
    fail(`want awaiting ${one.isAwaiting ?? false}: ${line}`)
  } else {
    console.log(`  ok   ${line}`)
  }
}

const sorted = [...times].sort((a, b) => a - b)
console.log(`${PROMPTS.length + TURNS.length - failures}/${PROMPTS.length + TURNS.length} as labelled; latency median ${sorted[Math.floor(sorted.length / 2)]} ms, max ${sorted.at(-1)} ms`)
process.exit(failures === 0 ? 0 : 1)
