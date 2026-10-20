---
instruction_id: delegate-the-input-scanning-and-merge-the-findings
title: Delegate the input scanning and merge the findings
summary: "Do not read the person own files; collect the paths, fan the scanners out in parallel with the product intent, degrade gracefully when no subagent is available, and merge the findings back, surfacing anything that challenges the assumptions."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "The person has documents, research or other material that has to be brought in."
conditions_does_not_apply_when: There is no material to bring in.
artifact_contract_output_type: gathered-context
artifact_contract_required_data:
  - the paths collected
  - the scanner findings
  - what challenged the assumptions
artifact_contract_verified_by: the material was read by the scanners and the surprising findings were surfaced before the work continued
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/SKILL.md
status: active
revision: 1
---

# Delegate the input scanning and merge the findings
Ask the user whether they have existing documents, research, brainstorming, or other materials to inform the PRFAQ. Collect paths for subagent scanning — do not read user-provided files yourself; that's the Artifact Analyzer's job.
Fan out subagents in parallel.
## Artifact Analyzer
For relevant documents, plus any user-provided paths. Receives the product intent summary so it knows what's relevant.
## Web Researcher
Searches for competitive landscape, market context, and current industry data relevant to the concept.
Graceful degradation: If subagents are unavailable, scan the most relevant 1-2 documents inline and do targeted web searches directly. Never block the workflow.
Merge findings with what the user shared. Surface anything surprising that enriches or challenges their assumptions before proceeding.
