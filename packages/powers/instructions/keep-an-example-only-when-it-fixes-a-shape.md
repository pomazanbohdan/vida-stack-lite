---
instruction_id: keep-an-example-only-when-it-fixes-a-shape
title: Keep an example only when it fixes a shape
summary: An example is kept only when the output diverges without it; a format line beats a worked artefact.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - output-formatting
conditions_applies_when: An instruction carries a worked example or a filled-in artefact.
conditions_does_not_apply_when: The artefact is the output itself and not an illustration.
artifact_contract_output_type: kept-example
artifact_contract_required_data:
  - the rule
  - the smallest fragment that shows the divergence
  - the rule the fragment belongs to
artifact_contract_verified_by: "the rule alone on a fresh model reproduces the output, or the kept fragment shows the divergence it fixes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/cut.md
status: active
revision: 1
---

# Keep an example only when it fixes a shape
An example earns its place only by fixing a shape. A format line beats a worked artifact. Delete the example and run the rule alone on a fresh model: if the output conforms, the example was explanation; if it diverges in a way one more clause cannot fix, keep the smallest fragment that shows the divergence, beside the rule it fixes. General knowledge, such as what a good bug report looks like, needs no example. Where the project will hold its own instances after the first run, point at those rather than ship a sample.
