---
instruction_id: run-the-lenses-and-fix-what-they-find
title: Run the lenses and fix what they find
summary: "Every file-writing path ends with the lenses over what was written, every defect they name is applied, and a judgment call is left alone."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
  - review-fix-application-policy
conditions_applies_when: A tool or a skill has been written and is about to be handed over.
conditions_does_not_apply_when: Nothing was written in this session.
artifact_contract_output_type: lens-round
artifact_contract_required_data:
  - the lenses run
  - the findings applied
  - the judgment calls left
  - the rounds run
artifact_contract_verified_by: "every defect finding was applied, the judgment calls were left, and the lenses were re-run after a critical or important fix"
compatibility_excludes:
  - keep-review-read-only
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ship.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run the lenses and fix what they find
Launch one subagent per lens, in parallel
If subagents are unavailable, run the lenses inline one at a time and say so.
Apply what is a defect against the standards or the canon's tests: a path that does not resolve, a description without its `Use when` or past its two parts, a declared customization value the body never reads, prose doing a script's work, a line a capable model follows unasked. Apply every leanness finding too, its `proposed_smallest` included: the lean version is the default, and the check below guards it. Leave what is a judgment call: a persona line, a split into two skills. Never apply a finding that undoes the approved read-back (name, purpose, shape, location) without asking. When an Important or Critical finding was fixed, run the lenses once more; stop after two rounds.
Every path that writes files ends by loading the shipping step, where the lenses run over what was written and it fixes what they find before handing over.
