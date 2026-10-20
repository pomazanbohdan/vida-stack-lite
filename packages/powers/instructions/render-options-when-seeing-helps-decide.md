---
instruction_id: render-options-when-seeing-helps-decide
title: Render options when seeing helps decide
summary: "Render when a visual beats more conversation — picking colour tokens, picking a visual personality, sketching the map, mocking a tricky flow — and let the renderer return only a compact summary, never the full payload."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A decision is waiting on a visual comparison.
conditions_does_not_apply_when: The decision is already made.
artifact_contract_output_type: rendered-options
artifact_contract_required_data:
  - the decision moment
  - the artifact path
  - one line per variant
artifact_contract_verified_by: the renderer returned a compact summary and the person picked from the options
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/creative-tools.md
status: active
revision: 1
---

# Render options when seeing helps decide
Decision moments where a visual beats more conversation: picking color tokens, picking a visual personality among directions, sketching IA, mocking a tricky flow.
Fast-path users typically skip; coaching-path users typically lean in. Read the room.
The parent passes the subagent: current `.memlog.md`, relevant prior `.working/` captures, the user's stated intent for this pass, the output path.
The subagent writes its artifact under `.working/` and returns ONLY a compact summary (file path, one line per variant, mode coverage). Parent never holds the full payload.
