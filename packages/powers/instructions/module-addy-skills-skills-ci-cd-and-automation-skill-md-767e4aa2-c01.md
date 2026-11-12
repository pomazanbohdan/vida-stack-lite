---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-ci-cd-and-automation-skill-md-767e4aa2-c01"
title: "addy-skills: skills/ci-cd-and-automation/SKILL.md module"
summary: "Carrier for 5 atomic instructions from addy-skills:skills/ci-cd-and-automation/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/ci-cd-and-automation/SKILL.md\"}"
atom_ids:
  - enforce-a-quality-gate-pipeline
  - feed-ci-failures-back-into-the-work-loop
  - give-feature-flags-a-cleanup-date
  - shift-checks-left
  - ship-in-small-batches
atom_count: 5
atoms: "[{\"atom_id\":\"enforce-a-quality-gate-pipeline\",\"file_sha256\":\"2853f84917df56bb86ac25d99e17ef1a35905ddccdee267ec14c3a73aea934db\",\"content_sha256\":\"defc1c973d80ca0b29898f0430e00d098a5013af701626928f2b29728d0fb4f4\",\"file_bytes\":1553,\"body_bytes\":491},{\"atom_id\":\"feed-ci-failures-back-into-the-work-loop\",\"file_sha256\":\"d92a1b714540f7c97b2b4bbe42fd8bd7b0771a393f79ac0c8818839353898c23\",\"content_sha256\":\"61750dd8a6a2df1fac42337e46c522ec87960b0389f07a2e56c14dc347612014\",\"file_bytes\":1746,\"body_bytes\":643},{\"atom_id\":\"give-feature-flags-a-cleanup-date\",\"file_sha256\":\"6f7352f9b9356c31c926dc6ac3030aa95fdae33ce2f3240f195201949e7d78c2\",\"content_sha256\":\"973f6079ad57b2921f5ee5217169405f17ee012adc9e7b0301aaf45ac46e77c2\",\"file_bytes\":1664,\"body_bytes\":650},{\"atom_id\":\"shift-checks-left\",\"file_sha256\":\"313c56d59bed86efb885482c5a63b665bd960510d7b2654a163733ab95fe296b\",\"content_sha256\":\"7ab3e46a2c11093c4a34d6c7b8c2567b7ae706bb2227b5f7cdfeebe890164de0\",\"file_bytes\":1239,\"body_bytes\":283},{\"atom_id\":\"ship-in-small-batches\",\"file_sha256\":\"722e4762d97eec376b17bd0259d66f4dfcdd952952e1dbf0ef663c94592a9a22\",\"content_sha256\":\"8d0499cf62fe486db70f75fb474c335679a08c2f3755ec9f299e9ee82e90343b\",\"file_bytes\":1188,\"body_bytes\":249}]"
carrier_sha256: a2ef6b38a8381cd0b435775ef4e1892828b041ebb04d66a0486222321f7e1c0d
carrier_bytes: 7963
revision: 1
status: active
---
<!-- vpmodule:atom:begin enforce-a-quality-gate-pipeline -->
---
instruction_id: enforce-a-quality-gate-pipeline
title: Enforce a quality-gate pipeline
summary: "No change reaches production without passing tests, lint, type checking and build, and no gate is skipped."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: "A project has automated checks, or a change must be verified before it ships."
conditions_does_not_apply_when: The work is a local experiment that is never shipped.
artifact_contract_output_type: quality-gate-pipeline
artifact_contract_required_data:
  - the gates in order
  - the rule that a failure blocks the change
artifact_contract_verified_by: a failing gate blocks the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Enforce a quality-gate pipeline
Automate quality gates so that no change reaches production without passing tests, lint, type checking, and build. CI/CD is the enforcement mechanism for every other skill — it catches what humans and agents miss, and it does so consistently on every single change.

Every change goes through these gates before merge:

**No gate can be skipped.** If lint fails, fix lint — don't disable the rule. If a test fails, fix the code — don't skip the test.
<!-- vpmodule:atom:end enforce-a-quality-gate-pipeline -->
<!-- vpmodule:atom:begin feed-ci-failures-back-into-the-work-loop -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
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
<!-- vpmodule:atom:end feed-ci-failures-back-into-the-work-loop -->
<!-- vpmodule:atom:begin give-feature-flags-a-cleanup-date -->
---
instruction_id: give-feature-flags-a-cleanup-date
title: Give a feature flag a cleanup date
summary: "Ship the code without enabling it, and remove the flag and the dead code when the rollout is done."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - automated-enforcement
conditions_applies_when: You introduce a feature flag.
conditions_does_not_apply_when: The behaviour is switched on permanently from the start.
artifact_contract_output_type: flag-lifecycle
artifact_contract_required_data:
  - the lifecycle stage
  - the cleanup date
artifact_contract_verified_by: the flag and its dead code are removed by the cleanup date
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
  - operations
---

# Give a feature flag a cleanup date
Feature flags decouple deployment from release. Deploy incomplete or risky features behind flags so you can:

- **Ship code without enabling it.** Merge to main early, enable when ready.
- **Roll back without redeploying.** Disable the flag instead of reverting code.
- **Canary new features.** Enable for 1% of users, then 10%, then 100%.
- **Run A/B tests.** Compare behavior with and without the feature.

**Flag lifecycle:** Create → Enable for testing → Canary → Full rollout → Remove the flag and dead code. Flags that live forever become technical debt — set a cleanup date when you create them.
<!-- vpmodule:atom:end give-feature-flags-a-cleanup-date -->
<!-- vpmodule:atom:begin shift-checks-left -->
---
instruction_id: shift-checks-left
title: Shift the checks left
summary: Catch a problem as early in the pipeline as possible.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: You choose where a check runs.
conditions_does_not_apply_when: The check can only run at one point.
artifact_contract_output_type: gate-ordering
artifact_contract_required_data:
  - the order of the checks
  - the earliest stage each runs at
artifact_contract_verified_by: "static analysis runs before tests, tests before staging, staging before production"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Shift the checks left
**Shift Left:** Catch problems as early in the pipeline as possible. A bug caught in linting costs minutes; the same bug caught in production costs hours. Move checks upstream — static analysis before tests, tests before staging, staging before production.
<!-- vpmodule:atom:end shift-checks-left -->
<!-- vpmodule:atom:begin ship-in-small-batches -->
---
instruction_id: ship-in-small-batches
title: Ship in small batches
summary: Smaller batches and more frequent releases reduce risk instead of increasing it.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - automated-enforcement
conditions_applies_when: You choose the size and cadence of a release.
conditions_does_not_apply_when: The change can only be delivered as one unit.
artifact_contract_output_type: release-plan
artifact_contract_required_data:
  - the batch size
  - the release cadence
artifact_contract_verified_by: each deployed batch is small enough to debug on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Ship in small batches
**Faster is Safer:** Smaller batches and more frequent releases reduce risk, not increase it. A deployment with 3 changes is easier to debug than one with 30. Frequent releases build confidence in the release process itself.
<!-- vpmodule:atom:end ship-in-small-batches -->