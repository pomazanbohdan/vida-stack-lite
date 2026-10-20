---
instruction_id: look-for-what-is-missing-not-only-what-is-wrong
title: "Look for what is missing, not only what is wrong"
summary: "The adversarial pass looks for what is absent as well as what is broken, weighs the areas the caller named, and refuses to end with an empty list."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - adversarial-self-review
conditions_applies_when: An adversarial pass over a piece of content is running.
conditions_does_not_apply_when: "The pass is not the adversarial one, or the content is empty."
artifact_contract_output_type: adversarial-findings
artifact_contract_required_data:
  - the missing things
  - the broken things
  - the areas that were weighed alongside the normal analysis
artifact_contract_verified_by: "the pass names at least ten issues to fix or improve, or states that the content was empty"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-adversarial.md
status: active
revision: 1
---

# Look for what is missing, not only what is wrong
Look for what's missing, not only what's wrong.
Find at least ten issues to fix or improve.
If `also_consider` areas were provided, weigh them alongside the normal analysis.
If the content is empty, stop and say so.
If you have zero findings, re-check and keep thinking; do not stop with an empty list.
