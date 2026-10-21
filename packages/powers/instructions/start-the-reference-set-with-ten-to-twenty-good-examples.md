---
instruction_id: start-the-reference-set-with-ten-to-twenty-good-examples
title: Start the reference set with ten to twenty good examples
summary: "The first reference set is small and labelled by domain experts, and it grows from what production shows rather than from imagined coverage."
capability_tags:
  - build-verification-harness
pattern_tags:
  - test-design
conditions_applies_when: A reference set for a behaviour is built.
conditions_does_not_apply_when: The reference set exists and grows from production.
artifact_contract_output_type: reference-set
artifact_contract_required_data:
  - the number of examples
  - who labelled them
  - the cases they cover
  - the growth source
artifact_contract_verified_by: "the set is small, expert-labelled and grew from observed failures"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/ai-evals.md
status: active
revision: 1
---

# Start the reference set with ten to twenty good examples
Start with **10-20 high-quality examples** — not 200 mediocre ones
Have domain experts label the examples (not just engineers)
Expand based on what you learn in production — don't build for hypothetical coverage
Building comprehensive coverage on day one — start small (10-20 examples), expand from real failure modes
