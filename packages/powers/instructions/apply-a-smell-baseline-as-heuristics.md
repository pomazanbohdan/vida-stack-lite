---
instruction_id: apply-a-smell-baseline-as-heuristics
title: Apply a smell baseline as heuristics
summary: "Use a fixed smell baseline as labelled judgement calls with a fix attached; the repo's own documented standards always override it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A review must judge a change against conventions, and the repo documents some of them."
conditions_does_not_apply_when: "The repo documents the standard, or a tool already enforces the check."
artifact_contract_output_type: standards-review
artifact_contract_required_data:
  - documented standards
  - smell baseline
  - per-finding citation
  - fix
artifact_contract_verified_by: every finding cites a documented rule or a named smell with its hunk
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/code-review/SKILL.md
status: active
revision: 4
---

# Apply a smell baseline as heuristics
On top of whatever the repo documents, the Standards axis always carries a **smell baseline**: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:
- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.
Each smell reads *what it is* → *how to fix*; match it against the diff:
- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.
