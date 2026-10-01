# Flow

The vocabulary of the flow mod, which tracks work from idea to ship.

**Task**: One unit of work followed from idea to ship. Exactly one is open at a time.

**Workflow**: The fixed chain of stages a task follows (Oneshot, Grill, Spec, Wayfind, Freeform).

**Stage**: A user-invoked skill that moves a task to a phase (for example Settle decisions, Build, Open the PR).

**Step**: A model-invoked skill recorded inside the current phase without moving it.

**Gate**: A stage boundary that waits for a person to approve before the flow moves on.

**Band**: The framed panel above the prompt showing the open task, its stages and its next actions.

**Quickbar**: The row of the person's own phrases under the band.

**Board**: The pane that lists every task, walks the open one's stages and offers what to do next; where a person picks the task to work on.

**Board artifact**: The claude.ai page every task is sent to, to follow tasks away from the terminal.

**Next action**: The single recommended command for the open task, shown as the band's button and as ghost text.

**Ghost text**: The next action offered dim in the empty prompt, for Tab to take.

**In progress**: A stage under way between turns; it stays so until the model reports it done.

**Ready**: Nothing under way: the stage is done, approved, or not started, so the next action can run.

**Needs approval**: A gate with something recorded to read, waiting for a person.
