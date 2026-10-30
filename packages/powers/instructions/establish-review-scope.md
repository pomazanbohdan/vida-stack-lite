---
instruction_id: establish-review-scope
title: "Understand first: fix the scope and trace the main flows"
summary: "Review what the user names, read the code the change touches, and trace the main flows from input to stored result."
capability_tags:
  - review-code
  - audit-codebase
pattern_tags:
  - code-review
  - code-audit
conditions_applies_when: A change or a whole repository is being reviewed and the material to read is not yet fixed.
conditions_does_not_apply_when: The review scope is already named and its material is fully read.
artifact_contract_output_type: review-scope-map
artifact_contract_required_data:
  - review target
  - sources read
  - main flows
  - parts not read
artifact_contract_verified_by: every named flow is traced from input to stored result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Understand first: fix the scope and trace the main flows
Review a change like the senior developer who will be paged when it breaks.
Audit the whole repo like the senior developer who just inherited it and will be paged when it breaks.
Review what the user names: uncommitted or staged changes, a branch, a PR link, or files.
Nothing named: the uncommitted changes, or the last commit if there are none.
Audit what the user names: a folder, a package, or the whole repo.
Nothing named: the whole repo.
Read the diff, then the code it touches: callers of every changed function, the functions it calls, the tests, the README.
Read the README, the deploy and build config, the dependency list, the entry points (main, routes, handlers, jobs, CLI commands) and the tests.
Trace the real flow: where data comes in, what is stored, what goes out.
Trace the main flows end to end: where data comes in, what is stored, what goes out.
Read those paths fully: input from users, money, auth, data writes, background jobs, anything shared between processes.
A change can break code it does not touch.
When a signature, return value or behavior changes, search every caller.
Big repo: go deep where a mistake costs the most, not file by file.
Say which parts you did not read.
