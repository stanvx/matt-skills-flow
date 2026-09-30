# flow

A Claude Code mod (a plugin of function hooks) that tracks one task at a time through the idea-to-ship flow [`ask-matt`](../../skills/engineering/ask-matt/SKILL.md) draws. Each task follows a workflow you pick when you open it: a form to start it, a pane that shows its stages and gates, a tab to read and approve what each stage wrote, and one recommended next step above the prompt.

The skills stay harness-agnostic. The mod only watches them run and drives them as slash commands: every stage is still a command you can type by hand, and nothing in the flow needs the mod.

## Try it

In this repo it loads by itself: `.claude/skills/flow` links it, and Claude Code loads a plugin from a project's `.claude/skills/<name>`. Anywhere else:

```sh
claude --plugin-dir <path to this repo>/plugins/flow
```

Function hooks are early access. The mod needs a Claude Code build that ships them (2.1.285 or later).

```text
/flow new
```

That opens the new-task dialog. Describe the work, pick a workflow, and Create writes `.scratch/<slug>/task.json`, opens the task pane and runs the first stage. `/flow new retry failed checkout payments` skips the form. Either way a band sits above the prompt:

```text
╭──────────────────────────────────────────────────────────────────────────────╮
│ SPEC 2/6   Retry failed checkout payments                          ● Ready   │
│ ✓ Settle decisions ─► ● Write the spec ◆ ─► ○ Split into tickets ◆           │
│ ─► ○ Build the tickets ─► ○ Open the PR ─► ○ Look back                       │
│ 1: /to-tickets split the spec into tracer-bullet tickets        2: continue  │
╰──────────────────────────────────────────────────────────────────────────────╯
```

Press `1` in an empty prompt to run the next step. At a gate the panel turns yellow, `1` opens what to read, and approving is the button (or `n` once the band has focus, `ctrl+x tab`):

```text
│ [ /flow approve ] read .scratch/retry-failed-checkout-payments/spec.md, then │
│ approve the spec                                           1: Read the spec  │
```

## Commands

| Command | What it does |
| --- | --- |
| `/flow new` | Opens the new-task dialog (on a surface with fields; on mobile it prints the usage). |
| `/flow new [--workflow <workflow>] [--start ticket\|idea\|broken\|foggy] [--model <m>] [--effort <e>] [--no-pr] [--worktree] <what>` | Opens a task, or resumes the one with the same title. `--workflow` and `--start` override the guesses about how it proceeds and where it joins. |
| `/flow` | Shows the task and opens the task pane. |
| `/flow board` | Lists every task under `.scratch/` and opens the board pane; a digit switches task. |
| `/flow switch <slug>` | Makes another task the open one. |
| `/flow use oneshot\|grill\|spec\|wayfind\|freeform` | Moves the open task to another workflow. |
| `/flow doc [pointer]` | Opens the artifact tab on the newest file the task produced, or the one named. |
| `/flow approve [path or link]` | Approves the spec or the tickets, so the flow moves on. It needs something recorded to approve; naming the file or link you read records it first, for a spec written where the mod could not see it. Only a person can: a run from a notification, a schedule, a peer session or another plugin is refused. |
| `/flow allow` | Lifts the code-edit gate for the rest of a planning phase. A person's call, like approve. |
| `/flow bar [add [--fill] [--label <l>] <text> \| rm <n> \| clear]` | Lists or edits your quickbar phrases. |
| `/flow share <artifact link>` | Sends every task to a board artifact on claude.ai, and each change after it. `/flow share off` stops. |
| `/flow done` | Closes the task. The file stays. |

## Workflows

Each task follows one workflow, a fixed chain of stages ([`hooks/flows.ts`](./hooks/flows.ts)):

