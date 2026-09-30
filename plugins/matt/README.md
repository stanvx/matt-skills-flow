# matt

A Claude Code mod (a plugin of function hooks) that tracks one task at a time through the idea-to-ship flow [`ask-matt`](../../skills/engineering/ask-matt/SKILL.md) draws, and shows the one recommended next step above the prompt.

The skills stay harness-agnostic. The mod only watches them run: every stage is still a slash command you can type by hand, and nothing in the flow needs the mod.

## Try it

```sh
claude --plugin-dir plugins/matt
```

Function hooks are early access. The mod needs a Claude Code build that ships them (2.1.285 or later).

```text
/matt new retry failed checkout payments
```

That opens a task at `.scratch/retry-failed-checkout-payments/task.json` and a band above the prompt:

```text
matt · retry failed checkout payments · new · next [/grill-with-docs retry failed ...] start here: sharpen the idea first
```

Press the button (or `n` once the band has focus, `ctrl+x tab`) to run it.

## Commands

| Command | What it does |
| --- | --- |
| `/matt new [--start ticket\|idea\|broken\|foggy] <what>` | Opens a task, or resumes the one with the same title. `--start` overrides the guess about where it joins the flow. |
| `/matt` | Shows the task and opens the rail pane. |
| `/matt board` | Lists every task under `.scratch/` and opens the board pane; a digit switches task. |
| `/matt switch <slug>` | Makes another task the open one. |
| `/matt approve` | Approves the spec or the tickets, so the flow moves on. |
| `/matt allow` | Lifts the code-edit gate for the rest of a planning phase. |
| `/matt share <artifact link>` | Sends every task to a board artifact on claude.ai, and each change after it. `/matt share off` stops. |
| `/matt done` | Closes the task. The file stays. |

## How it reads the flow

Four entry points, one flow: a ticket starts at `/implement`, an idea at `/grill-with-docs`, something broken at `diagnosing-bugs`, and a foggy effort at `/wayfinder`.

- **Stages** are the user-invoked skills (`grill-with-docs`, `wayfinder`, `to-spec`, `to-tickets`, `implement`, `implement-spec`, `retro`). Only a person can reach one, so running one moves the task to that phase.
- **Steps** are the model-invoked skills (`grilling`, `prototype`, `research`, `tdd`, `code-review`, `pr` and the rest). They are recorded inside the current phase and never move it. A model-invoked skill counts as a stage only where the task starts on it (`diagnosing-bugs` for a broken task).
- Both are seen through one event, so typing `/to-spec` and the model calling the Skill tool look the same.

## What it does in each phase

- **Planning phases** (`grill-with-docs`, `wayfinder`, `to-spec`, `to-tickets`) refuse code edits from Write, Edit and NotebookEdit. Markdown, `.scratch/` and edits right after a `prototype` step go through. The refusal tells the model to ask you for `/matt allow`.
- **Gates**: after `to-spec` and `to-tickets` the next step is `/matt approve`, pointing at the artifact to read first. Gates always wait for a person.
- **Artifacts**: files written under `.scratch/`, and the URLs `gh issue create` and `gh pr create` print, are recorded against the phase that made them. A later artifact wins over an earlier one, and live code beats any document.
- **Reminder**: each tracked skill's prompt carries the task, the phase and the artifacts so far, and tells the model to use the task's slug as the feature slug, so a local spec lands next to `task.json`.
- **Implement** on `main` or `master`: the prompt asks for a branch or a worktree before the first edit.
- **Checks** (test, typecheck, lint) are logged with their outcome. `pr` gets each check's first failure and latest run for its Evidence section.
- **CI**: once a PR exists, `gh pr checks` is polled every minute until it settles, then logged and shown.
- **Retro** gets the task's timeline: stages, steps, artifacts, approvals, held edits, checks and CI, in minutes from the start.
- **Context**: past `clearAt` percent the band suggests `/clear` before the next stage. The task survives `/clear`; sessions are disposable, the task is durable.

## The board

[`board.html`](./board.html) is a claude.ai artifact page that draws every task as a line on a transit map: stages are stations, the spec and tickets gates are signals, each station lists what it produced, and closed tasks rest at the terminus. It reads a `tasks` collection from the artifact's database and redraws as documents change, so it is published once and never republished for new data.

The mod keeps it current. After `/matt share <link>`, every change to a task reaches the board about three seconds later as one `ArtifactData` batch write: one document per task, id `<repo>--<slug>`, the flow already worked out (rail, gates, next step, evidence, journey) so the page only draws. One board serves every repo. Each sync is two tool calls (a read for the document's version, then the write), so allow `ArtifactData` in your permissions to keep them from prompting.

To publish your own board, publish `board.html` as an artifact with the `db` capability (`rules: [{ path: "", read: "view", write: "owner" }]`), then run `/matt share` with its link. Only you can open it until you share it from the page's Share menu.

## Settings

| Option | Default | Meaning |
| --- | --- | --- |
| `autoAdvance` | `false` | After `/matt approve`, run the next stage at once. A full context holds it. |
| `clearAt` | `50` | The context percentage from which the band and each gate suggest `/clear`. |

## The task file

`.scratch/<slug>/task.json` holds the phase, the skill history, ordered artifact pointers (never copies) and an event log. `$.store` remembers which task is open per project, so the next session picks it up.

Other mods can use the `$.matt` noun (`task`, `all`, `next`, `run`, `enter`, `produce`, `note`, `approve`, `allow`, `watch`, `share`, `board`, `sync`, `load`, `save`, `resume`), typed in [`types/index.d.ts`](./types/index.d.ts).

## Limits

- The gates are advisory. A hook that fails is skipped, and file edits made through Bash are not held.
- Paths are compared lexically, not through symlinks.
- The entry guess is a keyword heuristic; `--start` overrides it.
- One CI watch at a time: the latest PR.

## Developing

```sh
claude plugin validate plugins/matt
claude plugin test plugins/matt
npx -p typescript@5 tsc -p plugins/matt
```

The type check needs the engine's declarations, which Claude Code writes to `.claude-plugin/types/` when it loads the plugin (or `/plugin-types plugins/matt`).

| File | Holds |
| --- | --- |
| `hooks/flow.ts` | The flow: stages, steps, the next action, gates, the rail. Pure. |
| `hooks/trail.ts` | Evidence, the timeline, CI parsing and the skill reminder. Pure. |
| `hooks/noun.ts` | The `$.matt` noun: every read and write of the task. |
| `hooks/ui.tsx` | The band, the rail pane and the board pane. |
| `hooks/board.ts` | The document each task becomes on the board artifact. Pure. |
| `board.html` | The board artifact page. |
| `hooks/register.tsx` | The command and the hooks on skills and tool calls. |
