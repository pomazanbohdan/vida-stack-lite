---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-migrate-from-gsd-2-md-46be8048-c01"
title: "gsd-core: docs/how-to/migrate-from-gsd-2.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/migrate-from-gsd-2.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/migrate-from-gsd-2.md\"}"
atom_ids:
  - a-stopped-migration-writes-nothing-and-is-safe-to-rerun
  - surface-every-unresolved-conflict-instead-of-discarding-it
atom_count: 2
atoms: "[{\"atom_id\":\"a-stopped-migration-writes-nothing-and-is-safe-to-rerun\",\"file_sha256\":\"2603ede9f59dde68a1513e488e1c00636dda0a0ae6da5833ff85a485fe2f5ff6\",\"content_sha256\":\"f4abf1a4cd1a7978021daf62f2fa1d6dae1b8b322c474a761612601e580789e4\",\"file_bytes\":1363,\"body_bytes\":181},{\"atom_id\":\"surface-every-unresolved-conflict-instead-of-discarding-it\",\"file_sha256\":\"9080bd76670f4503e690cd42e7e0580b6d39d168ad3c71610a3b07723c437f05\",\"content_sha256\":\"59d51548b6ce2373261370761ea898e2711fc70c23aee26a156f0f1eb54eeb98\",\"file_bytes\":1332,\"body_bytes\":192}]"
carrier_sha256: 69923195e4b238f5b7846dd62d57295a71774007972887c5809431fd34ffba99
carrier_bytes: 3036
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-stopped-migration-writes-nothing-and-is-safe-to-rerun -->
---
instruction_id: a-stopped-migration-writes-nothing-and-is-safe-to-rerun
title: A stopped migration writes nothing and is safe to re-run
summary: "Conflict detection runs before any write: a migration that finds a contradiction stops, writes nothing, and can be re-run once the contradiction is resolved."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - revertable-increments
conditions_applies_when: A migration is about to be run over content that may contradict what is already there.
conditions_does_not_apply_when: The target is empty.
artifact_contract_output_type: migration-halt
artifact_contract_required_data:
  - the conflicts found
  - what was written
  - what to do before re-running
artifact_contract_verified_by: nothing was written and the migration can be re-run after the conflict is resolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/migrate-from-gsd-2.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# A stopped migration writes nothing and is safe to re-run
it prints a conflict report and stops without writing any files.
The migration is safe to re-run until it passes cleanly.
<!-- vpmodule:atom:end a-stopped-migration-writes-nothing-and-is-safe-to-rerun -->
<!-- vpmodule:atom:begin surface-every-unresolved-conflict-instead-of-discarding-it -->
---
instruction_id: surface-every-unresolved-conflict-instead-of-discarding-it
title: Surface every unresolved conflict instead of discarding it
summary: Only the strongest class of contradiction stops the run; every other conflict is surfaced for review rather than silently discarded.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: An import or a merge produces contradictions between the sources it reads.
conditions_does_not_apply_when: No contradiction was found.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the buckets
  - the contradictions
  - which ones stop the run
artifact_contract_verified_by: every unresolved contradiction appears in the report and only the strongest class hard-stops
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/migrate-from-gsd-2.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Surface every unresolved conflict instead of discarding it
Hard-stops only occur on LOCKED-vs-LOCKED ADR contradictions; everything else is surfaced for your review, not silently discarded.
<!-- vpmodule:atom:end surface-every-unresolved-conflict-instead-of-discarding-it -->