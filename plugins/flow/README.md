# flow

A Claude Code mod (a plugin of function hooks) that tracks one task at a time through the idea-to-ship flow [`ask-matt`](../../skills/engineering/ask-matt/SKILL.md) draws. Each task follows a workflow you pick when you open it: a form to start it, a band above the prompt that says what to do now, a board to pick a task and walk its stages, and a tab to read and approve what each stage wrote.

The skills stay harness-agnostic. The mod only watches them run and drives them as slash commands: every stage is still a command you can type by hand, and nothing in the flow needs the mod.

## Try it

In this repo it loads by itself: `.claude/skills/flow` links it, and Claude Code loads a plugin from a project's `.claude/skills/<name>`. Anywhere else, either point at the folder:

```sh
claude --plugin-dir <path to this repo>/plugins/flow
```

or install it from this repo's marketplace, which lists the whole stack (see [The stack](#the-stack)):

```sh
claude plugin marketplace add stanvx/matt-skills-flow
claude plugin install flow@stanvx-flow
```

Function hooks are early access. The mod needs a Claude Code build that ships them (2.1.285 or later).

```text
/flow new
```

That opens the new-task dialog. Describe the work, pick a workflow, and Create writes `.scratch/<slug>/task.json` and runs the first stage. `/flow new retry failed checkout payments` skips the form. Either way a band sits above the prompt and says what to do now. While a stage is under way:

```text
╭────────────────────────────────────────────────────────────────────────────────────╮
│ Retry failed checkout payments   ● Settle decisions → ○ Build → ○ 2 more     /flow │
│ ● In progress  reply in the prompt, or move on  [ Build ]                          │
╰────────────────────────────────────────────────────────────────────────────────────╯
```

Once the model reports the stage done, the next one is ready. Press `1` in an empty prompt, or take the ghost text the prompt shows (`/implement`: Tab, then Enter):

```text
╭────────────────────────────────────────────────────────────────────────────────────╮
│ Retry failed checkout payments   ✓ 1 done → ○ Build → ○ 2 more               /flow │
│ ● Ready  [ 1: Build ] /implement                                                   │
╰────────────────────────────────────────────────────────────────────────────────────╯
```

At a gate the frame turns to the theme's warning color, and `1` opens the spec beside the transcript, where `a` approves it:

```text
╭────────────────────────────────────────────────────────────────────────────────────╮
│ Retry failed checkout payments                                               /flow │
│ ✓ 1 done → ● Write the spec ◆ → ○ Split into tickets ◆ → ○ 3 more                  │
│ ◆ Needs approval  [ 1: Read the spec ]  then approve it there                      │
╰────────────────────────────────────────────────────────────────────────────────────╯
```

In a build stage, an edit to code turns the frame to the theme's permission color until a check passes after it. The band says what is missing, and counts the round of edit and check, a check's failed tries and the reworks (captured from a live terminal, 120 columns):

