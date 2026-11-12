---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-interface-versioning-policy-md-e3229073-c01"
title: "gsd-core: docs/explanation/interface-versioning-policy.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/explanation/interface-versioning-policy.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/interface-versioning-policy.md\"}"
atom_ids:
  - assert-the-negotiated-version-in-the-consumers-test
  - keep-the-deprecation-window-before-removing-a-value
atom_count: 2
atoms: "[{\"atom_id\":\"assert-the-negotiated-version-in-the-consumers-test\",\"file_sha256\":\"a2d054fbc72b776e05c78e799f6508ca49be94429838b98e4a87e7f9dda7e4a6\",\"content_sha256\":\"cf676b391217ca2cc194b2c17237ab69c59a972b2d855c0abb97735b74d96b44\",\"file_bytes\":1416,\"body_bytes\":211},{\"atom_id\":\"keep-the-deprecation-window-before-removing-a-value\",\"file_sha256\":\"234fca9a3cf75d0e797637bcec3c2e08c25c7074957e5a89d9d0e96776372152\",\"content_sha256\":\"1b71d36e7d8752802db5a1d1d3f4a7e632e66471ff56e17446d51d6285b0c35c\",\"file_bytes\":1580,\"body_bytes\":333}]"
carrier_sha256: f86286647f5efe5c50971c27392cb2932bb48e854c2bd44cb1f29134beed29df
carrier_bytes: 3315
revision: 1
status: active
---
<!-- vpmodule:atom:begin assert-the-negotiated-version-in-the-consumers-test -->
---
instruction_id: assert-the-negotiated-version-in-the-consumers-test
title: "Assert the negotiated version in the consumer's test"
summary: "A consumer pins the version it targets and asserts on it in its own test, and treats an unknown value as additive instead of crashing."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A consumer of a published interface is being written or upgraded.
conditions_does_not_apply_when: The consumer never negotiates a version because the interface is not versioned.
artifact_contract_output_type: version-assertion
artifact_contract_required_data:
  - the pinned version
  - "the assertion in the consumer's test"
  - the treatment of an unknown value
artifact_contract_verified_by: "the consumer pins the version, asserts it, and ignores unknown values"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/interface-versioning-policy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Assert the negotiated version in the consumer's test
- Pin to a `PROTOCOL_VERSION` and assert on it in your host-plugin's test.
- Treat unknown axis values / adapter options as additive (ignore, don't crash).
<!-- vpmodule:atom:end assert-the-negotiated-version-in-the-consumers-test -->
<!-- vpmodule:atom:begin keep-the-deprecation-window-before-removing-a-value -->
---
instruction_id: keep-the-deprecation-window-before-removing-a-value
title: Keep the deprecation window before removing a value
summary: "A value that is on its way out keeps working for at least one release cycle, is marked with its successor and its removal version, and the sentinel that means unknown is never deprecated."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A published value or shape is being taken out of a contract.
conditions_does_not_apply_when: The value was never published and no consumer can depend on it.
artifact_contract_output_type: deprecation-window
artifact_contract_required_data:
  - the deprecated value
  - the window it stays usable for
  - its successor and removal version
artifact_contract_verified_by: the value stayed usable for the window and was marked with its successor
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/interface-versioning-policy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the deprecation window before removing a value
- A value or adapter shape is **deprecated**, not removed, for at least **one minor release cycle**.
- The old form still works at its declared version.
- The `undocumented` sentinel is never deprecated — it is the permanent fail-closed fallback for a host that omits an axis.
<!-- vpmodule:atom:end keep-the-deprecation-window-before-removing-a-value -->