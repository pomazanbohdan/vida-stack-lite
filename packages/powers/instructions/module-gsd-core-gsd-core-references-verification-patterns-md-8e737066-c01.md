---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-verification-patterns-md-8e737066-c01"
title: "gsd-core: gsd-core/references/verification-patterns.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/verification-patterns.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/verification-patterns.md\"}"
atom_ids:
  - check-existence-then-substance-then-wiring-then-behaviour
  - name-the-stub-signatures-that-mark-a-placeholder
atom_count: 2
atoms: "[{\"atom_id\":\"check-existence-then-substance-then-wiring-then-behaviour\",\"file_sha256\":\"b7203b4533b59b025801ec5e104107319ff113cb36e0e151d84af5f0bd459b5e\",\"content_sha256\":\"575e760b2b5115e0215be717bb3e1c497a7231ba36cdc4e43902db62099d648b\",\"file_bytes\":1488,\"body_bytes\":440},{\"atom_id\":\"name-the-stub-signatures-that-mark-a-placeholder\",\"file_sha256\":\"e748cb90d57aba1e429ea1232333068201757d165068c9d50d3c75d1d1f9739e\",\"content_sha256\":\"05d773ea8ba714c9e48e321eb8cd1cd1f2eb2e3b41c5c878e8a3850c2e814ccf\",\"file_bytes\":1190,\"body_bytes\":236}]"
carrier_sha256: aea783958f55d60ab789651d289ce51f191ba4cf710c91182c569e076b3d82d0
carrier_bytes: 3003
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-existence-then-substance-then-wiring-then-behaviour -->
---
instruction_id: check-existence-then-substance-then-wiring-then-behaviour
title: "Check existence, then substance, then wiring, then behaviour"
summary: A file existing does not mean the feature works; the four levels are checked in that order.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An artefact is being verified.
conditions_does_not_apply_when: The artefact was already verified at the first level.
artifact_contract_output_type: artifact-levels
artifact_contract_required_data:
  - the level reached
  - the evidence for it
artifact_contract_verified_by: each level was checked in order and the level reached is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verification-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Check existence, then substance, then wiring, then behaviour
A file existing does not mean the feature works. Verification must check:
1. **Exists** - File is present at expected path
2. **Substantive** - Content is real implementation, not placeholder
3. **Wired** - Connected to the rest of the system
4. **Functional** - Actually works when invoked
Levels 1-3 can be checked programmatically. Level 4 often requires human verification
<!-- vpmodule:atom:end check-existence-then-substance-then-wiring-then-behaviour -->
<!-- vpmodule:atom:begin name-the-stub-signatures-that-mark-a-placeholder -->
---
instruction_id: name-the-stub-signatures-that-mark-a-placeholder
title: Name the stub signatures that mark a placeholder
summary: The four families of placeholder signature are recognised whatever the file type is.
capability_tags:
  - review-code
pattern_tags:
  - code-audit
conditions_applies_when: An artefact is checked for substance.
conditions_does_not_apply_when: The artefact is known to be a placeholder.
artifact_contract_output_type: stub-signatures
artifact_contract_required_data:
  - the signature families
artifact_contract_verified_by: the placeholder signature families were looked for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verification-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Name the stub signatures that mark a placeholder
These patterns indicate placeholder code regardless of file type
Comment-based stubs
Placeholder text in output
Empty or trivial implementations
Hardcoded values where dynamic expected
<!-- vpmodule:atom:end name-the-stub-signatures-that-mark-a-placeholder -->