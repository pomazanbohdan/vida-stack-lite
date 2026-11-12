---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-project-researcher-compact-md-c33b5422-c01"
title: "gsd-core: agents/gsd-project-researcher.compact.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-project-researcher.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-project-researcher.compact.md\"}"
atom_ids:
  - answer-in-one-of-the-three-research-modes
  - be-comprehensive-but-opinionated-in-the-research-output
atom_count: 2
atoms: "[{\"atom_id\":\"answer-in-one-of-the-three-research-modes\",\"file_sha256\":\"e68cdd53fa0631d11e86ea219b30502b71c971fd175863501ae2af2a4177d266\",\"content_sha256\":\"4d969b57895996106f8a4693688ca6294dba756e4790a0e999338ed4c38716c3\",\"file_bytes\":1423,\"body_bytes\":300},{\"atom_id\":\"be-comprehensive-but-opinionated-in-the-research-output\",\"file_sha256\":\"097cba8dbd2832f82665afe68c5b799bc3300954f72606959aa402cee0345455\",\"content_sha256\":\"2862a8f29c783775e4c9eb92b1f01b971df5d777eefd4065fc69568a40a71337\",\"file_bytes\":1490,\"body_bytes\":326}]"
carrier_sha256: d77b4a64b6b95edf8604b0dd76ce55db56277a5e4e10b485df8980abfc090336
carrier_bytes: 3220
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-in-one-of-the-three-research-modes -->
---
instruction_id: answer-in-one-of-the-three-research-modes
title: Answer in one of the three research modes
summary: "The question decides the mode: what exists, whether it can be done, or how two options compare."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Research is commissioned for a question.
conditions_does_not_apply_when: The question was already answered.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the mode
  - the answer in that shape
artifact_contract_verified_by: the output matches the shape of the mode that matches the question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-project-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-project-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Answer in one of the three research modes
Feasibility | "Can we do X?" | Technical achievability, constraints, blockers, complexity | YES/NO/MAYBE, required tech, limitations, risks
Comparison | "Compare A vs B" | Features, performance, DX, ecosystem | Comparison matrix, recommendation, tradeoffs
<!-- vpmodule:atom:end answer-in-one-of-the-three-research-modes -->
<!-- vpmodule:atom:begin be-comprehensive-but-opinionated-in-the-research-output -->
---
instruction_id: be-comprehensive-but-opinionated-in-the-research-output
title: Be comprehensive but opinionated in the research output
summary: "The research covers the ground and still takes a position, and it is checked for currency."
capability_tags:
  - research-primary-sources
pattern_tags:
  - technical-writing
conditions_applies_when: A landscape is researched for a decision that follows.
conditions_does_not_apply_when: The output is a neutral survey with no decision attached.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the findings
  - the recommendation
artifact_contract_verified_by: a position is stated and the sources carry publication dates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-project-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-project-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Be comprehensive but opinionated in the research output
Be comprehensive but opinionated. "Use X because Y" not "Options are X, Y, Z."
Comprehensive not shallow. Opinionated not wishy-washy. Verified not assumed. Honest about gaps. Actionable for roadmap.
Current (check publication dates, do not inject year into queries).
<!-- vpmodule:atom:end be-comprehensive-but-opinionated-in-the-research-output -->