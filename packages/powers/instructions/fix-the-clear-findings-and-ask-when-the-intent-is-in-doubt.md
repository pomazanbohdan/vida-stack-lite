---
instruction_id: fix-the-clear-findings-and-ask-when-the-intent-is-in-doubt
title: Fix the clear findings and ask when the intent is in doubt
summary: "Fix the findings that are clear and come back to the human when the intent cannot settle one; edits to the other documents are drafted, not applied, and the owning tool applies them."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A change has been built and reviewed.
conditions_does_not_apply_when: The review produced no findings.
artifact_contract_output_type: review-outcome
artifact_contract_required_data:
  - the findings fixed
  - the findings left open
  - the drafted edits
artifact_contract_verified_by: a finding whose fix depends on the intent was handed to the human
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/implementation-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Fix the clear findings and ask when the intent is in doubt
It fixes clear findings itself and returns to the human when intent is in doubt.
It drafts the edits to the PRD, architecture, UX, and stories and does not apply them: the user applies those through the owning skills.
Its handoff lists the added, removed, resequenced, or rescoped epics and stories for the user to apply
