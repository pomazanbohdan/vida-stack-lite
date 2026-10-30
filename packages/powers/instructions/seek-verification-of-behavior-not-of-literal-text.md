---
instruction_id: seek-verification-of-behavior-not-of-literal-text
title: "Seek verification of behavior, not of literal text"
summary: The verification that counts exercises the behavior; a check that only matches the wording of a document or a prompt is not verification of it.
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: "The change produced a document, a prompt or an artifact and the search for its verification starts."
conditions_does_not_apply_when: The artifact is produced deterministically and its output is inspected.
artifact_contract_output_type: verification-target
artifact_contract_required_data:
  - the behavior that needs verification
  - the checks that would observe it
artifact_contract_verified_by: every check that is accepted executes the behavior and inspects its output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Seek verification of behavior, not of literal text
Seek verification of behavior, not the literal text of implementation or documentation artifacts.
Tests may assert exact content or structure when they execute deterministic construction or transformation and inspect its output, including generated prompts and request payloads.
Do not seek phrase-existence assertions over hand-authored prompts, skills, documents, or source files.
