---
instruction_id: state-a-read-with-a-confidence-number
title: State the read with a confidence number
summary: "Before asking anything, write down the current best understanding in one sentence together with an honest confidence number."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "An ask is underspecified and no plan, spec or code exists yet."
conditions_does_not_apply_when: "The ask is unambiguous and self-contained, or the user has explicitly asked for speed over verification."
artifact_contract_output_type: intent-read
artifact_contract_required_data:
  - the one-sentence read of what the user wants
  - the confidence number
  - "the reason when the confidence is below ~70%"
artifact_contract_verified_by: "the confidence number is one the executor can defend, and any number below ~70% carries a reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/interview-me/SKILL.md
status: active
revision: 1
---

# State the read with a confidence number

Before asking anything, write down your current best read of what the user wants in **one sentence**, plus an honest confidence number (0–100%):

```
HYPOTHESIS: You want a way to answer "how are we doing?" in standup, and "dashboard" was the convention that came to mind.
CONFIDENCE: ~30% — missing: who it's for, what "metrics" means in context, and what success looks like
```

The number forces honesty. If you wrote down a high number but can't actually predict the user's reactions to the next three questions you'd ask, the number is wrong. Start at the confidence level you can defend.

When confidence is below ~70%, append a brief reason on the same line — what's still unresolved or missing. This tells the user exactly what the interview needs to surface, and prevents the number from being a vague signal.

The number is a claim, not a mood: you must be able to defend it.
