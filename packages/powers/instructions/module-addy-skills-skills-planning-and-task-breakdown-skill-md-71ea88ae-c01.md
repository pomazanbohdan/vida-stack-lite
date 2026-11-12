---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-planning-and-task-breakdown-skill-md-71ea88ae-c01"
title: "addy-skills: skills/planning-and-task-breakdown/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/planning-and-task-breakdown/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/planning-and-task-breakdown/SKILL.md\"}"
atom_ids:
  - break-down-tasks-that-are-too-large
  - classify-the-work-before-parallelizing
  - explore-in-read-only-before-planning
  - give-every-task-acceptance-criteria-and-a-check
  - keep-the-plan-document-separate-from-the-task-list
  - order-the-tasks-by-the-dependency-graph
  - place-checkpoints-and-front-load-the-risky-work
  - record-risks-and-open-questions-in-the-plan
atom_count: 8
atoms: "[{\"atom_id\":\"break-down-tasks-that-are-too-large\",\"file_sha256\":\"f68c380f9bd253b00484fc5f30f986f054f9da97b87965a5c08c9ce889297eb3\",\"content_sha256\":\"210c7a56eca17098bcdd385cf937f4067988bfd558c9b0726abf9d88b7e33384\",\"file_bytes\":1959,\"body_bytes\":909},{\"atom_id\":\"classify-the-work-before-parallelizing\",\"file_sha256\":\"f7cb32ccab6813d029b60b9eb708eb49b35f5a754b040b349ec26fa9ce45f99c\",\"content_sha256\":\"79f9d9957b4e608289cecb434f5f72a6e770bf2e997bbb29bd5f121e1fee09be\",\"file_bytes\":1483,\"body_bytes\":398},{\"atom_id\":\"explore-in-read-only-before-planning\",\"file_sha256\":\"0b4d2b0b12383dd4e76c5cfd9dfb005c594311307e247a231fb7e6d10efe54f3\",\"content_sha256\":\"77e3054efe210cb1e11ce9da876cedfb262bc515a0c011288ee52363d70ee7c6\",\"file_bytes\":1525,\"body_bytes\":389},{\"atom_id\":\"give-every-task-acceptance-criteria-and-a-check\",\"file_sha256\":\"5be94beb90cad6bf5f12bc2986eae6af3c91abf555dc4d1bc7f433dac6363bf9\",\"content_sha256\":\"7475f70b5a1598e5cc47b54e4df22fefdc16f811a23a685d269a79bd6651e62c\",\"file_bytes\":3432,\"body_bytes\":1843},{\"atom_id\":\"keep-the-plan-document-separate-from-the-task-list\",\"file_sha256\":\"9d71cd2982c2f079000146a5c5dfc1fe8465cbdca4d0b362781ccc9dcb7d2e88\",\"content_sha256\":\"352d7386ecd5a786b2ebfbc91176eccc94bd6f38069ba5589d7b3bbb2fc0f64f\",\"file_bytes\":1407,\"body_bytes\":301},{\"atom_id\":\"order-the-tasks-by-the-dependency-graph\",\"file_sha256\":\"ab7852661776c279ffc7b59b519f3fda2030d6cf5a8cb366c102a7eef1acfe1d\",\"content_sha256\":\"f50558d73994d6354142097a10d64355e2d8ce048f09e3df602880e4e188ba67\",\"file_bytes\":1710,\"body_bytes\":577},{\"atom_id\":\"place-checkpoints-and-front-load-the-risky-work\",\"file_sha256\":\"87d8ab6ab59455b6c5b4db4a575eec3b9c39f10b6e5eb21a66836a473b5ef967\",\"content_sha256\":\"dffd231a15acc28570965e9fa336d3902d536cca4f7312d8a749c029dda27b9c\",\"file_bytes\":1896,\"body_bytes\":517},{\"atom_id\":\"record-risks-and-open-questions-in-the-plan\",\"file_sha256\":\"c29570d475e61cf8372ecb7207fd7c5c3421713b0bd5b8182c3425cca54400ee\",\"content_sha256\":\"834023447bb752b3228c20cdeea77430499b15bc3c846e97738f3e647db036f1\",\"file_bytes\":1548,\"body_bytes\":370}]"
carrier_sha256: 932cf23675b8a491e3ad4d1a3bcad05e4555f582345344e7e52d21a334e8442a
carrier_bytes: 16093
revision: 1
status: active
---
<!-- vpmodule:atom:begin break-down-tasks-that-are-too-large -->
---
instruction_id: break-down-tasks-that-are-too-large
title: Break down tasks that are too large
summary: "A task that touches many files, cannot state its acceptance criteria, or takes more than one session is two tasks."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A task in the plan is larger than one focused session.
conditions_does_not_apply_when: The task is already small enough to implement and verify at once.
artifact_contract_output_type: task-split
artifact_contract_required_data:
  - the oversized task
  - the split
  - the size of each part
