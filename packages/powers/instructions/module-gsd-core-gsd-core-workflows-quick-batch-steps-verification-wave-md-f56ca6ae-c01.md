---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-quick-batch-steps-verification-wave-md-f56ca6ae-c01"
title: "gsd-core: gsd-core/workflows/quick-batch/steps/verification-wave.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/quick-batch/steps/verification-wave.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/quick-batch/steps/verification-wave.md\"}"
atom_ids:
  - do-not-roll-back-what-already-merged
  - treat-an-unusable-verification-status-as-neither-pass-nor-fail
atom_count: 2
atoms: "[{\"atom_id\":\"do-not-roll-back-what-already-merged\",\"file_sha256\":\"f6644037857e9de76c45672702192f93f7fa2f5d0869cf2706884e5c54f74a10\",\"content_sha256\":\"e1d4f3bc8f406aed0c2e339c9e2d835f3a5797b0ee9acfe437bf98be37dcc16c\",\"file_bytes\":1545,\"body_bytes\":309},{\"atom_id\":\"treat-an-unusable-verification-status-as-neither-pass-nor-fail\",\"file_sha256\":\"065731121bec54536138fabed0d43f98f35b5004b4cc06e87e7a7ec47a4e61e0\",\"content_sha256\":\"b92ffaea88927ea1643839a89f0bb3abb9bd19e5a17c7e92929674fab1ce436f\",\"file_bytes\":1756,\"body_bytes\":375}]"
carrier_sha256: 3aadddcd5a7ee1ba25fd6cdd55f63ba8997d53f934ac98934ff1e512a24fa1fa
carrier_bytes: 3612
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-roll-back-what-already-merged -->
---
instruction_id: do-not-roll-back-what-already-merged
title: Do not roll back what already merged
summary: "A verification that runs after the change is already integrated does not undo the integration: the failure is recorded and routed, and no automatic repair and no rollback runs behind the owner's back."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A verification of an already merged unit reports a failure.
conditions_does_not_apply_when: The change was not integrated yet and can still be abandoned before the merge.
artifact_contract_output_type: post-merge-failure-routing
artifact_contract_required_data:
  - the unit that failed
  - the failure reason
  - the routing that was chosen
artifact_contract_verified_by: the merged change was left in place and the failure was recorded instead of reverted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/verification-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not roll back what already merged
An item this step marks `human_needed` or `failed` is NOT reverted — its worktree was already removed by the successful merge
Mark the item `failed` with the routing's `failureReason`
NO automatic gap-fix retry (v1 exclusion), NO rollback of the already-merged commit
<!-- vpmodule:atom:end do-not-roll-back-what-already-merged -->
<!-- vpmodule:atom:begin treat-an-unusable-verification-status-as-neither-pass-nor-fail -->
---
instruction_id: treat-an-unusable-verification-status-as-neither-pass-nor-fail
title: Treat an unusable verification status as neither pass nor fail
summary: "A report whose status is outside the closed set is refused, and the refusal is an error to record — never a verdict to infer and never a unit to drop silently."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verification report arrives with a status the reader does not accept.
conditions_does_not_apply_when: The report carries one of the accepted statuses.
artifact_contract_output_type: verification-verdict
artifact_contract_required_data:
  - the status that was reported
  - the error that was recorded
  - the options offered
artifact_contract_verified_by: the refusal is recorded as the failure reason and no verdict was inferred from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick/steps/quick-verification.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/verification-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Treat an unusable verification status as neither pass nor fail
A report `status` outside `passed | gaps_found | human_needed` is not a status at all
never read the refusal as a verdict, and never drop the item silently
Do **not** improvise a result
Report that verification produced no usable status
then offer: 1) Re-run the verifier, 2) Accept as-is without verification
<!-- vpmodule:atom:end treat-an-unusable-verification-status-as-neither-pass-nor-fail -->