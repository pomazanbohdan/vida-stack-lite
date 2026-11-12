---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-acknowledge-emitted-drift-md-cbb91263-c01"
title: "gsd-core: docs/how-to/acknowledge-emitted-drift.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/acknowledge-emitted-drift.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/acknowledge-emitted-drift.md\"}"
atom_ids:
  - a-placeholder-word-is-not-a-real-reason
  - a-smaller-file-is-not-a-smaller-context
atom_count: 2
atoms: "[{\"atom_id\":\"a-placeholder-word-is-not-a-real-reason\",\"file_sha256\":\"05e2feb74cd629385685f6f3d19fd79ae67b467ba8214134c01ff34abc1ced4b\",\"content_sha256\":\"e1800f39bb6a67ef63e5e781b99932530defba4ce03e9c26ae20b404d2a46660\",\"file_bytes\":1290,\"body_bytes\":179},{\"atom_id\":\"a-smaller-file-is-not-a-smaller-context\",\"file_sha256\":\"2f42b18adac4707a7f5ed876cc35ee8cbfdb9ac316b53e906816fa7a01e0bfd3\",\"content_sha256\":\"80f0044babf5e7aa0a4c4a2f58cd6b0dec036553af79b81294703946cea631fd\",\"file_bytes\":1303,\"body_bytes\":168}]"
carrier_sha256: ca9137962e7895a79e8c80760d4ca7918f17a06e96b1ce288e8d030d31f19d06
carrier_bytes: 2864
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-placeholder-word-is-not-a-real-reason -->
---
instruction_id: a-placeholder-word-is-not-a-real-reason
title: A placeholder word is not a real reason
summary: "A required reason is read by a reviewer as the whole artifact: a placeholder such as \"fix\" or \"expected\" is rejected, and so is an empty one."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: "A record, a declaration or a note must carry a reason."
conditions_does_not_apply_when: The field is a value that is checked against a list rather than read as prose.
artifact_contract_output_type: reasoned-record
artifact_contract_required_data:
  - the reason
  - the record it explains
artifact_contract_verified_by: "the reason is a sentence a reviewer can act on, not a placeholder and not empty"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/acknowledge-emitted-drift.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# A placeholder word is not a real reason
Write a real reason. "fix" or "expected" is not one — the reason is the whole artifact a reviewer reads, and an empty one is rejected.
<!-- vpmodule:atom:end a-placeholder-word-is-not-a-real-reason -->
<!-- vpmodule:atom:begin a-smaller-file-is-not-a-smaller-context -->
---
instruction_id: a-smaller-file-is-not-a-smaller-context
title: A smaller file is not a smaller context
summary: "Eagerly importing content into a file shrinks the file without shrinking what a session loads, so it games a size guard and makes the real cost worse."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Content is moved into another file to bring a size or length limit down.
conditions_does_not_apply_when: The content is read on demand only when the task needs it.
artifact_contract_output_type: context-cost-decision
artifact_contract_required_data:
  - the file before and after
  - what the reader still loads
artifact_contract_verified_by: "the reader still loads the same content, so the limit was not really reduced"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/acknowledge-emitted-drift.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# A smaller file is not a smaller context
An eager `@`-import shrinks the file without shrinking loaded context, which games the guard while making the real cost worse
<!-- vpmodule:atom:end a-smaller-file-is-not-a-smaller-context -->