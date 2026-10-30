---
instruction_id: size-a-change-and-split-it
title: Size the change and split it when it grows
summary: "Keep a change near a hundred changed lines, watch the total size of the file it lands in, and split with a named strategy."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A change is being prepared for review or commit and its size is known.
conditions_does_not_apply_when: The change is a complete file deletion or an automated refactoring a reviewer only verifies by intent.
artifact_contract_output_type: change-sizing-decision
artifact_contract_required_data:
  - the changed lines
  - the size of the file it lands in
  - the splitting strategy
  - the decomposition decision
artifact_contract_verified_by: no change exceeds the split threshold and no already-large file grows without decomposition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Size the change and split it when it grows

Small, focused changes are easier to review, faster to merge, and safer to deploy. Target these sizes:

```
~100 lines changed   → Good. Reviewable in one sitting.
~300 lines changed   → Acceptable if it's a single logical change.
~1000 lines changed  → Too large. Split it.
```

**Watch file size, not just diff size.** A small diff can still push a file past a healthy boundary — around 1000 *total* lines in a single file (distinct from the ~1000 *changed*-lines threshold above) is a common inspection signal, not a hard cap. When a change materially grows an already-large file, ask whether to extract helpers, subcomponents, or modules *first*, before piling more on. Decompose, then add.

**What counts as "one change":** A single self-contained modification that addresses one thing, includes related tests, and keeps the system functional after submission. One part of a feature — not the whole feature.

**Splitting strategies when a change is too large:**

| Strategy | How | When |
|----------|-----|------|
| **Stack** | Submit a small change, start the next one based on it | Sequential dependencies |
| **By file group** | Separate changes for groups needing different reviewers | Cross-cutting concerns |
| **Horizontal** | Create shared code/stubs first, then consumers | Layered architecture |
| **Vertical** | Break into smaller full-stack slices of the feature | Feature work |

**When large changes are acceptable:** Complete file deletions and automated refactoring where the reviewer only needs to verify intent, not every line.

Small diffs still push files past a healthy size and bolt branches onto unrelated flows. Judge the resulting structure, not the diff size.

A change that grows an already-large file instead of decomposing it

Large PRs that are "too big to review properly" (split them)
