---
instruction_id: inventory-the-evidence-before-you-analyse-it
title: Inventory the evidence before you analyse it
summary: "What the finished work produced is enumerated with the source of each artifact, and the inventory is the authoritative list the later phases read."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
  - evidence-analysis
  - code-audit
conditions_applies_when: A retrospective begins the analysis of a finished body of work.
conditions_does_not_apply_when: The inventory was already taken in this run.
artifact_contract_output_type: evidence-inventory
artifact_contract_required_data:
  - what exists and the source path of each
  - what is missing
  - the diff ranges the later phases read
artifact_contract_verified_by: "every artifact of the body of work is listed with its source, and the inventory names what is missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/evidence-gathering.md
status: active
revision: 1
---

# Inventory the evidence before you analyse it
Enumerate what the completed epic produced, so every later analysis works from real artifacts instead of memory.
Output is an inventory: what exists, what is missing, and the diff ranges the rest of the retro will read.
Collect what the epic produced and note the source path or range of each:
- **Epic file**
- Description, Outcome, Done when, Boundaries, and Notes. Done when governs Phase 4; when the file has none, note that the verdict will be profiled from the diff.
- **Initiative requirements** — the Requirements section of the initiative file in the epic folder's parent. Each ticket's `covers` names ids there.
- **Entries**
- its `description`, `verify`, and `covers` are what the build was given. `description` and `verify` are empty once the entry was pulled: the story file holds them.
- **Story files**
- when it is not null: the intent of a ticket a person reviewed or refined.
- **Plans** — one plan for each ticket:
- its frontmatter (`status`, `baseline_revision`),
- the decisions it froze after approval,
- Design Notes and Implementation Notes,
- and the sections Review Triage Log, Verification, Plan Change Log, and the dated `### <date>` blocks under `## Code Review`, absent when no review ran.
- These mark the boundaries between build sessions.
- **Previous retrospective**
- in the previous epic's folder, if one exists,
- so Phase 4 can check whether last epic's action items landed.
- **Session logs** — conversation or session records for the epic's tickets, when available.
Carry the inventory forward into Phase 2 as the authoritative list of what is available to read.
