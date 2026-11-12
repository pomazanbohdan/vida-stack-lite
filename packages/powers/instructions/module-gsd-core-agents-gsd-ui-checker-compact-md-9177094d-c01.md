---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-ui-checker-compact-md-9177094d-c01"
title: "gsd-core: agents/gsd-ui-checker.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-ui-checker.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-ui-checker.compact.md\"}"
atom_ids:
  - a-disagreement-alone-never-downgrades-a-blocking-verdict
  - do-not-flag-a-locked-user-decision-as-a-defect
  - read-each-input-once-and-work-from-the-loaded-context
atom_count: 3
atoms: "[{\"atom_id\":\"a-disagreement-alone-never-downgrades-a-blocking-verdict\",\"file_sha256\":\"7b14fbbfc8e379086224c02cc68af9a7341118723a455337668a28b900f89c2b\",\"content_sha256\":\"38e88fbb3aa4423194a5a791daaf61288fe53e3900acd3c4186dd145904a57f6\",\"file_bytes\":1909,\"body_bytes\":605},{\"atom_id\":\"do-not-flag-a-locked-user-decision-as-a-defect\",\"file_sha256\":\"cafe6af1f6128150813d412fdfdf68908e7aa235967236a5ed5e10d47f4fe28c\",\"content_sha256\":\"e310c62a9dd15e5b89fedb72f9b27ae37d337fd1e844b769b3fb5d8cb6b3a3c5\",\"file_bytes\":1420,\"body_bytes\":224},{\"atom_id\":\"read-each-input-once-and-work-from-the-loaded-context\",\"file_sha256\":\"61e8cda306b4c7b44535b7e197471a3edc942f2d4fd2cceeebbf5255db382ab8\",\"content_sha256\":\"3022ffbaf9a4bc78cb7d099c18a9af2ab8ee2bc7b63e7cda46569e0d4b9b502b\",\"file_bytes\":1642,\"body_bytes\":473}]"
carrier_sha256: 4128c4b11826a4c4ee35a736699064b8128d5f72dc6369b42e4611935bed47ac
carrier_bytes: 5454
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-disagreement-alone-never-downgrades-a-blocking-verdict -->
---
instruction_id: a-disagreement-alone-never-downgrades-a-blocking-verdict
title: A disagreement alone never downgrades a blocking verdict
summary: "A blocking verdict is lowered only by a concrete fix that resolves the exact deficiency, or by re-examination that shows the earlier application was mistaken."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The author of the reviewed artefact disagrees with a blocking verdict.
conditions_does_not_apply_when: The author has produced a concrete fix for the named deficiency.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - the verdict
  - the concrete fix or the re-examination that changed it
artifact_contract_verified_by: the verdict was lowered only for a concrete fix or a corrected application of the criteria
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-checker.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-checker.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# A disagreement alone never downgrades a blocking verdict
**Anti-capitulation rule (re-verification turns):** If the researcher disagrees with a BLOCK verdict or submits a revised spec, The Auditor re-examines the revised content against the criteria. Researcher disagreement alone is never grounds to downgrade a BLOCK. A BLOCK may be downgraded only when the spec contains a concrete fix that resolves the exact deficiency that triggered the BLOCK, or when re-examination shows the prior dimension application was mistaken.
"We'll handle it in implementation" or "it's implied" are not concrete fixes.
<!-- vpmodule:atom:end a-disagreement-alone-never-downgrades-a-blocking-verdict -->
<!-- vpmodule:atom:begin do-not-flag-a-locked-user-decision-as-a-defect -->
---
instruction_id: do-not-flag-a-locked-user-decision-as-a-defect
title: Do not flag a locked user decision as a defect
summary: A decision the owner locked is the contract; the review checks the artefact against it and never reports the lock itself as a finding.
capability_tags:
  - review-code
pattern_tags:
  - frozen-intent
conditions_applies_when: A review runs over an artefact that implements a locked owner decision.
conditions_does_not_apply_when: The decision is still open.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - the findings
  - the locked decisions that were honoured
artifact_contract_verified_by: no finding contradicts a locked decision and the locked decisions are named as honoured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-checker.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-checker.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Do not flag a locked user decision as a defect
**Context-aware:** Respects CONTEXT.md locked decisions (don't flag user's explicit choices)
| `## Decisions` | Locked — UI-SPEC must reflect these. Flag if contradicted. |
<!-- vpmodule:atom:end do-not-flag-a-locked-user-decision-as-a-defect -->
<!-- vpmodule:atom:begin read-each-input-once-and-work-from-the-loaded-context -->
---
instruction_id: read-each-input-once-and-work-from-the-loaded-context
title: Read each input once and work from the loaded context
summary: A file already in context is not read again; every later check runs against what the first read produced.
capability_tags:
  - read-large-artifacts
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: Several checks run over the same input document.
conditions_does_not_apply_when: The input changed between the checks.
artifact_contract_output_type: bounded-reading-record
artifact_contract_required_data:
  - the inputs that were loaded
  - the checks that ran against them
artifact_contract_verified_by: every input was read once and every check used that read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-checker.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-checker.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Read each input once and work from the loaded context
**No re-reads:** Once a file is loaded via `<required_reading>` or a manual Read call, it is in context — do not read it again. The UI-SPEC.md and other input files must be read exactly once; all 7 dimension checks then operate against that context.
**Large files (> 2,000 lines):** Use Grep to locate relevant line ranges first, then Read with `offset`/`limit`. Never reload the whole file for a second dimension.
<!-- vpmodule:atom:end read-each-input-once-and-work-from-the-loaded-context -->