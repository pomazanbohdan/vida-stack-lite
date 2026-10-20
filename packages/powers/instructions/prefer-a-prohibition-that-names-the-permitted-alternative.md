---
instruction_id: prefer-a-prohibition-that-names-the-permitted-alternative
title: Prefer a prohibition that names the permitted alternative
summary: "Write the negative constraint rather than the positive one, and always name the permitted alternative next to the ban."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A rule in the repository's instructions can be written as a prohibition or as positive guidance."
conditions_does_not_apply_when: A guardrail cannot be phrased positively at all.
artifact_contract_output_type: constraint-form-choice
artifact_contract_required_data:
  - the prohibition
  - the permitted alternative
artifact_contract_verified_by: the prohibition names what is allowed instead
compatibility_excludes:
  - write-directive-rules
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/theory-of-project-context.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/set-and-maintain-project-context.md
status: active
revision: 1
---

# Prefer a prohibition that names the permitted alternative
Negative constraints over positive guidance, which measured better, and which is why a prohibition here always names the permitted alternative.
Conventions that differ from ecosystem defaults, because an agent follows the norm unless told otherwise.
A fact nobody would get wrong by default is not worth a line.
