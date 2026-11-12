---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-lifecycle-md-3111b8d3-c01"
title: "bmad-method: skills/bmad-deep-recon/references/lifecycle.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-deep-recon/references/lifecycle.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/lifecycle.md\"}"
atom_ids:
  - deepen-one-slice-and-say-when-it-changes-no-conclusion
  - refresh-by-re-verifying-only-the-stale-claims
atom_count: 2
atoms: "[{\"atom_id\":\"deepen-one-slice-and-say-when-it-changes-no-conclusion\",\"file_sha256\":\"2c8d1d4ae1b6a0228a4d12549f19cc3440621ed3af90a10125db9a3d8220dcd8\",\"content_sha256\":\"1335980cedd168612ebda964d1310569d83708184b16d509c401c7d649c4bb2b\",\"file_bytes\":1489,\"body_bytes\":326},{\"atom_id\":\"refresh-by-re-verifying-only-the-stale-claims\",\"file_sha256\":\"46be21192c5a9b3f09d9d56d61e72b85c3c98d2e89013096e0fe7c21ea19f5e1\",\"content_sha256\":\"7c090c23f99550f5e8f5ea9b1398408ab43ce253612c28178530d8cde3af13f1\",\"file_bytes\":1788,\"body_bytes\":581}]"
carrier_sha256: 465e68fbed784fb96127036474ba2ba9890d1dfccd10993b2dc13ea42151f19f
carrier_bytes: 3590
revision: 1
status: active
---
<!-- vpmodule:atom:begin deepen-one-slice-and-say-when-it-changes-no-conclusion -->
---
instruction_id: deepen-one-slice-and-say-when-it-changes-no-conclusion
title: Deepen one slice and say when it changes no conclusion
summary: "One dimension is drilled into behind a small gate and merged back, and the report says so when the new material changes no conclusion."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: An existing report needs one dimension deepened.
conditions_does_not_apply_when: The whole report is being redone.
artifact_contract_output_type: deepen-delta
artifact_contract_required_data:
  - the slice deepened
  - the sections the new material affected
  - the statement that no conclusion changed
artifact_contract_verified_by: only the affected sections were touched and a deepening that changed no conclusion says so
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/lifecycle.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Deepen one slice and say when it changes no conclusion
Drill into one dimension or add a new one without touching the rest: mini plan gate, acquire → verify for that slice only
- merge into `<folder name>.md`, update only the synthesis sections the new material affects — a deepening that changes no conclusion says so.
<!-- vpmodule:atom:end deepen-one-slice-and-say-when-it-changes-no-conclusion -->
<!-- vpmodule:atom:begin refresh-by-re-verifying-only-the-stale-claims -->
---
instruction_id: refresh-by-re-verifying-only-the-stale-claims
title: Refresh by re-verifying only the stale claims
summary: "The stale claims are computed from the ledger, confirmed in one exchange, and re-checked on their own; the result is a delta appended to the report."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An existing report is older than the freshness of its claims.
conditions_does_not_apply_when: The report was written moments ago.
artifact_contract_output_type: refresh-delta
artifact_contract_required_data:
  - the stale claims
  - "the delta of confirmed, changed and overturned claims"
  - the warning for an overturned load-bearing claim
artifact_contract_verified_by: only the stale claims were re-checked and the delta is appended with the update date bumped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/lifecycle.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Refresh by re-verifying only the stale claims
Read `<folder name>.md` and `.memlog.md` — never re-research from scratch.
- Build the refresh set mechanically: assemble the claims (`claim`, `class`, `pub_date`) from the ledger, map the pack’s freshness bars to a months-per-class JSON
- the stale flags are the candidate set. Confirm it in one exchange, re-verify just those claims, and deliver a **delta report** (confirmed / changed / overturned, new sources)
- An overturned load-bearing claim triggers an explicit warning naming the downstream artifacts that consumed it.
<!-- vpmodule:atom:end refresh-by-re-verifying-only-the-stale-claims -->