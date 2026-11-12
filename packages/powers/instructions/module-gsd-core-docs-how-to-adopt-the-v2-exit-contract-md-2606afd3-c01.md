---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-adopt-the-v2-exit-contract-md-2606afd3-c01"
title: "gsd-core: docs/how-to/adopt-the-v2-exit-contract.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/adopt-the-v2-exit-contract.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/adopt-the-v2-exit-contract.md\"}"
atom_ids:
  - reject-an-unknown-selector-instead-of-falling-back-to-the-default
  - separate-a-degraded-result-from-a-crash
atom_count: 2
atoms: "[{\"atom_id\":\"reject-an-unknown-selector-instead-of-falling-back-to-the-default\",\"file_sha256\":\"88488fb0f098c066555de80c5ee3a3dd6f22184dd48f23d7a15bd37194562890\",\"content_sha256\":\"621fcab42dc651011325868002738b8638c59219f009a5418244bd7e72903223\",\"file_bytes\":1505,\"body_bytes\":369},{\"atom_id\":\"separate-a-degraded-result-from-a-crash\",\"file_sha256\":\"13dfa7e9c9d5b2794b3ee85b33cc55a3c248e71b3f9142766060f1bd318e78ef\",\"content_sha256\":\"1a78ed2f623f69e80e43b64235c293bf3a430403beee141581774426d9c9ffe7\",\"file_bytes\":1457,\"body_bytes\":354}]"
carrier_sha256: c8323e8a9c2fde0fe3a9fd8fb06b45dc2b2d470007c8d2aa07ed0eeb3411d188
carrier_bytes: 3285
revision: 1
status: active
---
<!-- vpmodule:atom:begin reject-an-unknown-selector-instead-of-falling-back-to-the-default -->
---
instruction_id: reject-an-unknown-selector-instead-of-falling-back-to-the-default
title: Reject an unknown selector instead of falling back to the default
summary: A selector that names nothing recognisable is refused; the switch whose whole point is that nothing fails with success must not itself fail open.
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: "A mode, version or profile is selected by a value that may be wrong."
conditions_does_not_apply_when: The selector names a known value.
artifact_contract_output_type: selection-rejection
artifact_contract_required_data:
  - the rejected value
  - the reason it was refused
artifact_contract_verified_by: an unknown selector is refused loudly and no default was silently applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/adopt-the-v2-exit-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject an unknown selector instead of falling back to the default
Only the exact lowercase tokens `v1`/`v2` are accepted. Anything else present — a typo, `V2`, `v3`, or an explicitly empty `--exit-contract=` — throws rather than silently falling back to `v1`; a selector for a contract whose whole point is "nothing fails with success" must not itself fail open.
<!-- vpmodule:atom:end reject-an-unknown-selector-instead-of-falling-back-to-the-default -->
<!-- vpmodule:atom:begin separate-a-degraded-result-from-a-crash -->
---
instruction_id: separate-a-degraded-result-from-a-crash
title: Separate a degraded result from a crash
summary: "A run that completed and reported a condition is a degraded result; only a run that broke is a crash, and the two are never mapped onto the same code."
capability_tags:
  - triage-reports
pattern_tags:
  - graceful-degradation
conditions_applies_when: A result carries a condition that the run diagnosed on purpose.
conditions_does_not_apply_when: The run itself broke.
artifact_contract_output_type: outcome-classification
artifact_contract_required_data:
  - the outcome class
  - the condition that was reported
artifact_contract_verified_by: the diagnosed condition is classified as a degraded result and not as a crash
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/adopt-the-v2-exit-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate a degraded result from a crash
`80` is **not** a crash. The process did its job: it determined, correctly, that the artifact you asked about is absent, unparseable, or that a required argument was missing
Do not conflate the two: a gate that maps `80` to "the tool is broken" will page someone for a condition the tool successfully diagnosed.
<!-- vpmodule:atom:end separate-a-degraded-result-from-a-crash -->