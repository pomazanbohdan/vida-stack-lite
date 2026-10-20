---
instruction_id: report-the-other-findings-separately
title: Report the other findings separately
summary: "A real defect noticed while tracing verification is reported apart from the gaps, so it still goes through the normal triage."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Tracing verification turned up a problem that is not a verification gap.
conditions_does_not_apply_when: Only verification gaps were found.
artifact_contract_output_type: other-findings
artifact_contract_required_data:
  - the problems noticed
  - where they were noticed
artifact_contract_verified_by: the non-gap problems are listed apart from the gaps
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/verification-gap.md
status: active
revision: 1
---

# Report the other findings separately
Report genuine problems you noticed while tracing verification, even if they are not verification gaps. Put them under `Other findings` in the output.
This permits reporting what you already reached, not extra hunting.
A claim that code misbehaves is a defect, not a gap — it goes under `Other findings` for standard triage, however you found it.
