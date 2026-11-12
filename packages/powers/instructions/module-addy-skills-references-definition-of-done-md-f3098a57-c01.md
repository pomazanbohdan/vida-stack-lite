---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-definition-of-done-md-f3098a57-c01"
title: "addy-skills: references/definition-of-done.md module"
summary: "Carrier for 6 atomic instructions from addy-skills:references/definition-of-done.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/definition-of-done.md\"}"
atom_ids:
  - account-for-migrations-config-and-flags
  - apply-the-standing-checklist-as-the-work-grows
  - document-the-current-state-not-the-change-history
  - review-security-observability-and-rollback-before-ship
  - separate-acceptance-criteria-from-the-standing-bar
  - verify-behaviour-at-runtime-not-only-at-compile
atom_count: 6
atoms: "[{\"atom_id\":\"account-for-migrations-config-and-flags\",\"file_sha256\":\"b96e62f89e6b627a3786ac33718c88d3bae6533592e2ee247ccfe09760292900\",\"content_sha256\":\"a98bdd3e551780a6a292c6c84bbb0fb7cae5007006c3f57b947f3a7858aa8fb4\",\"file_bytes\":1429,\"body_bytes\":253},{\"atom_id\":\"apply-the-standing-checklist-as-the-work-grows\",\"file_sha256\":\"0d915e601ec10af378fa9edc6461d371b185c8da08e5a9aaba82cc251e44b1ad\",\"content_sha256\":\"f2118737035107eb2637c530e92f0fb16d32dca7a96f456bd7a8c2031c70d463\",\"file_bytes\":1576,\"body_bytes\":384},{\"atom_id\":\"document-the-current-state-not-the-change-history\",\"file_sha256\":\"793ef57efab90471d6a616018f673728315030a58807d009c28313ccdd456993\",\"content_sha256\":\"d9cf5aafa5d921b7a7bb476e2db65415350b83b18b44bc9d87caa739eb5e0bbc\",\"file_bytes\":1881,\"body_bytes\":573},{\"atom_id\":\"review-security-observability-and-rollback-before-ship\",\"file_sha256\":\"75b67222b5aeda2b85b1a3f950b96205786f54f1dd1f86b20dc548d41213c37f\",\"content_sha256\":\"613632eb167c896d9329ceea95e0ffa610bb5185732afe993b2e83be1f20f33e\",\"file_bytes\":1762,\"body_bytes\":499},{\"atom_id\":\"separate-acceptance-criteria-from-the-standing-bar\",\"file_sha256\":\"d1124592815a55e744c498eaa5d2ecfb34845376d4d6b90961c5c448650ed411\",\"content_sha256\":\"57fd1effce7b17fe73526c5f8724f7f06672a8b990fdb5402c320441f964d8b5\",\"file_bytes\":2317,\"body_bytes\":1161},{\"atom_id\":\"verify-behaviour-at-runtime-not-only-at-compile\",\"file_sha256\":\"1d9b19a11961daa364f0ffb0613c048ba80ea2066c64f2db3fe5628fc7754426\",\"content_sha256\":\"788bfc6ce0e06f603d69452d646e3ad7c00805eab56b26de95090af8ef07a453\",\"file_bytes\":1817,\"body_bytes\":576}]"
carrier_sha256: b91e2fb42208390f90602f6b7305dc258c2777c81858cb3ae63c36d0ca25ee74
carrier_bytes: 11699
revision: 1
status: active
---
<!-- vpmodule:atom:begin account-for-migrations-config-and-flags -->
---
instruction_id: account-for-migrations-config-and-flags
title: "Account for migrations, config and flags"
summary: "The change names the migrations, configuration changes and feature flags it touches and works with the rest of the system."
capability_tags:
  - define-quality-bar
pattern_tags:
  - standing-quality-bar
conditions_applies_when: A change is about to be integrated into a running system.
conditions_does_not_apply_when: "The change touches no schema, configuration or public interface."
artifact_contract_output_type: integration-surface-list
artifact_contract_required_data:
  - the migrations
  - the configuration changes
  - the feature flags
  - the backward compatibility decision
artifact_contract_verified_by: "every migration, config change and flag the change reaches is named and accounted for"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/definition-of-done.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Account for migrations, config and flags
Change works with the rest of the system, not just in isolation
Database migrations, config changes, and feature flags are accounted for
Backward compatibility considered for any public interface or API change
<!-- vpmodule:atom:end account-for-migrations-config-and-flags -->
<!-- vpmodule:atom:begin apply-the-standing-checklist-as-the-work-grows -->
---
instruction_id: apply-the-standing-checklist-as-the-work-grows
title: Apply the standing checklist as the work grows
summary: "The checklist is applied in stages: correctness and quality per task, integration and documentation per feature, the whole list per release."
capability_tags:
  - define-quality-bar
pattern_tags:
  - standing-quality-bar
conditions_applies_when: "A task, a feature or a release is being signed off."
conditions_does_not_apply_when: The project has no standing checklist of its own.
artifact_contract_output_type: checklist-application-record
artifact_contract_required_data:
  - the stage the work has reached
  - the sections that apply at this stage
  - the sections still outstanding
