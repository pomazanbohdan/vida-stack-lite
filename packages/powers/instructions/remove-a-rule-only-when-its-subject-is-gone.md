---
instruction_id: remove-a-rule-only-when-its-subject-is-gone
title: Remove a rule only when its subject is gone
summary: "A policy or a pitfall leaves the rules file only when the thing it guards is gone or the user retires it; the absence of recent failures is not a reason, and a human-written rule needs one of the stated grounds."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A rule in the instructions file is being removed.
conditions_does_not_apply_when: The rule is being changed rather than removed.
artifact_contract_output_type: rule-removal
artifact_contract_required_data:
  - the rule
  - what it guards
  - the reason it may go
artifact_contract_verified_by: "the rule was removed for a stated reason, not for the absence of recent failures"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/project-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Remove a rule only when its subject is gone
A policy or pitfall goes only when the thing it guards is gone or the user retires it.
No recent failures is not a reason.
An instruction a human wrote is deleted only when it is stale or wrong, enforced by a hook or check, contradictory, or approved for deletion as its own item.
