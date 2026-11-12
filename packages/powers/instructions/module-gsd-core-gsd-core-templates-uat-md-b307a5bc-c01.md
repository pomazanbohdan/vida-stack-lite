---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-uat-md-b307a5bc-c01"
title: "gsd-core: gsd-core/templates/UAT.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/templates/UAT.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/UAT.md\"}"
atom_ids:
  - distinguish-a-skipped-test-from-a-blocked-one
  - only-an-executed-plan-can-resolve-a-gap
  - record-a-gap-with-its-root-cause-and-the-missing-piece
atom_count: 3
atoms: "[{\"atom_id\":\"distinguish-a-skipped-test-from-a-blocked-one\",\"file_sha256\":\"38cc784717468cf419a50db3f9b979972b9d34d8f44116d41f670f4675b5d83c\",\"content_sha256\":\"b5cf002d41c355ba2ce1b24e1e3b825d70756302560451d5ced09a90b179a3a1\",\"file_bytes\":1279,\"body_bytes\":298},{\"atom_id\":\"only-an-executed-plan-can-resolve-a-gap\",\"file_sha256\":\"53d1cf9d7182dd16659cf3b38c206781f9d3f859b6977bac07377457fda66b2f\",\"content_sha256\":\"a3f16c56ac54f3566e2dc1cece576772bf7b5f82213e2780f2317e85f9fb18c3\",\"file_bytes\":1451,\"body_bytes\":375},{\"atom_id\":\"record-a-gap-with-its-root-cause-and-the-missing-piece\",\"file_sha256\":\"08fb1e655c3e9a28648a08eb7687cc9ea75d3dd73714093b82d0fca1e7dcd822\",\"content_sha256\":\"4894b9619e9f23b2514d5fb390a544574a9dcf1b001f46112bb6cc6424bacf90\",\"file_bytes\":1244,\"body_bytes\":178}]"
carrier_sha256: 8e279e44c227df7a11b320f42b226cbaf0136726c9a60003189411a9e77af09b
carrier_bytes: 4423
revision: 1
status: active
---
<!-- vpmodule:atom:begin distinguish-a-skipped-test-from-a-blocked-one -->
---
instruction_id: distinguish-a-skipped-test-from-a-blocked-one
title: Distinguish a skipped test from a blocked one
summary: A skipped test and a blocked test are different outcomes and each carries its own reason.
capability_tags:
  - verify-work-results
pattern_tags:
  - report-triage
conditions_applies_when: A user acceptance test is not passed.
conditions_does_not_apply_when: The test passed.
artifact_contract_output_type: test-outcome
artifact_contract_required_data:
  - the outcome
  - the reason
  - the tag for a blocked test
artifact_contract_verified_by: a skipped test carries a reason and a blocked test carries a tag and a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Distinguish a skipped test from a blocked one
`result` values: [pending], pass, issue, skipped, blocked
**If skipped: add `reason` if provided**
**If blocked: add `blocked_by` (tag) and `reason` (if provided)**
**blocked_by**: server | physical-device | release-build | third-party | prior-phase
<!-- vpmodule:atom:end distinguish-a-skipped-test-from-a-blocked-one -->
<!-- vpmodule:atom:begin only-an-executed-plan-can-resolve-a-gap -->
---
instruction_id: only-an-executed-plan-can-resolve-a-gap
title: Only an executed plan can resolve a gap
summary: A gap is closed by a plan that was executed and produced its summary; a hand-written resolution still blocks.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - verification-before-completion
conditions_applies_when: A failed check is about to be marked as resolved.
conditions_does_not_apply_when: The gap was never recorded.
artifact_contract_output_type: gap-resolution
artifact_contract_required_data:
  - the plan that resolved the gap
  - the date it was resolved
artifact_contract_verified_by: the resolution names a plan that exists with a matching summary and a later regression opens a new gap
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Only an executed plan can resolve a gap
it updates the entry IN PLACE — `status: failed` → `status: resolved` — and adds `resolved_by` (the resolving plan's basename) and `resolved_at` (the date).
a hand-written `status: resolved` with no valid `resolved_by` still blocks
A later regression against the same test gets a fresh `gap_id`, never a reopened resolved one.
<!-- vpmodule:atom:end only-an-executed-plan-can-resolve-a-gap -->
<!-- vpmodule:atom:begin record-a-gap-with-its-root-cause-and-the-missing-piece -->
---
instruction_id: record-a-gap-with-its-root-cause-and-the-missing-piece
title: Record a gap with its root cause and the missing piece
summary: "A recorded gap names the expected behaviour, the root cause and what is missing, so it can be planned against."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - decision-trail
conditions_applies_when: A failure has been diagnosed.
conditions_does_not_apply_when: The failure was not diagnosed yet.
artifact_contract_output_type: gap-record
artifact_contract_required_data:
  - the expected behaviour
  - the root cause
  - the missing piece
  - the files involved
artifact_contract_verified_by: "the gap names the root cause, the artifacts and what is missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Record a gap with its root cause and the missing piece
After diagnosis: fill `root_cause`, `artifacts`, `missing`, `debug_session`
- APPEND only when issue found (YAML format)
<!-- vpmodule:atom:end record-a-gap-with-its-root-cause-and-the-missing-piece -->