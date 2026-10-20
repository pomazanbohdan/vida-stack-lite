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
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/pr/SKILL.md
status: active
revision: 1
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
