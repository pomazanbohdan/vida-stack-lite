---
instruction_id: instrument-component-boundaries
title: Gather evidence at every component boundary
summary: "Instrument each component boundary once, compare what enters and exits, and investigate only the component where the data goes wrong."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: The failure occurs in a system with several components or boundaries.
conditions_does_not_apply_when: The failure is localized in one component with no data passing between components.
artifact_contract_output_type: boundary-evidence
artifact_contract_required_data:
  - boundaries
  - input data
  - output data
  - failing component
artifact_contract_verified_by: one instrumented run locates the failing boundary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Gather evidence at every component boundary
When a system has multiple components, add diagnostic instrumentation before proposing fixes.
For each component boundary, log what data enters the component.
Log what data exits the component.
Verify environment and config propagation.
Check state at each layer.
Run once to gather evidence showing where it breaks.
Then analyze evidence to identify the failing component.
Then investigate that specific component.
This reveals which layer fails.
Log before the dangerous operation, not after it fails.
Include directory, working directory, environment variables, and timestamps.
Capture the stack with a new Error to show the complete call chain.
Use the error channel in tests; a logger may be suppressed.
When you can't trace manually, add instrumentation.
Analyze stack traces.
Look for test file names.
Find the line number triggering the call.
