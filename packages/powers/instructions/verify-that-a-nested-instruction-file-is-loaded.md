---
instruction_id: verify-that-a-nested-instruction-file-is-loaded
title: Verify that a nested instruction file is loaded
summary: "Check in every harness in use that the nested file is really loaded; where it is not, keep the rules at the root as path-qualified lines."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - verified-loading
conditions_applies_when: Rules are about to be moved into a nested file that sits inside the repository.
conditions_does_not_apply_when: All rules stay in the root block.
artifact_contract_output_type: nested-instruction-decision
artifact_contract_required_data:
  - the nested file
  - the harness check
  - the rules that stay at the root
  - the path-qualified lines
artifact_contract_verified_by: the loading was checked in every harness in use before the nested file was relied on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/references/best-practices.md
status: active
revision: 1
---

# Verify that a nested instruction file is loaded
A component, nested repository, or extracted rules file gets its own file under the same shape when work keeps landing there and every condition holds:
its rules are subtree-exclusive, they are substantial (a handful of rules is not a file), the split materially reduces the parent block, the loading mechanism is verified for every harness in use — checked, never assumed — and the user approves the split.
Even with verified loading, keep a rule at the root when it must apply before a session enters that directory or when breaking it can affect work outside the child.
Otherwise the rules stay in the parent block as path-qualified lines ("in `src/importer/`: ..."), which cost less than a file nobody loads.
Check, never assume: several harnesses build the instruction chain once at session start, root down to the working directory, so a nested file is invisible to the session that later edits into that subtree.
Unverified means path-qualified lines at root instead
Use a linked file only when the trigger is not a path.
