---
instruction_id: run-every-check-before-reporting-the-first-failure
title: Run every check before reporting the first failure
summary: "All the checks run, then the findings are reported one per line with the fix, and the check itself changes nothing."
capability_tags:
  - harden-validation
pattern_tags:
  - verification-before-completion
  - output-formatting
conditions_applies_when: An artefact is checked for what would stop it working.
conditions_does_not_apply_when: A check is a single command whose failure ends the work.
artifact_contract_output_type: validation-report
artifact_contract_required_data:
  - the findings
  - the fix for each finding
  - the counts
  - whether the target would work as it stands
artifact_contract_verified_by: "every check ran, the report says whether the target would work, and nothing was changed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/validate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Run every check before reporting the first failure
Check a skill or a module and report what would stop it installing, loading or firing, with the fix for each. This mode writes nothing.
Run them all, then report; do not stop at the first failure.
One line per finding: file, what is wrong, the fix. Then the counts, and whether the target would install and load as it stands.
Offer to fix through the edit mode; do not fix here.
