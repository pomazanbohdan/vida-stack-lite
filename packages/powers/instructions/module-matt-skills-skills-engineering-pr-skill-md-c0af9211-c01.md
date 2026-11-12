---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-pr-skill-md-c0af9211-c01"
title: "matt-skills: skills/engineering/pr/SKILL.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/pr/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/pr/SKILL.md\"}"
atom_ids:
  - classify-merge-reversibility
  - write-pr-body-with-visual-evidence
atom_count: 2
atoms: "[{\"atom_id\":\"classify-merge-reversibility\",\"file_sha256\":\"5cd98dc2c49c364be0d556a2a9ea980533c550ec3691ba70cd0bb842866214e4\",\"content_sha256\":\"79d4e7166732c15497d7f25ae744648c5b3fdb33ed5357ba658baa8dfebbb7f4\",\"file_bytes\":2513,\"body_bytes\":1285},{\"atom_id\":\"write-pr-body-with-visual-evidence\",\"file_sha256\":\"4f0eb69bfcda06d066da43dc9306950612de8f95db5848dc8ef0881c7e1c6da0\",\"content_sha256\":\"969f76b12e5fa33e0b880509c31cfac3c6296dde43c49af51f33433253f1a429\",\"file_bytes\":2939,\"body_bytes\":1806}]"
carrier_sha256: ed344abb3b9c4f2d06b04d8cfbc44431a29066c1d320fa99814dfb8207baa3ad
carrier_bytes: 5691
revision: 1
status: active
---
<!-- vpmodule:atom:begin classify-merge-reversibility -->
---
instruction_id: classify-merge-reversibility
title: Classify merge reversibility
summary: "Classify a change's merge danger as a one-way or two-way door and name its blast radius."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A change is about to be merged and its reversibility matters.
conditions_does_not_apply_when: The change is trivially reversible and low impact.
artifact_contract_output_type: merge-danger
artifact_contract_required_data:
  - door
  - blast radius
artifact_contract_verified_by: the door is stated as one-way or two-way and the blast radius is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/pr/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/plan-md.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/phase-planning.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Classify merge reversibility
Describe whether it's a one-way or two-way door. You can walk back through two-way doors, but not one-way doors. A PR that is cheap to roll back is lower risk. Changes that involve destructive actions or hard-to-reverse decisions are one-way doors.
The blast radius is the potential impact or scope of the changes introduced by this PR. Consider all possibilities. Examples are layout shift, breakages for consumers, mobile responsiveness, etc.
- `reversible` | Undo is local and cheap. | None. This is the default when no rating is given.
- `costly` | Undo touches many call sites or needs a coordinated change. | Flagged in the plan so the reader sees the weight. Never blocks.
- `one-way` | Undo requires a migration, breaks a published contract, or is impossible. | The planner inserts a `checkpoint:decision` immediately **before** the dependent task, unless the human already settled that decision.
- prefer *removing* irreversibility over gating it
MUST support an optional `<reversibility rating="reversible|costly|one-way">` element recording how costly a decision would be to undo
MUST insert a `checkpoint:decision` before the task implementing a `one-way` decision
`costly` is flagged without blocking; `reversible` and unrated flow normally
<!-- vpmodule:atom:end classify-merge-reversibility -->
<!-- vpmodule:atom:begin write-pr-body-with-visual-evidence -->
---
instruction_id: write-pr-body-with-visual-evidence
title: Write a PR body with visual evidence
summary: "Shape a pull request body as a summary built from the smallest visual that makes the change clear, before/after evidence that it works, and a merge-danger call."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A change goes up as a pull request and its body must be written.
conditions_does_not_apply_when: The change is not going up for review.
artifact_contract_output_type: pr-body
artifact_contract_required_data:
  - summary visual
  - before evidence
  - after evidence
  - merge danger
artifact_contract_verified_by: the summary is the smallest visual that makes the key point clear and the evidence is concrete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/pr/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Write a PR body with visual evidence
Use this template for writing the PR body:
```
## Summary
<diagram, diff-sketch, or tree>
## Evidence
- **Before:** <screenshot/output/failing test run>
  **After:** <screenshot/output/passing test run>
## Merge Danger
**Door:** <one-way or two-way>
<optional: description>
**Blast Radius:** <one-word description>
<optional: potential ramifications of merge>
```
Skip all preambles and keep prose brief. Use the user's domain language from the project glossary.
### Summary
Pick the smallest view that makes the key point clear.
- Show logic or an algorithm as pseudocode.
- Show runtime control flow as a call tree.
- Show UI structure as a component tree, including state and module boundaries that matter.
- Show file responsibility or a broad refactor as a shallow file tree.
- Show component interaction, control flow, or data flow with Mermaid.
- Use `diff` when the point is what changes and the surrounding shape already exists. Match the diff shape to the topic.
Show the whole block when most of it is new, when omitted context would hide ownership or order, or when the user needs a copyable target shape.
Place each visual next to the short text it supports. Keep only the calls, files, props, states, and boundaries needed to answer the user's current question or the options to resolve the current discussion point.
You may use one of these, you may use several, it is unlikely you will use all of them. Use your judgement and don't overwhelm the user.
### Evidence
Concrete evidence that the change works. Show a before and after.
Screenshots are S-tier - when the environment is set up for it and the change is visual.
Execution-based evidence is A-tier. Test results, console output. Show the exact test that now fails and passes, using pseudocode.
<!-- vpmodule:atom:end write-pr-body-with-visual-evidence -->