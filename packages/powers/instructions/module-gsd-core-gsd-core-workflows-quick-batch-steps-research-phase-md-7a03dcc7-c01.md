---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-quick-batch-steps-research-phase-md-7a03dcc7-c01"
title: "gsd-core: gsd-core/workflows/quick-batch/steps/research-phase.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/quick-batch/steps/research-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/quick-batch/steps/research-phase.md\"}"
atom_ids:
  - keep-research-targeted-not-a-domain-survey
  - warn-and-continue-when-an-advisory-artifact-is-missing
atom_count: 2
atoms: "[{\"atom_id\":\"keep-research-targeted-not-a-domain-survey\",\"file_sha256\":\"8502fb2fc6ba1063c7af1e070bf77aa5c4da6a1f2a9e74b0b76da76c5ac5ba2d\",\"content_sha256\":\"5fa83f44cf0e5a7838cb493e3741f4a03f4644d6b0bf686c97f866319de2b3ee\",\"file_bytes\":1816,\"body_bytes\":493},{\"atom_id\":\"warn-and-continue-when-an-advisory-artifact-is-missing\",\"file_sha256\":\"e304c1d589d7e15cda368585858bc665a7dc7841c27696d9ea56de678aa803c8\",\"content_sha256\":\"681360c91681155cbb0aa1fa8ea7916eac9922f9bcd13a1a9b2daf0c682d334f\",\"file_bytes\":1548,\"body_bytes\":268}]"
carrier_sha256: 335f59d2531115d326d4b92d8082889012486d0ccb05079ad551c71bebb710e0
carrier_bytes: 3671
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-research-targeted-not-a-domain-survey -->
---
instruction_id: keep-research-targeted-not-a-domain-survey
title: "Keep research targeted, not a domain survey"
summary: "Research for one unit of work is scoped to the best libraries and patterns for that unit, the pitfalls, the integration points and the constraints worth knowing, and it stays short and actionable."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Research runs for one bounded unit of work.
conditions_does_not_apply_when: The research question is open and the scope is the whole field.
artifact_contract_output_type: research-findings
artifact_contract_required_data:
  - the libraries or patterns
  - the pitfalls
  - the integration points
artifact_contract_verified_by: the findings are a short actionable set rather than a broad survey
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/research-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick/steps/research-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Keep research targeted, not a domain survey
Research should be concise and targeted
Best libraries/patterns for this specific item
Common pitfalls and how to avoid them
Integration points with existing codebase
Any constraints or gotchas worth knowing before planning
Do NOT produce a full domain survey. Target 1-2 pages of actionable findings.
Spawn a single focused researcher (not 4 parallel researchers like full phases — quick tasks need targeted research, not broad domain surveys)
<!-- vpmodule:atom:end keep-research-targeted-not-a-domain-survey -->
<!-- vpmodule:atom:begin warn-and-continue-when-an-advisory-artifact-is-missing -->
---
instruction_id: warn-and-continue-when-an-advisory-artifact-is-missing
title: Warn and continue when an advisory artifact is missing
summary: "Research is advisory input to the next step, not a gate: when it produced nothing, the run says so and continues instead of stopping."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: An advisory artifact that a later step would read was not produced.
conditions_does_not_apply_when: The artifact is a gate and the next step cannot run without it.
artifact_contract_output_type: advisory-gap
artifact_contract_required_data:
  - the missing artifact
  - the warning
  - the decision to continue
artifact_contract_verified_by: the gap is reported and the run continued
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/research-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick/steps/research-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Warn and continue when an advisory artifact is missing
research is advisory input to planning, never a hard gate
If a researcher does not produce
warn but continue
proceeding to planning without research
idempotent — a resumed batch skips items already researched
<!-- vpmodule:atom:end warn-and-continue-when-an-advisory-artifact-is-missing -->