---
instruction_id: explain-every-line-you-submit
title: Explain every line you submit
summary: The author understands every submitted line and can explain the reasoning behind it.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change is prepared for submission.
conditions_does_not_apply_when: The change is a mechanical edit with no content of its own.
artifact_contract_output_type: submission-account
artifact_contract_required_data:
  - the lines submitted
  - the deliberate choices made
  - the reasoning behind them
artifact_contract_verified_by: the author explains every line of the change without reading it back
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=CONTRIBUTING.md
status: active
revision: 1
---

# Explain every line you submit
You must understand every line you're submitting, have made deliberate choices about what to include, and be able to explain your reasoning.
Using AI to write code is normal here; using AI as a substitute for thinking is not.
