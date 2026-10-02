// A taste pass by Jev: typed questions about each screen as a terminal drew it, one call per
// screen, judged against what the person needs at that moment. Feed it real captures (a tmux
// capture-pane of a live session), never a description.
//   bun plugins/flow/evals/taste.ts [--runs <n>] <captures file>   screens under `## <name>/<moment>` lines
//   bun plugins/flow/evals/taste.ts [--runs <n>] --live <dir>      raw captures from live.sh, one <moment>.txt each
// --show prints the screens as Jev reads them, cut and stripped, without asking it.
// Prints each score with its pass line; exits 1 when any screen fails in any run.
import { readdirSync } from 'node:fs'

import { JEV_MODEL, JEV_URL, noul, read, request, score } from '../hooks/jev'

/** What the person needs at each moment, so "too much" and "too little" are judged against it. */
const INTENT: Record<string, string> = {
  idle: 'No task is open. The person may want to start one, or just chat.',
  new: 'The person is starting a new task: they describe it and pick a workflow (how many stages, which gates).',
  working: 'The agent is working on a stage. The person needs nothing from the screen, only a glance at where things are, and a way into detail if they want it.',
  progress: 'The stage paused mid-way for the person: they reply in the prompt to carry on, and can open detail to see more or move on.',
  gate: 'A stage wrote an artifact that needs the person to read and approve it, or send it back.',
  ready: 'The stage is done. The person chooses what next: the next stage, or redo this one.',
  proof: 'The build is not proven yet: a check is failing or none has run. The person chooses how to prove it or fix it.',
  stuck: 'The same check failed three times in a row. The person chooses: diagnose, or try again.',
}

const QUESTIONS = {
  clarity: score('How clearly does `screen` tell a first-time user where the task stands and what to do next, given `moment`?', [
    'It does not say, or says it in terms only the authors know.',
    'A user could work it out with effort.',
    'Clear on a careful read.',
    'Clear at a glance: the state and the one next action stand out.',
  ]),
  visual: score('How much does `screen` show the stages and the choices visually (shape, position, colour, a diagram) rather than in sentences?', [
    'All sentences: nothing is shown, everything is told.',
    'Some structure, mostly text.',
    'The structure is visible; text only labels it.',
    'The shape alone tells the story: you could follow it without reading the words.',
  ]),
  overload: noul('Given `moment`, does `screen` show more than the person needs right now, detail that should sit behind a key instead?'),
  jargon: noul('Does `screen` lean on a term a first-time user could not understand from the screen alone?', {
    true: 'It uses an unexplained internal name, code, or abbreviation the user needs in order to act.',
    false: 'Every term is plain, or explained on the screen, or a command the user can type as written.',
  }),
  competing: noul('Does `screen` offer two or more actions that look equally like the main thing to do now?'),
  retry: noul('If something went wrong or the person disagrees, does `screen` show a clear way to retry or redo it? (True when it shows one or none is needed.)'),
} as const

// ponytail: lines set by eye on synthetic screens (a bare rail scores overload 0.65, a wall of status 0.83); near them, Jev varies by about 0.05, so run it more than once.
const PASS = { clarity: 2, visual: 2, overload: 0.7, jargon: 0.65, competing: 0.5, retry: 0.5, confidence: 0.6 } as const

/** Retry is only asked of moments where something can be redone. */
const NEEDS_RETRY = new Set(['gate', 'ready', 'proof', 'stuck'])

// Claude Code's own chrome, the same whatever the mod draws: scoring it only adds noise.
const CHROME_LINE = /Claude Code v|with (low|medium|high|xhigh|max) effort|SessionStart|tmux (detected|focus-events)|session limit|\/T\/tmp\.|· \/rc$|^\s*\(shift\+tab to cycle\)\s*$|^[\s─━]*$|^\s*❯\s*$|^\s*❯\s*Try "/
const CHROME_TEXT = [/⏵⏵ [a-z ]+ on[^·]*(· \(shift\+tab to cycle\))?/g, /· ← for agents/g, /\? for shortcuts/g, /[●◐] (low|medium|high|xhigh|max) · \/effort/g]

/** The screen as the mod drew it: engine chrome dropped, the prompt kept as one marker line. */
const stripChrome = (lines: readonly string[]) =>
  lines
    .map(line => (/^\s*❯\s*$/.test(line) ? '[prompt]' : line))
    .filter(line => line === '[prompt]' || !CHROME_LINE.test(line))
    .map(line => CHROME_TEXT.reduce((text, pattern) => text.replace(pattern, ''), line).trimEnd())
    .filter(line => line.trim() !== '')

