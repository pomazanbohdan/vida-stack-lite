---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-support-deep-linking-with-protocol-activation
title: "Support deep linking with protocol activation"
summary: "Respond to URI activation and toast taps"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Navigation guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L20"
status: active
revision: 1
---

# Support deep linking with protocol activation

Respond to URI activation and toast taps

**Do:** OnActivated handler with proper page routing

**Don't:** Ignoring activation arguments

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
protected override void OnActivated(IActivatedEventArgs args) { if (args.Kind == ActivationKind.Protocol) { ... } }
```

**Bad example:**

```text
Empty OnActivated ignoring URI parameters
```
