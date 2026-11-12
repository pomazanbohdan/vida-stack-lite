---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-code-review-skill-md-a23cd8df-c01"
title: "matt-skills: skills/engineering/code-review/SKILL.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/code-review/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/code-review/SKILL.md\"}"
atom_ids:
  - apply-a-smell-baseline-as-heuristics
  - review-along-separate-axes
atom_count: 2
atoms: "[{\"atom_id\":\"apply-a-smell-baseline-as-heuristics\",\"file_sha256\":\"3a62a51022c9431f5a3b780825b34f86460aff2a30d6dde137c26588c6c358ed\",\"content_sha256\":\"1ac086092c4bdd489e2815a40ca3de6b3df701a2836c5e2459a4ed05a0c49860\",\"file_bytes\":3512,\"body_bytes\":2384},{\"atom_id\":\"review-along-separate-axes\",\"file_sha256\":\"c6c3d645d475c5903a3f4ebd7cbc25145fcd65e6ed1d4346859e8959bc93a3f4\",\"content_sha256\":\"8a9d81f8101c031235d381e9dd2c6c1016d347164e4051247a42e9fe157d740e\",\"file_bytes\":2322,\"body_bytes\":1193}]"
carrier_sha256: 505685c3492b9dc982a5a32dd9ce77eb0ce2c10c5215b53395f9184a092d136d
carrier_bytes: 6073
revision: 1
status: active
---
<!-- vpmodule:atom:begin apply-a-smell-baseline-as-heuristics -->
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
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/code-review/SKILL.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
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
<!-- vpmodule:atom:end apply-a-smell-baseline-as-heuristics -->
<!-- vpmodule:atom:begin review-along-separate-axes -->
---
instruction_id: review-along-separate-axes
title: Review along separate axes
summary: Run independent review axes as separate lanes and report each under its own heading; never merge or re-rank the axes.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A change can pass one quality axis and fail another, and a blended verdict would hide the failing one."
conditions_does_not_apply_when: "The review has a single axis, or the axes share one failure point and can be merged safely."
artifact_contract_output_type: two-axis-review
artifact_contract_required_data:
  - axes
  - per-axis findings
  - per-axis worst issue
artifact_contract_verified_by: the report carries each axis under its own heading with its own worst issue
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/code-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Review along separate axes
Two-axis review of the diff between `HEAD` and a fixed point the user supplies:
- **Standards**: does the code conform to this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue / spec?
Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.
Start each axis sub-agent with a fresh context window.
## Aggregate
Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings, because the two axes are deliberately separate.
End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes: that's the reranking the separation exists to prevent.
## Why two axes
A change can pass one axis and fail the other:
- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**
Reporting them separately stops one axis from masking the other.
<!-- vpmodule:atom:end review-along-separate-axes -->