---
instruction_id: close-a-container-against-its-done-when
title: Close a container against its done when
summary: "A container is closed by checking its done condition against the implementation evidence, not by the fact that all of its children are closed."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A container is being closed.
conditions_does_not_apply_when: "The container's items are still open."
artifact_contract_output_type: closure-check
artifact_contract_required_data:
  - the done condition checked against the implementation evidence
  - the requirements and constraints
  - the dropped work explained
artifact_contract_verified_by: "the done condition was checked against implementation evidence, not against the items being closed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/finish-an-epic.md
status: active
revision: 2
---

# Close a container against its done when
Verify the container's Done when against implementation evidence and its requirements, including constraints and companions. All known children done is evidence, not proof the parent is complete; explain any dropped work and confirm remaining scope with the user.
Closing every child does not close the parent. Run the closure check in `validate.md` against its requirements and Done when; the user confirms the parent is complete.
A failing epic never closes as quietly accepted.
If the criteria aren't met, or any of the epic's tickets are still unfinished, and no one overrides the call, it closes as not accepted.
Unfinished tickets make the skill's verdict `rejected`; a human can still override.
The verdict is the gate.
