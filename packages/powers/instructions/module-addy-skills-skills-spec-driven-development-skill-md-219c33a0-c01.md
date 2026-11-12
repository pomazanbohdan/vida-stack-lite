---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-spec-driven-development-skill-md-219c33a0-c01"
title: "addy-skills: skills/spec-driven-development/SKILL.md module"
summary: "Carrier for 6 atomic instructions from addy-skills:skills/spec-driven-development/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/spec-driven-development/SKILL.md\"}"
atom_ids:
  - keep-the-spec-current
  - map-capabilities-before-specifying
  - reframe-vague-requirements-as-success-criteria
  - stop-after-saving-the-spec
  - surface-your-assumptions-before-building
  - write-the-spec-with-the-core-areas
atom_count: 6
atoms: "[{\"atom_id\":\"keep-the-spec-current\",\"file_sha256\":\"0043b5ec2709d6d182945ddcd98eff8cc5c86cc48a095e71d1fa78f96f3b9257\",\"content_sha256\":\"5794001e865829a6b697b0f6cee982cf8a53b9e7ca855034ddc45ea2ec5403d5\",\"file_bytes\":2211,\"body_bytes\":933},{\"atom_id\":\"map-capabilities-before-specifying\",\"file_sha256\":\"018b535f8363e844b974c3a851140208ebefe378428d1978ea2f6ccf89a6da28\",\"content_sha256\":\"5dfe587510de50a1e5ca3f6b63213108312ffa80c1460c2b97275d0aed7fd2fb\",\"file_bytes\":3745,\"body_bytes\":2526},{\"atom_id\":\"reframe-vague-requirements-as-success-criteria\",\"file_sha256\":\"2f5b5a57cfac5ac7d6b6bb5fe77e2a21881b74bbdc9c988e66dfa9aee707853d\",\"content_sha256\":\"3bd4d20cd1d0254351073b4713c81833878592265302dff52f73ac74357135b2\",\"file_bytes\":1743,\"body_bytes\":614},{\"atom_id\":\"stop-after-saving-the-spec\",\"file_sha256\":\"f7389614f72fda6d71f275eaf299b46195c94b1579d0ba6ae1b06840c5d64601\",\"content_sha256\":\"3fe91e8912dd83722bbe29c655a4f710b80bbcd825e03f19e6b245d8ff4cd13a\",\"file_bytes\":1882,\"body_bytes\":823},{\"atom_id\":\"surface-your-assumptions-before-building\",\"file_sha256\":\"94be74f3bbc79091947652731f8adddb3f491499b2a8e55759dacaae055b93f0\",\"content_sha256\":\"5281114e861a5ba8c6eb54b4642677c623d43fafb32cd5cc2bcdb3489c559632\",\"file_bytes\":2709,\"body_bytes\":1337},{\"atom_id\":\"write-the-spec-with-the-core-areas\",\"file_sha256\":\"c905215606509f965a50c1b3ed9981c4f99f50b2d13fe9422f07141d88773dc1\",\"content_sha256\":\"663de2810b90d9776b294eae9b2eef048e5c677777520100e068ec97417e0473\",\"file_bytes\":4076,\"body_bytes\":2755}]"
carrier_sha256: cb609ac169f463a5cf0e79be96f46bd304dc27b9f012260b5ab6878c673c9ac5
carrier_bytes: 17115
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-spec-current -->
---
instruction_id: keep-the-spec-current
title: Keep the spec current
summary: "Update the spec when a decision or the scope changes, commit it with the code, and link each change request back to the spec section it implements."
capability_tags:
  - plan-implementation
pattern_tags:
  - living-specification
conditions_applies_when: A decision or the scope of a specified change changes after the spec was written.
conditions_does_not_apply_when: The spec has not been written yet.
artifact_contract_output_type: updated-specification
artifact_contract_required_data:
  - the changed decision or scope
  - the updated spec section
  - the spec reference in the change
artifact_contract_verified_by: the spec was updated before the code followed the change and the change links back to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/spec-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Keep the spec current

## Keeping the Spec Alive

The spec is a living document, not a one-time artifact:

- **Update when decisions change** — If you discover the data model needs to change, update the spec first, then implement.
- **Update when scope changes** — Features added or cut should be reflected in the spec.
- **Commit the spec** — The spec belongs in version control alongside the code.
- **Reference the spec in PRs** — Link back to the spec section that each PR implements.

## Common Rationalizations

"I'll write the spec after I code it"
That's documentation, not specification. The spec's value is in forcing clarity *before* code.

"Requirements will change anyway"
That's why the spec is a living document. An outdated spec is still better than no spec.

When a change overrides something that came from a source input, offer to update that source too, so upstream and the spec don't silently diverge.
<!-- vpmodule:atom:end keep-the-spec-current -->
<!-- vpmodule:atom:begin map-capabilities-before-specifying -->
---
instruction_id: map-capabilities-before-specifying
title: Map capabilities before specifying
summary: "When a request bundles several independently testable capabilities, propose a capability map with stable module ids, one-way dependencies and a build order before any module spec is written."
capability_tags:
  - plan-implementation
