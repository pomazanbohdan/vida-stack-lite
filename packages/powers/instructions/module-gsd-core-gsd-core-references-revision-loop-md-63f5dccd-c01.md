---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-revision-loop-md-63f5dccd-c01"
title: "gsd-core: gsd-core/references/revision-loop.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/references/revision-loop.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/revision-loop.md\"}"
atom_ids:
  - keep-a-conflict-out-of-the-revision-budget
  - run-bounded-fix-loop
  - start-a-fresh-agent-for-each-revision-round
  - stop-the-revision-loop-when-the-issue-count-stops-falling
atom_count: 4
atoms: "[{\"atom_id\":\"keep-a-conflict-out-of-the-revision-budget\",\"file_sha256\":\"9d8e23d8605d583a3fedfd402c540eb49fffd293951b509d63872d603741bafd\",\"content_sha256\":\"2ffd81b9cd888fd7b96f9fdaf1ac7be1a6b0b5d81c0d8cf54e71eddf28d09aa6\",\"file_bytes\":1895,\"body_bytes\":710},{\"atom_id\":\"run-bounded-fix-loop\",\"file_sha256\":\"243bde32c3ed283f080cea88720b6382147a2696b63c262c8c49de18b0a09fe3\",\"content_sha256\":\"7da1415b61d3d8c9ff0ed3c6f5ece1f5af37e2e9e5623211fdf581d7379d7f9d\",\"file_bytes\":3231,\"body_bytes\":1833},{\"atom_id\":\"start-a-fresh-agent-for-each-revision-round\",\"file_sha256\":\"eb202c6272bb798a81ec16359d13c24751c4b9efef981de4343a6f819593ed8f\",\"content_sha256\":\"44859401d2f69fa50b9dfaf23332a649de87e4071648b04f7308fc5922aa751e\",\"file_bytes\":1812,\"body_bytes\":583},{\"atom_id\":\"stop-the-revision-loop-when-the-issue-count-stops-falling\",\"file_sha256\":\"b461d21c062ed7d0982fd8e5967b48bbdf2c7b12a924b2e1f307f989fea19b7d\",\"content_sha256\":\"96b96d1fdc3570325a5ac761451f8a9eab5abded6c4192e23b155309d05f6b3f\",\"file_bytes\":2691,\"body_bytes\":1469}]"
carrier_sha256: 6b9934d20d67adda67042e4884502014d62c02d9b4bf80c0a28f2ab87e2a134f
carrier_bytes: 10184
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-a-conflict-out-of-the-revision-budget -->
---
instruction_id: keep-a-conflict-out-of-the-revision-budget
title: Keep a conflict out of the revision budget
summary: "A conflict return is not a failed attempt: it consumes no revision iteration, and it is bounded twice — by the repeat of one property and by the total number of conflicts."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - stop-on-conflict
conditions_applies_when: The producing agent reports that it cannot apply a suggestion without breaking a constraint.
conditions_does_not_apply_when: The agent addressed the finding.
artifact_contract_output_type: conflict-budget
artifact_contract_required_data:
  - the conflict
  - the repetition count
  - the total conflict count
artifact_contract_verified_by: the conflict consumed no revision iteration and the conflict budget was tracked separately
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/revision-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep a conflict out of the revision budget
Do NOT increment the iteration counter and do NOT update `prev_issue_count`. Do NOT re-spawn the checker yet — the conflict is not a revised output
A conflict naming the SAME `required_property` twice in a row means the chosen resolution did not take. Stop re-spawning; escalate as a stall
Count every conflict return in this revision loop, whatever property each names. On the THIRD, stop and escalate — an agent that alternates property names never trips the repeat rule, so the repeat rule alone leaves the loop unbounded
A conflict still never consumes a revision iteration — the cap on conflicts is separate from, and additional to, the cap on revisions
<!-- vpmodule:atom:end keep-a-conflict-out-of-the-revision-budget -->
<!-- vpmodule:atom:begin run-bounded-fix-loop -->
---
instruction_id: run-bounded-fix-loop
title: Bound the fix loop at five rounds
summary: "Fix findings round by round, resume the same implementer for the first three rounds, and adjudicate whatever remains at the cap."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - revision-round-continuity-policy
conditions_applies_when: A review returned a confirmed finding that must be fixed.
conditions_does_not_apply_when: "There are no findings, or they are already closed by evidence."
artifact_contract_output_type: fix-loop
artifact_contract_required_data:
  - open findings
  - round
  - scoped re-review
  - ruling
