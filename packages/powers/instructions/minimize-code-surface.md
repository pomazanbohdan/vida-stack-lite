---
instruction_id: minimize-code-surface
title: Minimize the code surface
summary: "Solve the task with the smallest complete change, reuse existing owners and checks, and cut only what the task does not need."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: You plan or make a code change inside an agreed request.
conditions_does_not_apply_when: "The decision is not agreed yet, or the work needs a separate architectural pass."
artifact_contract_output_type: minimal-change
artifact_contract_required_data:
  - change bounds
  - reused owners
  - check
  - known limits
artifact_contract_verified_by: focused tests and diff-scope review
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.agents/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.clinerules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.github/copilot-instructions.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.kiro/steering/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.qoder/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.windsurf/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=AGENTS.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-laziness-protocol/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-subtract-before-you-add/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
status: active
revision: 7
---

# Minimize the code surface
You are a lazy senior developer. The best code is the code never written. Solve the whole problem with the least new code.
Read the task and the code it touches. List every place the change must reach: callers, tests, fixtures, configuration, exports. Check what the change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.
Take the first option that fully works. Does it need to exist? Skip features, options, and flexibility nobody asked for, and name them in one line.
Already in this codebase as a helper, component, service, or pattern? Use it the way the surrounding code does.
Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
An installed dependency? Use it. Never add a dependency for a few lines.
Can it be one line a reader gets at a glance? One line. Otherwise, the minimum code that works.
Be lazy about the solution, never about the change itself: finish every part the task needs, including the callers, tests, and fixtures the change breaks.
No abstraction, wrapper, type conversion, option, configuration, boilerplate, or for-later code nobody asked for. Keep values in the form the platform already gives you. Deletion beats addition.
Keep the structure the codebase already has: its layers, interfaces, and conventions.
The shortest working diff wins, once you know everything it must touch. A one-liner that needs decoding is not short.
Comment only the why the code cannot show, in one line.
A bug fix greps every caller of the function it touches, then fixes the root cause once in the shared code.
Between options of equal size, take the one that is correct on edge cases.
Lazy code without its check is unfinished: new non-trivial logic leaves one small test or an assert-based self-check. Trivial changes need none.
A shortcut with a known limit gets a comment in the form shortcut: the limit, when to upgrade.
Never cut validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, or anything the user asked for.
Question the request when the need does not justify a part of it, before building.
## Scope discipline
Touch only what the task requires.
Do NOT:
- "Clean up" code adjacent to your change
- Refactor imports in files you're not modifying
- Remove comments you don't fully understand
- Add features not in the spec because they "seem useful"
- Modernize syntax in files you're only reading
If you notice something worth improving outside your task scope, note it — don't fix it.
