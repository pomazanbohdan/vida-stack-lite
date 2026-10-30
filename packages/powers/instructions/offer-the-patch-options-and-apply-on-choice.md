---
instruction_id: offer-the-patch-options-and-apply-on-choice
title: Offer the patch options and apply on choice
summary: "Present the patch findings as a numbered choice — apply them all, leave them as action items, or walk through them — and carry out the chosen one without a per-finding confirmation."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review produced patch findings and the reader has to say what to do with them.
conditions_does_not_apply_when: There are no patch findings.
artifact_contract_output_type: patch-choice
artifact_contract_required_data:
  - the options offered
  - the choice made
  - the summary of what was changed
artifact_contract_verified_by: the options were offered as a numbered choice and the chosen option was carried out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-04-present.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/review-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Offer the patch options and apply on choice
How would you like to handle the `<P>` `patch` findings?
1. **Apply every patch** — fix all of them now, no per-finding confirmation. Defer and decision-needed items are not touched.
2. **Leave as action items** — they are already in `{plan_file}`
3. **Walk through each patch** — show details for each before deciding
If `plan_file` is **not** set, present only options 1 and 2 (omit "Leave as action items" — findings were not written to a file):
Apply every patch finding without per-finding confirmation. Do not modify defer or decision-needed items.
After all patches are applied, present a summary of changes made. If `plan_file` is set, check off the patch items in it (leave defer items as-is).
Walk through each patch: Present each finding with full detail, diff context, and suggested fix.
After walkthrough, re-offer the applicable options above.
HALT — I am waiting for your numbered choice. Reply with only the number. Do not proceed until you select an option.
When the right fix depends on what you meant, the review doesn't pick one for you: it lists the possible fixes, says which one it would choose and why, and leaves the call to you.
The review lists the fixes and says which one it recommends.
