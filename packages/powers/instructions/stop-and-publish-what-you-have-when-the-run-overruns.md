---
instruction_id: stop-and-publish-what-you-have-when-the-run-overruns
title: Stop and publish what you have when the run overruns
summary: "When the run drags past the estimate, the spawning stops and the report is written from the material already on disk, with the remainder reported as open questions."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The run has overrun the estimate the gate gave.
conditions_does_not_apply_when: The run is inside its estimate.
artifact_contract_output_type: partial-report
artifact_contract_required_data:
  - the material the report was written from
  - the remainder and its route
artifact_contract_verified_by: the report was written from material on disk and the remainder is reported as open questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Stop and publish what you have when the run overruns
**Stop-and-write valve.** If the run is dragging well past the plan gate’s estimate — rounds queuing, budgets mostly spent — stop spawning, synthesize from the digests already on disk, and report the remainder as open questions with a route (a Deepen later, or a drafted prompt for the user’s own tool). A shorter honest report beats a longer stale one.
- the report grows as material lands: the user watches the document build, not a spinner.
