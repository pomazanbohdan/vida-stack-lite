---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-map-codebase-md-bfa49bc7-c01"
title: "gsd-core: gsd-core/workflows/map-codebase.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/map-codebase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/map-codebase.md\"}"
atom_ids:
  - scan-generated-artifacts-for-leaked-secrets-before-you-commit
  - stamp-the-freshness-marker-outside-the-producer
atom_count: 2
atoms: "[{\"atom_id\":\"scan-generated-artifacts-for-leaked-secrets-before-you-commit\",\"file_sha256\":\"2b78777a71cacaab8c1ed515b6ce226b0d5497dd22b130fc0711ea0150e4ef98\",\"content_sha256\":\"4d2cd541c6558930d25fc676271341a88320c15dfb2aaa3095baf51e825ffcb3\",\"file_bytes\":1539,\"body_bytes\":394},{\"atom_id\":\"stamp-the-freshness-marker-outside-the-producer\",\"file_sha256\":\"123552cab71b2743084b1903c93ea01cd16d0e224919ff7849c58151770752d0\",\"content_sha256\":\"546840b0dd8f1b2510a0c97d6a78834deedbc9284ece9a16c011180549f004f0\",\"file_bytes\":1816,\"body_bytes\":635}]"
carrier_sha256: 1916a1ae496cb1ee3655548220ef437bcd97f8bc09f64889468bd3c6bb51e803
carrier_bytes: 3686
revision: 1
status: active
---
<!-- vpmodule:atom:begin scan-generated-artifacts-for-leaked-secrets-before-you-commit -->
---
instruction_id: scan-generated-artifacts-for-leaked-secrets-before-you-commit
title: Scan the generated artifacts for leaked secrets before you commit
summary: Generated documents are scanned for secret patterns before they are committed; a hit pauses the commit and names what was found.
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: Documents produced by a run are about to be committed.
conditions_does_not_apply_when: Nothing generated in this run is being committed.
artifact_contract_output_type: secret-scan
artifact_contract_required_data:
  - the detected patterns
  - the files that hold them
  - the pause before the commit
artifact_contract_verified_by: no commit happens while a detected secret is still in the files
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/map-codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Scan the generated artifacts for leaked secrets before you commit
CRITICAL SECURITY CHECK: Scan output files for accidentally leaked secrets before committing.
This would expose credentials if committed.
If these are real secrets, they must be removed before committing
Pausing before commit. Reply "safe to proceed" if the flagged content is not actually sensitive, or edit the files first.
<!-- vpmodule:atom:end scan-generated-artifacts-for-leaked-secrets-before-you-commit -->
<!-- vpmodule:atom:begin stamp-the-freshness-marker-outside-the-producer -->
---
instruction_id: stamp-the-freshness-marker-outside-the-producer
title: Stamp the freshness marker outside the producer
summary: "The machine-readable freshness marker is written by a step the producing agent cannot skip, and only for the artefacts that were really regenerated."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A generated artefact carries a freshness marker that a later gate reads.
conditions_does_not_apply_when: The artefact has no freshness marker and none is needed.
artifact_contract_output_type: freshness-stamp
artifact_contract_required_data:
  - the machine-readable marker
  - the artefact it was written into
  - the artefacts that were not regenerated
artifact_contract_verified_by: no artefact claims a freshness it did not receive
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/map-codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stamp the freshness marker outside the producer
The human-readable markers the mapper writes (`**Analysis Date:**`, `<!-- refreshed: ... -->`) are restamped unconditionally on an Update run, so a mapper that decides its work is already done and rewrites only the dates still looks fresh to a human.
Leaving the machine-readable stamp to the same agent reproduces exactly the failure the stamp exists to detect.
A shell step cannot be skipped by a confident agent.
An Update run does not touch the documents the user did not select, so stamping those at HEAD would claim a freshness they do not have.
Stamp only what you regenerated.
<!-- vpmodule:atom:end stamp-the-freshness-marker-outside-the-producer -->