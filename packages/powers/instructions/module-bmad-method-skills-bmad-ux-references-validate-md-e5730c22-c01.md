---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-ux-references-validate-md-e5730c22-c01"
title: "bmad-method: skills/bmad-ux/references/validate.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-ux/references/validate.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-ux/references/validate.md\"}"
atom_ids:
  - check-the-design-coverage-mechanically-before-judging-it
  - check-the-design-for-bloat-inheritance-and-shape
  - rate-a-design-finding-by-downstream-impact
atom_count: 3
atoms: "[{\"atom_id\":\"check-the-design-coverage-mechanically-before-judging-it\",\"file_sha256\":\"1bb280a50575d8d63688d9e23a215279cbbe7ddd8847678cd4f27a44925e2485\",\"content_sha256\":\"e973c3bba9eebf20b532b94e81fb1ff2ec6a2207379eb83f9c99d55334b98e67\",\"file_bytes\":2649,\"body_bytes\":1498},{\"atom_id\":\"check-the-design-for-bloat-inheritance-and-shape\",\"file_sha256\":\"3517c27ac9f0ac0b2434b018ffc709c95b6739d6ed5c9e654875d7c5eeb06264\",\"content_sha256\":\"799423a5ea5e0cbb224b1545bf712a3f9852bd25fc2df7c31c8cf9b347667157\",\"file_bytes\":2531,\"body_bytes\":1441},{\"atom_id\":\"rate-a-design-finding-by-downstream-impact\",\"file_sha256\":\"01aa447e8c3e4a1a046176ab5b327b35e16301f1457d37f6cfb8026ff524b3b6\",\"content_sha256\":\"e9a24a7f1d44c96739225441883f3005973a894672553e28e1ab02ce4f7c61a7\",\"file_bytes\":1280,\"body_bytes\":176}]"
carrier_sha256: eb57e74d9155547e9200b5dbe912eeaf0f7e5a4e9e25dc9784c9caad647f7a6b
carrier_bytes: 6925
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-design-coverage-mechanically-before-judging-it -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/validate.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Check the design coverage mechanically before judging it
Pass 1 — mechanical coverage. Per category: extract, then list misses with location citations. No misses = strong.
Flow coverage (EXPERIENCE.md). The ticket's Requirements when one exists, else the sources frontmatter → extract every journey / requirement name. Verify each has a Key Flow with named protagonist, numbered steps, a climax beat, and a failure path where applicable.
Token completeness (DESIGN.md). Extract every token in the YAML frontmatter and every `{path.to.token}` reference in the prose. Verify each defined
Color tokens missing hex (or light/dark pairs where applicable) are Critical — downstream code mirrors the spine.
Platform conventions (native dynamic type, 8pt grid) may stay semantic. Contrast targets stated for load-bearing combinations.
Component coverage (both spines). Extract every component name used anywhere. Verify each has a row in DESIGN.md.Components (visual spec) and EXPERIENCE.md.Component Patterns (behavioral spec) — real rules, not one-word descriptions.
State coverage (EXPERIENCE.md). Walk every IA surface. List states it should have (empty, cold-load, focus, error, offline, permission-denied — whichever apply). Verify each covered.
Visual reference coverage. List every file in `mockups/`, `wireframes/`, `imports/`. Spines link to each inline at the relevant section and name what it illustrates; spines-win-on-conflict stated once. List orphans and unspecific references.
<!-- vpmodule:atom:end check-the-design-coverage-mechanically-before-judging-it -->
<!-- vpmodule:atom:begin check-the-design-for-bloat-inheritance-and-shape -->
---
instruction_id: check-the-design-for-bloat-inheritance-and-shape
title: "Check the design for bloat, inheritance and shape"
summary: "Pass two is judgment: rate each category, and look for bloat, broken inheritance and a shape that does not fit — the canonical order, the required defaults, and sections that earn their place."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The mechanical coverage pass is done.
conditions_does_not_apply_when: The coverage has not been checked yet.
artifact_contract_output_type: judgment-review
artifact_contract_required_data:
  - the category verdicts
  - the findings
artifact_contract_verified_by: each category carries a verdict and the findings add information
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/validate.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Check the design for bloat, inheritance and shape
Pass 2 — judgment. Verdict per category (strong / adequate / thin / broken); findings only where they add information.
Bloat & overspecification. Pixel specs where tokens cover it; source restatement (personas, FRs, scope); prose where a table works; sections no downstream consumer would read; decorative narrative untied to a decision. DESIGN.md prose may carry editorial voice; EXPERIENCE.md prose should not.
Inheritance discipline. `sources` frontmatter resolves. Journey / requirement names verbatim from the ticket's Requirements when one exists, else the sources frontmatter. Glossary identical across spines, ticket and sources. Component names identical across all sections in both files. EXPERIENCE.md token references resolve to DESIGN.md tokens by name.
Shape fit. DESIGN.md sections in canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts; omittable but order-locked when present). EXPERIENCE.md required defaults present (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows). Dropped defaults defensible. Required-when-applicable present where triggered (Inspiration when sources / memlog show reference products or rejects; Responsive when multi-surface or breakpoints). Invented sections earn their place.
<!-- vpmodule:atom:end check-the-design-for-bloat-inheritance-and-shape -->
<!-- vpmodule:atom:begin rate-a-design-finding-by-downstream-impact -->
---
instruction_id: rate-a-design-finding-by-downstream-impact
title: Rate a design finding by downstream impact
summary: "The severity of a finding is the downstream impact of leaving it, not the effort of fixing it; every finding carries Critical, Important or Minor, its location and its fix."
capability_tags:
  - review-code
pattern_tags:
  - impact-based-severity
conditions_applies_when: A design finding is being rated.
conditions_does_not_apply_when: The finding is a preference with no downstream effect.
artifact_contract_output_type: severity-rating
artifact_contract_required_data:
  - the severity
  - the location
  - the fix
artifact_contract_verified_by: "the severity follows the impact of leaving the finding, not the difficulty of the fix"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/validate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Rate a design finding by downstream impact
Severity = downstream impact, not fix difficulty.
Severity: Critical, Important, Minor.
[Finding] (location). *Fix:* [suggestion].
<!-- vpmodule:atom:end rate-a-design-finding-by-downstream-impact -->