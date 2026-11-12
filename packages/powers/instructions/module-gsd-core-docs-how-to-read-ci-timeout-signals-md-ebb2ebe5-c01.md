---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-read-ci-timeout-signals-md-ebb2ebe5-c01"
title: "gsd-core: docs/how-to/read-ci-timeout-signals.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/read-ci-timeout-signals.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/read-ci-timeout-signals.md\"}"
atom_ids:
  - a-killed-run-never-reaches-its-last-step
  - a-near-cap-warning-means-less-margin-not-a-failure
atom_count: 2
atoms: "[{\"atom_id\":\"a-killed-run-never-reaches-its-last-step\",\"file_sha256\":\"d321b3a03fa3c06c9d77f5a23d5b4f491cd0438c8b54f450dc27afc1e853e8ef\",\"content_sha256\":\"54bb8c2936062cafcb734d3a55894bba8137f958a2edc85441cae64d264d85c2\",\"file_bytes\":1371,\"body_bytes\":219},{\"atom_id\":\"a-near-cap-warning-means-less-margin-not-a-failure\",\"file_sha256\":\"1ed92889035f90c7ba22d7b79b490c722ce58417cd3b84997c27aaf231d7a850\",\"content_sha256\":\"ee0e0faf4d1ee4604bda4d52f3221751d21f8a2cb15e171d9de88e31bca707c3\",\"file_bytes\":1296,\"body_bytes\":213}]"
carrier_sha256: 51dfa77fb4933603a1e0d7894f7b3b4cdc2b0c200fd3ce7b43a9e1a98971e8b3
carrier_bytes: 2962
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-killed-run-never-reaches-its-last-step -->
---
instruction_id: a-killed-run-never-reaches-its-last-step
title: A killed run never reaches its last step
summary: "A check that runs as the final step of a job reports nothing for a job that was killed before it, so its absence is explained by the kill and not by the condition being absent."
capability_tags:
  - instrument-production-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: A signal is missing from a run that may have been cut short.
conditions_does_not_apply_when: The run reached its end and the signal was still absent.
artifact_contract_output_type: absent-signal-reading
artifact_contract_required_data:
  - the missing signal
  - whether the run reached its last step
artifact_contract_verified_by: the absence is attributed to the kill and not read as a clean result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/read-ci-timeout-signals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# A killed run never reaches its last step
If the warning never appears even on a job that was actually cancelled at its cap, that is expected - a killed job never reaches its last step, so the in-job check never runs.
<!-- vpmodule:atom:end a-killed-run-never-reaches-its-last-step -->
<!-- vpmodule:atom:begin a-near-cap-warning-means-less-margin-not-a-failure -->
---
instruction_id: a-near-cap-warning-means-less-margin-not-a-failure
title: "A near-cap warning means less margin, not a failure"
summary: "An advisory warning on an otherwise green run says exactly that: the run finished, with less margin than the gate assumes it has."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A run finished and an advisory signal reported that it came close to a limit.
conditions_does_not_apply_when: The run failed.
artifact_contract_output_type: margin-warning
artifact_contract_required_data:
  - the signal
  - the elapsed time
  - the cap
artifact_contract_verified_by: the warning is read as reduced margin and the run is not called a failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/read-ci-timeout-signals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# A near-cap warning means less margin, not a failure
A near-cap warning on an otherwise-green run means exactly what it says: this run finished, but with less margin than the headroom-factor gate assumes it has.
<!-- vpmodule:atom:end a-near-cap-warning-means-less-margin-not-a-failure -->