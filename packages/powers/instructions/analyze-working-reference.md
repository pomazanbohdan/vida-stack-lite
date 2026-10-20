---
instruction_id: analyze-working-reference
title: Compare the broken path with a working one
summary: "Find a working example of the same behavior, read it completely, and list every difference before changing one thing at a time."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A similar working path or example exists to compare with the failure.
conditions_does_not_apply_when: There is no analogue and the failure is investigated in isolation.
artifact_contract_output_type: comparison-evidence
artifact_contract_required_data:
  - working example
  - difference list
  - verification
artifact_contract_verified_by: the difference list is tested one item at a time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/SKILL.md
status: active
revision: 1
---

# Compare the broken path with a working one
Locate similar working code in the same codebase.
What works that's similar to what's broken?
If implementing a pattern, read the reference implementation completely.
Don't skim; read every line.
Understand the pattern fully before applying it.
What's different between working and broken?
List every difference, however small.
Don't assume "that can't matter".
What other components does this need?
What settings, config, environment?
What assumptions does it make?
Partial understanding guarantees bugs.
Read it completely.
Identify the differences.
Compare against references.
