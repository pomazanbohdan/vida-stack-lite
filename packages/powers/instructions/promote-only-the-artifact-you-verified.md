---
instruction_id: promote-only-the-artifact-you-verified
title: Promote only the artifact you verified
summary: "The release promotes the tested commit, and a released tag is never moved."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: A verified change is promoted to a release.
conditions_does_not_apply_when: Nothing is being promoted.
artifact_contract_output_type: release-record
artifact_contract_required_data:
  - the tested commit
  - the gate it passed
  - the promotion it entered
artifact_contract_verified_by: the promoted commit is the one the gate ran on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/release.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Promote only the artifact you verified
Run the quality gate on committed `HEAD` in this checkout before pushing; keep that tested commit checked out through promotion/tagging.
Never force a push or move a release tag.
