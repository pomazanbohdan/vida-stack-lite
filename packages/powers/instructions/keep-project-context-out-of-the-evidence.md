---
instruction_id: keep-project-context-out-of-the-evidence
title: Keep project context out of the evidence
summary: "Project context shapes what to ask and never what is true: a research worker receives its brief and nothing else."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A research worker is dispatched to gather material.
conditions_does_not_apply_when: The worker reads the project files directly and there is no brief to hand it.
artifact_contract_output_type: research-firewall
artifact_contract_required_data:
  - the brief the worker received
  - the context withheld from it
artifact_contract_verified_by: "no claim in the artifact rests on project context, and the worker received nothing but its brief"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 1
---

# Keep project context out of the evidence
It is inadmissible as evidence: every claim in a research artifact traces to a digest or import file with a source.
Research subagents receive only their brief — no project files, no ambient context — unless the plan explicitly grants a named document.
Each assistant runs behind the **research firewall**: it gets its brief and nothing else — no project files, no ambient context.
Spawn every subagent fresh and directly, never through a workflow, which relays the triggering request to every agent it runs, and as a subagent type without the project’s instruction files and git status when the harness has one, since those can name the work in progress.
- `brief.md` is all a researcher learns: the numbered questions with their shapes, the full and short commit, the budgets, the validation level, and the paths left out of every search, relative to the repository
