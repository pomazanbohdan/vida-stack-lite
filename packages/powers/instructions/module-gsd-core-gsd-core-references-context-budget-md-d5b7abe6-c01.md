---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-context-budget-md-d5b7abe6-c01"
title: "gsd-core: gsd-core/references/context-budget.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/references/context-budget.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/context-budget.md\"}"
atom_ids:
  - adjust-the-behaviour-to-the-context-degradation-signals
  - check-semantic-completeness-not-just-file-existence
  - derive-confidence-from-measured-history
  - scale-the-read-depth-to-the-context-window
atom_count: 4
atoms: "[{\"atom_id\":\"adjust-the-behaviour-to-the-context-degradation-signals\",\"file_sha256\":\"d36085494593cabba646102cf55748019d3458a6be0acd6f3b4a6e560755ee55\",\"content_sha256\":\"1299c1386f1f56e0ed1dde429faba580cf92bd26e913819358e3b368b211b487\",\"file_bytes\":2672,\"body_bytes\":1248},{\"atom_id\":\"check-semantic-completeness-not-just-file-existence\",\"file_sha256\":\"681e91cd71d465a45bd524f2beda2e86273e7d3478a9290a3a753598d2b261d1\",\"content_sha256\":\"ccc315f37b2aa0dfb2c50e91baa92b35415c9a9f3b7329d869f2145cca8cd583\",\"file_bytes\":1596,\"body_bytes\":481},{\"atom_id\":\"derive-confidence-from-measured-history\",\"file_sha256\":\"af3bb84ab9f41d6f5bb970c8d1283cc294bd55ea84106922e05db71b579d850b\",\"content_sha256\":\"02ebbaa2674e1f69d90e4de110d6442ceb5065665f2204c64546dc7ee8de4e38\",\"file_bytes\":1550,\"body_bytes\":424},{\"atom_id\":\"scale-the-read-depth-to-the-context-window\",\"file_sha256\":\"ad7890f52b80a6fdb1e00872dc51020d74ffbf4127c595c730d180036f081e21\",\"content_sha256\":\"e35f057c3f0ffbf79b9280859cdc32ba14aad995bc3051e4c2ebde9b78e2f872\",\"file_bytes\":2289,\"body_bytes\":1032}]"
carrier_sha256: 57d50bf17cfe5396ccb0b9f47376bdf805b344dadca3c9cf831b8ca6b5f49305
carrier_bytes: 8712
revision: 1
status: active
---
<!-- vpmodule:atom:begin adjust-the-behaviour-to-the-context-degradation-signals -->
---
instruction_id: adjust-the-behaviour-to-the-context-degradation-signals
title: Adjust the behaviour to the context degradation signals
summary: "Pressure shows up as vagueness, skipped steps and partial completion before any budget warning fires, and the run changes its behaviour accordingly."
capability_tags:
  - curate-context
pattern_tags:
  - resource-bounds
  - context-degradation-policy
  - context-degradation-signals
conditions_applies_when: A long run notices that its own output is degrading.
conditions_does_not_apply_when: The run is short and the context is nearly empty.
artifact_contract_output_type: degradation-response
artifact_contract_required_data:
  - the signals that were seen
  - the tier they indicate
  - the behaviour that was changed
artifact_contract_verified_by: the behaviour was changed on the assessed signals and not on a token count
compatibility_excludes:
  - measure-the-context-and-start-a-fresh-session-before-it-degrades
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/context-budget.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/execute-phase-context-guard.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Adjust the behaviour to the context degradation signals

Quality degrades gradually before panic thresholds fire. Watch for these early signals:

Silent partial completion -- agent claims task is done but implementation is incomplete. Self-check catches file existence but not semantic completeness. Always verify agent output meets the plan's must_haves, not just that files exist.

Increasing vagueness -- agent starts using phrases like "appropriate handling" or "standard patterns" instead of specific code. This indicates context pressure even before budget warnings fire.

Skipped steps -- agent omits protocol steps it would normally follow. If an agent's success criteria has 8 items but it only reports 5, suspect context pressure.

DEGRADING (50-70%): Economize. Frontmatter-only reads, minimal inlining, warn user about budget. Emit warning, continue.

