---
instruction_id: scope-agent-reads-to-the-current-work
title: Scope agent reads to the current work
summary: "Point the agent at the current work: the finished plans stay as evidence, the superseded ones are archived once their references remain reachable, and no live plan is removed as part of that cleanup."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A repository holds the records of work that is finished and of work in flight.
conditions_does_not_apply_when: There is only one piece of work.
artifact_contract_output_type: context-scope
artifact_contract_required_data:
  - the current work
  - the archived records
  - what stays reachable
artifact_contract_verified_by: an agent reading the scope sees the current work first and the old records as evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/artifact-lifetime.md
status: active
revision: 1
---

# Scope agent reads to the current work
Scope ordinary agent reads to the active initiative and current epic in `AGENTS.md`.
Historical plans are evidence, not a replacement for the current code.
Superseded planning documents can be archived once their references and requirement sources remain accessible.
Never remove live plans as part of that cleanup.
