---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-use-unpackaged-or-packaged-appropriately
title: "Use unpackaged or packaged appropriately"
summary: "Choose deployment model for your scenario"
capability_tags:
  - design-production-readiness
pattern_tags:
  - release-readiness
conditions_applies_when: "Packaging guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L31"
status: active
revision: 1
---

# Use unpackaged or packaged appropriately

Choose deployment model for your scenario

**Do:** Packaged (MSIX) for Store distribution

**Don't:** Unpackaged without considering API limitations

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
<WindowsPackageType>None</WindowsPackageType> for unpackaged
```

**Bad example:**

```text
Assuming all APIs work in unpackaged mode
```
