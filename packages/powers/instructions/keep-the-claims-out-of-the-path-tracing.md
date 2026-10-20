---
instruction_id: keep-the-claims-out-of-the-path-tracing
title: Keep the claims out of the path tracing
summary: "The claims are read only after the path tracing is finished, so they cannot steer the tracing retroactively."
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: A review walks the paths of a change and then checks its claims.
conditions_does_not_apply_when: There are no claims to read afterwards.
artifact_contract_output_type: review-order
artifact_contract_required_data:
  - the order the passes ran in
  - the point at which the claims were read
artifact_contract_verified_by: the claims were opened after the path tracing was finished
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/references/claims-check.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
status: active
revision: 1
---

# Keep the claims out of the path tracing
Final pass for the Edge Case Hunter. Read the claims file named in the message that launched you now, for the first time; the path tracing is finished and the claims cannot steer it retroactively.
Do NOT read it before Step 5: the path tracing in Steps 2–3 must finish before the claims are seen.
