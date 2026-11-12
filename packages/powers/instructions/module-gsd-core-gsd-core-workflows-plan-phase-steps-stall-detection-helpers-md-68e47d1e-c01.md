---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-plan-phase-steps-stall-detection-helpers-md-68e47d1e-c01"
title: "gsd-core: gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md\"}"
atom_ids:
  - bound-the-wait-in-short-cycles-not-one-long-call
  - detect-completion-by-the-marker-not-by-the-file-time
atom_count: 2
atoms: "[{\"atom_id\":\"bound-the-wait-in-short-cycles-not-one-long-call\",\"file_sha256\":\"6c9769d27d3ea7fea556e4b4cc172823eb4656531cdfa08cfb36de00c27c6c55\",\"content_sha256\":\"6b512154957c04c9b9ca33f5c9a4b0fcc3f04eb0e186ec71e9dc857118ca6fb1\",\"file_bytes\":2106,\"body_bytes\":843},{\"atom_id\":\"detect-completion-by-the-marker-not-by-the-file-time\",\"file_sha256\":\"86e774c837a332af3997d4257b0c1f038ce3cb9a683cac19d41b5387b34e532c\",\"content_sha256\":\"4b6438f7e2bd3781685a2bad9ba44e88bcf7be35f56fd8ab8dd0e8acae50b49b\",\"file_bytes\":1433,\"body_bytes\":272}]"
carrier_sha256: daaa67fa151d139161cc208e1a30d6b81377352785178d7a5442081bdfab9d12
carrier_bytes: 3854
revision: 1
status: active
---
<!-- vpmodule:atom:begin bound-the-wait-in-short-cycles-not-one-long-call -->
---
instruction_id: bound-the-wait-in-short-cycles-not-one-long-call
title: "Bound the wait in short cycles, not one long call"
summary: A long wait is split into short bounded cycles; the outer threshold accumulates across the cycles instead of being carried by one call.
capability_tags:
  - coordinate-program
pattern_tags:
  - resource-bounds
  - verification-rerun-policy
conditions_applies_when: A wait can outlast the timeout of the tool that performs it.
conditions_does_not_apply_when: The wait is bounded by the tool itself and returns as soon as the condition holds.
artifact_contract_output_type: bounded-wait-policy
artifact_contract_required_data:
  - the interval one cycle waits
  - the threshold the cycles accumulate
  - the outcome of the current cycle
artifact_contract_verified_by: every cycle was a short bounded call and the elapsed time was accumulated across the cycles
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the wait in short cycles, not one long call
A single Bash tool call blocking for `threshold + interval` minutes (up to 15 min at defaults) risks the *host tool's own* timeout killing the call before it ever prints a result — silently defeating the fix it exists to ship.

Looping at the orchestrator-prose level instead means every cycle is a short (default 5 min), real, bounded call that reliably hands control back — the outer threshold is enforced by `dispatch_ts` accumulating across calls, not by one call's own duration.

**Disclosed tradeoff:** the first cycle always sleeps a full `PLANNER_STALL_INTERVAL_MINUTES` before its first check, so a planner that completes in seconds is not observed by this path until that interval elapses (default 5 min) — slower than a plain blocking call's near-instant return on success.
<!-- vpmodule:atom:end bound-the-wait-in-short-cycles-not-one-long-call -->
<!-- vpmodule:atom:begin detect-completion-by-the-marker-not-by-the-file-time -->
---
instruction_id: detect-completion-by-the-marker-not-by-the-file-time
title: "Detect completion by the marker, not by the file time"
summary: A watcher decides that the work is done from the completion signal of the run; fresh file times only prove that something happened.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A watcher decides whether a dispatched run is finished or hung.
conditions_does_not_apply_when: The run already returned its result.
artifact_contract_output_type: completion-detection
artifact_contract_required_data:
  - the completion signal that was read
  - the file times that were only a hint
artifact_contract_verified_by: a finished run was never declared hung because no file had been touched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Detect completion by the marker, not by the file time
A stale artifact is not a hung agent.
reporting a succeeded agent as hung, which is worse than the original unbounded wait.
is the ONLY working completion signal for that spawn; the artifact glob is secondary there.
<!-- vpmodule:atom:end detect-completion-by-the-marker-not-by-the-file-time -->