---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-extract-learnings-md-1b355292-c01"
title: "gsd-core: gsd-core/workflows/extract-learnings.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/extract-learnings.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/extract-learnings.md\"}"
atom_ids:
  - degrade-an-absent-optional-integration-silently
  - never-fabricate-a-learning-or-a-sample
  - overwrite-the-record-instead-of-appending
  - require-the-core-artifacts-and-skip-the-optional-ones-gracefully
atom_count: 4
atoms: "[{\"atom_id\":\"degrade-an-absent-optional-integration-silently\",\"file_sha256\":\"c03076a7e179612834b1c5b7d5398e5c91e28d0e78a54c32159e72d7d6121f1a\",\"content_sha256\":\"0bf4d7e88541ad4d551b183e7e5bc8bbe7d6111c1fe8e267ed485d20d167031e\",\"file_bytes\":1525,\"body_bytes\":357},{\"atom_id\":\"never-fabricate-a-learning-or-a-sample\",\"file_sha256\":\"3fd3ea69b0a9b580b309618816aab67f436b6646c1d704ebfabb1f23d5465137\",\"content_sha256\":\"56eef3c95916f5270b508870adc67419227c6ef64af36dfe511aeb060c402ee6\",\"file_bytes\":1486,\"body_bytes\":342},{\"atom_id\":\"overwrite-the-record-instead-of-appending\",\"file_sha256\":\"3e8471efb7a39793235485f81390fa7378b987682ba61a330d2e0b2e69b3b022\",\"content_sha256\":\"5819a70e5014f8fc583bda7b369354611e4a58c3d21bb8ccd2bfca9ea7144aaf\",\"file_bytes\":1268,\"body_bytes\":234},{\"atom_id\":\"require-the-core-artifacts-and-skip-the-optional-ones-gracefully\",\"file_sha256\":\"633622ad36036b59f8b0fe52284a568a268969aaaedd126219b50d80f81b3e84\",\"content_sha256\":\"9fbffc9e8c7adb08fb5cfcc3b2ad682b4fae301d83816013c73850baa9cca916\",\"file_bytes\":1680,\"body_bytes\":437}]"
carrier_sha256: 7d9faa346f3c34f54a02ec1710af6ef3735de9aa4c12306f0817c210fb64eb75
carrier_bytes: 6570
revision: 1
status: active
---
<!-- vpmodule:atom:begin degrade-an-absent-optional-integration-silently -->
---
instruction_id: degrade-an-absent-optional-integration-silently
title: Degrade an absent optional integration silently
summary: "An optional integration that is not present is a silent no-op: the step is skipped without a warning and without a failure, and the primary output stays."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A workflow step calls an integration that may not be installed.
conditions_does_not_apply_when: The integration is present and used.
artifact_contract_output_type: optional-integration-outcome
artifact_contract_required_data:
  - the integration that was looked for
  - whether it was present
  - the primary output
artifact_contract_verified_by: the run neither warned nor failed and the primary output was produced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Degrade an absent optional integration silently
If no such tool is present, the step is a silent no-op
If not available (no MCP server in the session exposes this tool, or the runtime does not support it), skip the step silently and continue.
The workflow must not fail or warn — this is expected behavior for users who do not run a knowledge-base MCP.
<!-- vpmodule:atom:end degrade-an-absent-optional-integration-silently -->
<!-- vpmodule:atom:begin never-fabricate-a-learning-or-a-sample -->
---
instruction_id: never-fabricate-a-learning-or-a-sample
title: Never fabricate a learning or a sample
summary: "Only what the artefacts state is extracted; a phase that carries no estimate or no actuals is skipped rather than guessed, because a fabricated sample would steer every later estimate."
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - evidence-analysis
conditions_applies_when: The artefacts are read and the items are extracted or counted.
conditions_does_not_apply_when: Nothing is extracted or counted.
artifact_contract_output_type: extraction-report
artifact_contract_required_data:
  - the items that were extracted
  - the samples that were skipped
  - the sample count and the confidence
artifact_contract_verified_by: no item and no sample was invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never fabricate a learning or a sample
Do not fabricate learnings — only extract what is explicitly documented in artifacts
Phases missing either side are skipped rather than guessed: a fabricated sample would steer every future estimate.
The verb rebuilds from scratch each run, so it is safe to re-run and never accumulates duplicates.
<!-- vpmodule:atom:end never-fabricate-a-learning-or-a-sample -->
<!-- vpmodule:atom:begin overwrite-the-record-instead-of-appending -->
---
instruction_id: overwrite-the-record-instead-of-appending
title: Overwrite the record instead of appending
summary: "The learning record of a phase is replaced, never appended to, so running the extraction twice yields the same document."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The learning record of a phase already exists.
conditions_does_not_apply_when: The record is written for the first time.
artifact_contract_output_type: learnings-record
artifact_contract_required_data:
  - the path of the record
  - the fact that it was replaced
artifact_contract_verified_by: "the record contains one extraction, not two"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Overwrite the record instead of appending
If a previous LEARNINGS.md exists, overwrite it (replace the file entirely).
Running extract-learnings twice on the same phase must overwrite (replace) the previous LEARNINGS.md, not append
<!-- vpmodule:atom:end overwrite-the-record-instead-of-appending -->
<!-- vpmodule:atom:begin require-the-core-artifacts-and-skip-the-optional-ones-gracefully -->
---
instruction_id: require-the-core-artifacts-and-skip-the-optional-ones-gracefully
title: Require the core artifacts and skip the optional ones gracefully
summary: "The plan and summary documents are required and their absence stops the extraction; the verification, acceptance-test and state documents are read when they exist and their absence is recorded."
capability_tags:
  - curate-context
pattern_tags:
  - empty-result-policy
conditions_applies_when: A learnings extraction starts and the artefacts are collected.
conditions_does_not_apply_when: The extraction was already run.
artifact_contract_output_type: artifact-availability-report
artifact_contract_required_data:
  - the required artefacts that were found
  - the optional artefacts that were missing
artifact_contract_verified_by: the missing optional artefacts are recorded and the extraction stopped only on a missing core artefact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Require the core artifacts and skip the optional ones gracefully
Read the phase artifacts. PLAN.md and SUMMARY.md are required; VERIFICATION.md, UAT.md, and STATE.md are optional.
If PLAN.md or SUMMARY.md files are not found or missing, exit with error: "Required artifacts missing. PLAN.md and SUMMARY.md are required for learning extraction."
Track which optional artifacts are missing for the `missing_artifacts` frontmatter field.
<!-- vpmodule:atom:end require-the-core-artifacts-and-skip-the-optional-ones-gracefully -->