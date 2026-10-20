---
instruction_id: offer-a-cross-model-second-opinion
title: Offer a cross-model second opinion
summary: "In an interactive session, offer the user a second, independent review and record the answer; never skip it silently."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A single-model review of a non-trivial artifact has finished.
conditions_does_not_apply_when: The session is not interactive and the skip can be announced instead.
artifact_contract_output_type: second-opinion-choice
artifact_contract_required_data:
  - the offer made
  - "the user's answer"
  - the acknowledgement of the answer in the output
artifact_contract_verified_by: "the output shows the offer and what the user chose, including an announced skip"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 1
---

# Offer a cross-model second opinion

A single-model reviewer shares blind spots with the original author — a colder, different-architecture model catches them. Doubt-driven is already opt-in for non-trivial decisions, so within that scope offering cross-model is part of the skill's value, not optional friction.

**Interactive sessions: always offer. Never silently skip.**

**Step 1: Ask the user**

After the single-model review in Step 3 above, but before RECONCILE, pause and ask:

> *"Single-model review complete. Want a cross-model second opinion? Options: Gemini CLI, Codex CLI, manual external review (you paste it elsewhere), or skip."*

This question is mandatory in every interactive doubt cycle — even on artifacts that feel low-stakes. The user — not the agent — decides whether the cost is worth it. The agent's job is to surface the choice.

**Step 4: If the user skips**

Acknowledge the skip in the output (*"Proceeding with single-model findings only"*) and continue to RECONCILE. Skipping is fine; silent skipping is not.

**Non-interactive contexts** (CI, `/loop`, autonomous-loop, scheduled runs):

- Cross-model is **skipped**, and the skip must be **announced** in the output: *"Cross-model skipped: non-interactive context."*
- **Never invoke an external CLI without explicit user authorization** — this is a load-bearing safety property.

Cross-model adds cost, latency, and tool fragility. The agent surfaces the choice every cycle; the user decides whether this artifact warrants it.
