---
instruction_id: probe-the-capability-the-claim-is-about-not-just-the-import
title: "Probe the capability the claim is about, not just the import"
summary: "The probe exercises the capability the claim is about, and a failure that comes from the environment is fixed rather than banked."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - verification-harness
conditions_applies_when: A compatibility claim is about to be probed.
conditions_does_not_apply_when: The claim is already backed by a positive statement in the upstream documentation.
artifact_contract_output_type: compatibility-probe
artifact_contract_required_data:
  - the capability the probe exercises
  - the result
  - the attribution of a failure
artifact_contract_verified_by: the probe exercised the capability and a failure is attributed to the incompatibility
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Probe the capability the claim is about, not just the import
**It must exercise the capability the claim is about.** `import ldap3` succeeding on 3.14 says nothing about whether `bind()` and `search()` work.
**A failure must be attributable to the incompatibility.** If the probe fails because a certificate is missing or the host is wrong, that is your environment failing, not the library. Fix the probe and rerun; do not bank the failure.
**A probe that succeeds refutes the claim.** Do not soften it to "probably fine" — remove it. A disproved claim left in place as `[ASSUMED]` still steers the plan, and nobody looks again at something that already carries a hedge.
