# matt

A Claude Code mod (a plugin of function hooks) that tracks one task at a time through the idea-to-ship flow [`ask-matt`](../../skills/engineering/ask-matt/SKILL.md) draws. Each task follows a workflow you pick when you open it, in the spirit of [HumanLayer's workflows](https://docs.humanlayer.com/reference/skills-workflows): a form to start it, a pane that shows its stages and gates, a tab to read and approve what each stage wrote, and one recommended next step above the prompt.

The skills stay harness-agnostic. The mod only watches them run and drives them as slash commands: every stage is still a command you can type by hand, and nothing in the flow needs the mod.

## Try it

```sh
claude --plugin-dir plugins/matt
```

Function hooks are early access. The mod needs a Claude Code build that ships them (2.1.285 or later).

```text
/matt new
```

That opens the new-task dialog. Describe the work, pick a workflow, and Create writes `.scratch/<slug>/task.json`, opens the task pane and runs the first stage. `/matt new retry failed checkout payments` skips the form. Either way a band sits above the prompt:

```text
matt · [Grill 1/4] grill-with-docs · Ready [/implement] build it here, in this session
```

Press the button (or `n` once the band has focus, `ctrl+x tab`) to run the next step.

## Commands

| Command | What it does |
| --- | --- |
| `/matt new` | Opens the new-task dialog (on a surface with fields; on mobile it prints the usage). |
| `/matt new [--flow <flow>] [--start ticket\|idea\|broken\|foggy] [--model <m>] [--effort <e>] [--no-pr] [--worktree] <what>` | Opens a task, or resumes the one with the same title. `--flow` and `--start` override the guesses about how it proceeds and where it joins. |
| `/matt` | Shows the task and opens the task pane. |
| `/matt board` | Lists every task under `.scratch/` and opens the board pane; a digit switches task. |
| `/matt switch <slug>` | Makes another task the open one. |
| `/matt flow oneshot\|grill\|spec\|freeform` | Moves the open task to another workflow. |
| `/matt doc [pointer]` | Opens the artifact tab on the newest file the task produced, or the one named. |
| `/matt approve` | Approves the spec or the tickets, so the flow moves on. Only a person can: a run from a notification, a schedule, a peer session or another plugin is refused. |
| `/matt allow` | Lifts the code-edit gate for the rest of a planning phase. A person's call, like approve. |
| `/matt bar [add [--fill] [--label <l>] <text> \| rm <n> \| clear]` | Lists or edits your quickbar phrases. |
| `/matt share <artifact link>` | Sends every task to a board artifact on claude.ai, and each change after it. `/matt share off` stops. |
| `/matt done` | Closes the task. The file stays. |

## Workflows

Each task follows one workflow, a fixed chain of stages ([`hooks/flows.ts`](./hooks/flows.ts)):

| Workflow | Stages (a ✓ waits for `/matt approve`) | For |
| --- | --- | --- |
| Oneshot | `implement`, `pr`, `retro` | The ticket already says enough. |
| Grill | `grill-with-docs`, `implement`, `pr`, `retro` | Settle the decisions, then build in one session. |
| Spec | `grill-with-docs`, `to-spec` ✓, `to-tickets` ✓, `implement-spec`, `pr`, `retro` | Bigger work, built across sessions. |
| Freeform | none | Run any skill; each one is recorded, and no code edit is held. |

- **The guess**: a ticket reference or a bug reads as Oneshot, a foggy effort as Spec, anything else as Grill. The dialog refines it with a cheap classifier; `--flow` or a pick overrides it.
- **On-ramps** replace the first stage: something broken starts at `diagnosing-bugs`, a foggy effort at `/wayfinder`.
- **No PR** (`--no-pr`, or the dialog's toggle) drops the `pr` stage.
- **Growing**: running a stage the workflow lacks moves the task to the smallest workflow that has it (`/grill-with-docs` on a Oneshot task makes it Grill, `/to-spec` on a Grill task makes it Spec), and the log says so.
- `implement` and `implement-spec` fill the same place, so a Spec task can be built one ticket at a time.

## The screens

One vocabulary everywhere: a workflow badge, a stage count, and a status.

| Status | Means |
| --- | --- |
| Working | a model turn is running (dim) |
| Waiting for you | a spec or tickets gate waits for `/matt approve` (yellow) |
| Ready | the next stage can run (green) |
| Done | the task is closed (dim) |

### New-task dialog

`/matt new` with no text opens a form that takes the keyboard; Esc or Cancel drops the draft.

| Field | What it does |
| --- | --- |
| What | The work, or a GitHub issue URL or `#123`. The name and the guessed workflow follow what you type; Enter refines the guess and moves on. |
| Name | Defaults to the first line. The folder it gets, `.scratch/<slug>/`, shows under it. |
| Workflow (1-4) | Oneshot, Grill, Spec or Freeform, with what each is for and a live preview of its stages. |
| Open a PR when done (p) | Keeps or drops the `pr` stage. |
| Worktree (w) | This checkout, or the task's own git worktree. |
| Model, Effort | Session default, or Fable, Opus, Sonnet or Haiku and an effort for the task's turns. |
| Create task (c) | Writes the task, opens the task pane and runs the first stage. |

Multi-line text is kept as `.scratch/<slug>/ticket.md`, and the first stage is handed that file. A GitHub issue is read with `gh issue view`: its title becomes the name, the task starts as a ticket, and `ticket.md` holds the title, the link and the body.

### Task pane

`/matt` opens it (`b` there opens the board).

- A header with the workflow badge, the title and the status, and a line with the folder, `stage k of n`, and the model and effort when the task sets them.
- The numbered stages, each done, now or ahead, with what it produced under it. The spec and tickets stages say `approved` or `waiting for approval`. Freeform lists the skills it ran instead.
- The next command as the primary button (`n`) with why it is next, then Open artifact (`o`), Allow edits (`e`, while a planning phase holds code edits) and Board (`b`).
- The last five things that happened, and the keys that work now.
- With no task open, three numbered directions and a New task button.

### Band and quickbar

The band above the prompt reads `matt · [Spec 2/6] to-spec · Waiting for you`, then the next command as a button and why it is next. Past `clearAt` percent of the context, the why gives way to a nudge to `/clear` first.

Under it, the quickbar: a row of phrase buttons (digits 1-9 once the band has focus).

| When | Buttons |
| --- | --- |
| A spec or tickets gate waits | `/matt doc` |
| Planning (`grill-with-docs`, `wayfinder`, `to-spec`, `to-tickets`) | `continue` |
| Building (`implement`, `implement-spec`, `diagnosing-bugs`) | `continue`, `/code-review`, `run the checks` |
| `pr` | `/retro` |
| Context at or past `clearAt` | `/clear` |

Your own phrases follow (`/matt bar add`). A phrase that starts with `/` runs as a command, any other is sent as a prompt (one sent while a turn runs waits for it), and a `--fill` phrase goes into the prompt box ahead of what you typed, for you to finish. Phrases live in the mod's store, so they follow you across projects.

### Artifact tab

`/matt doc`, or `o` in the task pane, opens the newest file the task produced, drawn as Markdown. A select switches between the task's files; issue and PR links are listed below.

- Approve (`a`) shows while the task waits at a spec or tickets gate and the file belongs to that stage.
- Revise (`r`) puts `Revise <file>: ` in the prompt for you to finish.
- Copy path (`y`) copies the file's path.

A file past 10,000 characters shows its first part and says how much is left.

### Board pane

`/matt board`: a New task button, then one row per task with its status, title (a digit switches to it), workflow, stage and `waiting` while a gate waits. Open tasks come first.

## How it reads the flow

- **Stages** are the user-invoked skills (`grill-with-docs`, `wayfinder`, `to-spec`, `to-tickets`, `implement`, `implement-spec`, `retro`), plus a model-invoked one where the task's workflow has it (`pr`, and `diagnosing-bugs` for a broken task). Running one moves the task to that phase.
- **Steps** are the other model-invoked skills (`grilling`, `prototype`, `research`, `tdd`, `code-review` and the rest). They are recorded inside the current phase and never move it.
- Both are seen through one event, so typing `/to-spec` and the model calling the Skill tool look the same.

## What it does in each phase

- **Planning phases** (`grill-with-docs`, `wayfinder`, `to-spec`, `to-tickets`), outside Freeform, refuse code edits from Write, Edit and NotebookEdit. Markdown, `.scratch/` and edits right after a `prototype` step go through. The refusal tells the model to ask you for `/matt allow`.
- **Gates**: after `to-spec` and `to-tickets` the next step is `/matt approve`, pointing at the artifact to read first. When the artifact lands, a toast says so once. Gates always wait for a person.
- **Artifacts**: files written under `.scratch/`, and the URLs `gh issue create` and `gh pr create` print, are recorded against the phase that made them. A later artifact wins over an earlier one, and live code beats any document.
- **Reminder**: each tracked skill's prompt carries the task, its workflow, the phase and the artifacts so far, and tells the model to use the task's slug as the feature slug, so a local spec lands next to `task.json`.
- **Stage done**: the mod gives the model a tool, `mcp__matt__stage_done`, and each stage's prompt asks it to call the tool once the stage's work is finished. The task logs it, and the model is told the next step is yours or matt's to run.
- **Implement** on `main` or `master`: the prompt asks for a branch or a worktree before the first edit.
- **Checks** (test, typecheck, lint) are logged with their outcome. `pr` gets each check's first failure and latest run for its Evidence section.
- **CI**: once a PR exists, `gh pr checks` is polled every minute until it settles, then logged and shown.
- **Retro** gets the task's timeline: stages, steps, artifacts, approvals, held edits, checks and CI, in minutes from the start.
- **Context**: past `clearAt` percent the band suggests `/clear` before the next stage. The task survives `/clear`; sessions are disposable, the task is durable.

## Model, effort and worktree

- **Model and effort** set on a task (the dialog, or `--model` and `--effort`) apply to the main loop's requests while the task is open; subagents keep their own. The status line reads `matt: <model> at <effort>` while it applies. `fable`, `opus`, `sonnet` and `haiku` map to their current ids; any other word needs a full id (`claude-sonnet-5-5`), or the task keeps the session's model and a toast says why.
- **Worktree**: a new task made with its own worktree enters one named after its slug right after it is created. Task files stay in the main working tree, and the worktree reaches them through a `.scratch` link, so artifacts and `task.json` live in one place.

## The board

[`board.html`](./board.html) is a claude.ai artifact page with one card per task: its workflow badge, its status ("Waiting for you" glows amber), the model and effort when set, a rail with a progress line through the stages and the gates drawn as signals, the next command with a Copy button, the checks and CI, and the activity log. Tasks waiting on you sort first, and closed ones rest in a list below. The rail runs vertically on a phone. It reads a `tasks` collection from the artifact's database and redraws as documents change, so it is published once and never republished for new data.

The mod keeps it current. After `/matt share <link>`, every change to a task reaches the board about three seconds later as one `ArtifactData` batch write: one document per task, id `<repo>--<slug>`, the flow already worked out (rail, gates, status, next step, evidence, journey) so the page only draws. One board serves every repo. Each sync is two tool calls (a read for the document's version, then the write), so allow `ArtifactData` in your permissions to keep them from prompting. The board never knows whether a turn is running, so it shows Waiting, Ready or Done, never Working.

To publish your own board, publish `board.html` as an artifact with the `db` capability (`rules: [{ path: "", read: "view", write: "owner" }]`), then run `/matt share` with its link. Only you can open it until you share it from the page's Share menu.

## Settings

| Option | Default | Meaning |
| --- | --- | --- |
| `autoAdvance` | `false` | After `/matt approve`, and after the model reports a build or closing stage done (`implement`, `implement-spec`, `diagnosing-bugs`, `pr`), run the next stage at once. It never starts a build from planning, never crosses a gate, and a full context holds it. |
| `clearAt` | `50` | The context percentage from which the band, the quickbar and each gate suggest `/clear`. |

## The task file

`.scratch/<slug>/task.json` holds the workflow (and whether it ends in a PR, works in a worktree, and runs on a chosen model and effort), the phase, the skill history, ordered artifact pointers (never copies) and an event log. `ticket.md` beside it holds the task's own description when there is more than a title. `$.store` remembers which task is open per project, so the next session picks it up.

Other mods can use the `$.matt` noun (`task`, `create`, `all`, `next`, `run`, `enter`, `produce`, `note`, `approve`, `allow`, `watch`, `share`, `board`, `sync`, `load`, `save`, `resume`), typed in [`types/index.d.ts`](./types/index.d.ts), and hook its methods as events (`matt.create`, `matt.produce`).

## Limits

- The gates are advisory. A hook that fails is skipped, and file edits made through Bash are not held.
- Paths are compared lexically, not through symlinks.
- The entry and workflow guesses are a keyword heuristic and a small classifier; `--start` and `--flow` override them.
- One CI watch at a time: the latest PR.
- The model table in `hooks/flows.ts` is kept by hand.
- If Claude Code asks before the model calls `mcp__matt__stage_done`, allow it in your permissions.

## Developing

```sh
claude plugin validate plugins/matt
claude plugin test plugins/matt
npx -p typescript@5 tsc -p plugins/matt
```

The type check needs the engine's declarations, which Claude Code writes to `.claude-plugin/types/` when it loads the plugin (or `/plugin-types plugins/matt`).

| File | Holds |
| --- | --- |
| `hooks/flows.ts` | The workflows as data: their stages, labels, models and the why of each next step. |
| `hooks/flow.ts` | The flow: stages, steps, the next action, gates, the rail, the status. Pure. |
| `hooks/trail.ts` | Evidence, the timeline, CI parsing and the skill reminder. Pure. |
| `hooks/noun.ts` | The `$.matt` noun: every read and write of the task. |
| `hooks/status.ts` | What the band and the panes say and how they style it. Pure. |
| `hooks/ui.tsx` | The busy flag and the band. |
| `hooks/ui-pane.tsx` | The task pane. |
| `hooks/ui-board.tsx` | The board pane. |
| `hooks/dialog.tsx`, `hooks/draft.ts` | The new-task dialog, and what typing and picking do to its draft (pure). |
| `hooks/doc.tsx` | The artifact tab. |
| `hooks/quickbar.tsx` | The quickbar and `/matt bar`. |
| `hooks/autonomy.ts` | Stage done, auto-advance, the gate notice, the task's model and effort, and worktree entry. |
| `hooks/board.ts` | The document each task becomes on the board artifact. Pure. |
| `board.html` | The board artifact page. |
| `hooks/register.tsx` | The command and the hooks on skills and tool calls. |
