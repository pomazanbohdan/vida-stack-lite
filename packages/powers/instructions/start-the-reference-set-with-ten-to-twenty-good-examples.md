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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/ai-evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Start the reference set with ten to twenty good examples
Start with **10-20 high-quality examples** — not 200 mediocre ones
Have domain experts label the examples (not just engineers)
Expand based on what you learn in production — don't build for hypothetical coverage
Building comprehensive coverage on day one — start small (10-20 examples), expand from real failure modes
