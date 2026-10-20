---
instruction_id: refresh-by-re-verifying-only-the-stale-claims
title: Refresh by re-verifying only the stale claims
summary: "The stale claims are computed from the ledger, confirmed in one exchange, and re-checked on their own; the result is a delta appended to the report."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An existing report is older than the freshness of its claims.
conditions_does_not_apply_when: The report was written moments ago.
artifact_contract_output_type: refresh-delta
artifact_contract_required_data:
  - the stale claims
  - "the delta of confirmed, changed and overturned claims"
  - the warning for an overturned load-bearing claim
artifact_contract_verified_by: only the stale claims were re-checked and the delta is appended with the update date bumped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/lifecycle.md
status: active
revision: 1
---

# Refresh by re-verifying only the stale claims
Read `<folder name>.md` and `.memlog.md` — never re-research from scratch.
- Build the refresh set mechanically: assemble the claims (`claim`, `class`, `pub_date`) from the ledger, map the pack’s freshness bars to a months-per-class JSON
- the stale flags are the candidate set. Confirm it in one exchange, re-verify just those claims, and deliver a **delta report** (confirmed / changed / overturned, new sources)
- An overturned load-bearing claim triggers an explicit warning naming the downstream artifacts that consumed it.
