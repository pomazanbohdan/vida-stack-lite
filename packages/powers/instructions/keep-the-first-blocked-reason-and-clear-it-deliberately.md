---
instruction_id: keep-the-first-blocked-reason-and-clear-it-deliberately
title: Keep the first blocked reason and clear it deliberately
summary: "Blocked means continuing without a human was unsafe; the plan keeps its first reason, every later dispatch of that item halts, and a retry is only allowed after the cause is fixed and the blocked fields are deliberately cleared."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: An unattended run halted and the item has to be run again.
conditions_does_not_apply_when: The run completed.
artifact_contract_output_type: blocked-record
artifact_contract_required_data:
  - the first blocked reason
  - the cause that was fixed
  - the status the retry resumes from
artifact_contract_verified_by: the blocked fields are cleared explicitly before the item runs again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/unattended-builds.md
status: active
revision: 1
---

# Keep the first blocked reason and clear it deliberately
`blocked` means continuing without a human was unsafe.
A blocked plan halts every later dispatch of its ticket and keeps its first reason.
To retry, fix the cause
which clears the blocked fields.
A plan that holds only frontmatter can be deleted instead, and the next dispatch starts fresh.
