// What the board artifact reads: one document per task, the flow already
// worked out, so the page only draws.
import type { MattBoardTask, MattTask } from '../types'
import { GATED, nextAction, rail, slugify } from './flow'
import { evidence, journey } from './trail'

/** The board document's id: the repo and the slug, so repos share one board. */
export const boardId = (repo: string, slug: string) => `${slugify(repo)}--${slug}`.slice(0, 120)

/** The repo's folder name, as the board labels it. */
export const repoName = (root: string) => root.split('/').filter(Boolean).at(-1) ?? 'repo'

/** The version an ArtifactData read names for its document, or undefined when there is none. */
// ponytail: read from the tool's text, where each document ends `"version":N,"updatedAt":"..."}`;
// the typed result once the tool declares one.
export const boardVersion = (text: string) => {
  const found = /"version":(\d+),"updatedAt":"[\dT:.Z-]+"\}\s*$/m.exec(text)

  return found === null ? undefined : Number(found[1])
}

export type RailView = MattBoardTask['rail']

/** The rail with each gate's state and each stage's artifacts: what the pane and the board both draw. */
export const railView = (task: MattTask): RailView => {
  const approvedPhases = task.log.filter(one => one.kind === 'approve').map(one => one.phase)

  return rail(task).map(stop => ({
    ...stop,
    ...(stop.stage in GATED
      ? { gate: approvedPhases.includes(stop.stage) ? ('approved' as const) : stop.state === 'now' ? ('waiting' as const) : ('ahead' as const) }
      : {}),
    artifacts: task.artifacts.filter(one => one.phase === stop.stage).map(one => one.pointer),
  }))
}

export const boardDoc = (task: MattTask, repo: string, at: number): MattBoardTask => {
  const ci = task.log.filter(one => one.kind === 'ci').at(-1)

  return {
    repo,
    slug: task.slug,
    title: task.title,
    entry: task.entry,
    phase: task.phase,
    isOpen: task.closedAt === undefined,
    next: nextAction(task),
    rail: railView(task),
    evidence: evidence(task),
    ...(ci === undefined ? {} : { ci: { ok: ci.ok === true, url: ci.detail ?? '' } }),
    journey: journey(task),
    createdAt: task.createdAt,
    updatedAt: at,
    ...(task.closedAt === undefined ? {} : { closedAt: task.closedAt }),
  }
}
