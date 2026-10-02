// The moments live.sh opens: real task states built with the mod's own functions, one folder each.
//   bun plugins/flow/evals/live-fixtures.ts <repo dir>
import { createTask, recordArtifact, recordEvent, recordSkill } from '../hooks/flow'
import { mkdirSync, writeFileSync } from 'node:fs'

const out = process.argv[2] ?? '.'
const t0 = Date.now() - 11 * 60_000
const save = (slug: string, task: ReturnType<typeof createTask>) => {
  mkdirSync(`${out}/.scratch/${slug}`, { recursive: true })
  writeFileSync(`${out}/.scratch/${slug}/task.json`, JSON.stringify({ ...task, slug }, null, 2))
}
const base = (title: string, flow: 'spec' | 'grill' | 'oneshot') => createTask(title, t0, { flow })

// ready: decisions settled, spec next
let ready = recordSkill(base('Retry failed checkout payments', 'spec'), 'grill-with-docs', t0 + 1)
ready = recordEvent(ready, { kind: 'done', detail: 'settled' }, t0 + 2)
save('ready', ready)

// progress: mid-stage, turn ended
save('progress', recordSkill(base('Retry failed checkout payments', 'spec'), 'grill-with-docs', t0 + 1))

// gate: spec written, waits for approval
let gate = recordSkill(recordEvent(recordSkill(base('Retry failed checkout payments', 'spec'), 'grill-with-docs', t0 + 1), { kind: 'done' }, t0 + 2), 'to-spec', t0 + 3)
gate = recordArtifact(gate, '.scratch/gate/spec.md', t0 + 4)
save('gate', gate)

// proof: build edited, check failed once
let proof = recordSkill(base('Retry failed checkout payments', 'grill'), 'implement', t0 + 1)
proof = recordEvent(proof, { kind: 'edit', detail: 'src/checkout/retry.ts' }, t0 + 2)
proof = recordEvent(proof, { kind: 'check', detail: 'pnpm test', ok: false }, t0 + 3)
save('proof', proof)

// stuck: check failed three times
let stuck = proof
for (const at of [4, 5]) stuck = recordEvent(stuck, { kind: 'check', detail: 'pnpm test', ok: false }, t0 + at)
save('stuck', stuck)
