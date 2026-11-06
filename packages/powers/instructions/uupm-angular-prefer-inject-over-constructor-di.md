---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-prefer-inject-over-constructor-di
title: "Prefer inject() over constructor DI"
summary: "inject() function is composable and works in more contexts than constructor injection"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L51"
status: active
revision: 1
---

# Prefer inject() over constructor DI

inject() function is composable and works in more contexts than constructor injection

**Do:** inject() for dependency injection

**Don't:** Constructor parameters for new code

**Applies To:** angular 22.x

**Severity:** Medium

**Good example:**

```text
readonly http = inject(HttpClient); readonly router = inject(Router)
```

**Bad example:**

```text
constructor(private http: HttpClient private router: Router) {}
```
