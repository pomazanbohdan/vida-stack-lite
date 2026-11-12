---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-core-tools-help-help-md-fcbcba70-c01"
title: "bmad-method: skills/bmod-core-tools/help/help.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmod-core-tools/help/help.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-core-tools/help/help.md\"}"
atom_ids:
  - go-to-the-upstream-documentation-when-the-local-help-runs-out
  - make-a-status-report-read-only-and-name-the-one-next-command
  - make-the-setup-step-safe-to-run-at-any-time
  - suggest-a-standalone-capability-without-making-it-required
atom_count: 4
atoms: "[{\"atom_id\":\"go-to-the-upstream-documentation-when-the-local-help-runs-out\",\"file_sha256\":\"0c1822edc88661b0783be2cea43b48d01f0c48cc012b37d18bf9d0d479e62d19\",\"content_sha256\":\"177616cfb3527c5b58fded68c3fff38dae7d9efba656f63b80c53bd1b7b8f768\",\"file_bytes\":1916,\"body_bytes\":429},{\"atom_id\":\"make-a-status-report-read-only-and-name-the-one-next-command\",\"file_sha256\":\"c1d140d42226cd6db61bb16d74f67e27a6c61e448b2637d07ce1d2dd89ea6a01\",\"content_sha256\":\"51c4bcd30c9116ea1f395442110f7db6b36670d894ab577989b03bf17f8f1428\",\"file_bytes\":1663,\"body_bytes\":434},{\"atom_id\":\"make-the-setup-step-safe-to-run-at-any-time\",\"file_sha256\":\"5525997d2095f3edb9b73dbe35b9cb8a09ffba93fd5daac1258c0a46cf666cef\",\"content_sha256\":\"14a185bc83245307fbc00945e95787c38b30d7aed28795dc5780d323d3eb82a2\",\"file_bytes\":1393,\"body_bytes\":222},{\"atom_id\":\"suggest-a-standalone-capability-without-making-it-required\",\"file_sha256\":\"e7580a4437f191511784abda4fe60a7467103bd5dafc72fa7464ef3cb664d4a3\",\"content_sha256\":\"1466390ff09d01f4272057cb5734a77cd8afb25e9914d5a02be83d4bccc1759d\",\"file_bytes\":1499,\"body_bytes\":263}]"
carrier_sha256: 37429bedc110f7f5fc37abc621a032b92c68e43a5b3ac45addddf975980aabf8
carrier_bytes: 7146
revision: 1
status: active
---
<!-- vpmodule:atom:begin go-to-the-upstream-documentation-when-the-local-help-runs-out -->
---
instruction_id: go-to-the-upstream-documentation-when-the-local-help-runs-out
title: Go to the upstream documentation when the local help runs out
summary: "When the help document, its topic files and the installed skills cannot answer the question, the documentation site is fetched, and the source repository it links to is the final authority on how anything actually behaves."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: "The local help, its topic files and the installed skills cannot answer the question."
conditions_does_not_apply_when: One of the local sources can answer the question.
artifact_contract_output_type: upstream-answer
artifact_contract_required_data:
  - the sources that were exhausted
  - the documentation page that answers the question
  - the upstream source that is the final authority
artifact_contract_verified_by: the answer is taken from the upstream documentation and names the source it came from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/help.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/research-documentation-lookup.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Go to the upstream documentation when the local help runs out
This document, its topic files, and the installed skills cannot answer,
fetch the documentation site
and follow the pages relevant to the question.
The source repository it links to is the final authority on how anything actually behaves.

Do not skip documentation lookups because MCP tools are unavailable - the CLI fallback works and produces equivalent output.
<!-- vpmodule:atom:end go-to-the-upstream-documentation-when-the-local-help-runs-out -->
<!-- vpmodule:atom:begin make-a-status-report-read-only-and-name-the-one-next-command -->
---
instruction_id: make-a-status-report-read-only-and-name-the-one-next-command
title: Make a status report read-only and name the one next command
summary: "A status report changes nothing; it says what is installed, what is missing or out of date, and the one command to run next."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: The state of an installation has to be reported.
conditions_does_not_apply_when: The report is meant to change the installation.
artifact_contract_output_type: status-report
artifact_contract_required_data:
  - what is installed
  - what is missing or out of date
  - the one next command
artifact_contract_verified_by: the report changes nothing and ends on exactly one command
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/help.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/list-seeds.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Make a status report read-only and name the one next command
The status command changes nothing.
It reports what is installed, what is missing or out of date, and the one command to run next.

The listing changes nothing: no listed item is modified.
An empty result is answered with the one command that creates the first item.
The summary states the total and the per-status counts, and the next actions are offered as plain text.
<!-- vpmodule:atom:end make-a-status-report-read-only-and-name-the-one-next-command -->
<!-- vpmodule:atom:begin make-the-setup-step-safe-to-run-at-any-time -->
---
instruction_id: make-the-setup-step-safe-to-run-at-any-time
title: Make the setup step safe to run at any time
summary: The setup step creates and repairs what is installed and asks the new configuration questions; it is safe to run again at any time and is recommended after anything is installed or updated.
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: "The installation is set up, repaired or checked."
conditions_does_not_apply_when: Nothing was installed and nothing was updated.
artifact_contract_output_type: setup-step
artifact_contract_required_data:
  - what the setup creates and repairs
  - the questions it asks once
  - when it is run again
artifact_contract_verified_by: the setup can be run at any time without changing an answer that was already given
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Make the setup step safe to run at any time
It creates and repairs
the shared scripts other skills call,
and asks each installed module's new configuration questions.
Recommend it after anything is installed or updated.
<!-- vpmodule:atom:end make-the-setup-step-safe-to-run-at-any-time -->
<!-- vpmodule:atom:begin suggest-a-standalone-capability-without-making-it-required -->
---
instruction_id: suggest-a-standalone-capability-without-making-it-required
title: Suggest a standalone capability without making it required
summary: "A capability that belongs to no phase stands alone and is suggested whenever it would help, before, during, after or entirely outside another flow; it is never presented as a required step."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A capability that stands outside any fixed sequence could help with the request in hand.
conditions_does_not_apply_when: The capability is a required step of the sequence being run.
artifact_contract_output_type: capability-suggestion
artifact_contract_required_data:
  - the capability
  - where in the flow it would help
  - that it is optional
artifact_contract_verified_by: the suggestion says when it helps and never says that it must be run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Suggest a standalone capability without making it required
Suggest one whenever it would help: before, during, after, or entirely outside another module's flow.
Each stands alone and works with or without any other module.
Never present one as a required step.
<!-- vpmodule:atom:end suggest-a-standalone-capability-without-making-it-required -->