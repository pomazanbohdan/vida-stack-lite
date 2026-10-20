---
instruction_id: let-unfinished-work-force-the-rejected-verdict
title: Let unfinished work force the rejected verdict
summary: "Unfinished work makes the machine verdict rejected and is named as the evidence; a person may override it, but the absence of a decision is never recorded as acceptance."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The acceptance verdict is rendered and the completeness of the work is known.
conditions_does_not_apply_when: Every item of the body of work is finished.
artifact_contract_output_type: verdict-rules
artifact_contract_required_data:
  - the unfinished items
  - the machine verdict
  - the override and who made it
artifact_contract_verified_by: "unfinished items make the machine verdict rejected, and a failing epic without a human decision is recorded as not accepted"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/acceptance-verdict.md
status: active
revision: 1
---

# Let unfinished work force the rejected verdict
The **machine** verdict is **rejected**. Name every unfinished ticket in the Acceptance verdict section as the evidence. Do not soften this to accepted-with-open-items: unfinished delivery is not an open finding about a finished epic — the epic itself is incomplete.
Do not render a rejected or accepted verdict from the absence of data — say the check was unavailable and weigh only the criteria and findings you have.
Three hard rules:
1. A human decision always overrides the machine verdict.
2. An epic that fails its criteria with **no** human decision is recorded as **not accepted** — never as silently accepted.
3. A non-empty `pending_tickets` list makes the machine verdict **rejected**, including in headless mode.
