---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-approaches-from-logs-md-1374cd5a-c01"
title: "bmad-method: skills/bmad-toolsmith/approaches/from-logs.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/approaches/from-logs.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/approaches/from-logs.md\"}"
atom_ids:
  - find-the-existing-tool-before-writing-a-new-one
  - mine-skill-candidates-from-the-logs
atom_count: 2
atoms: "[{\"atom_id\":\"find-the-existing-tool-before-writing-a-new-one\",\"file_sha256\":\"595f4732d355441b95b77c354eae9f1123dee884f88a3d8d1d53b9fce6300ba3\",\"content_sha256\":\"c9c33eac864f472627460e989bba13b63f2141f9aae3281efa420a20a01bc90d\",\"file_bytes\":1451,\"body_bytes\":219},{\"atom_id\":\"mine-skill-candidates-from-the-logs\",\"file_sha256\":\"4bc4a41938841f02a2746ef0eb3ae0f358d8d5de1d05c16a44628063f113a056\",\"content_sha256\":\"ebb95882b301ab3f8db433285b05111e83945ed6963dc06fddc21fd61f1a24d4\",\"file_bytes\":1767,\"body_bytes\":557}]"
carrier_sha256: fc258dd127d9d013f5fc3f4c432ef81e4859c3f58f9140c3d3d92ea29b28c696
carrier_bytes: 3497
revision: 1
status: active
---
<!-- vpmodule:atom:begin find-the-existing-tool-before-writing-a-new-one -->
---
instruction_id: find-the-existing-tool-before-writing-a-new-one
title: Find the existing tool before writing a new one
summary: "What is already installed is looked at first, and what an installed tool already covers is not proposed again."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
  - evidence-analysis
conditions_applies_when: A new tool is about to be written.
conditions_does_not_apply_when: The tool exists already and is being changed.
artifact_contract_output_type: inventory
artifact_contract_required_data:
  - what is already installed
  - what it already covers
artifact_contract_verified_by: the existing inventory was read before the proposal and nothing already covered is proposed again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/ecosystem.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/approaches/from-logs.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Find the existing tool before writing a new one
List the folder the user's agent reads skills from, and open a `SKILL.md` only when the name does not say what it does.
Leave out what an installed skill already covers
<!-- vpmodule:atom:end find-the-existing-tool-before-writing-a-new-one -->
<!-- vpmodule:atom:begin mine-skill-candidates-from-the-logs -->
---
instruction_id: mine-skill-candidates-from-the-logs
title: Mine skill candidates from the logs
summary: "A candidate is a request made repeatedly plus the corrections the user made, and the corrections are the know-how a skill exists to encode."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
  - instruction-authoring
conditions_applies_when: A skill is looked for in what the user actually did.
conditions_does_not_apply_when: The user has described the request in words already.
artifact_contract_output_type: candidate-set
artifact_contract_required_data:
  - the repeated request
  - the tool sequence that answered it
  - the corrections
  - how often it was asked
artifact_contract_verified_by: "each candidate carries its counts and the corrections verbatim, and nothing an installed tool already covers is proposed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/approaches/from-logs.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Mine skill candidates from the logs
A candidate is a request made repeatedly, the tool sequence that answered it, and the corrections the user made along the way.
The corrections are the know-how a skill exists to encode; a request with none is probably something the model already does well and needs no skill.
Propose at most three, each with its counts: how often asked, in which words, which tools in which order, and the corrections verbatim.
Say that the digest is computed locally and nothing leaves the machine, and wait for a yes before reading.
<!-- vpmodule:atom:end mine-skill-candidates-from-the-logs -->