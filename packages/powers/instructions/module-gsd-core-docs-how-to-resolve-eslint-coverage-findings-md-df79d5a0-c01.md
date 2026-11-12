---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-eslint-coverage-findings-md-df79d5a0-c01"
title: "gsd-core: docs/how-to/resolve-eslint-coverage-findings.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/resolve-eslint-coverage-findings.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-eslint-coverage-findings.md\"}"
atom_ids:
  - delete-a-stale-exemption
  - make-an-exemption-cost-a-sentence
  - never-downgrade-a-rule-to-make-a-new-file-pass
atom_count: 3
atoms: "[{\"atom_id\":\"delete-a-stale-exemption\",\"file_sha256\":\"3bf1c8cf2fa575c4dec7e127a987afa9ab386c6cdc044ee4d89851b31028f40e\",\"content_sha256\":\"13697843a0dfd7ff64daeda003ba066d7f3a671f2119411ba73d5190bb43827c\",\"file_bytes\":1290,\"body_bytes\":247},{\"atom_id\":\"make-an-exemption-cost-a-sentence\",\"file_sha256\":\"b07ac928544c754c196f8dfb65e66a6db081b84b61ec2cdddeb975da3cc16724\",\"content_sha256\":\"d9a383a0dfc89fe5824536c38660bf04080238493564c8584f13fcf2d5f55899\",\"file_bytes\":1530,\"body_bytes\":497},{\"atom_id\":\"never-downgrade-a-rule-to-make-a-new-file-pass\",\"file_sha256\":\"bf1203a28bfe9a4a66e129032c5806c8385f3c8c754f075f5520733519c4097e\",\"content_sha256\":\"3ce3d947d0d781771ca8d243c690d6c040abe9a3cb70b6c0aaa482b033e599c8\",\"file_bytes\":1595,\"body_bytes\":455}]"
carrier_sha256: 33e55b13137845879a0eed6ca4f7413e94f502af300b74bb01b167ea40799846
carrier_bytes: 4794
revision: 1
status: active
---
<!-- vpmodule:atom:begin delete-a-stale-exemption -->
---
instruction_id: delete-a-stale-exemption
title: Delete a stale exemption
summary: An exemption whose subject now resolves to rules is dead weight; the exemption list only ratchets down.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - technical-debt
conditions_applies_when: An exemption is reported as obsolete because its subject now resolves to rules.
conditions_does_not_apply_when: The exemption still covers a subject that resolves to no rules.
artifact_contract_output_type: exemption-cleanup
artifact_contract_required_data:
  - the stale entry that was deleted
artifact_contract_verified_by: the stale entry is gone and the exemption list holds no dead entries
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-eslint-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Delete a stale exemption
`allowlist_stale` means an allowlisted file now resolves to rules — someone widened a glob and the exemption became dead weight. **Delete the entry.**
The allowlist only ratchets down; it can never quietly accumulate.
<!-- vpmodule:atom:end delete-a-stale-exemption -->
<!-- vpmodule:atom:begin make-an-exemption-cost-a-sentence -->
---
instruction_id: make-an-exemption-cost-a-sentence
title: Make an exemption cost a sentence
summary: An exemption needs a permanent written reason; a promise to get to it later is not a reason.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - decision-trail
conditions_applies_when: A file or a site has to be exempted from a check.
conditions_does_not_apply_when: The file can be brought under the rule and needs no exemption.
artifact_contract_output_type: exemption-record
artifact_contract_required_data:
  - the exempted path
  - the permanent reason
artifact_contract_verified_by: the exemption carries a non-empty reason and the reason survives scrutiny
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-eslint-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make an exemption cost a sentence
The `reason` is **structurally required** — an entry with a missing, empty, or whitespace-only reason fails the guard.
That is deliberate. The easy way to make a coverage metric look good is to add an exemption, so an exemption has to cost you a sentence you are willing to sign.
⚠️ **"Not linted yet" is not a reason.** An allowlist entry meaning *we will get to it* is a TODO wearing an exemption's badge, and it will outlive everyone who remembers it.
<!-- vpmodule:atom:end make-an-exemption-cost-a-sentence -->
<!-- vpmodule:atom:begin never-downgrade-a-rule-to-make-a-new-file-pass -->
---
instruction_id: never-downgrade-a-rule-to-make-a-new-file-pass
title: Never downgrade a rule to make a new file pass
summary: A file that no rule covers is not linted at all; lowering a rule severity turns a real finding into a silent one.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A newly covered file trips a rule and the finding is inconvenient.
conditions_does_not_apply_when: The file is covered by a rule block that already applies to it.
artifact_contract_output_type: rule-coverage-decision
artifact_contract_required_data:
  - the file
  - the rule block that covers it
  - the severity that is kept
artifact_contract_verified_by: the file resolves to rules and no rule severity was lowered to pass it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-eslint-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never downgrade a rule to make a new file pass
ESLint assigns rules by `files:` glob. A file matching **no** glob is not "linted and clean" — it is **not linted at all**, and ESLint reports nothing about it. There is no warning, no summary line, no exit code. The failure is perfectly silent.
Do not downgrade a rule's severity to make a new file pass — that converts a real finding into a silent one, which is the failure this guard exists to end.
<!-- vpmodule:atom:end never-downgrade-a-rule-to-make-a-new-file-pass -->