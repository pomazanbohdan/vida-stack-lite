---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-retrospective-references-team-discussion-md-1648844b-c01"
title: "bmad-method: skills/bmad-retrospective/references/team-discussion.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-retrospective/references/team-discussion.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-retrospective/references/team-discussion.md\"}"
atom_ids:
  - let-the-team-discuss-evidence-never-invention
  - run-the-discussion-inline-when-the-agents-are-unavailable
  - seed-the-discussion-with-sourced-findings-and-the-criteria
atom_count: 3
atoms: "[{\"atom_id\":\"let-the-team-discuss-evidence-never-invention\",\"file_sha256\":\"36b0761bd9df761dbd323813e4d60851792aec5ed0d68743320cb51b4dcbc69e\",\"content_sha256\":\"22e4a335c75658574ccc534d22efa8eee273b56543af304a94ad6c1ca8402548\",\"file_bytes\":2094,\"body_bytes\":891},{\"atom_id\":\"run-the-discussion-inline-when-the-agents-are-unavailable\",\"file_sha256\":\"08dadc7fd721f9a28b49d715bd0a644c315638ac8bfefbaaad98c472bdd5906d\",\"content_sha256\":\"fe2ce651162e17e19894450842d9cc45fdfc4527ac1630962a2519858bbf6799\",\"file_bytes\":2146,\"body_bytes\":728},{\"atom_id\":\"seed-the-discussion-with-sourced-findings-and-the-criteria\",\"file_sha256\":\"ef6a114c25cfb2d5940e600564f9094c319d7211d6f23653ae95fee0be074e18\",\"content_sha256\":\"b7dec680840a37263d2f1b4aca8eabcc54e15b0341247e2e5dcca46e932e35c0\",\"file_bytes\":2071,\"body_bytes\":724}]"
carrier_sha256: d902c60c1f3cc5b790df9a42e5da85c19b1cd58459881b956e998bc897db32e7
carrier_bytes: 6804
revision: 1
status: active
---
<!-- vpmodule:atom:begin let-the-team-discuss-evidence-never-invention -->
---
instruction_id: let-the-team-discuss-evidence-never-invention
title: "Let the team discuss evidence, never invention"
summary: "The discussion speaks only to findings that carry a source reference, steers to the process that would have prevented the finding rather than to blame, and never replaces the verdict."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
  - code-audit
conditions_applies_when: A discussion of the findings is held.
conditions_does_not_apply_when: No discussion was asked for.
artifact_contract_output_type: team-discussion
artifact_contract_required_data:
  - the findings under discussion
  - what the discussion surfaced
artifact_contract_verified_by: "every point made in the discussion rests on a sourced finding, and a new observation is a question until it can be sourced"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/team-discussion.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Let the team discuss evidence, never invention
One rule: **the team discusses evidence, never invention.**
Agents speak only to findings that carry source references.
No agent may describe an event that did not happen or report a pattern the diff does not show.
Only when asked — "discuss it as a team," "run party mode," or similar. A default run never enters this phase.
Keep the user an active participant and steer toward systemic understanding over blame — the point is which process or convention would have prevented a finding, not who wrote the line.
Capture anything the discussion surfaces that the analyses missed; a genuinely new observation becomes a finding only once you can tie it to a source, otherwise it is a question for Phase 4, not a conclusion.
The discussion does not replace Phase 4. Its output feeds the action items and the verdict; it does not render them.
<!-- vpmodule:atom:end let-the-team-discuss-evidence-never-invention -->
<!-- vpmodule:atom:begin run-the-discussion-inline-when-the-agents-are-unavailable -->
---
instruction_id: run-the-discussion-inline-when-the-agents-are-unavailable
title: Run the discussion inline when the agents are unavailable
summary: "A discussion that was asked for does not silently fail: it runs inline over the same seed, and the document says that it ran inline and what that costs."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
  - code-audit
  - delegation-requirement-policy
conditions_applies_when: A discussion was asked for and the installed agents cannot be run.
conditions_does_not_apply_when: The discussion ran with the installed agents.
artifact_contract_output_type: inline-discussion
artifact_contract_required_data:
  - the perspectives that were taken
  - the narrowing that the inline run is
artifact_contract_verified_by: the document says the discussion ran inline and names the loss of independent disagreement
compatibility_excludes:
  - treat-a-required-delegation-as-mandatory
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/team-discussion.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run the discussion inline when the agents are unavailable
If the agents are unavailable
a discussion the user asked for must not silently fail to happen.
Run it inline over the same seed — take each perspective yourself, hold every perspective to sourced findings — and record in the retrospective document that the discussion ran inline rather than through the installed agents.
Record it as the narrowing it is: one model playing every role loses the independent disagreement that surfaces missed findings.
State that in the document rather than omitting it.
The planning roles are the exception: if the agent call itself fails with a tool-unavailable error, log the gap and stop instead of collapsing the roles inline.
<!-- vpmodule:atom:end run-the-discussion-inline-when-the-agents-are-unavailable -->
<!-- vpmodule:atom:begin seed-the-discussion-with-sourced-findings-and-the-criteria -->
---
instruction_id: seed-the-discussion-with-sourced-findings-and-the-criteria
title: Seed the discussion with sourced findings and the criteria
summary: "The discussion is seeded with the sourced findings, the gains the evidence confirms, the acceptance criteria and the previous action items, so that every perspective is weighed against facts."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
  - code-audit
conditions_applies_when: A discussion of the findings is set up.
conditions_does_not_apply_when: No discussion was asked for.
artifact_contract_output_type: discussion-seed
artifact_contract_required_data:
  - the findings with their source references
  - the gains the evidence confirms
  - the acceptance criteria
  - the previous action items and whether they landed
artifact_contract_verified_by: "the seed carries the findings with their sources, the confirmed gains and the criteria, and every positive observation is grounded in fact"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/team-discussion.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Seed the discussion with sourced findings and the criteria
Seed the discussion
with the consolidated Phase 2 findings and the epic context, so the installed agents react as real subagents with independent thinking rather than a scripted dialogue.
Seed it with:
- The findings, each with its source reference, grouped by the aggregate view or lens that produced it.
- The improvements the evidence confirms — real gains, patterns that worked — so positive observations are grounded in fact.
- The epic's acceptance criteria (or the profiled stand-in), so the discussion can weigh the verdict.
- The previous epic's action items and whether they landed, when a prior retro exists, so accountability is grounded in fact.
<!-- vpmodule:atom:end seed-the-discussion-with-sourced-findings-and-the-criteria -->