artifact_contract_verified_by: every section that applies at the current stage is confirmed before the work is signed off
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/definition-of-done.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Apply the standing checklist as the work grows
Apply this to every change before declaring it done.
Per task: confirm the Correctness and Quality sections before checking the task off.
Per feature: confirm Integration and Documentation before considering the feature complete.
Per release: the full checklist is the floor; the release process adds the deploy-specific gates on top.
<!-- vpmodule:atom:end apply-the-standing-checklist-as-the-work-grows -->
<!-- vpmodule:atom:begin document-the-current-state-not-the-change-history -->
---
instruction_id: document-the-current-state-not-the-change-history
title: "Document the current state, not the change history"
summary: "Documentation describes the system as it is now, and the decisions worth preserving are recorded."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: "A change alters a public interface, an API or user-facing behaviour."
conditions_does_not_apply_when: The change is internal and leaves no documented surface behind.
artifact_contract_output_type: documentation-state-review
artifact_contract_required_data:
  - the documented surface
  - the description of its current state
  - the decision recorded
artifact_contract_verified_by: the documentation describes the present state in timeless language and the decision is written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/definition-of-done.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Document the current state, not the change history
Public interfaces, APIs, and user-facing behavior are documented
Architectural decisions worth preserving are recorded
Documentation describes the current state in timeless language, not the change history
Git holds history; the block states present truth only.
What the system should become belongs in specs.
An agent that treats a future state as current will write the wrong code.
When a claim's source disappears, the claim is fixed or removed, never silently pointed at a different document that still mentions it.
<!-- vpmodule:atom:end document-the-current-state-not-the-change-history -->
<!-- vpmodule:atom:begin review-security-observability-and-rollback-before-ship -->
---
instruction_id: review-security-observability-and-rollback-before-ship
title: "Review security, observability and rollback before ship"
summary: "Before merge or deploy, the security implications, the telemetry and the rollback path are checked and the human has approved."
capability_tags:
  - define-quality-bar
pattern_tags:
  - standing-quality-bar
conditions_applies_when: A change is about to be merged or deployed.
conditions_does_not_apply_when: The work stays local and ships with nothing.
artifact_contract_output_type: ship-readiness-review
artifact_contract_required_data:
  - the security review
  - the telemetry in place
  - the rollback path
  - the approval
artifact_contract_verified_by: each of the four ship-readiness items is confirmed by a person before merge or deploy
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/definition-of-done.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/security/baseline.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Review security, observability and rollback before ship
Security implications reviewed for any untrusted input, auth, or data handling
Observability in place for new critical paths (logs, metrics, traces)
Rollback path exists for anything risky
The human has reviewed and approved before merge or deploy
"Done" declared before human review on changes that need it.
- All CI checks pass on the release branch
- The version bump is consistent with the semver policy
- The changelog entry is present
<!-- vpmodule:atom:end review-security-observability-and-rollback-before-ship -->
<!-- vpmodule:atom:begin separate-acceptance-criteria-from-the-standing-bar -->
---
instruction_id: separate-acceptance-criteria-from-the-standing-bar
title: Separate acceptance criteria from the standing bar
summary: "Acceptance criteria say whether the right thing was built; the standing bar says whether it is finished, and both must hold."
capability_tags:
  - define-quality-bar
pattern_tags:
  - standing-quality-bar
conditions_applies_when: Work is being called done and the task had its own acceptance criteria.
conditions_does_not_apply_when: The work has no acceptance criteria of its own.
artifact_contract_output_type: two-gate-check
artifact_contract_required_data:
  - the acceptance criteria and their state
  - the standing bar and its state
  - which of the two is missing
artifact_contract_verified_by: both gates are reported separately and both are satisfied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/definition-of-done.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate acceptance criteria from the standing bar
A standing, project-wide bar that every change must clear before it counts as done.
Unlike acceptance criteria, which vary per task and answer "did we build the right thing?", the Definition of Done is the same every time and answers "is this finished to our standard?".
| Scope | Specific to one task or spec | Applies to every increment |
| Changes | Different for each item | Fixed and reused |
| Answers | "Did we build *this thing*?" | "Is it *ready*?" |
| Owner | Defined when planning the task | Defined once for the project |
| Example | "User can reset password via email link" | "Tests pass, no regressions, docs updated" |
The two are complementary. A task is done only when its acceptance criteria are met and the standing Definition of Done is satisfied. Skipping either leaves work that looks finished but is not.
Tailor the list to the project once, then reuse it unchanged. A Definition of Done that is renegotiated every sprint is not a Definition of Done.
A different bar applied depending on deadline pressure.
Acceptance criteria treated as the whole bar, with no standing quality floor.
<!-- vpmodule:atom:end separate-acceptance-criteria-from-the-standing-bar -->
<!-- vpmodule:atom:begin verify-behaviour-at-runtime-not-only-at-compile -->
---
instruction_id: verify-behaviour-at-runtime-not-only-at-compile
title: "Verify the behaviour at runtime, not only at compile time"
summary: "A change counts as done only when it has actually run and behaved as intended, not when it merely compiles or type-checks."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A change is about to be declared finished.
conditions_does_not_apply_when: The claim made is not about the change working.
artifact_contract_output_type: runtime-verification-record
artifact_contract_required_data:
  - the behaviour that was exercised
  - the run that exercised it
  - the observed result
artifact_contract_verified_by: the change was executed at runtime and the observed result is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/definition-of-done.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-verifier.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Verify the behaviour at runtime, not only at compile time
Code runs and behaves as intended, verified at runtime, not just compiled or typechecked
Existing tests still pass; no regressions introduced
"It's done, I just haven't run it yet": unverified work is not done.

A truth is *behavior-dependent* when its correctness hinges on runtime behavior grep/presence checks cannot see — a **state transition** or a **cancellation / cleanup / ordering invariant**
**Presence is not behavior.**
Never let symbol presence alone produce a VERIFIED on a behavior-dependent truth.
<!-- vpmodule:atom:end verify-behaviour-at-runtime-not-only-at-compile -->