pattern_tags:
  - explore-then-exploit
conditions_applies_when: One requirement names several independently testable capabilities.
conditions_does_not_apply_when: The request describes a single capability; skip the map and specify it directly.
artifact_contract_output_type: capability-map
artifact_contract_required_data:
  - the module ids
  - the module responsibilities
  - the dependency direction
  - the build order
artifact_contract_verified_by: the map was approved by the human before any module spec was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/spec-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Map capabilities before specifying

## Phase 0: Scope Check

Most requests describe one capability. If this one does, skip this phase and go straight to Specify — Phase 0 exists for the exception, not the rule, and it puts no hierarchy on single-capability features.

**Detection.** Decompose before specifying when a single requirement bundles several independently testable capabilities:

- The requirement names distinct capabilities with their own consumers or data (e.g. identity, billing, notifications, reporting)
- Acceptance criteria cluster into groups that could ship and be verified separately
- One capability could be cut or replaced without rewriting the others' requirements

**Propose a capability map before writing any spec.** Small and reviewable — a module table plus a build order, not a project plan:

```markdown
# Capability Map: [Initiative Name]

| Module id | Responsibility | Depends on |
|---|---|---|
| identity | Accounts, sessions, SSO | — |
| billing | Plans, invoices, payments | identity |
| notifications | Email and webhook fan-out | identity |
| reporting | Usage dashboards | billing, notifications |

Build order: identity → billing, notifications → reporting
```

- **Stable module ids.** Kebab-case, chosen once, never renamed mid-initiative. Specs, plans, and downstream commands select work by these ids instead of guessing which spec is active.
- **Dependency direction, no cycles.** Arrows point one way. If two modules each need the other, they are one module.
- **Interfaces live at the boundary.** The map records that `billing` depends on `identity`; the contract between them belongs in the provider module's spec.

**The map is gated like every phase.** The human reviews module boundaries, dependency direction, and build order before any module spec is written. Getting the map wrong is expensive; reviewing ten lines is not.

**Then recurse per module.** Run Specify → Plan → Tasks → Implement for each module in dependency order. Each module gets its own spec, scoped to that module's objective, boundaries, and success criteria. Save the approved map at the project root and each module's spec alongside it, named by module id (`SPEC-identity.md`, `SPEC-billing.md`) — the map, not filename guessing, is the index of what exists.

## Red Flags

- One spec whose requirements span several independently testable capabilities
- Module boundaries or build order decided implicitly during implementation because no capability map was approved up front
<!-- vpmodule:atom:end map-capabilities-before-specifying -->
<!-- vpmodule:atom:begin reframe-vague-requirements-as-success-criteria -->
---
instruction_id: reframe-vague-requirements-as-success-criteria
title: Reframe vague requirements as success criteria
summary: "Translate a vague requirement into concrete, testable conditions and confirm those targets before the work continues."
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: "A requirement is expressed as a wish, such as faster, better or more robust."
conditions_does_not_apply_when: The requirement already states a measurable condition.
artifact_contract_output_type: success-criteria
artifact_contract_required_data:
  - the original requirement
  - the reframed criteria
  - the confirmation question
artifact_contract_verified_by: each reframed criterion can be checked and was confirmed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/spec-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Reframe vague requirements as success criteria
Start with a high-level vision. Ask the human clarifying questions until requirements are concrete.

