---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-state-md-md-dc977524-c01"
title: "gsd-core: docs/reference/state-md.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/reference/state-md.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/state-md.md\"}"
atom_ids:
  - keep-the-state-file-a-digest-not-an-archive
  - overwrite-the-single-valued-section-instead-of-appending-to-it
  - report-unknown-rather-than-a-wrong-answer
atom_count: 3
atoms: "[{\"atom_id\":\"keep-the-state-file-a-digest-not-an-archive\",\"file_sha256\":\"060cd45496a23017a27717b5976ddd8cafb5bd74473d692a8d76537e999141a2\",\"content_sha256\":\"17811a5289226767c43c34e2ca16f9ce4680aca3973fa66fc603d1c25a785c87\",\"file_bytes\":1447,\"body_bytes\":320},{\"atom_id\":\"overwrite-the-single-valued-section-instead-of-appending-to-it\",\"file_sha256\":\"d54d6769b02faa58e5c4827e5f60e6868444aa0699086ec14c5260c887996a94\",\"content_sha256\":\"083f03d2b9399eafad2f0ae190c593f5b7efbca1262ee9845f8eca449dc04529\",\"file_bytes\":1482,\"body_bytes\":328},{\"atom_id\":\"report-unknown-rather-than-a-wrong-answer\",\"file_sha256\":\"488abf990212108a9a6ff2b3571253c2bfc72c237cdaac8ed77e47eea08dc0b4\",\"content_sha256\":\"298fc0965e3000816d2f1136dd19ba97d2b4fe1105be944928785a34eb2f8eca\",\"file_bytes\":1337,\"body_bytes\":191}]"
carrier_sha256: 4fbad72e7d6d2594656dd9acb49a1ecd591a13674afbfdc10a5d2fe424213cc3
carrier_bytes: 4731
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-state-file-a-digest-not-an-archive -->
---
instruction_id: keep-the-state-file-a-digest-not-an-archive
title: "Keep the state file a digest, not an archive"
summary: A state file stays a small digest of where the work stands; the history accumulates in the section that is designed to grow.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A state file that records the current position is being written.
conditions_does_not_apply_when: The file is the archive itself and is meant to carry the history.
artifact_contract_output_type: state-digest
artifact_contract_required_data:
  - the current position
  - the section that carries the growing history
artifact_contract_verified_by: the file holds the current position only and the history lives in the section designed to grow
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/state-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Keep the state file a digest, not an archive
- The file is intentionally small (target: under 100 lines). It is a digest of the project's state, not an archive.
- Progress *history* does not belong here. It accumulates in [`### Performance Metrics`](#performance-metrics) below, which is the section designed to grow.
<!-- vpmodule:atom:end keep-the-state-file-a-digest-not-an-archive -->
<!-- vpmodule:atom:begin overwrite-the-single-valued-section-instead-of-appending-to-it -->
---
instruction_id: overwrite-the-single-valued-section-instead-of-appending-to-it
title: Overwrite the single-valued section instead of appending to it
summary: "A section whose fields hold one value each is replaced, not appended to; a second value for the same field is malformed input, not history."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The current-position section of a state file is being written.
conditions_does_not_apply_when: The section is a running log of positions.
artifact_contract_output_type: single-valued-section
artifact_contract_required_data:
  - the section that is replaced
  - the field that must appear once
  - what a duplicate line means
artifact_contract_verified_by: the section was replaced and holds one value per field
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/state-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Overwrite the single-valued section instead of appending to it
- **Every field in this section is single-valued, and the section is overwritten rather than appended to.** A second `Phase:` line is not a second position and is not history — it is malformed input.
- Write the section by replacing it, never by adding a line.
<!-- vpmodule:atom:end overwrite-the-single-valued-section-instead-of-appending-to-it -->
<!-- vpmodule:atom:begin report-unknown-rather-than-a-wrong-answer -->
---
instruction_id: report-unknown-rather-than-a-wrong-answer
title: Report unknown rather than a wrong answer
summary: "When freshness cannot be established, the answer is unknown; a wrong freshness answer is worse than none, so the stamp is left out instead of guessed."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: The freshness of a record is being reported and the history does not answer it.
conditions_does_not_apply_when: The history answers it unambiguously.
artifact_contract_output_type: unknown-freshness
artifact_contract_required_data:
  - the thing whose freshness is unknown
  - the answer that is reported
  - why the stamp is omitted
artifact_contract_verified_by: the answer was reported as unknown and no unverifiable stamp was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/state-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Report unknown rather than a wrong answer
- an unverifiable stamp degrades to absent rather than asserting provenance the file does not have.
- a wrong answer here is worse than no answer.
<!-- vpmodule:atom:end report-unknown-rather-than-a-wrong-answer -->