artifact_contract_verified_by: every remaining task is at most medium in size
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Break down tasks that are too large

| Size | Files | Scope | Example |
|------|-------|-------|---------|
| **XS** | 1 | Single function or config change | Add a validation rule |
| **S** | 1-2 | One component or endpoint | Add a new API endpoint |
| **M** | 3-5 | One feature slice | User registration flow |
| **L** | 5-8 | Multi-component feature | Search with filtering and pagination |
| **XL** | 8+ | **Too large — break it down further** | — |

If a task is L or larger, it should be broken into smaller tasks. An agent performs best on S and M tasks.

**When to break a task down further:**
- It would take more than one focused session (roughly 2+ hours of agent work)
- You cannot describe the acceptance criteria in 3 or fewer bullet points
- It touches two or more independent subsystems (e.g., auth and billing)
- You find yourself writing "and" in the task title (a sign it is two tasks)
<!-- vpmodule:atom:end break-down-tasks-that-are-too-large -->
<!-- vpmodule:atom:begin classify-the-work-before-parallelizing -->
---
instruction_id: classify-the-work-before-parallelizing
title: Classify the work before parallelizing it
summary: "Independent slices, tests and documentation can run together, while migrations, shared state and dependency chains cannot."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several tasks could run at the same time.
conditions_does_not_apply_when: There is only one task.
artifact_contract_output_type: parallelization-classification
artifact_contract_required_data:
  - the tasks
  - the class of each
  - the shared contract to define first
artifact_contract_verified_by: every task is classified and every coordinated pair has its contract named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Classify the work before parallelizing it

When multiple agents or sessions are available:

- **Safe to parallelize:** Independent feature slices, tests for already-implemented features, documentation
- **Must be sequential:** Database migrations, shared state changes, dependency chains
- **Needs coordination:** Features that share an API contract (define the contract first, then parallelize)
<!-- vpmodule:atom:end classify-the-work-before-parallelizing -->
<!-- vpmodule:atom:begin explore-in-read-only-before-planning -->
---
instruction_id: explore-in-read-only-before-planning
title: Explore in read-only before you plan
summary: "Read the spec, the code, the patterns, the dependencies and the unknowns first, because planning writes no code."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A spec or clear requirements exist and the work has not been planned yet.
conditions_does_not_apply_when: The task is a single file with obvious scope.
artifact_contract_output_type: planning-notes
artifact_contract_required_data:
  - the spec
  - the codebase sections read
  - the existing patterns
  - the dependencies
  - the risks and unknowns
artifact_contract_verified_by: no code was written during the exploration and every note came from a read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Explore in read-only before you plan

Before writing any code, operate in read-only mode:

- Read the spec and relevant codebase sections
- Identify existing patterns and conventions
- Map dependencies between components
- Note risks and unknowns

**Do NOT write code during planning.**
The output is a plan document and a task list recorded in the task list target, not implementation.
<!-- vpmodule:atom:end explore-in-read-only-before-planning -->
<!-- vpmodule:atom:begin give-every-task-acceptance-criteria-and-a-check -->
---
instruction_id: give-every-task-acceptance-criteria-and-a-check
title: Give every task acceptance criteria and a check
summary: "Each task carries a description, specific testable acceptance criteria, the checks that prove it, its dependencies, the files it touches and its size."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Work is written down as a list of tasks.
conditions_does_not_apply_when: The work is a single action with no task list.
artifact_contract_output_type: task-record
artifact_contract_required_data:
  - the description
  - the acceptance criteria
  - the verification steps
  - the dependencies
  - the files
  - the estimated scope
artifact_contract_verified_by: "every task names at least one specific, testable acceptance criterion and one verification step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Give every task acceptance criteria and a check

Each task follows this structure, whether it lands in the markdown task list or as an item in an external tracker (see Output Files):

```markdown
## Task [N]: [Short descriptive title]

**Description:** One paragraph explaining what this task accomplishes.

**Acceptance criteria:**
- [ ] [Specific, testable condition]
- [ ] [Specific, testable condition]

**Verification:**
- [ ] Tests pass: [the repository's focused-test command]
- [ ] Build succeeds: [the repository's build command]
- [ ] Manual check: [description of what to verify]

**Dependencies:** [Task numbers this depends on, or "None"]

**Files likely touched:**
- `src/path/to/file.ts`
- `tests/path/to/test.ts`

**Estimated scope:** [Small: 1-2 files | Medium: 3-5 files | Large: 5+ files]
```
Acceptance criteria, where they are written, in the template's format: each is a check the implementer can prove it met without pointing at code, and together they are enough that building the wrong thing cannot pass.
Done is one runnable check. A story whose check needs another story's work goes after it.
Every criterion must be checkable as a source assertion, behavior assertion, test command, or CLI output
NEVER use subjective language ("looks correct", "properly configured", "consistent with")
Include exact strings, patterns, values, command outputs, or observable behavior where that is the right proof
Must include CONCRETE values, not references.
NEVER say "align X with Y", "match X to Y", "update to be consistent" without specifying the exact target state
Include concrete identifiers and reference values: config keys, function signatures, SQL table names, class names, import paths, env vars, endpoint paths, etc.
Do not include full file contents, fenced code blocks, or complete implementations in the action
<!-- vpmodule:atom:end give-every-task-acceptance-criteria-and-a-check -->
<!-- vpmodule:atom:begin keep-the-plan-document-separate-from-the-task-list -->
---
instruction_id: keep-the-plan-document-separate-from-the-task-list
title: Keep the plan document separate from the task list
summary: "The plan document stays a markdown file, because design decisions, risks and open questions do not map onto tracker issues."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan document is written and the tasks live somewhere.
conditions_does_not_apply_when: No plan document is written.
artifact_contract_output_type: plan-document
artifact_contract_required_data:
  - the design decisions
  - the risks
  - the open questions