artifact_contract_verified_by: a scoped re-review of each fix round
compatibility_excludes:
  - start-a-fresh-agent-for-each-revision-round
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/references/fix-loop.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/re-review-prompt.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/revision-loop.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Bound the fix loop at five rounds
The loop triggers when the review reports spec ❌, any Critical or Important finding, or a ⚠️ item you confirmed as a real gap.
Minor findings never enter the loop.
A finding labeled plan-mandated — or any finding that conflicts with what the plan's text requires — is yours to rule on.
Do not dismiss the finding because the plan mandates it.
A fix round is one fix dispatch plus one scoped re-review. Five rounds maximum per task.
Rounds 1-3 — resume the original implementer. Send it the open findings verbatim.
If your harness cannot send another message to a live subagent, dispatch a fresh implementer carrying the brief path, the report-file path, and the findings.
Rounds 4-5 — dispatch a fresh implementer on a more capable model, with the brief path, the report-file path, the open findings.
Every round, the implementer fixes, re-runs the tests covering the amended code, appends its fix report to the same report file, and returns the short contract.
Before re-dispatching the reviewer, confirm the fix report contains the covering tests, the command run, and the output.
The re-review is scoped: the re-reviewer verdicts each finding ADDRESSED or NOT ADDRESSED and flags new breakage in the fix diff only.
Out-of-scope observations go to the ledger as deferred minors — they never extend the loop.
Never fix findings yourself in the controller session — your context stays clean for coordination, and controller fixes skip review.
The breaker: when round 5's re-review still leaves findings open, stop dispatching.
Adjudicate each open finding yourself — you hold the plan and the cross-task context the reviewer lacks.
Adjudicating earlier to end a loop is pre-judging with a different name.
Every adjudication is a ledger entry — a silent discard is forbidden.
<!-- vpmodule:atom:end run-bounded-fix-loop -->
<!-- vpmodule:atom:begin start-a-fresh-agent-for-each-revision-round -->
---
instruction_id: start-a-fresh-agent-for-each-revision-round
title: Start a fresh agent for each revision round
summary: "Every revision round runs in a fresh agent with the checker's issues inlined verbatim, because continuing in the same context keeps the blind spots that produced the issues."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
  - revision-round-continuity-policy
conditions_applies_when: A checker sent the work back and the producer is re-dispatched.
conditions_does_not_apply_when: The work is not being revised.
artifact_contract_output_type: revision-dispatch
artifact_contract_required_data:
  - the issues passed to the new agent
  - the context the new agent started with
artifact_contract_verified_by: "the new agent received the checker's issues verbatim and did not continue the previous context"
compatibility_excludes:
  - run-bounded-fix-loop
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/revision-loop.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Start a fresh agent for each revision round
**Each iteration gets a fresh agent spawn** -- don't try to continue in the same context
**Checker feedback must be inlined** -- the revision agent needs to see exactly what failed
When re-spawning the producing agent for revision, pass the checker's YAML-formatted issues. The checker's output contains a
heading followed by a YAML block. Parse this block and pass it verbatim to the revision agent.
Display iteration progress before each revision spawn: `Revision iteration {N}/3 -- {blocker_count} blockers, {warning_count} warnings`
<!-- vpmodule:atom:end start-a-fresh-agent-for-each-revision-round -->
<!-- vpmodule:atom:begin stop-the-revision-loop-when-the-issue-count-stops-falling -->
---
instruction_id: stop-the-revision-loop-when-the-issue-count-stops-falling
title: Stop the revision loop when the issue count stops falling
summary: "The revision loop counts the issues the checker returns and stops early when the count does not fall between two rounds, because a stuck producer does not become unstuck with more rounds."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
  - verification-rerun-policy
conditions_applies_when: A checker sends the work back for revision.
conditions_does_not_apply_when: No issue was returned.
artifact_contract_output_type: revision-loop-record
artifact_contract_required_data:
  - the issue count per round
  - the round that stopped the loop
  - the state presented to the user
artifact_contract_verified_by: the loop stopped when the count stopped falling and the final state was presented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/revision-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop the revision loop when the issue count stops falling
Track the number of blocking and warning issues returned by the checker on each iteration. If the count does not decrease between consecutive iterations, the producing agent is stuck and further iterations will not help. Break early and escalate to the user.
**INFO-level issues are always acceptable** -- they don't trigger revision
**Don't silently swallow issues** -- always present the final state to the user after exiting the loop
If issues persist after 3 revision cycles:
1. Present remaining issues to the user
2. Use a gate prompt
question: "Issues remain after 3 revision attempts. Proceed with current output?" header: "Proceed?" options: - label: "Proceed anyway"   description: "Accept output with remaining issues" - label: "Adjust approach"  description: "Discuss a different approach"
3. If "Proceed anyway": accept current output and continue
4. If "Adjust approach" or "Other": discuss with user, then re-enter the producing step with updated context
Track the number of Critical + Important issues returned by the checker on each iteration. If the count does not decrease between consecutive iterations, the producing agent is stuck and further iterations will not help. Break early and escalate to the user
**Each iteration gets a fresh agent spawn** -- don't try to continue in the same context
**Checker feedback must be inlined** -- the revision agent needs to see exactly what failed
<!-- vpmodule:atom:end stop-the-revision-loop-when-the-issue-count-stops-falling -->