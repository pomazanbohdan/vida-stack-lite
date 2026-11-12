---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-debug-md-d7104402-c01"
title: "gsd-core: gsd-core/workflows/debug.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/debug.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/debug.md\"}"
atom_ids:
  - an-unrecognised-result-is-not-a-completion
  - guard-the-resume-loop-with-a-cap-and-a-steady-signal
atom_count: 2
atoms: "[{\"atom_id\":\"an-unrecognised-result-is-not-a-completion\",\"file_sha256\":\"9cf6cd1bcf11c2391f8ee19507b042990b4752f14dfc8bed6d7fcc03cae2cb5a\",\"content_sha256\":\"b1a73a444611350d824fe0b71a5520892d23063f817625536b1fbe94f0d72abc\",\"file_bytes\":1304,\"body_bytes\":240},{\"atom_id\":\"guard-the-resume-loop-with-a-cap-and-a-steady-signal\",\"file_sha256\":\"aa069ad8bda1d5fe3c056ad5fb903d0ca58bc6f970aeaa5298418d3764655079\",\"content_sha256\":\"7db6c3dd411152dc234448910991c89e927f8979f21ed648bed4fe9113207aa7\",\"file_bytes\":1480,\"body_bytes\":365}]"
carrier_sha256: 657ffd5be3d79c7933e11ad84d28d120334559c382a28438cead1d3dd6f57e29
carrier_bytes: 3087
revision: 1
status: active
---
<!-- vpmodule:atom:begin an-unrecognised-result-is-not-a-completion -->
---
instruction_id: an-unrecognised-result-is-not-a-completion
title: An unrecognised result is not a completion
summary: "Every return value falls into exactly one class, and a result that is not recognised is treated as not finished rather than as done."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: A delegated step returns a result that does not match a known class.
conditions_does_not_apply_when: The result is one of the known classes.
artifact_contract_output_type: return-classification
artifact_contract_required_data:
  - the class of the return
  - the action each class triggers
artifact_contract_verified_by: an unrecognised result was not read as complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# An unrecognised result is not a completion
Every return from the session manager falls into exactly one of three buckets.
Do not treat "not recognized" as "complete."
Terminal - complete.
Terminal - abandoned.
Non-terminal - auto-resume.
<!-- vpmodule:atom:end an-unrecognised-result-is-not-a-completion -->
<!-- vpmodule:atom:begin guard-the-resume-loop-with-a-cap-and-a-steady-signal -->
---
instruction_id: guard-the-resume-loop-with-a-cap-and-a-steady-signal
title: Guard the resume loop with a cap and a steady signal
summary: "A resume loop has two stops: a steady signal that shows no progress, and an absolute cap that ends the loop whatever the signal says."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - systematic-debugging
conditions_applies_when: A run resumes a delegated step repeatedly until it finishes.
conditions_does_not_apply_when: The step is run once.
artifact_contract_output_type: resume-loop-guard
artifact_contract_required_data:
  - the signal that shows no progress
  - the cap
  - the blocker report emitted at the cap
artifact_contract_verified_by: "the loop stops on the steady signal and at the cap, whichever comes first"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Guard the resume loop with a cap and a steady signal
A no-progress heuristic keyed on `next_action` ALONE
Never `updated`, which is overwritten on every checkpoint write
So it changes every cycle and can never signal no-progress.
After 3 total auto-resumes for the slug, STOP auto-resuming and emit the blocker report REGARDLESS of whether `next_action` changed.
<!-- vpmodule:atom:end guard-the-resume-loop-with-a-cap-and-a-steady-signal -->