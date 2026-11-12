---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-log-business-actions-through-services
title: "Log business actions through services"
summary: "Enterprise desktop apps need traceability for sensitive changes"
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: "Audit guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L71"
status: active
revision: 1
---

# Log business actions through services

Enterprise desktop apps need traceability for sensitive changes

**Do:** Record user action entity result and timestamp in service layer

**Don't:** Log only UI button clicks

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
audit.log(user, "invoice.approve", invoiceId, SUCCESS);
```

**Bad example:**

```text
System.out.println("clicked approve");
```
