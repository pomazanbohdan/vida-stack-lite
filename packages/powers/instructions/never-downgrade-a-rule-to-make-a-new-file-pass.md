---
instruction_id: never-downgrade-a-rule-to-make-a-new-file-pass
title: Never downgrade a rule to make a new file pass
summary: A file that no rule covers is not linted at all; lowering a rule severity turns a real finding into a silent one.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A newly covered file trips a rule and the finding is inconvenient.
conditions_does_not_apply_when: The file is covered by a rule block that already applies to it.
artifact_contract_output_type: rule-coverage-decision
artifact_contract_required_data:
  - the file
  - the rule block that covers it
  - the severity that is kept
artifact_contract_verified_by: the file resolves to rules and no rule severity was lowered to pass it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-eslint-coverage-findings.md
status: active
revision: 1
---

# Never downgrade a rule to make a new file pass
ESLint assigns rules by `files:` glob. A file matching **no** glob is not "linted and clean" — it is **not linted at all**, and ESLint reports nothing about it. There is no warning, no summary line, no exit code. The failure is perfectly silent.
Do not downgrade a rule's severity to make a new file pass — that converts a real finding into a silent one, which is the failure this guard exists to end.