```text
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Retry failed checkout payments   ✓ Settle decisions → ● Build ◇ → ○ Open the PR → ○ Look back                  /flow │
│ ◇ Needs proof  `pnpm test` is failing  [ Prove it ]  round 2 · failed 1 of 3 tries · 1 rework                        │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

`/flow` (or `/flow` on the band) opens the board: every task, the open one's stages, and the same next step on Enter.

## First run

Three settings decide how much the proof gate can see. Set them once per machine (`claude plugin configure flow` lists them and which are unset, or use the plugin's rows in `/config`), and the last one once per repo:

1. **`checks`**: the proof gate counts a known test, lint or typecheck runner. If the repo's real check is a script (`scripts/ci.sh`, `make smoke`), name it here, or a build there only ever reads Needs proof until `/flow allow`.
2. **Jev**: set `jevApiKey` (or export `TYPESAFE_API_KEY`) and `jevMode` to `shadow`. Leave it there for a week of real work, read `/flow jev`, and switch to `on` only if what it would have done looks right. `off` sends nothing anywhere. See [Jev](#jev).
3. **A verify skill per repo**: a task marked as having a UI is proven only once the change was seen working. In each repo with a UI, run `/flow:create-verification-skill` once: it writes a `verify` skill that launches the app and looks at the change, and running that skill counts as seen. Without one, a screenshot or note saved as `.scratch/<slug>/proof*` counts.

## Commands

| Command | What it does |
| --- | --- |
| `/flow new` | Opens the new-task dialog (on a surface with fields; on mobile it prints the usage). |
| `/flow new [--workflow <workflow>] [--start ticket\|idea\|broken\|foggy] [--model <m>] [--effort <e>] [--no-pr] [--worktree] [--ui] <what>` | Opens a task, or resumes the one with the same title. `--workflow` and `--start` override the guesses about how it proceeds and where it joins. `--ui` marks a task that changes something a person sees. |
| `/flow` | Opens the board pane with the keys, and prints the task for the model. |
| `/flow board` | Opens the board pane, and prints every task under `.scratch/` with its status. |
| `/flow switch <slug>` | Makes another task the open one. |
| `/flow use oneshot\|grill\|spec\|wayfind\|freeform` | Moves the open task to another workflow. |
| `/flow doc [pointer]` | Opens the artifact tab on the newest file the task produced, or the one named. |
| `/flow approve [path or link]` | Approves the spec or the tickets, so the flow moves on. It needs something recorded to approve; naming the file or link you read records it first, for a spec written where the mod could not see it. Only a person can: a run from a notification, a schedule, a peer session or another plugin is refused. |
| `/flow allow` | Lifts the code-edit gate for the rest of a planning phase, or waives the proof a build's edits so far still need. A person's call, like approve, and logged for the retro. |
| `/flow bar [add [--fill] [--label <l>] <text> \| rm <n> \| clear]` | Lists or edits your quickbar phrases. |
| `/flow share <artifact link>` | Sends every task to a board artifact on claude.ai, and each change after it. `/flow share off` stops. |
| `/flow jev` | Says whether Jev is off, shadowing or on, and what it judged lately. |
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
2. **Clear the map**: every later `/wayfinder` resolves one frontier ticket. The next step is always `/wayfinder <map>`, with `/clear` between tickets, and the board counts the ticket sessions. When the way is clear, the person presses **Map is clear** (on the band, or `m` on the board), which runs `/to-spec`; from there it is the Spec workflow.

Both are planning phases, so code edits wait, as the skill itself asks.

## The screens

One vocabulary everywhere: the task's title, its stages in words, and a status.

| Status | Means |
| --- | --- |
| Working | a model turn is running (dim) |
| In progress | a stage is under way between turns: reply, or move on once it is done (the theme's Claude accent) |
| Needs approval | a spec or tickets gate has something to read (warning) |
| Needs proof | a build stage's code was edited and no check has passed since, or one is failing (permission) |
| Needs you | the same check failed three times in a row, or the model reported the stage blocked (error) |
| Ready | the stage is done (the model reported it with `stage_done`, and a build's checks pass), approved, or not started yet, so the next one can run (success) |
| Done | the task is closed (dim) |

Colors are Claude Code's theme keys (`claude`, `warning`, `permission`, `error`, `success`), not fixed ANSI names, so the band, the board and the dialog follow your light, dark or colorblind theme as the engine's own screens do.

Stages read in words, with the command beside them: Settle decisions (`/grill-with-docs`), Chart the map and Clear the map (`/wayfinder`), Diagnose (`diagnosing-bugs`), Write the spec (`/to-spec`), Split into tickets (`/to-tickets`), Build (`/implement`), Build the tickets (`/implement-spec`), Open the PR (`pr`), Look back (`/retro`). A strip draws them in order: `✓` done, `●` under way, `○` ahead (bold for the one to start next), `◆` after a stage you approve, and after a build stage whose code was edited `◇` while it needs proof and `◈` once its checks pass (in the dialog's preview, a dim `◇` marks the build stage before it starts). The SVG strip on desktop draws the same marks: a hollow diamond, cored once proven. Where the band has no room for every name, it names the stage under way and the next one and counts the rest (`✓ 1 done`, `○ 3 more`); with no room for that either, as beside a docked board, it names the stage under way and where it falls (`● Build ◇ · 2 of 4`). A strip is one line: it is cut at its end, never wrapped inside a stage. A button's key leads its label (`1: Build`), as the terminal writes it on a plain button by itself, and hints read in lowercase (`tab moves · enter selects · esc back`).

### Band

The band above the prompt is a framed panel in the status's color with two rows: the title, the strip and `/flow` (which opens the board); then the status and the one thing to do now.

| Status | What the band offers |
| --- | --- |
| Ready | The next stage on `1`, its command beside it; Map is clear too while clearing a map. |
| In progress | Reply in the prompt, or move on to the next stage (a button, no key). |
| Needs approval | Read the spec (or tickets) on `1`: the artifact tab, where `a` approves. |
| Needs proof | What is missing, and Prove it (a button, no key), which asks the model to run the checks and show the change working. The same ask is the ghost text. A gap only Jev found starts `Jev:`. |
| Needs you | Why the stage is stuck. Reply in the prompt. |
| Working | Nothing to press. |

After the actions, dim, the counts worth steering by, each only once there is one: the build's round past the first (`round 2`), a failing check's tries before it reads Needs you (`failed 1 of 3 tries`), the reworks Jev found (`2 reworks`), and `Jev shadow` or `Jev on`.

Only Ready and Needs approval take a key: while a stage is under way, a digit typed into the empty prompt starts your reply, and no digit ever approves anything. Past `clearAt` percent of the context, Ready and Needs approval add a nudge to `/clear` first. With too few rows for the frame, the band folds to one line. With no task open it is one row: New task and Tasks.

The next step is also ghost text in the empty prompt: Tab takes it, Enter runs it. It is offered once there is a step to take (the next stage when Ready, `/flow doc` at a gate), after each turn, after approving and after switching task. While a stage is under way, the engine's own guess at your reply stands.

### Quickbar

Your own phrases sit in a row under the band (`/flow bar add`), on the digits from `2` while a task is open, nine in all. A phrase that starts with `/` runs as a command, any other is sent as a prompt (one sent while a turn runs waits for it), and a `--fill` phrase goes into the prompt box ahead of what you typed, for you to finish. Phrases live in the mod's store, so they follow you across projects.

### Board pane

`/flow`, `/flow board`, or `/flow` on the band opens it with the keys; its footer says which keys work. Beside a fullscreen transcript it docks, asking for 60 columns (a width you dragged it to wins, and is kept): Tab walks its buttons, the arrows scroll, and Esc hands the keys back with the board still open. Inline above the prompt it is a dialog: Tab and the arrows walk its buttons, and it closes on Esc and before any button that starts work.

- **Tasks**: a row per task with its status, the open one marked `›`, closed ones dim. Pressing a row opens that task (reopening a closed one). New task (`c`) opens the dialog, and Catch me up (`r`) runs `/recall` on the open task: where the work stands, from your own chat history and the live state.
- **Stages** of the open task under its workflow, with where it stands at the right (`step 2 of 4`), each with its command, `you approve`, `needs approval` or `approved` on a gate, `needs proof` or `proven` on a build stage with its checks underneath (and what showed the change working, once something did), its files by name underneath, and CI under the PR stage. Freeform lists the skills it ran.
- **Counts** under the stages: the band's counts, and always Jev's mode, with its latest read of the open task while it is not off (`Jev shadow, last turn end: short: only static checks ran`).
- **Actions**, the one to do now first and on Enter: the next stage (`n`), or at a gate Read the spec (`o`) and Approve (`a`), or Prove it (`v`) while a build needs proof; Map is clear (`m`); open the newest file (`o`); Allow edits (`e`) while a planning stage holds code edits. While a stage is under way, `continue`, `/code-review` and `run the checks` sit below them; once a build is proven and Ready, `/code-review` and `/codex:adversarial-review` do, so a review can come before the PR.
- **Before the first task**: each workflow with what it is for and its stages, a legend for the two marks (`◆` waits for your approval, `◇` a build finished once its checks pass), and New task.

At session start with no task open, it opens by itself where it can dock (the engine seats an unasked pane only from 144 columns).

### New-task dialog

`/flow new` with no text, or New task on the band or the board, opens a form that takes the keyboard; Esc or Cancel drops the draft.

| Field | What it does |
| --- | --- |
| What | The work, or a GitHub issue URL or `#123`. The name and the guessed workflow follow what you type; Enter refines the guess and moves on. |
| Name | Defaults to the first line. The folder it gets, `.scratch/<slug>/`, shows under it. |
| Workflow (1-5) | Oneshot, Grill, Spec, Wayfind or Freeform, with what each is for and the strip of its stages, redrawn as you pick: `◆` on a stage you approve, `◇` on the build stage the proof gate holds, and a line saying what each mark means. |
| Open a PR when done (p) | Keeps or drops the `pr` stage. |
| Work in its own git worktree (w) | The task's own worktree, or this checkout. |
| Has a UI (u) | The task changes something a person sees, so its build is proven only once the change was seen working. |
| Model, Effort | Session default, or Fable, Opus, Sonnet or Haiku and an effort for the task's turns. |
| Create task (c) | Writes the task and runs the first stage; beside a fullscreen transcript it opens the board too. |

