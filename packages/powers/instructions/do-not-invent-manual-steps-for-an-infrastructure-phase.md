---
instruction_id: do-not-invent-manual-steps-for-an-infrastructure-phase
title: Do not invent manual steps for an infrastructure phase
summary: A phase with no user-facing surface has no manual steps; a behaviour that no test exercises still counts as a gap.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The manual verification items of a phase are being listed.
conditions_does_not_apply_when: The phase has a user-facing surface.
artifact_contract_output_type: manual-verification-scope
artifact_contract_required_data:
  - the items
  - the reason each is needed
  - the behaviour that remains unverified
artifact_contract_verified_by: no artificial step was invented and every unverified behaviour produced an item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verifier-phase-gates.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Do not invent manual steps for an infrastructure phase
Do NOT invent artificial manual steps (e.g., "manually run git commits", "manually invoke methods", "manually check database state")
Mark human verification as **N/A** with rationale: "Infrastructure/foundation phase — no user-facing elements to test manually."
Set `human_verification: []` and do **not** produce a `human_needed` status solely due to lack of user-facing features
PRESENT_BEHAVIOR_UNVERIFIED (a state transition or a cancellation/cleanup/ordering invariant with no test exercising it) is a behavioral-evidence gap, not an artificial user-facing step
