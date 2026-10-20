---
instruction_id: let-the-team-discuss-evidence-never-invention
title: "Let the team discuss evidence, never invention"
summary: "The discussion speaks only to findings that carry a source reference, steers to the process that would have prevented the finding rather than to blame, and never replaces the verdict."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
  - code-audit
conditions_applies_when: A discussion of the findings is held.
conditions_does_not_apply_when: No discussion was asked for.
artifact_contract_output_type: team-discussion
artifact_contract_required_data:
  - the findings under discussion
  - what the discussion surfaced
artifact_contract_verified_by: "every point made in the discussion rests on a sourced finding, and a new observation is a question until it can be sourced"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/team-discussion.md
status: active
revision: 1
---

# Let the team discuss evidence, never invention
One rule: **the team discusses evidence, never invention.**
Agents speak only to findings that carry source references.
No agent may describe an event that did not happen or report a pattern the diff does not show.
Only when asked — "discuss it as a team," "run party mode," or similar. A default run never enters this phase.
Keep the user an active participant and steer toward systemic understanding over blame — the point is which process or convention would have prevented a finding, not who wrote the line.
Capture anything the discussion surfaces that the analyses missed; a genuinely new observation becomes a finding only once you can tie it to a source, otherwise it is a question for Phase 4, not a conclusion.
The discussion does not replace Phase 4. Its output feeds the action items and the verdict; it does not render them.
