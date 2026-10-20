---
instruction_id: test-for-durable-differentiation
title: Test for durable differentiation
summary: "Judge the direction by what is genuinely different, not merely better, and by whether a competitor could copy it in a week."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A direction has to be judged on whether it is worth switching to.
conditions_does_not_apply_when: The direction is a direct improvement of something the user already uses.
artifact_contract_output_type: differentiation-assessment
artifact_contract_required_data:
  - the one thing this does that nothing else does
  - the type of differentiation
  - how long a competitor needs to copy it
artifact_contract_verified_by: the single different thing is named and its type is placed on the strongest-to-weakest scale
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 1
---

# Test for durable differentiation

What makes this genuinely different? Not better — *different*.

**Questions to ask:**

- If a user described this to a friend, what would they say? Is that description compelling?
- What's the one thing this does that nothing else does? (If you can't name one, that's a problem.)
- Is this differentiation durable? Can a competitor copy it in a week?
- Is the difference something users actually care about, or just something builders find interesting?

**Types of differentiation (strongest to weakest):**

1. **New capability:** Does something that was previously impossible
2. **10x improvement:** So much better on a key dimension that it changes behavior
3. **New audience:** Brings an existing capability to people who were excluded
4. **New context:** Works in a situation where existing solutions fail
5. **Better UX:** Same capability, dramatically simpler experience
6. **Cheaper:** Same thing, lower cost (weakest — easily competed away)

**Red flags:**

- Differentiation is entirely about technology, not user experience
- "We're faster/cheaper/prettier" without a structural reason why
- The feature that differentiates is not the feature users care most about
