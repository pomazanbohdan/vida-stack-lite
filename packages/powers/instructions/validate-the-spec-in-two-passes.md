---
instruction_id: validate-the-spec-in-two-passes
title: Validate the spec in two passes
summary: "Sweep the result in two passes — coherence against the rules, then preservation claim by claim — and record both verdicts."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A specification has been created or updated and is about to be presented.
conditions_does_not_apply_when: Nothing was written.
artifact_contract_output_type: validation-verdict
artifact_contract_required_data:
  - the coherence verdict
  - the preservation verdict
  - the wrapper-only content that was dropped
artifact_contract_verified_by: both verdicts are recorded and every dropped claim is on the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Validate the spec in two passes
After every create or update, sweep the resulting artifact in **two passes** before presenting.
Every spec must satisfy these eight rules. The operation aims for them; the self-validate sweep enforces them.
Pass 1 — Coherence. Judge the spec against Spec Law rules 1–6 and 8. For anything that fails or feels weak, attempt to fix it without inventing content the input did not support.
Calls made without direct confirmation become `assumptions[]`; gaps that could not be filled become `open_questions[]`.
Pass 2 — Preservation. Walk the source claim by claim.
Confirm each load-bearing claim landed in
the spec or a companion.
Wrapper-ceremony drops are logged under "Wrapper-only content" so the drop is on the record, not silent.
Record the verdict for each pass to
the run log.
In interactive mode, review it with the user.