artifact_contract_verified_by: "the plan document holds the decisions, risks and open questions that the task list cannot carry"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the plan document separate from the task list

**Plan document:** Save the implementation plan to the plan document. This is always a markdown file — design decisions, risks, and open questions don't map cleanly onto individual tracker issues.
Create the plan directory if it does not exist.
<!-- vpmodule:atom:end keep-the-plan-document-separate-from-the-task-list -->
<!-- vpmodule:atom:begin order-the-tasks-by-the-dependency-graph -->
---
instruction_id: order-the-tasks-by-the-dependency-graph
title: Order the tasks by the dependency graph
summary: "Map what depends on what and implement bottom-up, foundations first."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The work breaks into tasks that depend on each other.
conditions_does_not_apply_when: The tasks are independent of each other.
artifact_contract_output_type: dependency-order
artifact_contract_required_data:
  - the dependency graph
  - the resulting order
artifact_contract_verified_by: "each task's dependencies appear earlier in the order"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/analyze-dependencies.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Order the tasks by the dependency graph

Map what depends on what.
Implementation order follows the dependency graph bottom-up: build foundations first.
If two items will both modify files in the same domain or the same specific files, one must run before the other. The one that provides the foundation runs first.
Item B mentions consuming, using, or calling something that item A creates/implements.
Item A creates data structures, schemas, or types -> item B consumes or transforms them.
For item pairs with no detected dependency, state that no dependency was detected.
<!-- vpmodule:atom:end order-the-tasks-by-the-dependency-graph -->
<!-- vpmodule:atom:begin place-checkpoints-and-front-load-the-risky-work -->
---
instruction_id: place-checkpoints-and-front-load-the-risky-work
title: Place checkpoints and front-load the risky work
summary: "Arrange tasks so that dependencies are satisfied, each task leaves the system working, the verification checkpoints sit at the right cadence and the high-risk tasks are early."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
  - checkpoint-cadence-policy
conditions_applies_when: A plan has several tasks to execute in order.
conditions_does_not_apply_when: The plan is a single task.
artifact_contract_output_type: checkpoint-plan
artifact_contract_required_data:
  - the task order
  - the checkpoints
  - the high-risk tasks placed first
artifact_contract_verified_by: a checkpoint exists after every two or three tasks and the highest-risk task comes first
compatibility_excludes:
  - put-one-checkpoint-at-the-end-of-the-meaningful-work
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Place checkpoints and front-load the risky work

Arrange tasks so that:

1. Dependencies are satisfied (build foundation first)
2. Each task leaves the system in a working state
3. Verification checkpoints occur after every 2-3 tasks
4. High-risk tasks are early (fail fast)

Add explicit checkpoints to the task list target:

```markdown
## Checkpoint: After Tasks 1-3
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Core user flow works end-to-end
- [ ] Review with human before proceeding
```
<!-- vpmodule:atom:end place-checkpoints-and-front-load-the-risky-work -->
<!-- vpmodule:atom:begin record-risks-and-open-questions-in-the-plan -->
---
instruction_id: record-risks-and-open-questions-in-the-plan
title: Record the risks and the open questions in the plan
summary: "The plan carries the decisions with their rationale, the risks with impact and mitigation, and the questions only a human can answer."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan document is written for work that carries design decisions and open questions.
conditions_does_not_apply_when: There is no plan document.
artifact_contract_output_type: plan-sections
artifact_contract_required_data:
  - the architecture decisions and their rationale
  - the risks with impact and mitigation
  - the open questions
artifact_contract_verified_by: the plan names each risk with its impact and mitigation and lists the open questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Record the risks and the open questions in the plan

The plan document holds:

```markdown
## Architecture Decisions
- [Key decision 1 and rationale]
- [Key decision 2 and rationale]

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Strategy] |

## Open Questions
- [Question needing human input]
```
<!-- vpmodule:atom:end record-risks-and-open-questions-in-the-plan -->