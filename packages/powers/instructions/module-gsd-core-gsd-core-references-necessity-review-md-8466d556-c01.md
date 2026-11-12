---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-necessity-review-md-8466d556-c01"
title: "gsd-core: gsd-core/references/necessity-review.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/necessity-review.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/necessity-review.md\"}"
atom_ids:
  - keep-a-trust-boundary-guard-out-of-necessity
  - prove-the-guarded-state-cannot-occur
atom_count: 2
atoms: "[{\"atom_id\":\"keep-a-trust-boundary-guard-out-of-necessity\",\"file_sha256\":\"64656aa53f00973b08a75de3facdb84e51366d6766099bc64b0ca6398a91a97c\",\"content_sha256\":\"0689205166f3e0faf3e753236b677e8e9cf40ab548d9180c6697e2d95bb33507\",\"file_bytes\":1806,\"body_bytes\":624},{\"atom_id\":\"prove-the-guarded-state-cannot-occur\",\"file_sha256\":\"dc6c6c986c56c3547bdb26c10255b7cddcfefb838c4b98d4a6869faa0b4347ea\",\"content_sha256\":\"05c018e597314f9f5b203a14a99e223c2019fd9403d8f4ec78d5e213024a48af\",\"file_bytes\":1792,\"body_bytes\":594}]"
carrier_sha256: 0c68dba508387ebc6e696d0452c9982b54d9b32ea3d0e7126916a67c72d65592
carrier_bytes: 3873
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-a-trust-boundary-guard-out-of-necessity -->
---
instruction_id: keep-a-trust-boundary-guard-out-of-necessity
title: Keep a trust-boundary guard out of necessity
summary: "A guard on data crossing a trust boundary is never an impossible-state guard, even when internal types claim it is safe; defense in depth and test seams are not necessity findings either."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A necessity finding is proposed against a guard.
conditions_does_not_apply_when: The code does not guard a trust boundary or a deliberate second layer.
artifact_contract_output_type: necessity-exclusion
artifact_contract_required_data:
  - the guard
  - the trust boundary it crosses
  - why the exclusion applies
artifact_contract_verified_by: no trust-boundary guard, defense-in-depth layer or test seam is reported as unnecessary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/necessity-review.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep a trust-boundary guard out of necessity
A guard on data crossing a trust boundary — user input, network, files, environment, deserialized data, another process — is never an impossible-state guard, even when internal types claim the value is safe. Types do not hold across a trust boundary.
A deliberate second security layer is defense in depth, not "already defended elsewhere".
A single-implementation interface that exists as a dependency-injection or test seam is not "generality without instantiation".
An unproven lapse is info at most; unreachable code is a code-quality finding, not a necessity finding.
<!-- vpmodule:atom:end keep-a-trust-boundary-guard-out-of-necessity -->
<!-- vpmodule:atom:begin prove-the-guarded-state-cannot-occur -->
---
instruction_id: prove-the-guarded-state-cannot-occur
title: Prove the guarded state cannot occur
summary: "Before calling code unnecessary, prove the state it guards cannot occur and cite the type, deployment, call sites or flag values that prove it; the pattern name alone is not a finding."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is judging whether code guards against a real problem.
conditions_does_not_apply_when: The review is judging correctness, quality or security rather than necessity.
artifact_contract_output_type: necessity-finding
artifact_contract_required_data:
  - the guarded state
  - why it cannot occur or why the requirement lapsed
  - the evidence that proves it
artifact_contract_verified_by: every necessity finding cites where the impossibility or lapse is proven
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/necessity-review.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prove the guarded state cannot occur
Before calling code unnecessary, prove the state it guards cannot occur and cite where that is proven: the type signature, the build or deploy configuration, the call sites, the flag's values.
A necessity finding states why the guarded state cannot occur, or why the requirement lapsed. The pattern name alone is not a finding; without that evidence, drop it or report it as info.
The taxonomy is a prompt, not a verdict: impossible-state guard, already-defended-elsewhere, cargo-culted pattern, phantom requirement, and generality without instantiation.
<!-- vpmodule:atom:end prove-the-guarded-state-cannot-occur -->