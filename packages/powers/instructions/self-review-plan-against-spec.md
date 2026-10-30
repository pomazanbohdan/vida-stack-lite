---
instruction_id: self-review-plan-against-spec
title: Self-review the plan against the spec
summary: "Run the checklist yourself against the spec, repair the plan once, and block with the failing criteria when it still fails."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan is written and about to be handed off.
conditions_does_not_apply_when: "The plan is unfinished, or there is no spec to check."
artifact_contract_output_type: plan-self-review
artifact_contract_required_data:
  - spec coverage
  - step scan
  - type consistency
  - review focus
  - proportion
artifact_contract_verified_by: checklist run against every spec requirement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Self-review the plan against the spec
After writing the complete plan, look at the spec with fresh eyes and check the plan against it.
This is a checklist you run yourself — not a subagent dispatch.
Spec coverage: skim each section or requirement in the spec. Can you point to a task that implements it? List any gaps.
Step scan: every step must let the implementer write exactly one reasonable thing, and no step may carry more than that.
A line that decides nothing is a gap; a function body the signature and tests already determine is a transcript. Fix both.
Type consistency: do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks?
A function called clearLayers() in Task 3 but clearFullLayers() in Task 7 is a bug.
Review focus: for each input class or failure mode the spec implies, is there a task whose tests exercise it?
Proportion: compare the plan's length to the spec's.
A plan several times longer than the spec it implements is a transcript of the program, not a plan.
If code blocks are most of the document, replace bodies with signatures, test names and assertions, and check that each step is still unambiguous.
If you find issues, fix them inline. No need to re-review — just fix and move on.
If you find a spec requirement with no task, add the task.
An empty review focus section means you checked and found none, not that you skipped the check.

If the plan does not meet the standard: repair it once, then re-read it from disk and verify again.
If it still does not meet the standard, stop with status `blocked`, blocking condition `plan failed ready-for-development standard`, and include the failing criteria and evidence gathered.
