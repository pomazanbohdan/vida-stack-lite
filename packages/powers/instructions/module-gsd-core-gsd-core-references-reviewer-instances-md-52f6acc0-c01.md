---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-reviewer-instances-md-52f6acc0-c01"
title: "gsd-core: gsd-core/references/reviewer-instances.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/reviewer-instances.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/reviewer-instances.md\"}"
atom_ids:
  - flag-a-shared-adapter-consensus-as-cross-model-not-cross-tool
  - never-drop-an-unknown-reviewer-silently
  - stop-on-an-unknown-reviewer-name-instead-of-dropping-it
atom_count: 3
atoms: "[{\"atom_id\":\"flag-a-shared-adapter-consensus-as-cross-model-not-cross-tool\",\"file_sha256\":\"ea034e3b4260bb5f7d69132db9e7c2e2b426e68ff081b068d69670798bbc1612\",\"content_sha256\":\"8136367ca43b705040c785f6fcc041485f1e72480bd8049648d806461debaf52\",\"file_bytes\":1329,\"body_bytes\":252},{\"atom_id\":\"never-drop-an-unknown-reviewer-silently\",\"file_sha256\":\"a4ef7166ea8641e3d2132b9596782006cdef5815dd433a8c04f81408dfce8956\",\"content_sha256\":\"8a0d71e8f287c41867816ab8da4627d8a2db7a6d3a30aefad9c0c58d4a61835a\",\"file_bytes\":1635,\"body_bytes\":548},{\"atom_id\":\"stop-on-an-unknown-reviewer-name-instead-of-dropping-it\",\"file_sha256\":\"fb57e56373898f938ac6b85d32af7c2028a475ee73ecfdf4461606d26ead3584\",\"content_sha256\":\"a1208caea91e417a3fa9b86f66e66f3a0bca76f113dd53e3bd190e7b46aaa883\",\"file_bytes\":1322,\"body_bytes\":222}]"
carrier_sha256: b091f6679f4588d5d90d760cc9484496837d3e2184e023efa202d1ff0ee0acd2
carrier_bytes: 4769
revision: 1
status: active
---
<!-- vpmodule:atom:begin flag-a-shared-adapter-consensus-as-cross-model-not-cross-tool -->
---
instruction_id: flag-a-shared-adapter-consensus-as-cross-model-not-cross-tool
title: "Flag a shared-adapter consensus as cross-model, not cross-tool"
summary: "When several reviewers run through the same adapter, the report says the consensus is cross-model and not cross-tool."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Two or more invoked reviewers share the same base adapter.
conditions_does_not_apply_when: Every reviewer runs on a different adapter.
artifact_contract_output_type: consensus-caveat
artifact_contract_required_data:
  - the reviewers that share the adapter
  - the one-line caveat
artifact_contract_verified_by: the caveat is printed before the first section
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/reviewer-instances.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Flag a shared-adapter consensus as cross-model, not cross-tool
when ≥2 invoked instances share the same base `cli`, print a one-line caveat immediately after the frontmatter (before the first section)
their consensus is cross-model, not cross-tool
<!-- vpmodule:atom:end flag-a-shared-adapter-consensus-as-cross-model-not-cross-tool -->
<!-- vpmodule:atom:begin never-drop-an-unknown-reviewer-silently -->
---
instruction_id: never-drop-an-unknown-reviewer-silently
title: Never drop an unknown reviewer silently
summary: "A reviewer entry that is neither a configured instance nor a known built-in is a hard error that is reported, never silently dropped."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review resolves the list of reviewers it will run.
conditions_does_not_apply_when: Every entry resolves to a configured instance or a known built-in.
artifact_contract_output_type: reviewer-resolution
artifact_contract_required_data:
  - the entry that did not resolve
  - the error that was raised
artifact_contract_verified_by: the unresolved entry was reported instead of dropped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/reviewer-instances.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never drop an unknown reviewer silently
An entry that is NEITHER a defined instance NOR a built-in slug is a **hard error** (likely a typo'd instance name) - stop and report it. Do NOT silently drop it.
Instances participate ONLY via
the default reviewers. They never appear under `--all` or explicit `--<cli>` flags, and there are no per-instance CLI flags.
An instance is **available** iff its base `cli` is detected
`model`/`agent`/instance-name are opaque: pass them as separate argv elements. They are NEVER interpolated into shell strings.
<!-- vpmodule:atom:end never-drop-an-unknown-reviewer-silently -->
<!-- vpmodule:atom:begin stop-on-an-unknown-reviewer-name-instead-of-dropping-it -->
---
instruction_id: stop-on-an-unknown-reviewer-name-instead-of-dropping-it
title: Stop on an unknown reviewer name instead of dropping it
summary: "A reviewer entry that is neither a defined instance nor a built-in is a hard error that is reported, not silently dropped."
capability_tags:
  - harden-validation
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A reviewer roster names an entry that resolves to nothing known.
conditions_does_not_apply_when: The entry resolves to a defined instance or a built-in.
artifact_contract_output_type: roster-error
artifact_contract_required_data:
  - the unknown entry
  - the error that was raised
artifact_contract_verified_by: the unknown entry was reported as an error and the run stopped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/reviewer-instances.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stop on an unknown reviewer name instead of dropping it
An entry that is NEITHER a defined instance NOR a built-in slug is a **hard error** (likely a typo'd instance name) — stop and report it. Do NOT silently drop it
<!-- vpmodule:atom:end stop-on-an-unknown-reviewer-name-instead-of-dropping-it -->