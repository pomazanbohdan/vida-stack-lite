---
instruction_id: diagnose-from-runtime-evidence
title: Diagnose from runtime evidence
summary: "Instrument the live process instead of theorizing from source; the deliverable is a cited diagnosis, not a fix."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - systematic-debugging
conditions_applies_when: The defect appears only in the real environment and does not reproduce locally.
conditions_does_not_apply_when: The cause is visible from the code or from a simple local reproduction.
artifact_contract_output_type: runtime-diagnosis
artifact_contract_required_data:
  - timeline
  - first point of deviation
  - version and configuration
  - rejected hypotheses
artifact_contract_verified_by: correlated logs and traces for the same request
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/runtime-forensics.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Diagnose from runtime evidence
You own the diagnosis; instrument the live process, do not theorize from source.
The deliverable is a cited diagnosis, not a fix.
Capture the live signal on the matching surface.
Capture a CPU profile for a spinning process.
Capture a heap snapshot for a leak.
Capture a trace for a visual glitch.
A real artifact, not a guess.
Reduce the artifact to the smoking gun: the function on the hot path, the retainer chain from the leaked object to a GC root, the loop firing without input.
Parse large artifacts outside the main thread and keep the reduced finding.
Prove the mechanism before believing it.
Inject instrumentation into the running process, or hotfix the live code without reloading, to confirm the hypothesis cheaply.
Map the finding back to source: file, symbol, the line that allocates or schedules.
Record the version and configuration the signal came from.
Record each hypothesis the evidence rejected.
Hand the diagnosis to the fix or performance workflow once the cause is known.
Do not ship a fix unless asked.
