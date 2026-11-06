---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-mock-services-with-jasmine-createspyobj
title: "Mock services with jasmine.createSpyObj"
summary: "Isolate unit tests by providing mock implementations of dependencies"
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Testing guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L39"
status: active
revision: 1
---

# Mock services with jasmine.createSpyObj

Isolate unit tests by providing mock implementations of dependencies

**Do:** SpyObj or jest.fn() mocks for services

**Don't:** Real HTTP calls in unit tests

**Applies To:** angular 22.x

**Severity:** High

**Good example:**

```text
const spy = jasmine.createSpyObj('UserService' ['getUser']); spy.getUser.and.returnValue(of(user))
```

**Bad example:**

```text
providers: [UserService] // real service in unit test
```
