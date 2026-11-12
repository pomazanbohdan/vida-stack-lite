---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-health-md-6d5efd28-c01"
title: "gsd-core: gsd-core/workflows/health.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/health.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/health.md\"}"
atom_ids:
  - a-config-the-run-fails-closed-on-is-not-healthy
  - offer-the-repair-instead-of-running-it
  - report-the-health-findings-by-severity
  - verify-a-repair-by-re-running-the-check-without-it
atom_count: 4
atoms: "[{\"atom_id\":\"a-config-the-run-fails-closed-on-is-not-healthy\",\"file_sha256\":\"711ac7f30337ceee82495b5c6524fd702b5f899e6209aef094881bd100cf6b12\",\"content_sha256\":\"6bbadce05f75aa1cac884ec8c5531462ca72b922655277b21e69e08fcd9cc84f\",\"file_bytes\":1358,\"body_bytes\":237},{\"atom_id\":\"offer-the-repair-instead-of-running-it\",\"file_sha256\":\"090a199f241bbcf9c9abbd253f9458c314e4485a4e1c05310e1a10ddb0c5ad5c\",\"content_sha256\":\"5b9474c647c62c88b164aae082182e9103b65eeec6b24817d35f4d59368fcbf2\",\"file_bytes\":1239,\"body_bytes\":225},{\"atom_id\":\"report-the-health-findings-by-severity\",\"file_sha256\":\"a87efb80f9fabef48e167558cd7f02431bf6bf0ceb13f32d96bcd36e906323cc\",\"content_sha256\":\"37f765a01bd97ca76d7d38b95df0422062173f16f048a1125a7cd4d282d56258\",\"file_bytes\":1326,\"body_bytes\":146},{\"atom_id\":\"verify-a-repair-by-re-running-the-check-without-it\",\"file_sha256\":\"3b5c9eb6128ede2daf540e2850725fcd8fe96365dbdf0d43048f37f0ee39a969\",\"content_sha256\":\"26fc63e434b31a3efceb7259a52505c694f5e25f1a5c26e7da0938e5970aa282\",\"file_bytes\":1352,\"body_bytes\":142}]"
carrier_sha256: 8bafb6eaf89cf4f6ebcd536b17b8cc4116c8b41ea4ccdef2136f27d436df714f
carrier_bytes: 5852
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-config-the-run-fails-closed-on-is-not-healthy -->
---
instruction_id: a-config-the-run-fails-closed-on-is-not-healthy
title: A config the run fails closed on is not healthy
summary: A configuration the execution path refuses to run with makes the state degraded even when the check itself found nothing wrong.
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: The check found a configuration that the execution path would refuse to run with.
conditions_does_not_apply_when: The configuration is one the run can work with.
artifact_contract_output_type: degraded-state-report
artifact_contract_required_data:
  - the configuration that fails closed
  - the warning that was added
  - the degraded status
artifact_contract_verified_by: the status is degraded and the warning is counted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/health.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# A config the run fails closed on is not healthy
a config the execution workflows fail closed on is not a healthy planning state
include it in the displayed warning count
It is not auto-repairable: an explicit `true` may be intentional
<!-- vpmodule:atom:end a-config-the-run-fails-closed-on-is-not-healthy -->
<!-- vpmodule:atom:begin offer-the-repair-instead-of-running-it -->
---
instruction_id: offer-the-repair-instead-of-running-it
title: Offer the repair instead of running it
summary: The repair is offered to the person and only runs after they asked for it.
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The check found issues that can be repaired automatically and the repair was not requested.
conditions_does_not_apply_when: The repair was already requested.
artifact_contract_output_type: repair-offer
artifact_contract_required_data:
  - the number of repairable issues
  - the offer
  - the answer
artifact_contract_verified_by: the repair ran only after it was asked for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/health.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Offer the repair instead of running it
**If repairable issues exist and --repair was NOT used:**
Ask user if they want to run the repair to fix N issues automatically?
If yes, re-run with --repair flag and display results.
<!-- vpmodule:atom:end offer-the-repair-instead-of-running-it -->
<!-- vpmodule:atom:begin report-the-health-findings-by-severity -->
---
instruction_id: report-the-health-findings-by-severity
title: Report the health findings by severity
summary: "The health report states one status and groups the findings into Critical, Important and Minor, with the count per group."
capability_tags:
  - define-output-format
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A health check produced findings about the state of the workspace.
conditions_does_not_apply_when: The check produced nothing.
artifact_contract_output_type: health-report
artifact_contract_required_data:
  - the status
  - the findings per severity
  - the count per severity
artifact_contract_verified_by: the report states the status and the findings grouped by severity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/health.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body only names a health-report status and count fields; it does not guide judgment, express a conditional choice, order actions, or enumerate checks."
---

# Report the health findings by severity
Status: HEALTHY | DEGRADED | BROKEN
Critical: N | Important: N | Minor: N
N issues can be auto-repaired.
<!-- vpmodule:atom:end report-the-health-findings-by-severity -->
<!-- vpmodule:atom:begin verify-a-repair-by-re-running-the-check-without-it -->
---
instruction_id: verify-a-repair-by-re-running-the-check-without-it
title: Verify a repair by re-running the check without it
summary: "After a repair, the check is run again in its ordinary mode and the final state is reported; a configuration that blocks the pipeline makes the state degraded even when the structural check is clean."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A repair was applied to a state that a check reported on.
conditions_does_not_apply_when: No repair was applied.
artifact_contract_output_type: repair-verification
artifact_contract_required_data:
  - the check that was run again
  - the final status
  - the state that still blocks the pipeline
artifact_contract_verified_by: the check was re-run without the repair and the reported status follows its result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/health.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Verify a repair by re-running the check without it
Re-run health check without --repair to confirm issues are resolved
Report final status.
<!-- vpmodule:atom:end verify-a-repair-by-re-running-the-check-without-it -->