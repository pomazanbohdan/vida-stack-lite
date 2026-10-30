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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
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
