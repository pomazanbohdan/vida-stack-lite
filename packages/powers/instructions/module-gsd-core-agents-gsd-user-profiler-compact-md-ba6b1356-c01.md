---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-user-profiler-compact-md-ba6b1356-c01"
title: "gsd-core: agents/gsd-user-profiler.compact.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:agents/gsd-user-profiler.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-user-profiler.compact.md\"}"
atom_ids:
  - apply-the-declared-rubric-exactly-and-invent-nothing-beyond-it
  - keep-everything-inside-the-marker-the-parser-reads
  - report-the-split-instead-of-forcing-one-rating
  - turn-an-observation-into-an-instruction-not-a-description-of-the-user
atom_count: 4
atoms: "[{\"atom_id\":\"apply-the-declared-rubric-exactly-and-invent-nothing-beyond-it\",\"file_sha256\":\"5618f169285737ac1119bd21637a19bdc331c5085e1bf8572f2b2adba5bdc285\",\"content_sha256\":\"f054d6c21a5342c9487d0cb5d1e30a71ad2335c36ff1a3bddbda4f1b8f10dce1\",\"file_bytes\":1636,\"body_bytes\":386},{\"atom_id\":\"keep-everything-inside-the-marker-the-parser-reads\",\"file_sha256\":\"4dc2a32af8084953af1d68acf0436e06deabfd14d10552d63dd95738753d96c2\",\"content_sha256\":\"b79f3b6ad5642fd3cb4c5e3c2b5f09647e9a448a73c25c137f7c31bfaabdd45c\",\"file_bytes\":1480,\"body_bytes\":275},{\"atom_id\":\"report-the-split-instead-of-forcing-one-rating\",\"file_sha256\":\"7cc46af8d68dac570ec322feb004275bd59e836bbe59039542d944c957db837d\",\"content_sha256\":\"8b902a012330b2496f4f85f954ba66bac5e9490dfefcf02bc86456bcf41241d1\",\"file_bytes\":1416,\"body_bytes\":273},{\"atom_id\":\"turn-an-observation-into-an-instruction-not-a-description-of-the-user\",\"file_sha256\":\"763a3f05310ae36e578d3abe429b5eaba3d029bbe0b0061a86c43b3f675f36f6\",\"content_sha256\":\"b9bf1d90e6b73c3dcee0d0d827c4a7a3c1f38d96bb347fdaec149b09a54cd167\",\"file_bytes\":1645,\"body_bytes\":323}]"
carrier_sha256: 899e5e656b643eb549967cd4621642f481df57280d750e34cbeff9ac7b173b20
carrier_bytes: 6862
revision: 1
status: active
---
<!-- vpmodule:atom:begin apply-the-declared-rubric-exactly-and-invent-nothing-beyond-it -->
---
instruction_id: apply-the-declared-rubric-exactly-and-invent-nothing-beyond-it
title: Apply the declared rubric exactly and invent nothing beyond it
summary: "The rubric that the reference document defines is the whole rulebook; no dimension, scale or pattern is added to it."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: "A rubric document defines the dimensions, the scales and the thresholds."
conditions_does_not_apply_when: The document states no rubric and the task is open.
artifact_contract_output_type: rubric-application
artifact_contract_required_data:
  - the rubric applied
  - the score for each declared dimension
artifact_contract_verified_by: every score comes from a declared dimension and no dimension was invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Apply the declared rubric exactly and invent nothing beyond it
CRITICAL: You must apply the rubric defined in the reference document. Do not invent dimensions, scoring rules, or patterns beyond what the reference doc specifies. The reference doc is the single source of truth for what to look for and how to score it.
- Rating values match the defined spectrums (no invented ratings)
<!-- vpmodule:atom:end apply-the-declared-rubric-exactly-and-invent-nothing-beyond-it -->
<!-- vpmodule:atom:begin keep-everything-inside-the-marker-the-parser-reads -->
---
instruction_id: keep-everything-inside-the-marker-the-parser-reads
title: Keep everything inside the marker the parser reads
summary: The machine-readable block carries the whole payload; commentary outside it is not read and only breaks the extraction.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A structured result is parsed programmatically by its caller.
conditions_does_not_apply_when: The result is read by a person and prose is expected around it.
artifact_contract_output_type: structured-result
artifact_contract_required_data:
  - the payload inside the marker
artifact_contract_verified_by: nothing but the payload sits inside the marker and no commentary sits outside it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep everything inside the marker the parser reads
Wrap the JSON in `<analysis>` tags for reliable extraction by the orchestrator.
Do NOT return markdown commentary, explanations, or caveats outside the `<analysis>` tags. The orchestrator parses the tags programmatically.
<!-- vpmodule:atom:end keep-everything-inside-the-marker-the-parser-reads -->
<!-- vpmodule:atom:begin report-the-split-instead-of-forcing-one-rating -->
---
instruction_id: report-the-split-instead-of-forcing-one-rating
title: Report the split instead of forcing one rating
summary: "When the evidence differs between contexts, the split is the finding; one averaged rating hides it."
capability_tags:
  - communicate-concisely
pattern_tags:
  - preserved-disagreement
conditions_applies_when: The same pattern holds in one context and not in another.
conditions_does_not_apply_when: The evidence agrees everywhere.
artifact_contract_output_type: split-report
artifact_contract_required_data:
  - the contexts that differ
  - what holds in each
artifact_contract_verified_by: the split is described and no single rating was forced across it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Report the split instead of forcing one rating
**Report context-dependent splits rather than forcing a single rating when contradictory signals exist across projects**
If the pattern varies by project: `cross_project_consistent: false`, describe the split in the summary
<!-- vpmodule:atom:end report-the-split-instead-of-forcing-one-rating -->
<!-- vpmodule:atom:begin turn-an-observation-into-an-instruction-not-a-description-of-the-user -->
---
instruction_id: turn-an-observation-into-an-instruction-not-a-description-of-the-user
title: "Turn an observation into an instruction, not a description of the user"
summary: A finding about how somebody works is written as the directive that follows from it; the description of the person is not the deliverable.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An observation about a reader or a user is turned into guidance for an agent.
conditions_does_not_apply_when: The observation is the deliverable and no guidance is derived from it.
artifact_contract_output_type: derived-guidance
artifact_contract_required_data:
  - the directive
  - the observation it came from
artifact_contract_verified_by: "the guidance reads as something that can be followed, not as a description of the person"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Turn an observation into an instruction, not a description of the user
**MUST be imperative**: "Provide concise explanations with code" not "You tend to prefer brief explanations"
claude_instruction fields must be imperative directives, not descriptions -- the profile is an instruction document for Claude's consumption
<!-- vpmodule:atom:end turn-an-observation-into-an-instruction-not-a-description-of-the-user -->