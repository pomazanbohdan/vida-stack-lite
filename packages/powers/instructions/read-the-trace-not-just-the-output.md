---
instruction_id: read-the-trace-not-just-the-output
title: "Read the trace, not just the output"
summary: "The tool is tried once on a real input in a fresh context, and the transcript is read, because the trace shows what to fix."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
  - experiment-design
conditions_applies_when: A tool has just been written and the user has a real input for it.
conditions_does_not_apply_when: No real input exists yet.
artifact_contract_output_type: trial-trace
artifact_contract_required_data:
  - the real input
  - the transcript
  - what the trace shows
  - the fix that followed
artifact_contract_verified_by: "the transcript was read, the fix it pointed at was applied once, and the decision was recorded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/lean.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read the trace, not just the output
When the user has a real input (a request they made by hand, a file, a transcript), run the skill on it once in a fresh context, a subagent that sees only the skill and the input, and read the transcript, not just the output.
Several approaches tried before one worked: an instruction is too vague. Name the default.
An instruction followed where it did not apply: too broad. Narrow its condition.
Stalling between alternatives: no default was named. Name one.
The same helper rewritten each run: bundle it as a script.
A line the run never needed: cut it.
Fix what the trace shows, once, and record the decision.
