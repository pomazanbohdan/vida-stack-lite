---
instruction_id: pick-the-verification-tier-of-a-prohibition
title: Pick the verification tier of a prohibition
summary: A prohibition that a mechanical check can prove is routed to a test; one that cannot is routed to a judgment-based review.
capability_tags:
  - harden-validation
pattern_tags:
  - testable-criteria
conditions_applies_when: A prohibition is about to be resolved into an acceptance criterion.
conditions_does_not_apply_when: The prohibition is already backed by a wired mechanical check.
artifact_contract_output_type: prohibition-tier
artifact_contract_required_data:
  - the tier
  - the evidence that decides the tier
artifact_contract_verified_by: the tier is one of test or judgment and the criteria for it are written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-prohibition-findings.md
status: active
revision: 1
---

# Pick the verification tier of a prohibition
**`test`** — a mechanical check can prove it: a negative test, a lint rule, an assertion that the audit log contains no raw SSN. Choose this when a green/red check exists.
**`judgment`** — the prohibition is real but cannot be reduced to a mechanical test (e.g. "the framing is not manipulative"). It records intent and routes to a judgment-based review rather than a passing test.
Pick the tier honestly — see [what happens downstream](#what-happens-to-resolved-findings-downstream) for why a `test`-tier prohibition is held to a stricter bar.
