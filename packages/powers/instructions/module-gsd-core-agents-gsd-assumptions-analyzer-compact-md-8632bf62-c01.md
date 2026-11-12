---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-assumptions-analyzer-compact-md-8632bf62-c01"
title: "gsd-core: agents/gsd-assumptions-analyzer.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-assumptions-analyzer.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-assumptions-analyzer.compact.md\"}"
atom_ids:
  - cite-the-file-path-that-supports-every-assumption
  - flag-the-gap-the-codebase-cannot-answer-instead-of-researching-it
  - state-the-concrete-consequence-if-the-assumption-is-wrong
atom_count: 3
atoms: "[{\"atom_id\":\"cite-the-file-path-that-supports-every-assumption\",\"file_sha256\":\"933223a3cd561959d72f8cb59bf9d57b3e344870681f2a26a8fa34442f31440d\",\"content_sha256\":\"0edf0a3dc7440c6b2f3570bac08ca620b6b13f517e13680524bdef4005d2880b\",\"file_bytes\":1404,\"body_bytes\":203},{\"atom_id\":\"flag-the-gap-the-codebase-cannot-answer-instead-of-researching-it\",\"file_sha256\":\"3285789a228802cdcac9bd4460ccac2234b2c12fd0a37ff94790fdaa31c6b75a\",\"content_sha256\":\"cdd14b3fd38cde555f615470a0b62cbd4400929925379af255a25a50fe67fbf0\",\"file_bytes\":1528,\"body_bytes\":319},{\"atom_id\":\"state-the-concrete-consequence-if-the-assumption-is-wrong\",\"file_sha256\":\"4b73aede1362f72f459ac33b6886da95ed6778ca3922f84c1ff78bbb3dc0541d\",\"content_sha256\":\"1b161ac28754980a39553710c8ad7c1b8d8604979f57e524dd039103a97b324b\",\"file_bytes\":1486,\"body_bytes\":314}]"
carrier_sha256: 2fcdb784b3030a6794d598fb669b210d9be0e27edc60757e15527c0daee9414f
carrier_bytes: 4933
revision: 1
status: active
---
<!-- vpmodule:atom:begin cite-the-file-path-that-supports-every-assumption -->
---
instruction_id: cite-the-file-path-that-supports-every-assumption
title: Cite the file path that supports every assumption
summary: "No assumption is stated without the source file that supports it, and code that was not read is not reasoned about."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: Assumptions about how the codebase behaves are written down.
conditions_does_not_apply_when: "The statement is a decision the user made, not a reading of the code."
artifact_contract_output_type: assumption-list
artifact_contract_required_data:
  - the assumption
  - the file path that supports it
artifact_contract_verified_by: every assumption carries at least one file path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-assumptions-analyzer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-assumptions-analyzer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Cite the file path that supports every assumption
Every assumption MUST cite at least one file path as evidence.
Do NOT invent assumptions about code you haven't read -- read first, then form opinions
<!-- vpmodule:atom:end cite-the-file-path-that-supports-every-assumption -->
<!-- vpmodule:atom:begin flag-the-gap-the-codebase-cannot-answer-instead-of-researching-it -->
---
instruction_id: flag-the-gap-the-codebase-cannot-answer-instead-of-researching-it
title: Flag the gap the codebase cannot answer instead of researching it
summary: A question the repository cannot answer is listed as a gap; the scope of the work is not widened to close it.
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A question arises that the code alone cannot settle.
conditions_does_not_apply_when: External sources are part of the assigned task.
artifact_contract_output_type: assumption-list
artifact_contract_required_data:
  - the flagged gap
  - the scope boundary
artifact_contract_verified_by: the gap is listed and no out-of-scope research was performed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-assumptions-analyzer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-assumptions-analyzer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Flag the gap the codebase cannot answer instead of researching it
Flag any topics that need external research (library compatibility, ecosystem best practices)
Do NOT research beyond what the codebase contains (flag gaps in "Needs External Research")
Do NOT suggest scope expansion -- stay within the phase boundary.
<!-- vpmodule:atom:end flag-the-gap-the-codebase-cannot-answer-instead-of-researching-it -->
<!-- vpmodule:atom:begin state-the-concrete-consequence-if-the-assumption-is-wrong -->
---
instruction_id: state-the-concrete-consequence-if-the-assumption-is-wrong
title: State the concrete consequence if the assumption is wrong
summary: "Each assumption names what breaks if it turns out false, instead of a vague warning."
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: An assumption about the system is recorded.
conditions_does_not_apply_when: The statement is a fact read directly from a file.
artifact_contract_output_type: assumption-list
artifact_contract_required_data:
  - the assumption
  - the consequence if it is wrong
artifact_contract_verified_by: "no assumption says only that it \"could cause issues\""
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-assumptions-analyzer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-assumptions-analyzer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# State the concrete consequence if the assumption is wrong
Every assumption MUST state a concrete consequence if wrong (not vague "could cause issues").
Read 5-15 most relevant source files to understand existing patterns
Do NOT pad with obvious assumptions -- only surface decisions that could go multiple ways.
<!-- vpmodule:atom:end state-the-concrete-consequence-if-the-assumption-is-wrong -->