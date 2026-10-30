---
instruction_id: declare-what-a-hook-produces-and-consumes
title: Declare what a hook produces and consumes
summary: "Every step and contribution declares the artifacts it writes and the ones it reads, names the error posture it uses, and a predicate that must block a release is declared as a gate."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - expand-contract
  - control-tiering
  - control-failure-posture-policy
conditions_applies_when: A hook is being declared.
conditions_does_not_apply_when: The hook writes nothing and reads nothing.
artifact_contract_output_type: hook-declaration
artifact_contract_required_data:
  - the artifacts it produces
  - the artifacts it consumes
  - the error posture and the gate it uses
artifact_contract_verified_by: the hook declares what it produces and consumes and how it fails
compatibility_excludes:
  - fail-open-loudly-when-a-control-cannot-load
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/review-verification-capabilities.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Declare what a hook produces and consumes
- Declare `produces` and `consumes` arrays for every step and contribution hook.
- For a `verify:post` step, `produces` must name every phase artifact the step writes: it is what keeps the step from re-running after the verification fingerprint
- Use `onError: "halt"` for verification work that must stop advancement when it fails.
- Use a blocking `gate` for ship-time predicates that must prevent release.
