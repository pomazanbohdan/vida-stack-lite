---
instruction_id: advise-without-applying-the-fix
title: Advise without applying the fix
summary: "A review is advice, not a gate: the findings are ordered by severity, each with its fix, and none is applied unless it is asked for."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - output-formatting
conditions_applies_when: A review of an existing artefact is asked for.
conditions_does_not_apply_when: The review is part of a build that is going to be fixed in this session.
artifact_contract_output_type: advisory-review
artifact_contract_required_data:
  - the findings in severity order
  - the fix for each finding
  - the verdict of each lens
  - the written report
artifact_contract_verified_by: "the findings are ordered, each carries its fix, and nothing was changed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/review.md
status: active
revision: 1
---

# Advise without applying the fix
Advice, not a gate.
Merge the lens returns, drop duplicates (same file, same place, same point), order by severity.
Give the findings in chat, each in two lines: what and where, then the fix; one line per lens with its verdict above them.
Write the same list as markdown
so the user can work from it later; no other format.
Offer the edit mode
for the findings the user wants applied; apply none unasked.
