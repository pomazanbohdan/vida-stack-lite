---
instruction_id: extract-the-know-how-from-the-source
title: Extract the know-how from the source
summary: "The whole source is read, and what is lifted out is the outcome, the consumer, the triggers, the know-how and the scripts, plus what it leans on its host for."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - source-conversion
  - evidence-analysis
conditions_applies_when: Material written for another tool is converted.
conditions_does_not_apply_when: The material was written for this tool already.
artifact_contract_output_type: extraction
artifact_contract_required_data:
  - the outcome it produces
  - who consumes it
  - the triggers
  - the know-how a model would not have
  - the scripts
  - what it depends on from its host
artifact_contract_verified_by: "every part of the source is accounted for in the extraction, and the host dependencies are listed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/convert.md
status: active
revision: 1
---

# Extract the know-how from the source
Read the source whole. Pull out the outcome it produces, who consumes it, the triggers (when the author meant it to fire), the know-how a model would not have, and any scripts. Note what it depends on from its host: tools, variables, other files.
