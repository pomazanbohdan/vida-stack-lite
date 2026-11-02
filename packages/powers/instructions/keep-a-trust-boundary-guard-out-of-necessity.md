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
