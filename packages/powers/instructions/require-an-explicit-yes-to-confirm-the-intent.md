---
instruction_id: require-an-explicit-yes-to-confirm-the-intent
title: Require an explicit yes to confirm the intent
summary: "Only an explicit yes confirms the restated intent; delegation, ambiguity, a polite exit and silence are not a yes."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A restated statement of intent has been written back and the user has replied.
conditions_does_not_apply_when: The user corrected the restate and a new one has not yet been written.
artifact_contract_output_type: intent-confirmation
artifact_contract_required_data:
  - "the user's reply"
  - whether the reply is an explicit yes
  - the follow-up asked when it is not
artifact_contract_verified_by: "the confirmation is an explicit yes, not delegation, ambiguity or silence"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/interview-me/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Require an explicit yes to confirm the intent

The gate is an explicit "yes." The following are **not** yes:

- "Whatever you think is best." → The user is delegating, which means they don't have 95% confidence either. Re-ask with two concrete options framed as a choice.
- "Sounds good." → Ambiguous. Ask: "Anything you'd refine?" Silence isn't confirmation.
- "Sure, let's go." → Often a polite exit, not an endorsement. Same follow-up.
- Silence followed by "okay let's start." → The user has given up on the interview, not converged. Stop and ask whether you've missed something.

If they correct you, fold the correction in and restate. Loop until you get an explicit yes.

Never infer the positive choice from an ambiguous answer: re-ask once, and if the answer is still ambiguous, treat it as a refusal.
When you have enough signal, ask: "I think I have a good sense of the direction. Ready for me to sketch, or want to keep discussing?"
Only proceed when the user says go.
