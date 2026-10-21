---
instruction_id: reject-a-vague-or-placeholder-failure-statement
title: Reject a vague or placeholder failure statement
summary: "The failure statement names an observable signal; a restatement of the word failure, a placeholder value or a minimum-length rule is rejected."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: The failure statement of an acceptance command is written.
conditions_does_not_apply_when: The statement already names a concrete signal the tool emits.
artifact_contract_output_type: failure-statement
artifact_contract_required_data:
  - the observable signal
  - the rejected forms
artifact_contract_verified_by: no statement restates the word failure and no placeholder value survived
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-failing-direction.md
status: active
revision: 1
---

# Reject a vague or placeholder failure statement
- **Name an observable signal**, not the word "failure". `non-zero exit`, `"0 passed" in the summary`, `the coverage line is absent`, `stderr contains "ECONNREFUSED"` are signals. *"the command fails"*, *"it doesn't work"*, *"an error occurs"* are restatements and will be flagged.
- **Short is fine.** `non-zero exit` is complete. There is no minimum length and no required keyword.
- **`TBD`, `TODO`, `N/A`, `none`, `unknown`, `?`, `-` are rejected outright** as whole values. A statement you cannot write is a command you should not ship.
- **Any characters are safe.** `exit code > 0`, `stderr contains "FAIL" && exit != 0` are ordinary prose here - that is exactly why this is an element and not an attribute.