POOR (70%+): Emergency mode. Checkpoint progress immediately. No new reads unless critical. `warn`: emit warning + recommend the pause-work checkpoint. `auto`: invoke the pause-work checkpoint before the next wave. `off`: proceed anyway.

The guard is heuristic — no programmatic context-percentage API exists. Use your assessment of degradation signals, not a fixed token count.
<!-- vpmodule:atom:end adjust-the-behaviour-to-the-context-degradation-signals -->
<!-- vpmodule:atom:begin check-semantic-completeness-not-just-file-existence -->
---
instruction_id: check-semantic-completeness-not-just-file-existence
title: "Check semantic completeness, not just file existence"
summary: "A delegated result is checked against what had to be true, because a file that exists does not show that the work inside it is complete."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: Work was delegated and its output comes back.
conditions_does_not_apply_when: The agent did the work itself and checked it.
artifact_contract_output_type: delegation-check
artifact_contract_required_data:
  - what had to be true
  - the spot check
  - the gaps the structural check missed
artifact_contract_verified_by: "the must-haves were checked, not only the files"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/context-budget.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Check semantic completeness, not just file existence
Silent partial completion -- agent claims task is done but implementation is incomplete.
Self-check catches file existence but not semantic completeness.
Always verify agent output meets the plan's must_haves, not just that files exist.
When delegating to agents, the orchestrator cannot verify semantic correctness of agent output -- only structural completeness.
Mitigate with must_haves.truths and spot-check verification.
<!-- vpmodule:atom:end check-semantic-completeness-not-just-file-existence -->
<!-- vpmodule:atom:begin derive-confidence-from-measured-history -->
---
instruction_id: derive-confidence-from-measured-history
title: Derive confidence from measured history
summary: "A confidence value comes from the measured ratio of estimate to actual in this project, not from the agent's own certainty."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: An estimate and a confidence are produced for a piece of work.
conditions_does_not_apply_when: "The value is a measurement, not an estimate."
artifact_contract_output_type: calibrated-estimate
artifact_contract_required_data:
  - the raw estimate
  - the measured factor
  - the derived confidence
  - the sample count behind it
artifact_contract_verified_by: the confidence comes from the measured history and not from a self-assessment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/context-budget.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Derive confidence from measured history
confidence is **derived, not judged**: it is the `confidence` value from the same calibration query, keyed to the sample count
Do not rate your own certainty.
Self-rated confidence was measured in this project and found weak
every signal here routes on measured history instead.
multiply your raw figure by its `factor`. It is the measured estimate-vs-actual ratio for THIS project
<!-- vpmodule:atom:end derive-confidence-from-measured-history -->
<!-- vpmodule:atom:begin scale-the-read-depth-to-the-context-window -->
---
instruction_id: scale-the-read-depth-to-the-context-window
title: Scale the read depth to the context window
summary: "How much of a document is read depends on the size of the context window: summaries first, full bodies only when they are needed and there is room."
capability_tags:
  - read-large-artifacts
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: Artifacts are read in a session whose context window is known.
conditions_does_not_apply_when: The artifact is known to be short.
artifact_contract_output_type: read-depth-plan
artifact_contract_required_data:
  - the context window
  - the read depth chosen
  - the parts that were not read
artifact_contract_verified_by: the read depth matches the context window and the skipped parts are named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/context-budget.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Scale the read depth to the context window
Read depth scales with context window
read only frontmatter, status fields, or summaries.
MAY read full subagent output bodies when the content is needed for inline presentation or decision-making. Still avoid unnecessary reads.
If the field is absent, treat as 200k (conservative default).
Never read agent definition files
Never inline large files into subagent prompts -- tell agents to read files from disk instead
At < 500000: read only frontmatter, status fields, or summaries. At >= 500000 (1M model): full body reads permitted when content is needed for inline decisions
read frontmatter only from prior phase SUMMARYs. At >= 500000: full body reads permitted for direct-dependency phases. Transitive dependencies (2+ phases back) remain frontmatter-only regardless
Never read full PLAN.md files from other phases -- only current phase plans
Do not re-read full file contents when frontmatter is sufficient -- frontmatter contains status, key_files, commits, and provides fields
<!-- vpmodule:atom:end scale-the-read-depth-to-the-context-window -->