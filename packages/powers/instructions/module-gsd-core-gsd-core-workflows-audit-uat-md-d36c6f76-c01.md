---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-audit-uat-md-d36c6f76-c01"
title: "gsd-core: gsd-core/workflows/audit-uat.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/audit-uat.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/audit-uat.md\"}"
atom_ids:
  - an-empty-result-is-not-all-clear-when-the-parser-could-have-failed
  - check-that-a-recorded-item-still-points-at-something-real
atom_count: 2
atoms: "[{\"atom_id\":\"an-empty-result-is-not-all-clear-when-the-parser-could-have-failed\",\"file_sha256\":\"8561c2c3cc2138da77bb1e14005e07d014bf91a55a4e8539ec8d7618728bdd65\",\"content_sha256\":\"f58fe9a8f436bb46adccb8d1198c471822540e5333d415a95040ba8b32102f10\",\"file_bytes\":1565,\"body_bytes\":268},{\"atom_id\":\"check-that-a-recorded-item-still-points-at-something-real\",\"file_sha256\":\"2b65e2c73192666a43c736682a4d85d4f6de723334e794a07ac9b684b8b3c8ca\",\"content_sha256\":\"e2639f3de85b0de5fab69a48d1c30608f8ea5851f032217ce4271221f2cc20b8\",\"file_bytes\":1505,\"body_bytes\":382}]"
carrier_sha256: ca8be5e3f920ffdf1d9860f8d4433a60c580a550a1f4c2b79b7635645431391e
carrier_bytes: 3431
revision: 1
status: active
---
<!-- vpmodule:atom:begin an-empty-result-is-not-all-clear-when-the-parser-could-have-failed -->
---
instruction_id: an-empty-result-is-not-all-clear-when-the-parser-could-have-failed
title: An empty result is not all-clear when the parser could have failed
summary: "When files could not be parsed, an empty item list is not an all-clear: the unparsed files are reported first, because they may hide outstanding work."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A scan reports nothing and some of the files it read could not be parsed.
conditions_does_not_apply_when: Every file was parsed.
artifact_contract_output_type: unparsed-report
artifact_contract_required_data:
  - the files that could not be parsed
  - the reason the result is not all-clear
artifact_contract_verified_by: the unparsed files are reported and the run does not call the state clear
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-uat.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/autonomous.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# An empty result is not all-clear when the parser could have failed
This is NOT all-clear - one or more files have test blocks that could not be parsed and may be hiding outstanding work.
The report's `status` is outside the closed set
Never read it as "no results".
<!-- vpmodule:atom:end an-empty-result-is-not-all-clear-when-the-parser-could-have-failed -->
<!-- vpmodule:atom:begin check-that-a-recorded-item-still-points-at-something-real -->
---
instruction_id: check-that-a-recorded-item-still-points-at-something-real
title: Check that a recorded item still points at something real
summary: "Every recorded item is checked against the code before it is offered as work: the thing it names may be gone, rewritten, or still there."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A list of recorded items is offered as the work to do.
conditions_does_not_apply_when: The items were just created in this run.
artifact_contract_output_type: item-freshness-check
artifact_contract_required_data:
  - the state of each item
  - the reason it carries that state
artifact_contract_verified_by: every offered item was checked against the code before it was offered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-uat.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Check that a recorded item still points at something real
For each item in "Testable Now", use Grep/Read to check if the underlying feature still exists in the codebase:
If the test references a component/function that no longer exists → mark as `stale`
If the test references code that has been significantly rewritten → mark as `needs_update`
Otherwise → mark as `active`
<!-- vpmodule:atom:end check-that-a-recorded-item-still-points-at-something-real -->