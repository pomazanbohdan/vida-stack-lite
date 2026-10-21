---
instruction_id: re-check-a-passing-verification-against-a-content-digest
title: Re-check a passing verification against a content digest
summary: "A pass is re-checked against a digest of every covered input, and a checkout that changes the bytes is fixed rather than called drift."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A completion gate reads a verification report that says passed.
conditions_does_not_apply_when: The gate does not read a verification report.
artifact_contract_output_type: verification-freshness
artifact_contract_required_data:
  - the digest of the covered inputs
  - the verdict the gate produced
artifact_contract_verified_by: the digest was recomputed and the verdict states whether it still holds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/verify-and-ship.md
status: active
revision: 1
---

# Re-check a passing verification against a content digest
A `*-VERIFICATION.md` reporting `status: passed` is re-checked, not cached, every time a completion gate reads it.
The verifier records a digest of every input its verdict covers — the phase's `PLAN.md`/`SUMMARY.md` files, mapped requirements, and implementation files in the change set.
If any of those files changes, disappears, or becomes unreadable after verification, the gate recomputes the digest, finds a mismatch, and reports `stale`.
A checkout without a `.gitattributes` `eol=lf` rule pinning text files to LF (a Windows checkout with `core.autocrlf=true`, for example) can report `stale` on unchanged content — fix with a `.gitattributes` `eol=lf` rule, not by treating it as drift.