Multi-line text is kept as `.scratch/<slug>/ticket.md`, and the first stage is handed that file. A GitHub issue is read with `gh issue view`: its title becomes the name, the task starts as a ticket, and `ticket.md` holds the title, the link and the body.

### Artifact tab

`/flow doc`, or Read on the band or the board, opens the gate's file or the newest one the task produced, drawn as Markdown, with the keys: the arrows scroll and each button's letter presses it. A select switches between the task's files; issue and PR links are listed below.

- Approve (`a`) shows while the task waits at a spec or tickets gate and the file belongs to that stage. Approving closes the tab and offers the next step in the prompt.
- Revise (`r`) puts `Revise <file>: ` in the prompt for you to finish.
- Copy path (`y`) copies the file's path.

When a spec or tickets land, the tab opens on them by itself beside the transcript, without taking the keys. A file past 10,000 characters shows its first part and says how much is left.

Mermaid diagrams in a file are drawn as text art, sized to the pane; a flowchart too wide for it is turned the other way when that fits better. `to-spec` is asked for one diagram of the key flow and `to-tickets` for a flowchart of the tickets and their blocking edges, so both show up here. For diagrams in the conversation itself, install [claude-mermaid](https://github.com/galElmalah/claude-mods/tree/main/claude-mermaid) beside this mod.

## How it reads the flow

- **Stages** are the user-invoked skills (`grill-with-docs`, `wayfinder`, `to-spec`, `to-tickets`, `implement`, `implement-spec`, `retro`), plus a model-invoked one where the task's workflow has it (`pr`, and `diagnosing-bugs` for a broken task). Running one moves the task to that phase.
- **Steps** are the other model-invoked skills (`grilling`, `prototype`, `research`, `tdd`, `code-review` and the rest). They are recorded inside the current phase and never move it.
- Both are seen through one event, so typing `/to-spec` and the model calling the Skill tool look the same.

## What it does in each phase

- **Planning phases** (`grill-with-docs`, both map stages, `to-spec`, `to-tickets`), outside Freeform, refuse code edits from Write, Edit and NotebookEdit. Markdown, `.scratch/` and edits right after a `prototype` step go through. The refusal tells the model to ask you for `/flow allow`.
- **Gates**: after `to-spec` and `to-tickets` the next step is `/flow approve`, pointing at the artifact to read first (never a pull request, even one opened in that phase). Until an artifact is recorded nothing waits: the stage is still under way, and `/flow approve <path or link>` names one the mod did not see. When the artifact lands, a toast says so once and the artifact tab opens on it. Gates always wait for a person: a typed `/flow approve`, one sent from your phone, or flow's own buttons; not `claude -p`, an SDK host, a schedule, a notification or another session.
- **Artifacts**: files written under `.scratch/`, and the URLs `gh issue create` and `gh pr create` print, are recorded against the phase that made them. A later artifact wins over an earlier one, and live code beats any document.
- **Reminder**: each tracked skill's prompt carries the task, its workflow, the phase and the artifacts so far, and tells the model to use the task's slug as the feature slug, so a local spec lands next to `task.json`.
- **Stage done**: the mod gives the model a tool, `mcp__flow__stage_done`, and each stage's prompt asks it to call the tool once the stage's work is finished. The task logs it, the status turns from In progress to Ready, and the model is told the next step is yours or the flow mod's to run. A model that forgets leaves the stage In progress, where moving on is still a button away. With `outcome: "blocked"` the tool records that the stage cannot finish without you, and the status turns to Needs you until something moves.
- **Proof**: a build stage (`implement`, `implement-spec`, `diagnosing-bugs`) is finished on evidence, not on the model's word. Once code is edited there (anything but Markdown and `.scratch/`), the stage is proven only when every check run since the last edit passes in its latest run, and at least one ran. Until then `stage_done` records nothing and tells the model what is missing, which it can act on in the same turn; the band reads Needs proof and never offers the next stage; `/pr`, or any other stage that would leave the build, is told to wait; and Bash `git push`, `gh pr create` and `gh pr merge` are refused, as are an MCP server's `push_files`, `create_or_update_file`, `create_pull_request` and `merge_pull_request`. A local `git commit` goes through. An edit after the report reopens the stage. `/flow allow` waives the proof for the edits so far and ends a stuck loop (a person's call); the next edit needs proof again. The build stages share one account: an unproven edit made in Build is still owed in Diagnose, and moving between them is never held. Freeform holds nothing.
- **Seen working**: a task marked as having a UI (`--ui`, or the dialog's toggle) needs more than passing checks. After the last edit, the repo's `verify` skill must have run (the one `create-verification-skill` writes), or a file named `proof*` must have been saved under `.scratch/<slug>/`: a screenshot, or a note of what was observed. Until then the gap reads "the change has not been seen working".
- **The right skill per stage**: each stage's prompt names the principle that fits it. Building: small verifiable units, proven on the real thing. Diagnosing, or any stage after a rework prompt: the root cause, not the symptom. A UI task: the experience first, and a prototype where a look needs seeing. The retro: lessons become structure. Specs, tickets, PRs and retros: prose without AI tells.
- **Implement** on `main` or `master`: the prompt asks for a branch or a worktree before the first edit.
- **Checks** (test, typecheck, lint) are logged with their outcome. `pr` gets each check's first failure and latest run for its Evidence section.
- **CI**: once a PR exists, `gh pr checks` is polled every minute until it settles, then logged and shown.
- **Retro** gets the task's timeline: stages, steps, artifacts, approvals, held edits, checks and CI, in minutes from the start.
- **Context**: past `clearAt` percent the band suggests `/clear` before the next stage. The task survives `/clear`; sessions are disposable, the task is durable.

## Jev

The proof gate runs on facts: an edit, a check, its exit code. Two things only language carries, and for those the mod can ask [Jev](https://docs.typesafe.ai), TypeSafe's small typed-judgment model. It is off until you set `jevMode`.

| Call | When | What it judges | What follows |
| --- | --- | --- | --- |
| Prompt | You submit a prompt in a build or later stage (not a command, not a reply of three words or fewer) | Whether it says earlier work was wrong, and how: a defect, a mismatch with what was asked, a polish of taste, or a standing rule | Logged. With `on`, a `rework` event on the task, which the retro reads as "Corrections the person made" and which points later skills in that stage at the root cause; a defect or mismatch also carries a note only the model sees: reproduce it and find the root cause first, or restate what was asked against what was built |
| Turn end | A build turn ends with its checks passing and something new having run | How far the evidence goes: nothing ran the change, static checks only, tests, or the change seen working | Logged. With `on`, evidence short of what the task needs (tests, or the change seen working for a task with a UI) turns the status back to Needs proof and says why |

- **Fail open**: no key, a refusal, an unreadable answer or a late one (0.8 s on a prompt, 2 s at a turn's end) leaves everything as it was.
- **Jev never refuses anything**: only the proof gate's facts hold `stage_done`, `/pr` or a push. Jev adds a note, an event, or keeps the band from reading Ready, and `/flow allow` waives that too.
- **Auto-advance does not wait for Jev**: the turn-end judgment lands after the turn, so with `autoAdvance` on, the next stage may already have started on the facts alone.
- **`shadow` first**: it asks and logs without acting, so `/flow jev` shows what it would have done on your own prompts before you turn it on. The thresholds in `hooks/jev.ts` are starting points.
- **What is sent**: the task's title and phase, your prompt (first 2,000 characters), the last reply (last 1,500 to 2,000), changed file paths, the Bash commands run since the last edit (200 characters each) and the names of MCP and browser tools called, never their arguments. It goes to `api.typesafe.ai`, or `jevBaseUrl`. Leave `jevMode` off where that is not acceptable.
- **Cost**: about 250 ms and a few thousandths of a cent per call, measured from one machine.

`evals/jev.eval.ts` runs the same questions against labelled cases, live, to check a wording or a threshold before it ships (`bun plugins/flow/evals/jev.eval.ts`). `evals/prove.ts` asks the turn-end questions about any done claim. `evals/taste.ts` is the taste pass for the mod's own screens: give it real captures (a `tmux capture-pane` of a live session, screens separated by `## <name>` lines) and Jev scores each for clarity, unexplained terms, noise and competing actions.

## The stack

The mod drives skills from three places, and this repo's marketplace (`stanvx-flow`) lists them together:

| Plugin | What it brings | Source |
| --- | --- | --- |
| `mattpocock-skills` | The stages and steps: grilling, specs, tickets, `implement`, `diagnosing-bugs`, `code-review`, `prototype`, `research`, `handoff`, `retro` | this repo |
| `flow` | This mod, and nine pstack skills under [`skills/`](./skills/NOTICE.md) | this repo |
| `ponytail` | The least code that works, under every stage | `DietrichGebert/ponytail` |
| `codex` | `/codex:adversarial-review`, the independent review before a build ships | `openai/codex-plugin-cc` |
| `typesafe` | The `typesafe-ai` skill, for changing the Jev questions | `typesafe-ai/skills` |

The nine bundled skills are a pick, not pstack: `principle-prove-it-works`, `principle-fix-root-causes`, `principle-sequence-verifiable-units`, `principle-experience-first`, `principle-encode-lessons-in-structure`, `recall`, `create-verification-skill`, `unslop` and `typescript-best-practices`. They load as `flow:<name>`. [`skills/NOTICE.md`](./skills/NOTICE.md) records where each came from and the few lines changed.

How the report's stages map onto the mod:

| Stage | In the mod | Skills |
| --- | --- | --- |
| Orient | Catch me up, on the board | `recall`, then `ask-matt` or `wayfinder` |
| Plan | The planning stages | `grill-with-docs`, `to-spec`, `to-tickets`, `research` |
| Design | A step inside planning, for a task with a UI | `prototype`, `principle-experience-first` |
| Build | The build stage | `implement`, `principle-sequence-verifiable-units` |
| Prove | A gate on the build stage, not a stage | `principle-prove-it-works`, the repo's `verify` skill |
| Diagnose | A loop inside the build stage | `diagnosing-bugs`, `principle-fix-root-causes` |
| Review | Offered once the build is proven | `code-review`, `/codex:adversarial-review` |
| Ship | `pr`, held until proven | `pr` |
| Close out | `retro` | `handoff`, `principle-encode-lessons-in-structure`, `writing-for-agents` |

## Model, effort and worktree

- **Model and effort** set on a task (the dialog, or `--model` and `--effort`) apply to the main loop's requests while the task is open; subagents keep their own. The status line reads `flow: <model> at <effort>` while it applies. `fable`, `opus`, `sonnet` and `haiku` map to their current ids; any other word needs a full id (`claude-sonnet-5-5`), or the task keeps the session's model and a toast says why.
- **Worktree**: a task made with its own worktree runs every stage there. Before the flow mod runs a stage it enters the task's worktree (the one named after its slug, or a new one) unless the session is already in one, so a resumed task goes back to its worktree too. Task files stay in the main working tree, and the worktree reaches them through a `.scratch` link, so artifacts and `task.json` live in one place.

## The board artifact

[`board.html`](./board.html) is a claude.ai artifact page with one card per task: its workflow badge, its status ("Needs approval" glows amber), the model and effort when set, a rail with a progress line through the stages and the gates drawn as signals, the next command with a Copy button (led by why the task is held, while it needs proof or you), the counts as pills (`round 2`, `2 reworks`), the checks and CI with what showed the change working, and the activity log with reworks, blocks and sightings colored. A task that needs you gets a red frame, and the header counts the tasks that need proof or you. Tasks waiting on you sort first, and closed ones rest in a list below. The rail runs vertically on a phone. It reads a `tasks` collection from the artifact's database and redraws as documents change, so it is published once and never republished for new data. A new version of `board.html` itself (as this one, which added the held reason, the counts and the sightings) does need republishing to the same link; the documents it reads stay.

The mod keeps it current. After `/flow share <link>`, every change to a task reaches the board about three seconds later as one `ArtifactData` batch write: one document per task, id `<repo>--<slug>`, the flow already worked out (rail, gates, status, why it is held, the counts, next step, evidence, what was seen, journey) so the page only draws. One board serves every repo. Each sync is two tool calls (a read for the document's version, then the write), so allow `ArtifactData` in your permissions to keep them from prompting. The board never knows whether a turn is running, so it shows In progress, Needs approval, Ready or Done, never Working.

To publish your own board, publish `board.html` as an artifact with the `db` capability (`rules: [{ path: "", read: "view", write: "owner" }]`), then run `/flow share` with its link. Only you can open it until you share it from the page's Share menu.

## Settings

| Option | Default | Meaning |
| --- | --- | --- |
| `autoAdvance` | `false` | After `/flow approve`, and after the model reports a build or closing stage done (`implement`, `implement-spec`, `diagnosing-bugs`, `pr`), run the next stage: at once after an approval, and once the turn answers after a report (a turn you interrupt, or one that fails, drops it). It never starts a build from planning, never crosses a gate, never leaves an unproven or stuck build, and waits when the turn ended on a question; a full context holds it too. |
| `clearAt` | `50` | The context percentage from which the band and each gate suggest `/clear`. |
| `checks` | empty | Comma-separated text that marks a Bash command as a check, beside the runners the mod knows: `scripts/ci.sh, make smoke`. |
| `jevMode` | `off` | `off`, `shadow` (ask and log) or `on` (also act). See Jev. |
| `jevApiKey` | empty | The TypeSafe key, kept in secure storage. Empty reads `TYPESAFE_API_KEY` from the environment. |
| `jevBaseUrl` | `https://api.typesafe.ai` | Where `/v1/systemone` is served. |
| `jevModel` | `jev-1.13.0` | Pinned: the thresholds were set against it. |

## The task file

`.scratch/<slug>/task.json` is the source of truth: changes to it run one at a time and each re-reads the file, so two things the model does at once (a report and a write) both land. It holds the workflow (and whether it ends in a PR, works in a worktree, and runs on a chosen model and effort), the phase, the skill history, ordered artifact pointers (never copies) and an event log. `ticket.md` beside it holds the task's own description when there is more than a title. `$.store` remembers which task is open per project, so the next session picks it up.

Other mods can use the `$.flow` noun (`task`, `create`, `all`, `next`, `suggest`, `show`, `run`, `enter`, `produce`, `note`, `approve`, `allow`, `judge`, `watch`, `share`, `board`, `sync`, `load`, `save`, `resume`), typed in [`types/index.d.ts`](./types/index.d.ts), and hook its methods as events (`flow.create`, `flow.produce`).

## Limits

- The gates are advisory. A hook that fails is skipped, and file edits made through Bash are neither held nor seen, so they never ask for proof.
- A check is a known tool (`vitest`, `jest`, `pytest`, `tsc`, `eslint`, `biome`, `ruff`, `mypy` and the like) or a runner with a check task (`pnpm test`, `cargo clippy`, `flutter analyze`, `./gradlew lintDebug`, `go vet`, `mvn verify`), matched by pattern; the `checks` option names what that misses, and a model whose check was not counted is told to report the stage blocked and name it. A pass counts only when the check's own exit status is the command's: with a pipe, an `||`, a trailing `&` or another command after `;` anywhere behind it, it is not counted (a failure still is). A failing check is cleared by running that same command again. The gate knows that a check passed, not what it covered.
- A repo with no check to run needs `/flow allow` after its edits.
- Paths are compared lexically, not through symlinks.
- The entry and workflow guesses are a keyword heuristic and a small classifier; `--start` and `--workflow` override them.
- One CI watch at a time: the latest PR.
- The model table in `hooks/flows.ts` is kept by hand.
- If Claude Code asks before the model calls `mcp__flow__stage_done`, allow it in your permissions.

## Developing

```sh
claude plugin validate plugins/flow
claude plugin test plugins/flow
npx -p typescript@5 tsc -p plugins/flow --noEmit
```

The type check needs the engine's declarations, which Claude Code writes to `.claude-plugin/types/` when it loads the plugin (or `/plugin-types plugins/flow`). Without them `tsc` falls back to its defaults, so keep `--noEmit`: it would otherwise write JavaScript beside every source file.

| File | Holds |
| --- | --- |
| `hooks/flows.ts` | The workflows as data: their stages, labels, models and the why of each next step. |
| `hooks/flow.ts` | The flow: stages, steps, the next action, gates, the rail, the status. Pure. |
| `hooks/trail.ts` | Evidence, the timeline, CI parsing and the skill reminder. Pure. |
| `hooks/proof.ts` | The proof gate: when a build's edits are proven, when it is stuck, and what waits until then. Pure. |
| `hooks/noun.ts` | The `$.flow` noun: every read and write of the task. |
| `hooks/status.ts` | What the band and the board say, the ghost text, and how they style it. Pure. |
| `hooks/strip.ts` | The stage strip: chips, the focused form the band falls back to, and the SVG. Pure. |
| `hooks/mermaid.ts` | Mermaid fences drawn as text art for the artifact tab. |
| `hooks/vendor/mermaid-ascii.js` | [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid)'s ASCII renderer, vendored (MIT; its header says how to rebuild it). |
| `hooks/ui.tsx` | The busy flag, the band and the ghost text. |
| `hooks/ui-pane.tsx` | The board pane. |
| `hooks/dialog.tsx`, `hooks/draft.ts` | The new-task dialog, and what typing and picking do to its draft (pure). |
| `hooks/doc.tsx` | The artifact tab. |
| `hooks/quickbar.tsx` | The quickbar and `/flow bar`. |
| `hooks/jev.ts` | Jev: the questions, the thresholds, the policy, the request and its parser. Pure. |
| `hooks/judge.ts` | The two Jev calls: the prompt read for rework, a build turn's end read for evidence. |
| `hooks/autonomy.ts` | Stage done and its proof check, auto-advance, the gate notice, the task's model and effort, and worktree entry. |
| `hooks/board.ts` | The document each task becomes on the board artifact. Pure. |
| `board.html` | The board artifact page: stages in words, with their commands under them. |
| `hooks/register.tsx` | The command and the hooks on skills and tool calls. |
| `skills/` | The nine pstack skills the stages name, with their notice and licence. |
| `evals/` | Live Jev runs over labelled cases; not loaded by the mod. |
