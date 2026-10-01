# Vendored skills

The skills in this folder are copied from [michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude) at commit `d709ffc96ca080da762f3527d49bfcf5e493cbc5`, the Claude Code port of [pstack](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan. MIT licensed: (c) 2026 Lauren Tan, (c) 2026 Michael Denyer. The licence travels beside this file as [LICENSE-pstack](./LICENSE-pstack).

Nine of pstack's skills are here, the ones a usage audit showed earn their place in this flow:

| Skill | Where the flow uses it |
| --- | --- |
| `principle-prove-it-works` | The build stages, before a stage is reported done |
| `principle-fix-root-causes` | `diagnosing-bugs`, and any rework after a failed proof |
| `principle-sequence-verifiable-units` | The build stages |
| `principle-experience-first` | Planning and building a task that has a UI |
| `principle-encode-lessons-in-structure` | `retro` |
| `recall` | Catch me up, on the board |
| `create-verification-skill` | Once per repo, to give "seen working" a script |
| `unslop` | Any prose the flow writes |
| `typescript-best-practices` | Loaded by path, on `.ts` and `.tsx` files |

## Changes from upstream

Each change removes a pointer to a pstack skill that is not bundled, or follows this repo's rule against em-dashes. Nothing else is edited, so a re-sync is a copy plus these.

- `recall`: the shared-record sweep names its sources and investigators directly where it pointed at the `why` skill; the pointers to `session-pickup`, `automate-me` and `why/references/epistemics.md` are dropped.
- `principle-prove-it-works`: the pointer to `show-me-your-work` is dropped.
- `principle-sequence-verifiable-units`: the pointer to `build-the-lever` is dropped, and `prove-it-works` is named as it is installed here.
- `typescript-best-practices`: the pointers to `type-system-discipline` and `boundary-discipline` are dropped (the skill and its patterns file).
- `create-verification-skill`: the Codex platform-mapping pointer is dropped, `maintain-verification-skill` is named as not bundled, and five em-dashes are rewritten.
