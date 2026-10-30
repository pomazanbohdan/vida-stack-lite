---
instruction_id: keep-a-rule-until-what-it-is-about-is-gone
title: Keep a rule until what it is about is gone
summary: "Remove a rule only when its subject is gone or now enforced by a tool, or when a human removes it; a quiet period never retires it."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A rule in the repository's instructions is under review for removal."
conditions_does_not_apply_when: "The rule is stale, wrong, harmful or contradictory."
artifact_contract_output_type: rule-retention-decision
artifact_contract_required_data:
  - the rule
  - the ground for removal
  - who removed it
artifact_contract_verified_by: the removal names a ground other than the absence of recent failures
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/theory-of-project-context.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/set-and-maintain-project-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep a rule until what it is about is gone
A rule stays until what it is about is gone, or you retire it.
A policy or pitfall is removed only when what it is about is gone — deleted, or now enforced by a tool — or when a human removes it.
Absence of recent failures is never grounds: a working rule erases the evidence that it is still needed.
The same protection covers every instruction a human wrote.
It goes only when it is stale or wrong, already enforced by a hook or a check, harmful or contradictory, or you approve the deletion as a line item — never because it looks derivable, and never because it is discoverable somewhere in the repository.
