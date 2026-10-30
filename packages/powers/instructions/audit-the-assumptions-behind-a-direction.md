---
instruction_id: audit-the-assumptions-behind-a-direction
title: Audit the assumptions behind a direction
summary: "For every direction, name the assumptions and sort them by how fatal they are if they turn out to be wrong."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A direction has been chosen and the bets behind it have to be made visible before building.
conditions_does_not_apply_when: The direction was already validated against its assumptions.
artifact_contract_output_type: assumption-audit
artifact_contract_required_data:
  - the must-be-true assumptions
  - the should-be-true assumptions
  - the might-be-true assumptions
  - what could kill the idea
  - what is being ignored
artifact_contract_verified_by: every assumption sits in one of the three categories and the kill list is not empty of content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/refinement-criteria.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - business
---

# Audit the assumptions behind a direction

For every idea direction, explicitly list assumptions in three categories:

### Must Be True (Dealbreakers)

Assumptions that, if wrong, kill the idea entirely. These need validation before building.

Example: "Users will share their data with us" — if they won't, the entire product doesn't work.

### Should Be True (Important)

Assumptions that significantly impact success but don't kill the idea. You can adjust the approach if these are wrong.

Example: "Users prefer self-serve over talking to a person" — if wrong, you need a different go-to-market, but the core product can still work.

### Might Be True (Nice to Have)

Assumptions about secondary features or optimizations. Don't validate these until the core is proven.

Example: "Users will want to share their results with teammates" — a growth feature, not a core value proposition.

**Surface hidden assumptions.** For each direction, explicitly name:

- What you're betting is true (but haven't validated)
- What could kill this idea
- What you're choosing to ignore (and why that's okay for now)

This is where most ideation fails. Don't skip it.
