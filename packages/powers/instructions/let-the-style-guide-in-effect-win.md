---
instruction_id: let-the-style-guide-in-effect-win
title: Let the style guide in effect win
summary: "A style guide named in the request beats the configured one, and the guide in effect beats every generic principle of the editorial pass."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An editorial pass runs and a style guide is in effect.
conditions_does_not_apply_when: No style guide applies to the document.
artifact_contract_output_type: style-guide-precedence
artifact_contract_required_data:
  - the style guide in effect
  - where it came from
artifact_contract_verified_by: "no finding contradicts the style guide in effect, and the guide in effect is named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Let the style guide in effect win
A style guide stated in the request wins over the configured one for that run.
Where the style guide in effect conflicts with a generic principle here — including the reader calibration — the style guide wins.
Nothing overrides content being sacrosanct.
