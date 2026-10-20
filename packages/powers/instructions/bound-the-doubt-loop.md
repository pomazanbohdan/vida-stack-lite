---
instruction_id: bound-the-doubt-loop
title: Bound the doubt loop
summary: "Stop the review cycle when it returns only trivial findings, after three cycles, or when the owner says ship; escalate instead of grinding on."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: An adversarial review cycle is running.
conditions_does_not_apply_when: The first review is still in flight.
artifact_contract_output_type: cycle-outcome
artifact_contract_required_data:
  - the cycles run
  - the stop condition met
  - the findings that remain open
  - the escalation
artifact_contract_verified_by: the cycle stopped at a stated condition and the open findings were surfaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 1
---

# Bound the doubt loop

Stop when:

- Next iteration returns only trivial or already-considered findings, **or**
- 3 cycles completed (escalate to user, don't grind a fourth alone), **or**
- User explicitly says "ship it"

If after 3 cycles the reviewer still surfaces substantive issues, the artifact may not be ready. Surface this to the user — three unresolved cycles is information about the artifact, not a reason to keep looping.

If 3 cycles is "obviously insufficient" because the artifact is large: the artifact is too big — return to Step 2 and decompose. Do not lift the bound.

**Doubt theater (checkable signal):** across 2 or more cycles where the reviewer surfaced substantive findings, zero findings were classified as actionable. You are validating, not doubting. Stop and escalate.

**Red Flags**

- Re-spawning fresh-context on an unchanged artifact (you'll get the same findings; you're stalling)
- Looping >3 cycles without escalating to the user
- Skipping doubt under time pressure on a high-stakes decision
