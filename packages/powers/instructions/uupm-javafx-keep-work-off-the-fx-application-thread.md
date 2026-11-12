---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-keep-work-off-the-fx-application-thread
title: "Keep work off the FX Application Thread"
summary: "Long-running work blocks rendering and input when executed on the UI thread"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Threading guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L3"
status: active
revision: 1
---

# Keep work off the FX Application Thread

Long-running work blocks rendering and input when executed on the UI thread

**Do:** Use Task or Service for background work

**Don't:** Run network database or file work in button handlers

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
Task<List<Item>> task = new Task<>() { protected List<Item> call() { return repo.load(); } }; new Thread(task).start();
```

**Bad example:**

```text
loadLargeFile(); table.setItems(items);
```