| Workflow | Stages (a ✓ waits for `/flow approve`) | For |
| --- | --- | --- |
| Oneshot | `implement`, `pr`, `retro` | The ticket already says enough. |
| Grill | `grill-with-docs`, `implement`, `pr`, `retro` | Settle the decisions, then build in one session. |
| Spec | `grill-with-docs`, `to-spec` ✓, `to-tickets` ✓, `implement-spec`, `pr`, `retro` | Bigger work, built across sessions. |
| Wayfind | `wayfinder` (chart the map), `wayfinder` again (clear the map, one ticket per session), `to-spec` ✓, `to-tickets` ✓, `implement-spec`, `pr`, `retro` | Too big and foggy for one session: find the way before building it. |
| Freeform | none | Run any skill; each one is recorded, and no code edit is held. |

- **The guess**: a ticket reference or a bug reads as Oneshot, a foggy effort (greenfield, from scratch, a rewrite) as Wayfind, anything else as Grill. The dialog refines it with a cheap classifier; `--workflow` or a pick overrides it.
- **On-ramp**: something broken starts at `diagnosing-bugs` in place of the first stage.
- **No PR** (`--no-pr`, or the dialog's toggle) drops the `pr` stage.
- **Growing**: running a stage the workflow lacks moves the task to the smallest workflow that has it (`/grill-with-docs` on a Oneshot task makes it Grill, `/to-spec` on a Grill task makes it Spec, `/wayfinder` on any of them makes it Wayfind), and the log says so.
- `implement` and `implement-spec` fill the same place, so a Spec task can be built one ticket at a time.

### Wayfind

[`/wayfinder`](../../skills/engineering/wayfinder/SKILL.md) plans work too big for one session as a map of decision tickets on the issue tracker. Wayfind gives it two stages:

1. **Chart the map**: the first `/wayfinder <idea>` names the destination and creates the map (labelled `wayfinder:map`) and its first tickets. The task keeps the map: a local `map.md`, or the first issue the charting created.
2. **Clear the map**: every later `/wayfinder` resolves one frontier ticket. The next step is always `/wayfinder <map>`, with `/clear` between tickets (the band has both), and the pane counts the ticket sessions. When the way is clear, the person presses **Map is clear** (`m` in the pane, or its button in the band), which runs `/to-spec`; from there it is the Spec workflow.

Both are planning phases, so code edits wait, as the skill itself asks.

## The screens

One vocabulary everywhere: a workflow badge, a stage count, and a status.

| Status | Means |
| --- | --- |
| Working | a model turn is running (dim) |
| Waiting for you | a spec or tickets gate has something to read and waits for `/flow approve` (yellow) |
| Ready | the next stage can run (green) |
| Done | the task is closed (dim) |

Stages read in words, with the command beside them: Settle decisions (`/grill-with-docs`), Chart the map and Clear the map (`/wayfinder`), Diagnose (`diagnosing-bugs`), Write the spec (`/to-spec`), Split into tickets (`/to-tickets`), Build (`/implement`), Build the tickets (`/implement-spec`), Open the PR (`pr`), Look back (`/retro`). A strip draws them in order, `✓ done  ● now  ○ ahead  ◆ you approve`: colored chips on the terminal, a picture that follows light or dark mode on the desktop. The band shows it as a glyph run, the task pane and the dialog in full, wrapped to the pane's width.

### New-task dialog

`/flow new` with no text opens a form that takes the keyboard; Esc or Cancel drops the draft.

| Field | What it does |
| --- | --- |
| What | The work, or a GitHub issue URL or `#123`. The name and the guessed workflow follow what you type; Enter refines the guess and moves on. |
| Name | Defaults to the first line. The folder it gets, `.scratch/<slug>/`, shows under it. |
| Workflow (1-5) | Oneshot, Grill, Spec, Wayfind or Freeform, with what each is for and the strip of its stages, redrawn as you pick. |
| Open a PR when done (p) | Keeps or drops the `pr` stage. |
| Worktree (w) | This checkout, or the task's own git worktree. |
| Model, Effort | Session default, or Fable, Opus, Sonnet or Haiku and an effort for the task's turns. |
| Create task (c) | Writes the task, opens the task pane and runs the first stage. |

Multi-line text is kept as `.scratch/<slug>/ticket.md`, and the first stage is handed that file. A GitHub issue is read with `gh issue view`: its title becomes the name, the task starts as a ticket, and `ticket.md` holds the title, the link and the body.

### Task pane

`/flow` opens it (`b` there opens the board).

- A header with the workflow badge, the title and the status, and a line with the folder, `stage k of n`, and the model and effort when the task sets them.
- The strip, then the numbered stages in words with their commands, each done, now or ahead, with what it produced under it and the legend below. The spec and tickets stages say `approved` or `waiting for approval`. Freeform lists the skills it ran instead.
- The next command as the primary button (`n`) with why it is next, then the step you may take instead when there is one (Map is clear, `m`), Open artifact (`o`), Allow edits (`e`, while a planning phase holds code edits) and Board (`b`).
- The last five things that happened, and the keys that work now.
- With no task open, three numbered directions and a New task button.

### Band and quickbar

The band above the prompt is a framed panel whose frame takes the status's color (yellow while it waits for you): the workflow chip with the stage count, the title and the status; the stages in words; and the action row, the next command with why it is next, then the phase's buttons. Past `clearAt` percent of the context, the why gives way to a nudge to `/clear` first. When the bottom of the screen has too few rows for the panel, it folds to one line: `flow · [Spec 2/6] ✓─●◆─○◆─○─○─○ Write the spec · Waiting for you [/flow approve] … 1: Read the spec`.

Every button there is a bordered chip with a digit, pressed from an empty prompt or once the band has focus. The next step is `1`, except at a waiting gate, where `1` reads the artifact and approving takes `n` with the band focused, so a stray digit never approves anything. The phase's buttons follow:

| When | Buttons |
| --- | --- |
| A spec or tickets gate waits | Read the spec (or tickets): `/flow doc` |
| Charting or clearing a map | Map is clear (`/to-spec`), `/clear` |
| Planning (`grill-with-docs`, `to-spec`, `to-tickets`) | `continue` |
| Building (`implement`, `implement-spec`, `diagnosing-bugs`) | `continue`, `/code-review`, `run the checks` |
| Context at or past `clearAt` | `/clear` |

Your own phrases sit in a row under the panel (`/flow bar add`), numbered after the band's buttons, nine digits in all. A phrase that starts with `/` runs as a command, any other is sent as a prompt (one sent while a turn runs waits for it), and a `--fill` phrase goes into the prompt box ahead of what you typed, for you to finish. Phrases live in the mod's store, so they follow you across projects.

### Artifact tab

`/flow doc`, or `o` in the task pane, opens the newest file the task produced, drawn as Markdown. A select switches between the task's files; issue and PR links are listed below.

- Approve (`a`) shows while the task waits at a spec or tickets gate and the file belongs to that stage.
- Revise (`r`) puts `Revise <file>: ` in the prompt for you to finish.
- Copy path (`y`) copies the file's path.

A file past 10,000 characters shows its first part and says how much is left.

Mermaid diagrams in a file are drawn as text art, sized to the pane; a flowchart too wide for it is turned the other way when that fits better. `to-spec` is asked for one diagram of the key flow and `to-tickets` for a flowchart of the tickets and their blocking edges, so both show up here. For diagrams in the conversation itself, install [claude-mermaid](https://github.com/galElmalah/claude-mods/tree/main/claude-mermaid) beside this mod.

### Board pane

`/flow board`: a New task button, then one row per task with its status, title (press it, Enter or a click, to open that task), workflow, stage, `waiting` while a gate waits, and its next command. Open tasks come first. Digits never switch task: they belong to the band. With no tasks the pane shows a three-step walk-through, and it opens by itself at session start while no task is open.

## How it reads the flow

- **Stages** are the user-invoked skills (`grill-with-docs`, `wayfinder`, `to-spec`, `to-tickets`, `implement`, `implement-spec`, `retro`), plus a model-invoked one where the task's workflow has it (`pr`, and `diagnosing-bugs` for a broken task). Running one moves the task to that phase.
- **Steps** are the other model-invoked skills (`grilling`, `prototype`, `research`, `tdd`, `code-review` and the rest). They are recorded inside the current phase and never move it.
- Both are seen through one event, so typing `/to-spec` and the model calling the Skill tool look the same.

## What it does in each phase

- **Planning phases** (`grill-with-docs`, both map stages, `to-spec`, `to-tickets`), outside Freeform, refuse code edits from Write, Edit and NotebookEdit. Markdown, `.scratch/` and edits right after a `prototype` step go through. The refusal tells the model to ask you for `/flow allow`.
- **Gates**: after `to-spec` and `to-tickets` the next step is `/flow approve`, pointing at the artifact to read first (never a pull request, even one opened in that phase). Until an artifact is recorded nothing waits: the next step is the stage's own command, and `/flow approve <path or link>` names one the mod did not see. When the artifact lands, a toast says so once. Gates always wait for a person: a typed `/flow approve`, one sent from your phone, or flow's own buttons; not `claude -p`, an SDK host, a schedule, a notification or another session.
- **Artifacts**: files written under `.scratch/`, and the URLs `gh issue create` and `gh pr create` print, are recorded against the phase that made them. A later artifact wins over an earlier one, and live code beats any document.
- **Reminder**: each tracked skill's prompt carries the task, its workflow, the phase and the artifacts so far, and tells the model to use the task's slug as the feature slug, so a local spec lands next to `task.json`.
- **Stage done**: the mod gives the model a tool, `mcp__flow__stage_done`, and each stage's prompt asks it to call the tool once the stage's work is finished. The task logs it, and the model is told the next step is yours or the flow mod's to run.
- **Implement** on `main` or `master`: the prompt asks for a branch or a worktree before the first edit.
- **Checks** (test, typecheck, lint) are logged with their outcome. `pr` gets each check's first failure and latest run for its Evidence section.
- **CI**: once a PR exists, `gh pr checks` is polled every minute until it settles, then logged and shown.
- **Retro** gets the task's timeline: stages, steps, artifacts, approvals, held edits, checks and CI, in minutes from the start.
- **Context**: past `clearAt` percent the band suggests `/clear` before the next stage. The task survives `/clear`; sessions are disposable, the task is durable.

## Model, effort and worktree

- **Model and effort** set on a task (the dialog, or `--model` and `--effort`) apply to the main loop's requests while the task is open; subagents keep their own. The status line reads `flow: <model> at <effort>` while it applies. `fable`, `opus`, `sonnet` and `haiku` map to their current ids; any other word needs a full id (`claude-sonnet-5-5`), or the task keeps the session's model and a toast says why.
- **Worktree**: a task made with its own worktree runs every stage there. Before the flow mod runs a stage it enters the task's worktree (the one named after its slug, or a new one) unless the session is already in one, so a resumed task goes back to its worktree too. Task files stay in the main working tree, and the worktree reaches them through a `.scratch` link, so artifacts and `task.json` live in one place.

## The board

[`board.html`](./board.html) is a claude.ai artifact page with one card per task: its workflow badge, its status ("Waiting for you" glows amber), the model and effort when set, a rail with a progress line through the stages and the gates drawn as signals, the next command with a Copy button, the checks and CI, and the activity log. Tasks waiting on you sort first, and closed ones rest in a list below. The rail runs vertically on a phone. It reads a `tasks` collection from the artifact's database and redraws as documents change, so it is published once and never republished for new data.

The mod keeps it current. After `/flow share <link>`, every change to a task reaches the board about three seconds later as one `ArtifactData` batch write: one document per task, id `<repo>--<slug>`, the flow already worked out (rail, gates, status, next step, evidence, journey) so the page only draws. One board serves every repo. Each sync is two tool calls (a read for the document's version, then the write), so allow `ArtifactData` in your permissions to keep them from prompting. The board never knows whether a turn is running, so it shows Waiting, Ready or Done, never Working.

To publish your own board, publish `board.html` as an artifact with the `db` capability (`rules: [{ path: "", read: "view", write: "owner" }]`), then run `/flow share` with its link. Only you can open it until you share it from the page's Share menu.

## Settings

| Option | Default | Meaning |
| --- | --- | --- |
| `autoAdvance` | `false` | After `/flow approve`, and after the model reports a build or closing stage done (`implement`, `implement-spec`, `diagnosing-bugs`, `pr`), run the next stage: at once after an approval, and once the turn answers after a report (a turn you interrupt, or one that fails, drops it). It never starts a build from planning, never crosses a gate, and a full context holds it. |
| `clearAt` | `50` | The context percentage from which the band, the quickbar and each gate suggest `/clear`. |

## The task file

`.scratch/<slug>/task.json` is the source of truth: changes to it run one at a time and each re-reads the file, so two things the model does at once (a report and a write) both land. It holds the workflow (and whether it ends in a PR, works in a worktree, and runs on a chosen model and effort), the phase, the skill history, ordered artifact pointers (never copies) and an event log. `ticket.md` beside it holds the task's own description when there is more than a title. `$.store` remembers which task is open per project, so the next session picks it up.

Other mods can use the `$.flow` noun (`task`, `create`, `all`, `next`, `run`, `enter`, `produce`, `note`, `approve`, `allow`, `watch`, `share`, `board`, `sync`, `load`, `save`, `resume`), typed in [`types/index.d.ts`](./types/index.d.ts), and hook its methods as events (`flow.create`, `flow.produce`).

## Limits

- The gates are advisory. A hook that fails is skipped, and file edits made through Bash are not held.
- Paths are compared lexically, not through symlinks.
- The entry and workflow guesses are a keyword heuristic and a small classifier; `--start` and `--workflow` override them.
- One CI watch at a time: the latest PR.
- The model table in `hooks/flows.ts` is kept by hand.
- If Claude Code asks before the model calls `mcp__flow__stage_done`, allow it in your permissions.

## Developing

```sh
claude plugin validate plugins/flow
claude plugin test plugins/flow
npx -p typescript@5 tsc -p plugins/flow
```

The type check needs the engine's declarations, which Claude Code writes to `.claude-plugin/types/` when it loads the plugin (or `/plugin-types plugins/flow`).

| File | Holds |
| --- | --- |
| `hooks/flows.ts` | The workflows as data: their stages, labels, models and the why of each next step. |
| `hooks/flow.ts` | The flow: stages, steps, the next action, gates, the rail, the status. Pure. |
| `hooks/trail.ts` | Evidence, the timeline, CI parsing and the skill reminder. Pure. |
| `hooks/noun.ts` | The `$.flow` noun: every read and write of the task. |
| `hooks/status.ts` | What the band and the panes say and how they style it. Pure. |
| `hooks/strip.ts` | The stage strip: chips, the band's glyph run and the SVG. Pure. |
| `hooks/mermaid.ts` | Mermaid fences drawn as text art for the artifact tab. |
| `hooks/vendor/mermaid-ascii.js` | [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid)'s ASCII renderer, vendored (MIT; its header says how to rebuild it). |
| `hooks/ui.tsx` | The busy flag and the band. |
| `hooks/ui-pane.tsx` | The task pane. |
| `hooks/ui-board.tsx` | The board pane. |
| `hooks/dialog.tsx`, `hooks/draft.ts` | The new-task dialog, and what typing and picking do to its draft (pure). |
| `hooks/doc.tsx` | The artifact tab. |
| `hooks/quickbar.tsx` | The quickbar and `/flow bar`. |
| `hooks/autonomy.ts` | Stage done, auto-advance, the gate notice, the task's model and effort, and worktree entry. |
| `hooks/board.ts` | The document each task becomes on the board artifact. Pure. |
| `board.html` | The board artifact page: stages in words, with their commands under them. |
| `hooks/register.tsx` | The command and the hooks on skills and tool calls. |
