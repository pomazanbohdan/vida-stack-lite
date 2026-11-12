---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-verify-mvp-mode-md-f9ab5d93-c01"
title: "gsd-core: gsd-core/references/verify-mvp-mode.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/verify-mvp-mode.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/verify-mvp-mode.md\"}"
atom_ids:
  - express-the-check-as-a-user-visible-outcome-not-a-schema
  - walk-the-user-through-the-flow-before-running-the-technical-checks
atom_count: 2
atoms: "[{\"atom_id\":\"express-the-check-as-a-user-visible-outcome-not-a-schema\",\"file_sha256\":\"4eba6767d6c12ab92b42e6d68176a426995222eebd29bb15f2bf0f4141797c2d\",\"content_sha256\":\"c6197a00335e87c7c292f50775b92679e624ce3667770595b2f7473ab91ec329\",\"file_bytes\":1626,\"body_bytes\":586},{\"atom_id\":\"walk-the-user-through-the-flow-before-running-the-technical-checks\",\"file_sha256\":\"ca9b1a8f642db8a3b55783e9638936952be5d9ed954ddffb2f6a3986bc1f8b4d\",\"content_sha256\":\"284acda0b3c0e493d0515cdc01e80378c67446f4c0233eca15a386f1e3a40525\",\"file_bytes\":1582,\"body_bytes\":429}]"
carrier_sha256: cb12b7329dfaee2cd8e35c067ae340368c5cc2c29445383862f4fa3e23f1fc98
carrier_bytes: 3567
revision: 1
status: active
---
<!-- vpmodule:atom:begin express-the-check-as-a-user-visible-outcome-not-a-schema -->
---
instruction_id: express-the-check-as-a-user-visible-outcome-not-a-schema
title: "Express the check as a user-visible outcome, not a schema"
summary: "A check is written as what the user sees, never as a field, an endpoint or a status code."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A check for a user-facing phase is written.
conditions_does_not_apply_when: The check is an internal technical assertion.
artifact_contract_output_type: user-visible-check
artifact_contract_required_data:
  - the user-visible outcome
  - the check that proves it
artifact_contract_verified_by: "no check names a field, an endpoint or a status code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verify-mvp-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Express the check as a user-visible outcome, not a schema
The user-flow form mirrors what a real user does: open, fill, click, see. No HTTP verbs, no JSON shapes, no error codes
"User has a `name` field on the User model." Reject. The user does not see database fields. Express the same check as a user-visible outcome ("the user's name appears in the dashboard header")
"Step 1: GET /api/users/me returns 200." Reject. The user does not see API endpoints. Reorder so a user action comes first
Coverage is a goal-backward check: "did this phase deliver what its user story promised?"
<!-- vpmodule:atom:end express-the-check-as-a-user-visible-outcome-not-a-schema -->
<!-- vpmodule:atom:begin walk-the-user-through-the-flow-before-running-the-technical-checks -->
---
instruction_id: walk-the-user-through-the-flow-before-running-the-technical-checks
title: Walk the user through the flow before running the technical checks
summary: "The user-flow walk-through comes first, the technical checks only follow it, and the coverage check comes last."
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A user-facing phase is being verified.
conditions_does_not_apply_when: The phase has no user-facing surface.
artifact_contract_output_type: uat-script
artifact_contract_required_data:
  - the user-flow steps
  - the expected outcome of each
  - the technical checks
  - the coverage check
artifact_contract_verified_by: the flow ran first and a failed step stopped the run before the technical checks
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verify-mvp-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
  - product
---

# Walk the user through the flow before running the technical checks
If any step fails, the verdict is FAIL — do not run technical checks
The user-flow walk-through is mandatory under MVP mode even when all unit tests are green
The first step opens the entry point
Each subsequent step is one user action: fill, click, type, observe
The final step asserts the user-visible outcome from the `[outcome]` clause of the user story
<!-- vpmodule:atom:end walk-the-user-through-the-flow-before-running-the-technical-checks -->