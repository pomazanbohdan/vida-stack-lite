---
instruction_id: re-check-a-research-claim-against-the-current-code
title: Re-check a research claim against the current code
summary: A research document is evidence as of its commit; a claim the plan rests on is re-checked against the current code when the file it cites changed since that commit.
capability_tags:
  - verify-work-results
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A plan takes a claim from a research document written at an earlier commit.
conditions_does_not_apply_when: The claim was read from the current code during this investigation.
artifact_contract_output_type: claim-recheck
artifact_contract_required_data:
  - the commit the research document was written at
  - the claim the plan rests on
  - the change to the cited file since that commit
  - the re-checked claim
artifact_contract_verified_by: the claim was re-checked against the current code or investigated afresh
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 1
---

# Re-check a research claim against the current code

Treat a codebase research document as evidence for this investigation, read at its `commit`.

Before the plan uses a claim from it, re-check it against the current code when the plan rests on it or its cited file changed since that commit (`git diff --stat <commit> -- <path>`).

Investigate afresh any claim that no longer holds.
Before the plan uses a claim from it, re-check it against the current code when the plan rests on it or its cited file changed since that commit
