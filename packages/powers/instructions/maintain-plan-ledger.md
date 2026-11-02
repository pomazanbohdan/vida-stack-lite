---
instruction_id: maintain-plan-ledger
title: Keep a per-plan ledger as the recovery map
summary: "Record the plan's identity, completion lines, fix rounds, and deferred minors in its own ledger so the work can be resumed and audited."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A plan runs across several tasks or can be interrupted before the end.
conditions_does_not_apply_when: The work is one short action with nothing to resume.
artifact_contract_output_type: plan-ledger
artifact_contract_required_data:
  - plan identity
  - completed tasks
  - rulings
  - current round
artifact_contract_verified_by: ledger entries match commits and test results
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/references/resuming.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-03-implement.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Keep a per-plan ledger as the recovery map
Each plan owns a workspace, home to every artifact for THIS plan: ledger, briefs, reports, review packages.
Create the ledger with its identity as the first line: `# SDD ledger — plan: <plan file path>`.
Check for this plan's ledger at `<workspace>/progress.md`.
If its first line names your plan file, tasks with a `Task <N>: complete` line are DONE — do not re-dispatch them; resume at the first task without one.
A task whose last line is a fix round is mid-loop: resume the loop at the next round.
A ledger whose first line names a different plan file — or a stray ledger at the old flat path `.superpowers/sdd/progress.md` — is another plan's progress: leave it in place and start your own, fresh.
Record BASE (`git rev-parse HEAD`) before dispatching — the review package and fix-round diffs need it. If the recorded base already holds a value (resumed run), preserve it — never overwrite it.
Append the completion line to the ledger in the same message as your other bookkeeping: `Task <N>: complete (commits <base7>..<head7>, review clean)`.
After each round, append to the ledger: `Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <finding one-liners>; commits <a7>..<b7>)`.
Record Minor findings in the progress ledger as you go: `Task <N>: minor (deferred): <one-liner>`.
A roll-up nobody reads is a silent discard.
The ledger is what survives compaction.
Controllers without one have re-dispatched entire completed task sequences.
Sibling directories belong to other plans; leave them alone.
Delete this plan's workspace only when the final review is clean and its fixes are committed — the git history is the record now.
Before you delete anything, collect every ledger line containing `Ruling:` into your final message.
A ruling that dies with the workspace was a decision made in secret.