**Reframe instructions as success criteria.** When receiving vague requirements, translate them into concrete conditions:

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED SUCCESS CRITERIA:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
- No layout shift during load (CLS < 0.1)
→ Are these the right targets?
```

This lets you loop, retry, and problem-solve toward a clear goal rather than guessing what "faster" means.
<!-- vpmodule:atom:end reframe-vague-requirements-as-success-criteria -->
<!-- vpmodule:atom:begin stop-after-saving-the-spec -->
---
instruction_id: stop-after-saving-the-spec
title: Stop after saving the spec
summary: "Summarise the spec, ask for approval, and end the turn; planning starts only in a later turn after the approval."
capability_tags:
  - plan-implementation
pattern_tags:
  - specification-gate
conditions_applies_when: A spec has just been written and saved.
conditions_does_not_apply_when: The spec was already approved and the work continues in a later turn.
artifact_contract_output_type: spec-approval-request
artifact_contract_required_data:
  - the spec summary
  - the open questions
  - the approval request
artifact_contract_verified_by: the turn ended with the saved spec and no plan or code was started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/spec-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Stop after saving the spec
**Stop after writing the spec (CRITICAL).** Once the spec is saved:

1. Summarize it and list any Open Questions.
2. Ask the human to approve it or request changes.
3. **STOP YOUR TURN IMMEDIATELY.** Do NOT start the next phase or write code in this turn. Planning starts only after the human approves the spec in a later turn.

## Verification

Before proceeding to implementation, confirm:
- [ ] The spec covers all six core areas
- [ ] The human has reviewed and approved the spec
- [ ] The turn ended after saving the spec; approval came in a later turn
- [ ] Success criteria are specific and testable
- [ ] Boundaries (Always/Ask First/Never) are defined
- [ ] The spec is saved to a file in the repository

## Red Flags

- Writing the spec and starting the plan or code in the same turn
<!-- vpmodule:atom:end stop-after-saving-the-spec -->
<!-- vpmodule:atom:begin surface-your-assumptions-before-building -->
---
instruction_id: surface-your-assumptions-before-building
title: Surface your assumptions before building
summary: "State the assumptions about requirements, architecture and scope before the work starts, and let them be corrected."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "A non-trivial piece of work is about to start, or a specification is about to be written."
conditions_does_not_apply_when: The change is a single-line fix with no assumption behind it.
artifact_contract_output_type: assumption-list
artifact_contract_required_data:
  - the assumptions
  - the correction request
artifact_contract_verified_by: the assumptions are stated before the implementation starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/spec-driven-development/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/using-agent-skills/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/list-phase-assumptions.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Surface your assumptions before building
Before implementing anything non-trivial, explicitly state your assumptions.

Before writing any spec content, list what you're assuming:

ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

The spec's entire purpose is to surface misunderstandings *before* code gets written — assumptions are the most dangerous form of misunderstanding.

## Red Flags

- Starting to write code without any written requirements
- Asking "should I just start building?" before clarifying what "done" means

Surface the assumptions across five areas: the technical approach, the implementation order, the scope boundaries (in, out and ambiguous), the risk areas and the dependencies.
Mark each assumption with its confidence: fairly confident, assuming, or unclear.
This is an analysis of what you think, not an intake of what the user knows - it produces no file and only a conversation.
Ask whether the assumptions are accurate, and fold the corrections into the understanding before continuing.
<!-- vpmodule:atom:end surface-your-assumptions-before-building -->
<!-- vpmodule:atom:begin write-the-spec-with-the-core-areas -->
---
instruction_id: write-the-spec-with-the-core-areas
title: Write the spec with the core areas
summary: "Cover the objective, the commands, the project structure, the code style, the testing strategy and the boundaries in every spec, and keep the format the project already uses."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: "A specification is written for a project, a feature or a significant change."
conditions_does_not_apply_when: "The change is a single-line fix, a typo correction, or a self-contained change whose requirements are unambiguous."
artifact_contract_output_type: specification
artifact_contract_required_data:
  - the objective
  - the commands
  - the project structure
  - the code style
  - the testing strategy
  - the boundaries
artifact_contract_verified_by: "the saved spec covers all six areas and the boundaries are split into always, ask first and never"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/spec-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
  - operations
---

# Write the spec with the core areas
Write a structured specification before writing any code. The spec is the shared source of truth between you and the human engineer — it defines what we're building, why, and how we'll know it's done. Code without a spec is guessing.

**Write a spec document covering these six core areas:**

1. **Objective** — What are we building and why? Who is the user? What does success look like?

2. **Commands** — Full executable commands with flags, not just tool names.
   ```
   Build: npm run build
   Test: npm test -- --coverage
   Lint: npm run lint --fix
   Dev: npm run dev
   ```

3. **Project Structure** — Where source code lives, where tests go, where docs belong.
   ```
   src/           → Application source code
   src/components → React components
   src/lib        → Shared utilities
   tests/         → Unit and integration tests
   e2e/           → End-to-end tests
   docs/          → Documentation
   ```

4. **Code Style** — One real code snippet showing your style beats three paragraphs describing it. Include naming conventions, formatting rules, and examples of good output.

5. **Testing Strategy** — What framework, where tests live, coverage expectations, which test levels for which concerns.

6. **Boundaries** — Three-tier system:
   - **Always do:** Run tests before commits, follow naming conventions, validate inputs
   - **Ask first:** Database schema changes, adding dependencies, changing CI config
   - **Never do:** Commit secrets, edit vendor directories, remove failing tests without approval

**Spec template:**

```markdown
# Spec: [Project/Feature Name]

## Objective
[What we're building and why. User stories or acceptance criteria.]

## Tech Stack
[Framework, language, key dependencies with versions]

## Commands
[Build, test, lint, dev — full commands]

## Project Structure
[Directory layout with descriptions]

## Code Style
[Example snippet + key conventions]

## Testing Strategy
[Framework, test locations, coverage requirements, test levels]

## Boundaries
- Always: [...]
- Ask first: [...]
- Never: [...]

## Success Criteria
[How we'll know this is done — specific, testable conditions]

## Open Questions
[Anything unresolved that needs human input]
```

**External spec tools:** This workflow is format-agnostic. If the project already uses another specification system, keep that system's artifact format and storage conventions instead of creating a duplicate spec file. This workflow owns the clarification, content, and approval gates; the external tool owns how the approved spec is represented.

## Red Flags

- Making architectural decisions without documenting them
- Skipping the spec because "it's obvious what to build"
<!-- vpmodule:atom:end write-the-spec-with-the-core-areas -->