---
instruction_id: feed-ci-failures-back-into-the-work-loop
title: Feed CI failures back into the work loop
summary: "When CI fails, hand the specific failure output back and verify the fix locally before pushing again."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: An automated check fails on a pushed change.
conditions_does_not_apply_when: "The failure is a defect report about behaviour, not a check result."
artifact_contract_output_type: failure-feedback-loop
artifact_contract_required_data:
  - the failure output
  - the local verification before the next push
artifact_contract_verified_by: the failure is reproduced and fixed locally before the change is pushed again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 1
---

# Feed CI failures back into the work loop
The power of CI with AI agents is the feedback loop. When CI fails:

```
CI fails
    │
    ▼
Copy the failure output
    │
    ▼
Feed it to the agent:
"The CI pipeline failed with this error:
[paste specific error]
Fix the issue and verify locally before pushing again."
    │
    ▼
Agent fixes → pushes → CI runs again
```

**Key patterns:**

```
Lint failure → Agent runs `npm run lint --fix` and commits
Type error  → Agent reads the error location and fixes the type
Test failure → Agent follows the debugging skill
Build error → Agent checks config and dependencies
```
