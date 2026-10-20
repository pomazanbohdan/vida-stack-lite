---
instruction_id: drop-the-host-mechanics-when-you-port-a-skill
title: Drop the host mechanics when you port a skill
summary: "When an artifact comes from another tool, drop that tool's own mechanics and the instructions every model already follows; what prevents a failure stays, and the gaps the source never said are filled."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An artifact written for another tool is being brought into this one.
conditions_does_not_apply_when: The artifact was already written for this tool.
artifact_contract_output_type: agent-skill
artifact_contract_required_data:
  - the source
  - what was dropped
  - what stayed
artifact_contract_verified_by: the ported artifact keeps what prevents a failure and carries no mechanics of the old host
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/how-to-convert-external.md
status: active
revision: 1
---

# Drop the host mechanics when you port a skill
reads it whole and extracts the outcome, who consumes it, the triggers the author meant, the know-how a model would not have, and any scripts.
drops the host's mechanics: frontmatter keys another tool owns
slash-command syntax and `$ARGUMENTS`, GPT conversation starters, and the instructions every model follows unasked (be helpful, think step by step, format as markdown)
What prevents a failure stays.
Discovery fills the gaps the source never said, usually the consumer, the near misses, and the name, since outside skills are named for their host.
