---
instruction_id: triage-the-failure-by-kind
title: Triage the failure by kind
summary: "Sort the failure as a test, build, runtime, data or external-service problem, then check the causes that belong to that kind."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "A test, build or running system fails and the failing layer is not yet known."
conditions_does_not_apply_when: The failing layer is already established.
artifact_contract_output_type: failure-triage
artifact_contract_required_data:
  - the failing layer
  - the causes checked for that kind
  - the outcome of each check
artifact_contract_verified_by: the failing layer is named and the causes of that kind were checked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/debugging-and-error-recovery/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/quota-and-rate-limit-failure-classification.md
status: active
revision: 2
---

# Triage the failure by kind

Narrow down WHERE the failure happens:

```
Which layer is failing?
├── UI/Frontend     → Check console, DOM, network tab
├── API/Backend     → Check server logs, request/response
├── Database        → Check queries, schema, data integrity
├── Build tooling   → Check config, dependencies, environment
├── External service → Check connectivity, API changes, rate limits
└── Test itself     → Check if the test is correct (false negative)
```

```
Test fails after code change:
├── Did you change code the test covers?
│   └── YES → Check if the test or the code is wrong
│       ├── Test is outdated → Update the test
│       └── Code has a bug → Fix the code
├── Did you change unrelated code?
│   └── YES → Likely a side effect → Check shared state, imports, globals
└── Test was already flaky?
    └── Check for timing issues, order dependence, external dependencies
```

```
Build fails:
├── Type error → Read the error, check the types at the cited location
├── Import error → Check the module exists, exports match, paths are correct
├── Config error → Check build config files for syntax/schema issues
├── Dependency error → Check package.json, run npm install
└── Environment error → Check Node version, OS compatibility
```

```
Runtime error:
├── TypeError: Cannot read property 'x' of undefined
│   └── Something is null/undefined that shouldn't be
│       → Check data flow: where does this value come from?
├── Network error / CORS
│   └── Check URLs, headers, server CORS config
├── Render error / White screen
│   └── Check error boundary, console, component tree
└── Unexpected behavior (no error)
    └── Add logging at key points, verify data at each step
```
Treat provider quota and rate-limit failures as wait-and-resume conditions, not normal executor failures.
Quota failures MUST NOT offer immediate retry as the primary recovery.
Non-quota failures MUST continue through the normal execution failure path.
