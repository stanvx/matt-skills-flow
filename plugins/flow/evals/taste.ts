// A taste pass by Jev: typed questions about each screen as a terminal drew it, one call per
// screen. Feed it real captures (a tmux capture-pane of a live session), never a description.
//   bun plugins/flow/evals/taste.ts <captures file>
// The file holds screens separated by lines that start with `## `, each naming the screen.
import { JEV_MODEL, JEV_URL, noul, read, request, score } from '../hooks/jev'

const QUESTIONS = {
  clarity: score('How clearly does `screen` tell a first-time user where the task stands and what to do next?', [
    'It does not say, or says it in terms only the authors know.',
    'A user could work it out with effort.',
    'Clear on a careful read.',
    'Clear at a glance: the state and the one next action stand out.',
  ]),
  jargon: noul('Does `screen` lean on a term a first-time user could not understand from the screen alone?', {
    true: 'It uses an unexplained internal name, code, or abbreviation the user needs in order to act.',
    false: 'Every term is plain, or explained on the screen, or a command the user can type as written.',
  }),
  noise: noul('Does `screen` repeat the same fact twice, or show text that adds nothing a user would act on?'),
  competing: noul('Does `screen` offer two or more actions that look equally like the main thing to do now?'),
} as const

// ponytail: starting points like jev.ts's, set by eye on the flow mod's own screens.
const PASS = { clarity: 2, jargon: 0.5, noise: 0.5, competing: 0.5, confidence: 0.6 } as const

const text = await Bun.file(process.argv[2] ?? '').text()
const screens = text.split(/^## /m).slice(1).map(part => ({ name: part.split('\n')[0]?.trim() ?? '', screen: part.split('\n').slice(1).join('\n').trim() }))
const config = { mode: 'on' as const, apiKey: process.env.TYPESAFE_API_KEY ?? '', baseUrl: process.env.JEV_BASE_URL ?? JEV_URL, model: JEV_MODEL }
let failed = 0
for (const { name, screen } of screens) {
  const { url, init } = request(config, { surface: 'Claude Code terminal, a mod that tracks one task through stages', screen }, QUESTIONS)
  const answers = read(await (await fetch(url, init)).text(), QUESTIONS)
  if (answers === undefined) {
    console.log(`${name}: Jev did not answer`)
    failed += 1
    continue
  }
  const level = Math.round(answers.clarity.score)
  const issues = [
    answers.clarity.confidence >= PASS.confidence && level < PASS.clarity ? `clarity ${level}/3` : undefined,
    answers.jargon.noul >= PASS.jargon ? `jargon ${answers.jargon.noul.toFixed(2)}` : undefined,
    answers.noise.noul >= PASS.noise ? `noise ${answers.noise.noul.toFixed(2)}` : undefined,
    answers.competing.noul >= PASS.competing ? `competing actions ${answers.competing.noul.toFixed(2)}` : undefined,
  ].filter(Boolean)
  failed += issues.length === 0 ? 0 : 1
  console.log(
    `${issues.length === 0 ? 'pass' : 'FAIL'} ${name}: clarity ${answers.clarity.score.toFixed(2)} (conf ${answers.clarity.confidence.toFixed(2)}), jargon ${answers.jargon.noul.toFixed(2)}, noise ${answers.noise.noul.toFixed(2)}, competing ${answers.competing.noul.toFixed(2)}${issues.length === 0 ? '' : `; ${issues.join(', ')}`}`,
  )
}
process.exit(failed === 0 ? 0 : 1)
