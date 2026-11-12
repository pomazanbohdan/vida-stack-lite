---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-debugger-techniques-md-079f282a-c01"
title: "gsd-core: gsd-core/references/debugger-techniques.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/debugger-techniques.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/debugger-techniques.md\"}"
atom_ids:
  - add-visibility-before-you-change-behaviour
  - resolve-a-constructed-value-on-both-sides
atom_count: 2
atoms: "[{\"atom_id\":\"add-visibility-before-you-change-behaviour\",\"file_sha256\":\"2dba52418a702976dbfcfb7128f7be81f956b27b9eb4f6e2048d3b0420d62c08\",\"content_sha256\":\"2f0d87f2798a6e3cdbe6a6dc0f7314c86eed1ff8d7dae7012115558b5994614b\",\"file_bytes\":1335,\"body_bytes\":216},{\"atom_id\":\"resolve-a-constructed-value-on-both-sides\",\"file_sha256\":\"943970af2554a0ca394afc533670bb92f4e8234df4ff0f6cbf6da451398fe877\",\"content_sha256\":\"f46daf91833bed24632843e02767d78008eb12839ffc05dacc455af220a8ca0f\",\"file_bytes\":1726,\"body_bytes\":550}]"
carrier_sha256: 3ce8911a23f2be6f88ee016927a1d238a26ad87d7d256b5b17dde6c26bc574b3
carrier_bytes: 3342
revision: 1
status: active
---
<!-- vpmodule:atom:begin add-visibility-before-you-change-behaviour -->
---
instruction_id: add-visibility-before-you-change-behaviour
title: Add visibility before you change behaviour
summary: Logging and assertions are added and the code is run first; only then is a hypothesis formed and a change made.
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: A fix is about to be written for a defect that is not yet understood.
conditions_does_not_apply_when: The cause is already proven and only the change is left.
artifact_contract_output_type: observation-pass
artifact_contract_required_data:
  - the visibility that was added
  - the observed output
  - the hypothesis formed from it
artifact_contract_verified_by: the code was run and observed before any behavior was changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-techniques.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Add visibility before you change behaviour
When: Always. Before making any fix.
Add visibility before changing behavior:
Workflow: Add logging -> Run code -> Observe output -> Form hypothesis -> Then make changes.
<!-- vpmodule:atom:end add-visibility-before-you-change-behaviour -->
<!-- vpmodule:atom:begin resolve-a-constructed-value-on-both-sides -->
---
instruction_id: resolve-a-constructed-value-on-both-sides
title: Resolve a constructed value on both sides
summary: "A constructed path, URL or key is never assumed correct: the producer and the consumer are found and the resolved value is compared on both sides."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A value is built from variables and two parts of the system are expected to agree on it.
conditions_does_not_apply_when: The value is a literal that both sides read directly.
artifact_contract_output_type: path-agreement-check
artifact_contract_required_data:
  - the producer
  - the consumer
  - the resolved value on both sides
  - the variables in the construction
artifact_contract_verified_by: the resolved value was compared on both sides and they agree
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-techniques.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Resolve a constructed value on both sides
Never assume a constructed path is correct. Resolve it to its actual value and verify the other side agrees.
Find the code that **produces** the value (writer/installer/creator)
Find the code that **consumes** the value (reader/checker/validator)
Trace the actual resolved value in both — do they agree?
Check every variable in the path construction — where does each come from? What's its actual value at runtime?
When two systems share a resource (file, directory, key), trace the full path in both.
<!-- vpmodule:atom:end resolve-a-constructed-value-on-both-sides -->