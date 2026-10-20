---
instruction_id: re-derive-the-code-from-a-corrected-plan
title: Re-derive the code from a corrected plan
summary: "A finding whose root cause is in the plan sends the work back to the human; a root cause in the plan itself is fixed in the plan, the code is reverted and re-derived, and the loop count stops the run."
capability_tags:
  - plan-implementation
pattern_tags:
  - expand-contract
conditions_applies_when: A review routed a finding to an intent gap or to a bad plan.
conditions_does_not_apply_when: The findings were routed to a patch or a defer.
artifact_contract_output_type: plan-amendment
artifact_contract_required_data:
  - the root cause of the finding
  - the loop iteration count
  - the amendment of the plan
  - the KEEP instructions
  - the change-log entry
artifact_contract_verified_by: the code was re-derived from the amended plan and the change log records the amendment and what was kept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/build-a-change.md
status: active
revision: 2
---

# Re-derive the code from a corrected plan

Process entries in cascading order. If intent_gap or bad_plan entries exist, they trigger a loopback — lower entries are moot since code will be re-derived. If neither exists, process patch and defer normally.

Before each loopback, read `{plan_file}` frontmatter `review_loop_iteration` (missing means `0`), increment it by 1, and write it back. If it exceeds 5, HALT and escalate to the human.

**intent_gap** — Root cause is inside `<frozen-after-approval>`. Revert code changes. Loop back to the human to resolve.

**bad_plan** — Root cause is outside `<frozen-after-approval>`. Before reverting code: extract KEEP instructions for positive preservation (what worked well and must survive re-derivation). Revert code changes. Read the `## Plan Change Log` in `{plan_file}` and strictly respect all logged constraints when amending the non-frozen sections that contain the root cause. Append a new change-log entry recording: the triggering finding, what was amended, the known-bad state avoided, and the KEEP instructions.

Do not modify or delete existing entries.

Each entry records: what finding triggered the change, what was amended, what known-bad state the amendment avoids, and any KEEP instructions (what worked well and must survive re-derivation).

Empty until the first bad_plan loopback.
If the code is wrong because the plan was weak, or the plan is wrong because the goal was wrong, it goes back to that layer and regenerates from there instead of patching only the diff.
