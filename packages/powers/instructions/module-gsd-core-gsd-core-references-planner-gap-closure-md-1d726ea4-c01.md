---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-gap-closure-md-1d726ea4-c01"
title: "gsd-core: gsd-core/references/planner-gap-closure.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/planner-gap-closure.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-gap-closure.md\"}"
atom_ids:
  - close-only-the-gaps-not-the-deferred-items
  - continue-the-register-numbering-after-the-existing-entries
  - do-not-plan-the-items-that-are-already-scheduled
atom_count: 3
atoms: "[{\"atom_id\":\"close-only-the-gaps-not-the-deferred-items\",\"file_sha256\":\"28385ddadfe5bae513bf59e25a6cdec1ef7ec30ce2567168e9cebc5777c3d93b\",\"content_sha256\":\"34ebf41894a1744cff694dc00ca7c5d4d60133ab719f0c7215b461cdd24e537f\",\"file_bytes\":1630,\"body_bytes\":579},{\"atom_id\":\"continue-the-register-numbering-after-the-existing-entries\",\"file_sha256\":\"b7feee89ab2c504c35787dfd155ebbe9ccf82e9422ace2b3edaf9220d2fde8fb\",\"content_sha256\":\"64982bcdc41e1dbd5817e200a0412ba1f95a1643aad82508c65bb262870ba77f\",\"file_bytes\":1382,\"body_bytes\":295},{\"atom_id\":\"do-not-plan-the-items-that-are-already-scheduled\",\"file_sha256\":\"78d02ccee10116b48efd04f27f3ebd1fa2644d4b426b31620fd95ac63b10b6a4\",\"content_sha256\":\"0ecb5a76f22e1ad74312d2ad73543ecf879dceab2e40d0980f0dbc91d3012c6b\",\"file_bytes\":1509,\"body_bytes\":422}]"
carrier_sha256: bc3e9a0ec70355f021ad4cea6a5ecd94b1f67f2807fa31c059724d5f248997c3
carrier_bytes: 4990
revision: 1
status: active
---
<!-- vpmodule:atom:begin close-only-the-gaps-not-the-deferred-items -->
---
instruction_id: close-only-the-gaps-not-the-deferred-items
title: "Close only the gaps, not the deferred items"
summary: The gap list is the only actionable source for gap-closure planning; the deferred list is not a gap.
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: Gap-closure plans are written from a verification report that carries both a gap list and a deferred list.
conditions_does_not_apply_when: The report carries only gaps.
artifact_contract_output_type: gap-closure-scope
artifact_contract_required_data:
  - the gap items addressed
  - the deferred items left alone
artifact_contract_verified_by: no plan was created for a deferred item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-gap-closure.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Close only the gaps, not the deferred items
**Important: Skip deferred items.** When reading VERIFICATION.md, only the `gaps:` section contains actionable items that need closure plans. The `deferred:` section (if present) lists items explicitly addressed in later milestone phases — these are NOT gaps and must be ignored during gap closure planning. Creating plans for deferred items wastes effort on work already scheduled for future phases
**5. Group gaps into plans** by: same artifact, same concern, dependency order (can't wire if artifact is stub → fix stub first)
<!-- vpmodule:atom:end close-only-the-gaps-not-the-deferred-items -->
<!-- vpmodule:atom:begin continue-the-register-numbering-after-the-existing-entries -->
---
instruction_id: continue-the-register-numbering-after-the-existing-entries
title: Continue the register numbering after the existing entries
summary: New entries in a shared register continue after the highest number already in use; they never restart the sequence.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - stable-identity
conditions_applies_when: A plan adds an entry to a register that earlier plans in the same phase already filled.
conditions_does_not_apply_when: The register is empty.
artifact_contract_output_type: register-entry
artifact_contract_required_data:
  - the highest number in use
  - the new number
artifact_contract_verified_by: the new number continues the sequence and no existing number is reused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-gap-closure.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Continue the register numbering after the existing entries
read the `<threat_model>` blocks of the phase's existing plan files and continue after their highest `T-{phase}-NN` — do not renumber from `T-{phase}-01`
Every ID already names a specific threat in an earlier plan; reusing it makes
<!-- vpmodule:atom:end continue-the-register-numbering-after-the-existing-entries -->
<!-- vpmodule:atom:begin do-not-plan-the-items-that-are-already-scheduled -->
---
instruction_id: do-not-plan-the-items-that-are-already-scheduled
title: Do not plan the items that are already scheduled
summary: Only the gaps section of a report holds items that need new plans; the deferred section holds work that is already scheduled for a later phase.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A report of gaps and deferred items is read to plan the closure work.
conditions_does_not_apply_when: The report holds only gaps.
artifact_contract_output_type: gap-set
artifact_contract_required_data:
  - the items that are gaps
  - the items that were deferred
artifact_contract_verified_by: no deferred item produced a plan and every gap produced one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-gap-closure.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not plan the items that are already scheduled
**Important: Skip deferred items.**
only the `gaps:` section contains actionable items that need closure plans. The `deferred:` section (if present) lists items explicitly addressed in later milestone phases - these are NOT gaps and must be ignored during gap closure planning. Creating plans for deferred items wastes effort on work already scheduled for future phases.
<!-- vpmodule:atom:end do-not-plan-the-items-that-are-already-scheduled -->