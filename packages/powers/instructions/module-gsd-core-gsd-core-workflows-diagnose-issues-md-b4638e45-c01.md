---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-diagnose-issues-md-b4638e45-c01"
title: "gsd-core: gsd-core/workflows/diagnose-issues.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/diagnose-issues.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/diagnose-issues.md\"}"
atom_ids:
  - the-declared-isolation-must-match-the-actual-execution
  - the-suggested-fix-is-a-hint-not-a-contract
atom_count: 2
atoms: "[{\"atom_id\":\"the-declared-isolation-must-match-the-actual-execution\",\"file_sha256\":\"20c91a4716e3f24e745b7c12ff2235779b35f5bd3213341728df0c1cd6293103\",\"content_sha256\":\"4c9c53c45fd25bef3e416dbaf823aa6485b59d27832476978ff53936fab2597f\",\"file_bytes\":1551,\"body_bytes\":348},{\"atom_id\":\"the-suggested-fix-is-a-hint-not-a-contract\",\"file_sha256\":\"1143fa5b59d4325dbff144813a1d24f6ba3cbb295da30f098f1a30944b66001d\",\"content_sha256\":\"68281e0d6ebe3115287ef9ce371444478a9a54c46e1e24815c19721a87335b47\",\"file_bytes\":1351,\"body_bytes\":237}]"
carrier_sha256: 4a6f7ea42b846db0ed5380ec5bcb753e1712667d59289d724d86e68750d1032c
carrier_bytes: 3209
revision: 1
status: active
---
<!-- vpmodule:atom:begin the-declared-isolation-must-match-the-actual-execution -->
---
instruction_id: the-declared-isolation-must-match-the-actual-execution
title: The declared isolation must match the actual execution
summary: "When the isolation is degraded the fan-out is degraded with it, because announcing a sequential mode and then running in parallel is the one outcome the degradation exists to prevent."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: The isolation of the workers is degraded and several of them could run at once.
conditions_does_not_apply_when: Each worker is isolated and can run at the same time safely.
artifact_contract_output_type: isolation-fanout-decision
artifact_contract_required_data:
  - the isolation that was decided
  - the fan-out that follows from it
artifact_contract_verified_by: the declared isolation and the way the workers were started agree
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/diagnose-issues.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# The declared isolation must match the actual execution
Isolation decides the fan-out, not just the flag
The agents would all run against the primary checkout, so spawn them one at a time, waiting for each to return before spawning the next
Degrading the flag while keeping the parallelism would announce sequential mode and then do the opposite.
<!-- vpmodule:atom:end the-declared-isolation-must-match-the-actual-execution -->
<!-- vpmodule:atom:begin the-suggested-fix-is-a-hint-not-a-contract -->
---
instruction_id: the-suggested-fix-is-a-hint-not-a-contract
title: "The suggested fix is a hint, not a contract"
summary: "The suggested route to a fix is an example; the diagnosed cause is the binding part, and any smaller or different mechanism that removes the cause closes the item."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A diagnosis comes with a suggested route to a fix.
conditions_does_not_apply_when: The cause is known and the fix is fixed by contract.
artifact_contract_output_type: diagnosis-payload
artifact_contract_required_data:
  - the diagnosed cause
  - the suggested route marked as non-binding
artifact_contract_verified_by: the plan was built on the cause and not on the suggested route
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/diagnose-issues.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# The suggested fix is a hint, not a contract
NON-BINDING example route for the gap closure plan - the binding payload is `root_cause`
A gap plan that removes the root cause by a smaller or different mechanism has closed the gap in full
<!-- vpmodule:atom:end the-suggested-fix-is-a-hint-not-a-contract -->