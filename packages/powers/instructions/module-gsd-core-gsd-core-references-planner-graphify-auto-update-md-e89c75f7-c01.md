---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-graphify-auto-update-md-e89c75f7-c01"
title: "gsd-core: gsd-core/references/planner-graphify-auto-update.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/planner-graphify-auto-update.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-graphify-auto-update.md\"}"
atom_ids:
  - annotate-derived-data-with-its-freshness
  - tell-a-stale-index-apart-from-a-running-or-failed-producer
atom_count: 2
atoms: "[{\"atom_id\":\"annotate-derived-data-with-its-freshness\",\"file_sha256\":\"1927fe28181f3c5cebccd63acced2125bae441b13c864a61902cd34b10594484\",\"content_sha256\":\"9fc38b34d611a5e0e2beee7bb6028cdbc7d044245974336d61053b2a1542da51\",\"file_bytes\":1544,\"body_bytes\":302},{\"atom_id\":\"tell-a-stale-index-apart-from-a-running-or-failed-producer\",\"file_sha256\":\"614195810ed04085067ef7c8f0ccc8efa3222341bcec5055c5a2989dc60402f4\",\"content_sha256\":\"fd7649e231382babb8fa2dc3f305b001a7137064ab5fda887c339b6ce75267f9\",\"file_bytes\":1822,\"body_bytes\":551}]"
carrier_sha256: e6db2cc331c97b9fc07aef293babbcbc6298d5f539ea7b8f7d9d18f40b8a9ff2
carrier_bytes: 3677
revision: 1
status: active
---
<!-- vpmodule:atom:begin annotate-derived-data-with-its-freshness -->
---
instruction_id: annotate-derived-data-with-its-freshness
title: Annotate derived data with its freshness
summary: "Derived context that is out of date carries the annotation with it wherever it is used, so the reader knows the relationships in it are approximate."
capability_tags:
  - curate-context
pattern_tags:
  - evidence-analysis
conditions_applies_when: A derived artifact is loaded and its freshness is known.
conditions_does_not_apply_when: The derived artifact was just rebuilt.
artifact_contract_output_type: freshness-annotation
artifact_contract_required_data:
  - the age of the derived artifact
  - the annotation that travels with it
artifact_contract_verified_by: the annotation is present wherever the derived data is used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-load-graph-context.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-graphify-auto-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Annotate derived data with its freshness
If the status response has `stale: true`, note for later: "Graph is {age_hours}h old -- treat semantic relationships as approximate." Include this annotation inline with any graph context injected below.
If nothing comes back, continue without graph context.
<!-- vpmodule:atom:end annotate-derived-data-with-its-freshness -->
<!-- vpmodule:atom:begin tell-a-stale-index-apart-from-a-running-or-failed-producer -->
---
instruction_id: tell-a-stale-index-apart-from-a-running-or-failed-producer
title: Tell a stale index apart from a running or failed producer
summary: "A stale marker says only how old a derived artifact is; the producer state is reported separately so that old, in-flight and failed are not read as the same thing."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A derived artifact is consumed while its producer may still be running or may have failed.
conditions_does_not_apply_when: The producer state is not observable and only the age of the artifact is known.
artifact_contract_output_type: producer-state
artifact_contract_required_data:
  - the age of the artifact
  - the state of its producer
artifact_contract_verified_by: the report distinguishes an artifact that is merely old from one whose producer is running or failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-graphify-auto-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell a stale index apart from a running or failed producer
The existing `stale: true` annotation tells the consumer the mtime is old; it cannot tell the consumer whether the auto-build hook has been running, just failed, or is in flight.
The hook writes `status: "running"` synchronously **before** detach, so the next planner invocation can see the in-flight signal even if `graphify update .` has not finished.
The file-missing case is silent (the operator either has not opted in or has not yet triggered a HEAD-advancing git op since enabling).
<!-- vpmodule:atom:end tell-a-stale-index-apart-from-a-running-or-failed-producer -->