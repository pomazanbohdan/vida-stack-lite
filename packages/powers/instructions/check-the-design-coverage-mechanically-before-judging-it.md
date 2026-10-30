---
instruction_id: check-the-design-coverage-mechanically-before-judging-it
title: Check the design coverage mechanically before judging it
summary: "Pass one is mechanical: extract and list the misses per category — flow coverage, token completeness, component coverage, state coverage, visual reference coverage — and only then does the judgment start."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A design pair is reviewed for coverage.
conditions_does_not_apply_when: The review is a judgment on a single decision.
artifact_contract_output_type: coverage-review
artifact_contract_required_data:
  - the misses per category with their location
  - the category verdict
artifact_contract_verified_by: every category was walked and each miss names its location
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/validate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Check the design coverage mechanically before judging it
Pass 1 — mechanical coverage. Per category: extract, then list misses with location citations. No misses = strong.
Flow coverage (EXPERIENCE.md). Sources frontmatter → extract every UJ / requirement name. Verify each has a Key Flow with named protagonist, numbered steps, a climax beat, and a failure path where applicable.
Token completeness (DESIGN.md). Extract every token in the YAML frontmatter and every `{path.to.token}` reference in the prose. Verify each defined
Color tokens missing hex (or light/dark pairs where applicable) are Critical — downstream code mirrors the spine.
Platform conventions (native dynamic type, 8pt grid) may stay semantic. Contrast targets stated for load-bearing combinations.
Component coverage (both spines). Extract every component name used anywhere. Verify each has a row in DESIGN.md.Components (visual spec) and EXPERIENCE.md.Component Patterns (behavioral spec) — real rules, not one-word descriptions.
State coverage (EXPERIENCE.md). Walk every IA surface. List states it should have (empty, cold-load, focus, error, offline, permission-denied — whichever apply). Verify each covered.
Visual reference coverage. List every file in `mockups/`, `wireframes/`, `imports/`. Spines link to each inline at the relevant section and name what it illustrates; spines-win-on-conflict stated once. List orphans and unspecific references.
