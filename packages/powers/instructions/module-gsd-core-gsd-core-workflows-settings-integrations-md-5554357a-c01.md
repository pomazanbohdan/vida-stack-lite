---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-settings-integrations-md-5554357a-c01"
title: "gsd-core: gsd-core/workflows/settings-integrations.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/settings-integrations.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/settings-integrations.md\"}"
atom_ids:
  - mask-a-secret-everywhere-you-show-it
  - validate-a-user-supplied-key-before-writing-it
  - write-the-list-as-a-list-not-as-a-joined-string
atom_count: 3
atoms: "[{\"atom_id\":\"mask-a-secret-everywhere-you-show-it\",\"file_sha256\":\"18e30c15ec79ee407b53cb9526db2a042e311fea32b86b0445f1f138e446ce1d\",\"content_sha256\":\"b3ef4c1134d541c9617755829bbbbdd59011cc7d332bce42a1a6aaa3edb2fa79\",\"file_bytes\":1449,\"body_bytes\":370},{\"atom_id\":\"validate-a-user-supplied-key-before-writing-it\",\"file_sha256\":\"994a72dd7f835bfc2679b78a22b058176aa412eef3dddc3d64cc90662e8aa72f\",\"content_sha256\":\"c41e11c6c9ba62763a35a1085627286c99496d04518ed025d83575f7af1761d7\",\"file_bytes\":1623,\"body_bytes\":415},{\"atom_id\":\"write-the-list-as-a-list-not-as-a-joined-string\",\"file_sha256\":\"dc5adabc2ea861bda35dc66235aa21483225c7eea4e7e5c747ce262f258f393f\",\"content_sha256\":\"f50d201b687333735b48c4dc9dd2801718c98be0a556859e49f9f7772703b143\",\"file_bytes\":1294,\"body_bytes\":255}]"
carrier_sha256: ff78b22023c1987e3cd3f80191e2666dea71abba4f612b4b1fdc6ab5d97521dc
carrier_bytes: 4797
revision: 1
status: active
---
<!-- vpmodule:atom:begin mask-a-secret-everywhere-you-show-it -->
---
instruction_id: mask-a-secret-everywhere-you-show-it
title: Mask a secret everywhere you show it
summary: "A secret is never displayed, echoed or logged; where it is shown it is masked, a short secret is masked without a tail, and an unset value shows as unset."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: A secret is written to a configuration and later shown to a person.
conditions_does_not_apply_when: The value is not a secret.
artifact_contract_output_type: masked-secret-view
artifact_contract_required_data:
  - the masked value
  - the unset marker
artifact_contract_verified_by: "no plaintext secret appears in any question, table or log"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-integrations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Mask a secret everywhere you show it
The UI must never display, echo, or log the plaintext value
Strings shorter than 8 characters render as `****` with no tail so a short secret does not leak a meaningful fraction of its bytes
Unset values render as `(unset)`
Plaintext is not echoed back by this workflow, not written to any log, and not displayed in error messages
<!-- vpmodule:atom:end mask-a-secret-everywhere-you-show-it -->
<!-- vpmodule:atom:begin validate-a-user-supplied-key-before-writing-it -->
---
instruction_id: validate-a-user-supplied-key-before-writing-it
title: Validate a user-supplied key before writing it
summary: "A key the user supplies is checked against a closed shape before any write, and a namespace that comes from a registry is closed: a key that merely looks right does not make it writable."
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A user-supplied name becomes a key in a configuration namespace.
conditions_does_not_apply_when: The name is chosen from a fixed list the interface offers.
artifact_contract_output_type: key-validation
artifact_contract_required_data:
  - the key
  - the shape it was checked against
  - the rejection
artifact_contract_verified_by: the rejected key was refused before any write and the registry-derived namespace accepted nothing else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-integrations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Validate a user-supplied key before writing it
slug inputs are checked against `^[a-zA-Z0-9_-]+$` before any write
inputs containing path separators
whitespace, or shell metacharacters are rejected
This closes off skill-injection attacks on that open namespace (dynamic key pattern)
the gate is membership in the closed, registry-derived settable set
slug shape alone never makes a `review.models.*` key writable
<!-- vpmodule:atom:end validate-a-user-supplied-key-before-writing-it -->
<!-- vpmodule:atom:begin write-the-list-as-a-list-not-as-a-joined-string -->
---
instruction_id: write-the-list-as-a-list-not-as-a-joined-string
title: "Write the list as a list, not as a joined string"
summary: "A list is written as a list: the reader never splits a string, so a joined value would be stored as one entry and would silently fail to resolve."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A setting holds several values.
conditions_does_not_apply_when: The setting holds one value.
artifact_contract_output_type: written-list
artifact_contract_required_data:
  - the entries
  - the form they were written in
artifact_contract_verified_by: the value is a list of entries and not one joined string
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-integrations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write the list as a list, not as a joined string
the resolver never splits strings, so a comma-joined string would be stored as ONE skill path that silently fails resolution
Split on commas, trim each entry, drop empty entries
write the JSON array form
<!-- vpmodule:atom:end write-the-list-as-a-list-not-as-a-joined-string -->