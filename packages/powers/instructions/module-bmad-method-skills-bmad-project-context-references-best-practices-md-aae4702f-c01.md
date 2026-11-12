---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-project-context-references-best-practices-md-aae4702f-c01"
title: "bmad-method: skills/bmad-project-context/references/best-practices.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-project-context/references/best-practices.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-project-context/references/best-practices.md\"}"
atom_ids:
  - admit-a-rule-by-the-cost-of-not-having-it
  - treat-every-existing-instruction-as-intentional
atom_count: 2
atoms: "[{\"atom_id\":\"admit-a-rule-by-the-cost-of-not-having-it\",\"file_sha256\":\"ca30916e3a0353866d7c4a42b1f44896d856497ea3c0a4eb01274d148c439a42\",\"content_sha256\":\"48ab2e259f56f83a19b1dd4e608d9139a5399cf4dc53fce1fcadb2a50212ba78\",\"file_bytes\":1811,\"body_bytes\":661},{\"atom_id\":\"treat-every-existing-instruction-as-intentional\",\"file_sha256\":\"fc3a4fa7f557b46162de577ebfd6ae3373a568d699f39b27913a20165836ea59\",\"content_sha256\":\"59ff241540e5489efa4d44749e035a9dc177fd432464f6bf848f234005501865\",\"file_bytes\":1403,\"body_bytes\":255}]"
carrier_sha256: f0f54081567b7fd88ed0f1be0cc0ff58e931ed0f4e0a1b980f1af6b043927f7e
carrier_bytes: 3505
revision: 1
status: active
---
<!-- vpmodule:atom:begin admit-a-rule-by-the-cost-of-not-having-it -->
---
instruction_id: admit-a-rule-by-the-cost-of-not-having-it
title: Admit a rule by the cost of not having it
summary: "A line earns its place by what it costs the agent when it is missing, not by whether the agent could derive it."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A candidate rule is being considered for the instructions of a repository.
conditions_does_not_apply_when: The rule is a reference value the agent can read from the code at any time.
artifact_contract_output_type: admitted-rule
artifact_contract_required_data:
  - the rule
  - the cost of not having it
  - the point of use
artifact_contract_verified_by: the admission test names what the agent would do wrong without the line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/references/best-practices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Admit a rule by the cost of not having it
Not *could an agent derive this* but *what does it cost when it doesn't*: how much exploration finding it takes, how likely the agent is to search the right place in time rather than guess, whether it is available at the point of use or only after the mistake, what a retrieval failure costs — a wasted search, or corrupt data — and whether it is a rule that must hold or a detail the code already shows.
A line that stops the same rediscovery every session earns its place, derivable or not.
A stored copy of what the agent reads more accurately first-hand does not — it rots, and it is charged every session.
<!-- vpmodule:atom:end admit-a-rule-by-the-cost-of-not-having-it -->
<!-- vpmodule:atom:begin treat-every-existing-instruction-as-intentional -->
---
instruction_id: treat-every-existing-instruction-as-intentional
title: Treat every existing instruction as intentional
summary: "An instruction a human wrote is presumed intentional and the file is the baseline being improved, not raw material to be discarded."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The instructions of a repository that already hold content are being revised.
conditions_does_not_apply_when: The instruction file is empty and everything is written from scratch.
artifact_contract_output_type: baseline-reading
artifact_contract_required_data:
  - the existing instructions
  - the presumption
  - the baseline
artifact_contract_verified_by: no existing instruction is dropped as raw material
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/references/best-practices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Treat every existing instruction as intentional
Every instruction a human wrote is presumed intentional: someone paid for it, usually by watching an agent fail.
The file is the baseline being improved, not raw material.
Keep its phrasing where it works
<!-- vpmodule:atom:end treat-every-existing-instruction-as-intentional -->