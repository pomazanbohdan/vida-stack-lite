---
instruction_id: verify-exported-evidence
title: Check that exported evidence still supports each finding
summary: "After scrubbing, resolve every citation inside the bundle, confirm the cited content supports the claim, and report privacy and support separately."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: An artifact is being prepared for delivery or archiving.
conditions_does_not_apply_when: The artifact never leaves where it was created.
artifact_contract_output_type: export-evidence-check
artifact_contract_required_data:
  - findings
  - included evidence
  - limitations
  - outcomes
artifact_contract_verified_by: each exported finding checked against included evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/templates/bundle-README.md
status: active
revision: 2
---

# Check that exported evidence still supports each finding
After scrubbing, check every material exported finding using only this bundle.
Resolve its citation to an included transcript or source marker.
Read the cited command, result, or quotation.
Verify that it supports the claim.
Path and line existence alone are insufficient.
Record specific limitations when the redaction level or necessary withholding removes support.
Reconcile the report, case, environment, findings, README, and any local issue draft.
Refresh the scrub-log counts against final files, excluding the log itself.
Remove stale export statements; distinguish bundle preparation from archive delivery.
Retain a mapping from historical anchors to included evidence.
Record the independent privacy audit separately from evidence usefulness.
Privacy audit: CLEAN or unresolved misses.
Evidence support: supported or limited, with affected findings and reasons.
If content changes after checking, repeat the affected checks.
Present the final log, file list, and both outcomes for the existing archive approval.
Archive the reviewed files and verify the delivered archive matches them.
Record archive delivery outside the reviewed bundle rather than changing its contents after approval.