/**
 * The mod's part of a raw capture: the band (its first row ends in the collapse mark `[-]`), the
 * prompt and the line under it; for the dialog, docked right of the transcript, the rows cut at
 * the column it starts in, so the transcript beside it never leaks in.
 */
const region = (moment: string, raw: string) => {
  const lines = raw.replace(/\n+$/, '').split('\n')
  const rules = lines.flatMap((line, at) => (line.startsWith('─'.repeat(20)) ? [at] : []))
  if (moment === 'new') {
    const top = lines.findIndex(line => line.includes('Describe the task'))
    const col = lines[top]?.indexOf('Describe the task') ?? 0
    const end = rules.find(at => at > top) ?? lines.length

    return lines.slice(top, end).map(line => line.slice(col))
  }
  const band = lines.findLastIndex(line => line.trimEnd().endsWith('[-]'))
  const start = band !== -1 ? band : Math.max(0, (rules.at(-2) ?? lines.length) - 1)

  return lines.slice(start)
}

type Screen = { name: string; moment: string; screen: string }

const args = process.argv.slice(2)
const runsAt = args.indexOf('--runs')
const runs = runsAt === -1 ? 1 : Math.max(1, Number(args[runsAt + 1]) || 1)
const liveAt = args.indexOf('--live')
// The one argument that is neither a flag nor the number after --runs.
const file = args.find((one, at) => !one.startsWith('--') && at !== runsAt + 1) ?? ''

const screens: Screen[] =
  liveAt === -1
    ? (await Bun.file(file).text())
        .split(/^## /m)
        .slice(1)
        .map(part => {
          const name = part.split('\n')[0]?.trim() ?? ''

          return { name, moment: name.split('/')[1] ?? name, screen: stripChrome(part.split('\n').slice(1)).join('\n') }
        })
    : await Promise.all(
        readdirSync(file)
          .filter(one => one.endsWith('.txt') && one.slice(0, -4) in INTENT)
          .map(async one => {
            const moment = one.slice(0, -4)

            return { name: moment, moment, screen: stripChrome(region(moment, await Bun.file(`${file}/${one}`).text())).join('\n') }
          }),
      )

if (args.includes('--show')) {
  for (const one of screens) console.log(`## ${one.name}\n${one.screen}\n`)
  process.exit(0)
}

const config = { mode: 'on' as const, apiKey: process.env.TYPESAFE_API_KEY ?? '', baseUrl: process.env.JEV_BASE_URL ?? JEV_URL, model: JEV_MODEL }
const f = (n: number) => n.toFixed(2)
const tally = new Map<string, number>()
let failed = 0
for (let run = 1; run <= runs; run += 1) {
  if (runs > 1) console.log(`-- run ${run}`)
  for (const { name, moment, screen } of screens) {
    const { url, init } = request(config, { surface: 'Claude Code terminal, a mod that tracks one task through stages', moment: INTENT[moment] ?? moment, screen }, QUESTIONS)
    const answers = read(await (await fetch(url, init)).text(), QUESTIONS)
    if (answers === undefined) {
      console.log(`${name}: Jev did not answer`)
      failed += 1
      continue
    }
    const issues = [
      answers.clarity.confidence >= PASS.confidence && answers.clarity.score < PASS.clarity ? 'clarity' : undefined,
      answers.visual.confidence >= PASS.confidence && answers.visual.score < PASS.visual ? 'visual' : undefined,
      answers.overload.noul >= PASS.overload ? 'overload' : undefined,
      answers.jargon.noul >= PASS.jargon ? 'jargon' : undefined,
      answers.competing.noul >= PASS.competing ? 'competing' : undefined,
      NEEDS_RETRY.has(moment) && answers.retry.noul < PASS.retry ? 'no retry' : undefined,
    ].filter(Boolean)
    failed += issues.length === 0 ? 0 : 1
    tally.set(name, (tally.get(name) ?? 0) + (issues.length === 0 ? 1 : 0))
    console.log(
      `${issues.length === 0 ? 'pass' : 'FAIL'} ${name}: clarity ${f(answers.clarity.score)}/3 (>=${PASS.clarity}), visual ${f(answers.visual.score)}/3 (>=${PASS.visual}), overload ${f(answers.overload.noul)} (<${PASS.overload}), jargon ${f(answers.jargon.noul)} (<${PASS.jargon}), competing ${f(answers.competing.noul)} (<${PASS.competing}), retry ${f(answers.retry.noul)} (>=${PASS.retry})${issues.length === 0 ? '' : `  <- ${issues.join(', ')}`}`,
    )
  }
}
if (runs > 1) console.log(`\n${[...tally].map(([name, passes]) => `${name} ${passes}/${runs}`).join(' · ')}`)
process.exit(failed === 0 ? 0 : 1)
