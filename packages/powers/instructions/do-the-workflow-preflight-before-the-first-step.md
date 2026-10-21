---
instruction_id: do-the-workflow-preflight-before-the-first-step
title: Do the workflow preflight before the first step
summary: "Check the run's settings against their allowed values, run the activation steps in order, and hold the facts they declare for the whole run."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A multi-step workflow is about to start and it declares settings and activation steps.
conditions_does_not_apply_when: The workflow declares no settings and no activation steps.
artifact_contract_output_type: workflow-preflight
artifact_contract_required_data:
  - the checked settings
  - the activation steps that ran
  - the facts held for the run
artifact_contract_verified_by: the settings were checked before the first step and every declared fact is held for the whole run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/workflow.md
status: active
revision: 4
---

# Do the workflow preflight before the first step
The review mode: quick or thorough.
The interactive mode: true or false.
The fix mode: apply or handoff.
Stop and name the wrong value.
Run each of these in order before step 1
(_None._ means skip)
Hold every entry below as fact for the whole run.
Entries prefixed `file:` are paths or globs under the project root to read under the project root to read under the project root to read
The rest are facts verbatim
Then run each of these in order...
