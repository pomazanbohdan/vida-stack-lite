---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-scripts-changeset-readme-md-4f4c6598-c01"
title: "gsd-core: scripts/changeset/README.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:scripts/changeset/README.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"scripts/changeset/README.md\"}"
atom_ids:
  - give-machine-consumers-a-structured-error-channel
  - reject-a-malformed-bound-rather-than-guessing-at-it
  - treat-an-empty-range-as-a-result-not-a-failure
atom_count: 3
atoms: "[{\"atom_id\":\"give-machine-consumers-a-structured-error-channel\",\"file_sha256\":\"b27826f88f8c9ced478073059053a96322d0dbfce840df8eb621b5bc19b9174e\",\"content_sha256\":\"728d02e01b9dc81f06af0b684bb0c62b88b63190c829bd20978c8eaf0ae48e9f\",\"file_bytes\":1432,\"body_bytes\":279},{\"atom_id\":\"reject-a-malformed-bound-rather-than-guessing-at-it\",\"file_sha256\":\"d6508666bd61174577e22517c125e8b71ed0654c2eb2583cd64bbd921f83f3c6\",\"content_sha256\":\"9dc46d9f9540108c48de42cb50d77702d9c1eb3f98334d3e443d430c6009e2d4\",\"file_bytes\":1407,\"body_bytes\":288},{\"atom_id\":\"treat-an-empty-range-as-a-result-not-a-failure\",\"file_sha256\":\"6d1d7bd616c9f76160236aab887b33093cbfb89527bfc8e917ba264851e3d3cd\",\"content_sha256\":\"c158193dca5cb1461c2d87fdecf7dfff94b15011699f197741d88c98e37e0d4f\",\"file_bytes\":1313,\"body_bytes\":231}]"
carrier_sha256: 240f899df9eac095ddecc2561411df8101a69dabb369f59de1cacc91d96eb435
carrier_bytes: 4617
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-machine-consumers-a-structured-error-channel -->
---
instruction_id: give-machine-consumers-a-structured-error-channel
title: Give machine consumers a structured error channel
summary: "A tool that a program calls returns its failures in a structured form, so the caller reads the error instead of parsing the text mode or guessing from the exit code."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A tool is being built for a program that will call it.
conditions_does_not_apply_when: The tool is only ever read by a person.
artifact_contract_output_type: structured-error-channel
artifact_contract_required_data:
  - the structured error field
  - the exit code that accompanies it
  - what the text mode writes
artifact_contract_verified_by: the machine consumer received a structured error and the exit code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=scripts/changeset/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give machine consumers a structured error channel
- **In default (text) mode, a failure is signalled by the exit code alone** — exit `1` from invalid semver or a missing changelog writes nothing to stdout. Machine consumers should pass `--json` to receive the `error` field.
<!-- vpmodule:atom:end give-machine-consumers-a-structured-error-channel -->
<!-- vpmodule:atom:begin reject-a-malformed-bound-rather-than-guessing-at-it -->
---
instruction_id: reject-a-malformed-bound-rather-than-guessing-at-it
title: Reject a malformed bound rather than guessing at it
summary: "A bound that is not exactly what was asked for is refused with a structured error, because guessing would silently select a different set."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A bound is parsed and it is not in the accepted form.
conditions_does_not_apply_when: The bound is exactly in the accepted form.
artifact_contract_output_type: strict-bound-validation
artifact_contract_required_data:
  - the accepted form
  - what a guess would select instead
  - how the refusal is reported
artifact_contract_verified_by: the malformed bound was refused and the set was not silently changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=scripts/changeset/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject a malformed bound rather than guessing at it
- Strict validation is deliberate. Coercing a malformed bound such as `1.42.x` to `1.42.0` would silently change which releases the range selects, so a malformed bound is rejected early with a structured error rather than guessed at.
<!-- vpmodule:atom:end reject-a-malformed-bound-rather-than-guessing-at-it -->
<!-- vpmodule:atom:begin treat-an-empty-range-as-a-result-not-a-failure -->
---
instruction_id: treat-an-empty-range-as-a-result-not-a-failure
title: "Treat an empty range as a result, not a failure"
summary: "A query that matched nothing is an answer: the request was understood and the result is empty, and it is not reported as an error."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A query returns a set and the set is empty.
conditions_does_not_apply_when: The query could not be understood at all.
artifact_contract_output_type: empty-range-result
artifact_contract_required_data:
  - the query that was understood
  - the empty result
  - what the caller is told
artifact_contract_verified_by: the empty result was reported as a result and not as a failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=scripts/changeset/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat an empty range as a result, not a failure
- **Treat exit `2` as "empty range", not "failure".** For a well-formed invocation it means the request was understood and simply matched nothing — do not surface it as an error.
<!-- vpmodule:atom:end treat-an-empty-range-as-a-result-not-a-failure -->