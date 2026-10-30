---
instruction_id: annotate-every-security-exclusion-with-a-reason-an-owner-and-an-expiry
title: "Annotate every security exclusion with a reason, an owner and an expiry"
summary: "A scanner exclusion is a structured annotation with a reason, an owner and an expiry; a strict scan honours neither an un-annotated nor an expired exclusion."
capability_tags:
  - harden-security-controls
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "A file is excluded from a security scan, or the exclusion list is reviewed."
conditions_does_not_apply_when: No file is excluded from any scan.
artifact_contract_output_type: exclusion-annotation
artifact_contract_required_data:
  - the reason for the exclusion
  - the owner of the exclusion
  - the expiry date of the exclusion
  - the rule id for a wildcard pattern
artifact_contract_verified_by: "a strict scan scans a file whose exclusion is un-annotated or expired, and the lint rejects a bare path"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=SECURITY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Annotate every security exclusion with a reason, an owner and an expiry
Bare paths are accepted in default mode with a deprecation warning but are rejected in strict mode.
The lint runs on every PR.
Required keys: `reason`, `owner`, `expires`.
Wildcard patterns (`**`, `*.ext`) also require `rule-id`.
Run this during every release and scheduled security review:
The `--strict` flag:
- Does **not** honour grandfathered (un-annotated) exclusions — those files are scanned.
- Skips any exclusion whose `expires` date is in the past — those files are scanned.
- Is intended to surface accumulated exclusion debt that default mode masks.
If `--strict` finds findings that default mode does not, those findings represent either (a) an entry that should have been annotated and renewed, or (b) an actual secret that was only hidden by a stale exclusion.
In both cases: investigate, remediate, and update the exclusion annotation.
