---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-gate-predicates-md-dad467e6-c01"
title: "gsd-core: docs/reference/gate-predicates.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/reference/gate-predicates.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/gate-predicates.md\"}"
atom_ids:
  - allow-exactly-one-check-shape-per-gate
  - confine-the-predicate-path-to-the-project-root
  - treat-a-timeout-as-a-failed-check-not-as-an-absent-result
atom_count: 3
atoms: "[{\"atom_id\":\"allow-exactly-one-check-shape-per-gate\",\"file_sha256\":\"8430d8b0e9694b2b7a550df17468c2e17b198fe280ebd07739e33d86b0ddbdd9\",\"content_sha256\":\"40497b1fc5238ff3e7c3da44e16472b6426c9a21c5fb2c1101d9664372d23ea6\",\"file_bytes\":1249,\"body_bytes\":188},{\"atom_id\":\"confine-the-predicate-path-to-the-project-root\",\"file_sha256\":\"8864bd05451e4fc9fe545250f3891111f9e533fd59b8a677c8b464f05a2d9207\",\"content_sha256\":\"5c9e0549a3340112b7e76836f361d2c5c9088e384409fb621b77516dbb5c6aeb\",\"file_bytes\":1504,\"body_bytes\":356},{\"atom_id\":\"treat-a-timeout-as-a-failed-check-not-as-an-absent-result\",\"file_sha256\":\"fb5f69a2f5cb4064e1287c7b68e10e4ff2584e33e382720ac78f399c2bec7b5d\",\"content_sha256\":\"16be945ce5b7c636e8d5726b8e497a29718987655d2c0d56f721831d827dc666\",\"file_bytes\":1324,\"body_bytes\":180}]"
carrier_sha256: d34a836164f6fdb334feb838aebe25c6fe176f1ef0357cf8431e972896f645f8
carrier_bytes: 4532
revision: 1
status: active
---
<!-- vpmodule:atom:begin allow-exactly-one-check-shape-per-gate -->
---
instruction_id: allow-exactly-one-check-shape-per-gate
title: Allow exactly one check shape per gate
summary: "A gate carries exactly one of the declared check shapes, and the validator refuses a gate that carries none or several."
capability_tags:
  - make-states-unrepresentable
pattern_tags:
  - state-modeling
conditions_applies_when: A gate is being declared.
conditions_does_not_apply_when: The gate does not carry a check at all.
artifact_contract_output_type: single-check-shape
artifact_contract_required_data:
  - the check shape the gate carries
  - the validator that refuses the others
  - what an ambiguous gate would mean
artifact_contract_verified_by: the gate carries exactly one declared check shape
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/gate-predicates.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Allow exactly one check shape per gate
- A capability gate's `check` block carries exactly one of three shapes (`query`, `predicate`, `agentVerdict`), enforced by the registry validator
<!-- vpmodule:atom:end allow-exactly-one-check-shape-per-gate -->
<!-- vpmodule:atom:begin confine-the-predicate-path-to-the-project-root -->
---
instruction_id: confine-the-predicate-path-to-the-project-root
title: Confine the predicate path to the project root
summary: A path that a check receives is resolved inside the project root before the check runs; one that escapes is a usage error and is not evaluated.
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A check is about to receive a path that comes from the caller.
conditions_does_not_apply_when: The path is produced inside the project by the program itself.
artifact_contract_output_type: predicate-path-confinement
artifact_contract_required_data:
  - the path that is validated
  - the root it must resolve inside
  - what an escaping path does
artifact_contract_verified_by: the escaping path was refused before the check ran
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/gate-predicates.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Confine the predicate path to the project root
- **`--phase-dir` is confined to the project.** The value is validated to resolve inside the project root before any predicate is evaluated; one that escapes is rejected as a usage error rather than evaluated.
- An absolute path inside the project is still accepted; absolute is not a synonym for escaping.
<!-- vpmodule:atom:end confine-the-predicate-path-to-the-project-root -->
<!-- vpmodule:atom:begin treat-a-timeout-as-a-failed-check-not-as-an-absent-result -->
---
instruction_id: treat-a-timeout-as-a-failed-check-not-as-an-absent-result
title: "Treat a timeout as a failed check, not as an absent result"
summary: "A command that times out is a check that failed, exactly like a command that exited non-zero; it is never reported as a check that did not run."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check runs a command that may hang.
conditions_does_not_apply_when: The command always returns promptly.
artifact_contract_output_type: timeout-is-a-failure
artifact_contract_required_data:
  - the three outcomes of the command
  - which outcome blocks
  - what a timeout is reported as
artifact_contract_verified_by: a timeout was reported as a failed check and not as an absent result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/gate-predicates.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a timeout as a failed check, not as an absent result
- Runs a declared command in a bounded `sh -c` subprocess; **exit 0 → pass, non-zero → block, timeout → block.**
<!-- vpmodule:atom:end treat-a-timeout-as-a-failed-check-not-as-an-absent-result -->