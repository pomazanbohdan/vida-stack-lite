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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/from-logs.md
status: active
revision: 1
---

# Mine skill candidates from the logs
A candidate is a request made repeatedly, the tool sequence that answered it, and the corrections the user made along the way.
The corrections are the know-how a skill exists to encode; a request with none is probably something the model already does well and needs no skill.
Propose at most three, each with its counts: how often asked, in which words, which tools in which order, and the corrections verbatim.
Say that the digest is computed locally and nothing leaves the machine, and wait for a yes before reading.
