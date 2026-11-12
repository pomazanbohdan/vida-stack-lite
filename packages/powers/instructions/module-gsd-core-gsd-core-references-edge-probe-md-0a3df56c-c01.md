---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-edge-probe-md-0a3df56c-c01"
title: "gsd-core: gsd-core/references/edge-probe.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/edge-probe.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/edge-probe.md\"}"
atom_ids:
  - require-a-reason-for-every-dismissal
  - surface-the-omitted-edge-in-the-spec-not-in-the-verifier
  - walk-every-requirement-against-a-closed-edge-taxonomy
atom_count: 3
atoms: "[{\"atom_id\":\"require-a-reason-for-every-dismissal\",\"file_sha256\":\"3806fd7023d96ef44265ff895c9e9e664a1ef245040ed4d5fea0abd8f47bf3e9\",\"content_sha256\":\"0e686cc20212b57779893398fc76114721391a47eabc3eb790393fcc3a851561\",\"file_bytes\":1434,\"body_bytes\":359},{\"atom_id\":\"surface-the-omitted-edge-in-the-spec-not-in-the-verifier\",\"file_sha256\":\"b975212080db5fe97245473ca593aebcf0a43608c1c0548ab8929b0e219228d3\",\"content_sha256\":\"6ca0b6f70a5455c9e16986a8d55489ccc7e77620fbcd93dc265b32524dfc90d5\",\"file_bytes\":1800,\"body_bytes\":616},{\"atom_id\":\"walk-every-requirement-against-a-closed-edge-taxonomy\",\"file_sha256\":\"6751e901980a3cd43d42230506fb4bf16dddc7f6afd31641bc51b98be95f0d48\",\"content_sha256\":\"bfbfe808413bb139937d149d30d628f9bccad004263ea3f3b8c0f13d522ef2ea\",\"file_bytes\":1795,\"body_bytes\":653}]"
carrier_sha256: 19c0f6aa9d602ada61c505ef2977d54de0494182a23c54477435a58069e7473e
carrier_bytes: 5492
revision: 1
status: active
---
<!-- vpmodule:atom:begin require-a-reason-for-every-dismissal -->
---
instruction_id: require-a-reason-for-every-dismissal
title: Require a reason for every dismissal
summary: "An edge that does not apply is dismissed with a written reason; silence is not a dismissal, and an unresolved edge stays carried forward."
capability_tags:
  - clarify-requirements
pattern_tags:
  - decision-trail
conditions_applies_when: A raised edge is closed as not applicable or left open.
conditions_does_not_apply_when: The edge is resolved with a check that enforces it.
artifact_contract_output_type: edge-disposition
artifact_contract_required_data:
  - the edge
  - its state
  - the reason for a dismissal
artifact_contract_verified_by: every dismissal carries a non-empty reason and every open edge stays visible
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/edge-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Require a reason for every dismissal
Dismissal requires a reason string. "N/A — input is a bounded enum, no boundary exists" is valid; silence is not.
The reason string is the audit trail.
dismissed — not applicable, accompanied by a required, non-empty reason string.
unresolved — carried forward and flagged; the author chose not to resolve it yet.
<!-- vpmodule:atom:end require-a-reason-for-every-dismissal -->
<!-- vpmodule:atom:begin surface-the-omitted-edge-in-the-spec-not-in-the-verifier -->
---
instruction_id: surface-the-omitted-edge-in-the-spec-not-in-the-verifier
title: "Surface the omitted edge in the spec, not in the verifier"
summary: "An edge the author never wrote down is invisible to any verifier, so it is surfaced as an explicit requirement before the code exists."
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: A requirement is written and its edge cases are not yet stated.
conditions_does_not_apply_when: The requirement already states its boundaries and empty cases.
artifact_contract_output_type: edge-requirement
artifact_contract_required_data:
  - the omitted edge
  - the requirement that now states it
  - the check that can enforce it
artifact_contract_verified_by: the edge exists as a written requirement before the implementation starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/edge-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Surface the omitted edge in the spec, not in the verifier
A goal-backward verifier only checks assertions that exist; an assertion only exists for a requirement that was written down.
The fix is not a better verifier or a confidence gate; confidence is uninformative across these regimes.
The fix is **spec completeness**: surface the omitted edge into an explicit, checkable assertion *before* any code exists, after which the verifier reliably catches it.
The differentiated move here is **placement, not technique**: apply the same edge taxonomy at the *spec* layer (front of pipeline, generating requirements)
<!-- vpmodule:atom:end surface-the-omitted-edge-in-the-spec-not-in-the-verifier -->
<!-- vpmodule:atom:begin walk-every-requirement-against-a-closed-edge-taxonomy -->
---
instruction_id: walk-every-requirement-against-a-closed-edge-taxonomy
title: Walk every requirement against a closed edge taxonomy
summary: "Every requirement is walked against a small fixed set of edge categories, and only the categories that apply to it are raised."
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: Requirements are written and their edge cases are checked.
conditions_does_not_apply_when: The work is not a specification of behavior.
artifact_contract_output_type: edge-taxonomy-walk
artifact_contract_required_data:
  - the requirement
  - the categories that apply to it
  - the candidate edge per category
artifact_contract_verified_by: every requirement was walked and only the applicable categories were raised
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/edge-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Walk every requirement against a closed edge taxonomy
Closed and small by design: a fixed eight the author must explicitly clear beats thirty nobody finishes.
Walk each requirement against the closed taxonomy below, propose a concrete candidate edge for each applicable category, and resolve each to exactly one state.
Relevance filter first. Classify each requirement's shape, then raise only the categories whose `applies to shapes` intersect that requirement's shapes.
A pure-text requirement is never asked about overflow.
Adopt the established QA names verbatim — this is decades-old black-box test technique, moved upstream to the spec layer.
<!-- vpmodule:atom:end walk-every-requirement-against-a-closed-edge-taxonomy -->