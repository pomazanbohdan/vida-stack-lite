---
instruction_id: ask-the-adversarial-question-then-narrow-the-answer
title: "Ask the adversarial question, then narrow the answer"
summary: The recall stage asks one open adversarial question per requirement and over-produces; the precision stage drops the routine-engineering items in one pass.
capability_tags:
  - clarify-requirements
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The constraints a requirement forbids are being surfaced.
conditions_does_not_apply_when: The requirement has already been through this pass.
artifact_contract_output_type: prohibition-recall
artifact_contract_required_data:
  - the raw candidates
  - the ones that were dropped
  - the ones that were kept
artifact_contract_verified_by: the raw list was narrowed by one drop/keep pass and a zero result is accepted as the outcome
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/prohibition-probe.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/specless-probe-fallback.md
status: active
revision: 1
---

# Ask the adversarial question, then narrow the answer
*What could this feature silently become that the author would NOT want, but the spec does not forbid?*
Filter the raw Stage-1 list in a single pass. The rule is a drop/keep split
**DROP routine-engineering items** — anything that is a normal correctness or hygiene concern rather than an intent constraint: "must not mutate its input", "must not throw on empty list", "must return a primitive not an object", "must not leak a file handle". These belong to the edge-probe or to ordinary code review, not here
**KEEP values / safety / ethics items** — anything that, if violated, makes the feature do something the author would object to on product, fairness, privacy, transparency, or safety grounds: "must not use shaming framing", "must not proxy on protected attributes", "must not store raw PII in plaintext"
A requirement that yields zero kept prohibitions emits an empty list — that is the correct precision outcome for a pure utility, not a failure
