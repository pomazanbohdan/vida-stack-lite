---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-take-over-a-capability-or-eos-md-da66999d-c01"
title: "gsd-core: docs/how-to/take-over-a-capability-or-eos.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/take-over-a-capability-or-eos.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/take-over-a-capability-or-eos.md\"}"
atom_ids:
  - do-not-hijack-a-live-entry
  - remove-a-listing-only-for-a-stated-ground
  - split-an-ownership-change-from-a-contract-change
atom_count: 3
atoms: "[{\"atom_id\":\"do-not-hijack-a-live-entry\",\"file_sha256\":\"a56338eea0561de0d79179efeba59f9d144cdab0e329345bdee89afa46907a6f\",\"content_sha256\":\"bb75bb796b0f8fdbc8b2bf6c9456b8817f9eef1626124b3f912ce4463eebc508\",\"file_bytes\":1434,\"body_bytes\":241},{\"atom_id\":\"remove-a-listing-only-for-a-stated-ground\",\"file_sha256\":\"e2e5730f3fb0ddb92b520090a80bca22b7002066ef12b1df067d06f59f1b4971\",\"content_sha256\":\"77cbe0c7a032817a934bf30056e01905fa0639e211b5bcf78dbf2ba526ccd18e\",\"file_bytes\":1470,\"body_bytes\":407},{\"atom_id\":\"split-an-ownership-change-from-a-contract-change\",\"file_sha256\":\"68dd36e0563421f7a44b947ed0caed3b3ee2137b0e3236ece78e6cedb54c019e\",\"content_sha256\":\"a6cb429245b49ea022dafea7eb72399a026215f82f5861114d109c299460a793\",\"file_bytes\":1511,\"body_bytes\":345}]"
carrier_sha256: d00d8a7d4c8840a38017cde11b6ad1b831eb3aa73cd380d815f2330865b7fc4f
carrier_bytes: 4818
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-hijack-a-live-entry -->
---
instruction_id: do-not-hijack-a-live-entry
title: Do not hijack a live entry
summary: "Repointing a live entry at a fork and reclaiming a listed identifier are hijacks, not takeovers."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - decision-trail
conditions_applies_when: A takeover of an existing entry is proposed.
conditions_does_not_apply_when: The entry is dead or the current owner agreed to the handoff.
artifact_contract_output_type: takeover-legality
artifact_contract_required_data:
  - the entry
  - the grounds on which the takeover happens
artifact_contract_verified_by: the takeover names a consensual handoff and the live entry is untouched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/take-over-a-capability-or-eos.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body protects an active repository entry and identifier from takeover, but the entry subject is unspecified; repository ownership mechanics alone do not support a listed content domain."
---

# Do not hijack a live entry
Repoint `repo` at a fork while the original is alive and maintained. That is an entry hijack, not a takeover.
Reclaim an `id` that is still listed.
Remove a working entry in order to make room for a replacement.
<!-- vpmodule:atom:end do-not-hijack-a-live-entry -->
<!-- vpmodule:atom:begin remove-a-listing-only-for-a-stated-ground -->
---
instruction_id: remove-a-listing-only-for-a-stated-ground
title: Remove a listing only for a stated ground
summary: "A listing is removed only for illegal content, malware, spam or a dead link, never for staleness, quality or disagreement."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A published listing is proposed for removal.
conditions_does_not_apply_when: The listing is still maintained and working.
artifact_contract_output_type: removal-ground
artifact_contract_required_data:
  - the one ground that is cited
  - the evidence behind it
artifact_contract_verified_by: the removal cites exactly one of the stated grounds with its evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/take-over-a-capability-or-eos.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Remove a listing only for a stated ground
A merged entry is removed only for illegal content, malware, spam, or a repo that is dead or completely non-functional.
It is **never** removed for staleness, quality, abandonment, or a maintainer's disagreement with its design.
Cite exactly one of the four grounds — illegal, malware, spam, or dead/non-functional link — and put the evidence in the PR body.
<!-- vpmodule:atom:end remove-a-listing-only-for-a-stated-ground -->
<!-- vpmodule:atom:begin split-an-ownership-change-from-a-contract-change -->
---
instruction_id: split-an-ownership-change-from-a-contract-change
title: Split an ownership change from a contract change
summary: The user-visible contract is preserved across a takeover; a change to it is a separate version bump afterwards.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Who maintains something changes while its contract stays in place.
conditions_does_not_apply_when: The contract itself is being redesigned.
artifact_contract_output_type: ownership-change
artifact_contract_required_data:
  - the contract fields that are preserved
  - the change request that carries only the ownership
artifact_contract_verified_by: the ownership change carries no contract change and the contract fields are byte-identical
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/take-over-a-capability-or-eos.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Split an ownership change from a contract change
These fields are the user-visible contract. A takeover **preserves** them. If you intend to change them, do that afterward as a normal version bump under your own maintainership — never inside the ownership-change PR.
Change `interactions` in the same PR as the ownership change. Split them.
<!-- vpmodule:atom:end split-an-ownership-change-from-a-contract-change -->