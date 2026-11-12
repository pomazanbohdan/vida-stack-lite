---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-systematic-debugging-skill-md-a7f4bb92-c01"
title: "superpowers: skills/systematic-debugging/SKILL.md module"
summary: "Carrier for 4 atomic instructions from superpowers:skills/systematic-debugging/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/systematic-debugging/SKILL.md\"}"
atom_ids:
  - analyze-working-reference
  - debug-systematically
  - handle-environmental-cause
  - instrument-component-boundaries
atom_count: 4
atoms: "[{\"atom_id\":\"analyze-working-reference\",\"file_sha256\":\"1e7022e8b07ebc7c1798680c4838109a6d774b8d3f01e0884b04dbae69394143\",\"content_sha256\":\"488d440db1a9d5aa0ee254210c931fec1ffdec4e2e0d23c4dcc21becc301607e\",\"file_bytes\":1693,\"body_bytes\":625},{\"atom_id\":\"debug-systematically\",\"file_sha256\":\"9eb7579ce4d85ef9dff67f24afc6b9abf0d703b7126584d04e9ab56ece80cfcb\",\"content_sha256\":\"a975b014171ccf8c235e640623a400f54ee0e01e5ea3f365f273104f917efce2\",\"file_bytes\":3276,\"body_bytes\":1820},{\"atom_id\":\"handle-environmental-cause\",\"file_sha256\":\"21d4e960af08a194b9be00c0ffa95175c8ab78d1f46717cda125190641799be0\",\"content_sha256\":\"5b115c20b626b3d2d7faf2893ef194285c9ac60e2583ebc356126c7823576800\",\"file_bytes\":1849,\"body_bytes\":687},{\"atom_id\":\"instrument-component-boundaries\",\"file_sha256\":\"8ea2f845379c4e1d726f828908cfa0886821fc64d09b472a53a2d62397daf092\",\"content_sha256\":\"3fd8ec2564cb26568eeccc2a2dc3fdbc774166e10bdfc3a280476bd34dc09012\",\"file_bytes\":2019,\"body_bytes\":897}]"
carrier_sha256: 991e472eba416c85c527ad5061f6837d065ce6abe1d937ad0b98b0667ad90093
carrier_bytes: 9272
revision: 1
status: active
---
<!-- vpmodule:atom:begin analyze-working-reference -->
---
instruction_id: analyze-working-reference
title: Compare the broken path with a working one
summary: "Find a working example of the same behavior, read it completely, and list every difference before changing one thing at a time."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A similar working path or example exists to compare with the failure.
conditions_does_not_apply_when: There is no analogue and the failure is investigated in isolation.
artifact_contract_output_type: comparison-evidence
artifact_contract_required_data:
  - working example
  - difference list
  - verification
artifact_contract_verified_by: the difference list is tested one item at a time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/systematic-debugging/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Compare the broken path with a working one
Locate similar working code in the same codebase.
What works that's similar to what's broken?
If implementing a pattern, read the reference implementation completely.
Don't skim; read every line.
Understand the pattern fully before applying it.
What's different between working and broken?
List every difference, however small.
Don't assume "that can't matter".
What other components does this need?
What settings, config, environment?
What assumptions does it make?
Partial understanding guarantees bugs.
Read it completely.
Identify the differences.
Compare against references.
<!-- vpmodule:atom:end analyze-working-reference -->
<!-- vpmodule:atom:begin debug-systematically -->
---
instruction_id: debug-systematically
title: Find the root cause of the failure
summary: "Complete root-cause investigation before any fix: read the error, reproduce, trace the value upstream, then test one hypothesis at a time."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "A test, build, or running system behaves unexpectedly."
conditions_does_not_apply_when: No failure or deviation from expected behavior has been found.
artifact_contract_output_type: root-cause-report
artifact_contract_required_data:
  - reproduction steps
  - root-cause evidence
  - fix verification
artifact_contract_verified_by: a reproduction test fails before the fix and passes after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/systematic-debugging/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/systematic-debugging/root-cause-tracing.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-philosophy.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debugger.md
status: active
revision: 8
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Find the root cause of the failure

No fix before the root cause.

Core principle: understand the problem before proposing a fix; read the error, reproduce the failure, form one hypothesis at a time and test it.

1. Read the error and the code around it.
2. Reproduce the failure reliably.
3. Form one hypothesis and design the smallest test that would disprove it.
4. Compare the hypothesis with the evidence.
5. Implement the fix only after the root cause is confirmed.
6. Verify the fix against the original failing case.

If you cannot find the root cause, say so explicitly and continue investigating instead of guessing.

When the cause is environmental, timing-dependent or external: document what you investigated, implement the appropriate handling such as a retry, a timeout or an error message, and add monitoring or logging for a future investigation. But 95% of the "no root cause" cases are an incomplete investigation.

After a deep investigation, propose an always-on signal that would have caught the failure earlier, and add it.
Complete reading: Read entire functions, not just "relevant" lines. Read imports, config, tests. Skimming misses crucial details.
A good hypothesis can be proven wrong. If you can't design an experiment to disprove it, it's not useful.
The difference: Specificity. Good hypotheses make specific, testable claims.
One hypothesis at a time. If you change three things and it works, you don't know which one fixed it.
Understand the mechanism? Not just "what fails" but "why it fails"
Reproduce reliably? Either always reproduces, or you understand trigger conditions
Have evidence, not just theory? You've observed directly, not guessing
Ruled out alternatives? Evidence contradicts other hypotheses
Don't act if: "I think it might be X" or "Let me try changing Y and see"
<!-- vpmodule:atom:end debug-systematically -->
<!-- vpmodule:atom:begin handle-environmental-cause -->
---
instruction_id: handle-environmental-cause
title: Tell an environmental cause from an incomplete investigation
summary: "Only after a complete investigation may a failure be environmental; document what was investigated, add handling, and monitor it."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "The investigation points to the environment, timing, or an external system."
conditions_does_not_apply_when: The cause is already established in code and confirmed by reproduction.
artifact_contract_output_type: environmental-cause-report
artifact_contract_required_data:
  - checked environment
  - evidence boundary
  - handling
  - observation
artifact_contract_verified_by: the documented investigation and the added handling are both present
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/systematic-debugging/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Tell an environmental cause from an incomplete investigation
If systematic investigation reveals issue is truly environmental, timing-dependent, or external:
You've completed the process.
Document what you investigated.
Implement appropriate handling (retry, timeout, error message).
Add monitoring/logging for future investigation.
95% of "no root cause" cases are incomplete investigation.
Under time pressure (emergencies make guessing tempting).
"Just one quick fix" seems obvious.
You've already tried multiple fixes.
Previous fix didn't work.
You don't fully understand the issue.
Simple bugs have root causes too.
Rushing guarantees rework.
Systematic is faster than thrashing.
<!-- vpmodule:atom:end handle-environmental-cause -->
<!-- vpmodule:atom:begin instrument-component-boundaries -->
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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/systematic-debugging/SKILL.md
status: active
revision: 3
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
<!-- vpmodule:atom:end instrument-component-boundaries -->