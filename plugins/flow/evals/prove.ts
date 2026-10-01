// Asks Jev the mod's own proof questions about work done outside a flow task:
// what was asked, what ran, and what the summary claims.
//   bun plugins/flow/evals/prove.ts --task "<what was asked>" --message "<the done claim>" [--ui] [--base <ref>] -- "<command that passed>" ...
// Changed files come from `git diff --name-only <base>` (default HEAD~1).
import { createTask } from '../hooks/flow'
import { JEV_MODEL, JEV_URL, PROOF, judgedOf, proofState, read, request } from '../hooks/jev'

const args = process.argv.slice(2)
const split = args.indexOf('--')
const flags = split === -1 ? args : args.slice(0, split)
const flag = (name: string) => (flags.includes(name) ? (flags[flags.indexOf(name) + 1] ?? '') : '')
const ran = (split === -1 ? [] : args.slice(split + 1)).map(command => ({ command, passed: true }))
const changed = Bun.spawnSync(['git', 'diff', '--name-only', flag('--base') || 'HEAD~1']).stdout.toString().trim().split('\n').filter(Boolean)
const task = { ...createTask(flag('--task'), 0), ui: flags.includes('--ui') }
const { url, init } = request(
  { mode: 'on', apiKey: process.env.TYPESAFE_API_KEY ?? '', baseUrl: process.env.JEV_BASE_URL ?? JEV_URL, model: JEV_MODEL },
  proofState({ task, ticket: '', changed, ran, answer: flag('--message') }),
  PROOF,
)
const answers = read(await (await fetch(url, init)).text(), PROOF)
if (answers === undefined) {
  console.error('Jev did not answer.')
  process.exit(2)
}
const judged = judgedOf(answers, task.ui ? 3 : 2)
console.log(
  `${judged.ok ? 'enough' : 'short'}: ${judged.detail} (evidence ${answers.evidence.score.toFixed(2)}, confidence ${answers.evidence.confidence.toFixed(2)}, claims verified ${answers.claims_verified.noul.toFixed(2)}${judged.isFalseClaim ? ', FALSE CLAIM' : ''})`,
)
process.exit(judged.ok ? 0 : 1)
