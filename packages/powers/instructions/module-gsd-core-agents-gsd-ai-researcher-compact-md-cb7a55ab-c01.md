---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-ai-researcher-compact-md-cb7a55ab-c01"
title: "gsd-core: agents/gsd-ai-researcher.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-ai-researcher.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-ai-researcher.compact.md\"}"
atom_ids:
  - bound-the-source-fetch-and-favour-depth-over-breadth
  - separate-the-system-prompt-from-the-user-prompt-and-bound-the-output
  - write-the-guidance-for-the-chosen-framework-not-generically
atom_count: 3
atoms: "[{\"atom_id\":\"bound-the-source-fetch-and-favour-depth-over-breadth\",\"file_sha256\":\"9498ae79c34a737e211d6963ce1ec6453be87f8c5adb8ae5207dccd00c691b8c\",\"content_sha256\":\"93e18a03074ff3e5ef24ea810c443536a2a4b8b40d80940c85b4117bd5bcbf87\",\"file_bytes\":1607,\"body_bytes\":313},{\"atom_id\":\"separate-the-system-prompt-from-the-user-prompt-and-bound-the-output\",\"file_sha256\":\"f693f22cff0662a8e1b019eac960b5f92671dcb157a44f99d624cc11df9823c6\",\"content_sha256\":\"0480274ff3a0b3c8a5575f33aa5e01ea546a13b18a62dbeee19bb7d3ef476477\",\"file_bytes\":1568,\"body_bytes\":285},{\"atom_id\":\"write-the-guidance-for-the-chosen-framework-not-generically\",\"file_sha256\":\"ce3e8aa7f23701b3514c8db5c91407214a0f483848becd71189cb2b713efa2d9\",\"content_sha256\":\"e04e2b59c7b206307117752c46cadab8a2c31dc963f4b6fb933318c1c0ac49d4\",\"file_bytes\":1472,\"body_bytes\":261}]"
carrier_sha256: f6c1f9c3f6fcde8d8e47b31568b112e31dd0f51412e40e5173d2ce07fdc17221
carrier_bytes: 5178
revision: 1
status: active
---
<!-- vpmodule:atom:begin bound-the-source-fetch-and-favour-depth-over-breadth -->
---
instruction_id: bound-the-source-fetch-and-favour-depth-over-breadth
title: Bound the source fetch and favour depth over breadth
summary: "A small number of pages is read well rather than many pages read shallowly, and what is quoted matches the real package."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Documentation is fetched to answer a specific implementation question.
conditions_does_not_apply_when: The answer is already in the repository and needs no external source.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the pages read
  - the installation command
  - the imports
  - the pitfalls
artifact_contract_verified_by: the note names at most the bound and every import matches the real package structure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ai-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ai-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Bound the source fetch and favour depth over breadth
Fetch 2-4 pages maximum — prioritize depth over breadth: quickstart, the `system_type`-specific pattern page, best practices/pitfalls.
Imports match actual package structure (not approximate)
All code snippets syntactically correct for the fetched version
<!-- vpmodule:atom:end bound-the-source-fetch-and-favour-depth-over-breadth -->
<!-- vpmodule:atom:begin separate-the-system-prompt-from-the-user-prompt-and-bound-the-output -->
---
instruction_id: separate-the-system-prompt-from-the-user-prompt-and-bound-the-output
title: Separate the system prompt from the user prompt and bound the output
summary: "The system instruction and the user instruction are written apart, few-shot examples are placed deliberately, and the output length is bounded explicitly."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Prompt handling is described for a model-backed feature.
conditions_does_not_apply_when: No model call is part of the work.
artifact_contract_output_type: implementation-guide
artifact_contract_required_data:
  - the system prompt
  - the user prompt
  - the output bound
artifact_contract_verified_by: the output bound is set explicitly and the two prompt roles are separated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ai-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ai-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Separate the system prompt from the user prompt and bound the output
System vs. user prompt separation; few-shot: inline vs. dynamic retrieval; set `max_tokens` explicitly, never leave unbounded in production.
stream vs. await (stream for UX, await for structured output validation)
<!-- vpmodule:atom:end separate-the-system-prompt-from-the-user-prompt-and-bound-the-output -->
<!-- vpmodule:atom:begin write-the-guidance-for-the-chosen-framework-not-generically -->
---
instruction_id: write-the-guidance-for-the-chosen-framework-not-generically
title: "Write the guidance for the chosen framework, not generically"
summary: Every pitfall and example is specific to the framework and the use case; an unverified API is marked as unverified.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: Implementation guidance is written for a chosen framework.
conditions_does_not_apply_when: The guidance is about the business domain rather than the framework.
artifact_contract_output_type: implementation-guide
artifact_contract_required_data:
  - the pitfalls
  - the examples
artifact_contract_verified_by: no pitfall or example is generic and every unverified API is marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ai-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ai-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the guidance for the chosen framework, not generically
Pitfalls specific — "use async where supported" is useless
No hallucinated API methods — note "verify in docs" if unsure
Section 4b examples specific to `framework` + `system_type`, not generic
<!-- vpmodule:atom:end write-the-guidance-for-the-chosen-framework-not-generically -->