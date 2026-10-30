---
instruction_id: tell-absent-empty-and-failed-apart
title: "Tell absent, empty and failed apart"
summary: "Absence, emptiness and failure are three different answers: an absent value fails loudly with a diagnostic, while a present but empty value is a real answer."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: "A routine reads a value that may be absent, empty, or unfetchable."
conditions_does_not_apply_when: The value is always present and is never fetched at runtime.
artifact_contract_output_type: distinguished-answer
artifact_contract_required_data:
  - "the state of the value: absent, empty or failed"
  - the diagnostic that names the missing field
  - the exit or verdict the caller reads
artifact_contract_verified_by: "an absent value answers differently from an empty one, and the caller can tell the two apart"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/failure-is-a-value-argv-and-pick-contracts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell absent, empty and failed apart
absence, emptiness, and failure are three different things, and a routine that cannot tell them apart eventually reports the wrong one.
An unknown flag or an unexpected positional past that boundary is now a loud, non-zero-exit `InvalidArgs` failure instead of a token quietly falling on the floor.
That is indistinguishable from a field that genuinely holds `null` or `''` — a real answer.
A present field's value — including `0`, `false`, `null`, and `''` — is unchanged: those are answers, not failures, and remain exit `0`.
That is rejected on the merits: it demotes *"I could not answer"* to *"the answer is zero"*, which would make a count-gated shell guard fire unconditionally on the very projects that could never resolve the count in the first place — the opposite of what a gate is for.
