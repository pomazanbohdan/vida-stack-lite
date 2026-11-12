---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-pattern-mapper-compact-md-3acd7d91-c01"
title: "gsd-core: agents/gsd-pattern-mapper.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-pattern-mapper.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-pattern-mapper.compact.md\"}"
atom_ids:
  - name-only-a-tracked-source-file-as-the-analog
  - name-the-analog-file-and-the-lines-to-copy-from
  - stop-the-analog-search-after-three-to-five-strong-matches
atom_count: 3
atoms: "[{\"atom_id\":\"name-only-a-tracked-source-file-as-the-analog\",\"file_sha256\":\"b82e1eaf930ef20ec02ee8c2da527cab847957046afcc9c81c8a670b9b95c6a6\",\"content_sha256\":\"2580a40987f011ed24a363063014f12355ed0ffbf2a2cbb6b03f896c0bf22fd6\",\"file_bytes\":1459,\"body_bytes\":336},{\"atom_id\":\"name-the-analog-file-and-the-lines-to-copy-from\",\"file_sha256\":\"76b60e2aea8a0311ee51f053ee4f130a177c21c3c4dc9338cc8255afa65653cb\",\"content_sha256\":\"dc7f5c9e150ad29a01d608f038632baea0f89f3e7fdfef27fbde7679a49a0e73\",\"file_bytes\":1440,\"body_bytes\":308},{\"atom_id\":\"stop-the-analog-search-after-three-to-five-strong-matches\",\"file_sha256\":\"9cb9b567bdc88d0a811f1786bdb6974760c802e8c48655dca19bccbecdf37de2\",\"content_sha256\":\"26a2fe2a35ca845521be5dffa790db0edfa9826d5fe9b6bbb547f16fdbdf4885\",\"file_bytes\":1628,\"body_bytes\":443}]"
carrier_sha256: e6ecafc841b87e7a6c374090b73eb37699ba3a19996bd9767f829252431f9e12
carrier_bytes: 4998
revision: 1
status: active
---
<!-- vpmodule:atom:begin name-only-a-tracked-source-file-as-the-analog -->
---
instruction_id: name-only-a-tracked-source-file-as-the-analog
title: Name only a tracked source file as the analog
summary: The file to copy from is one the version control tracks; a generated mirror is replaced by the origin it was synced from.
capability_tags:
  - audit-codebase
pattern_tags:
  - source-hierarchy
conditions_applies_when: A file is named as the pattern to copy from.
conditions_does_not_apply_when: The candidate file is not in version control at all.
artifact_contract_output_type: pattern-map
artifact_contract_required_data:
  - the analog path
  - its tracked origin
artifact_contract_verified_by: every named analog is a tracked file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-pattern-mapper.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-pattern-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name only a tracked source file as the analog
every analog path you name must be git-TRACKED source, never a gitignored install/runtime mirror
Before naming an analog whose file exists on disk, verify `git ls-files -- <path>` prints it (non-empty = tracked)
if the closest analog is a gitignored mirror, substitute its tracked origin
<!-- vpmodule:atom:end name-only-a-tracked-source-file-as-the-analog -->
<!-- vpmodule:atom:begin name-the-analog-file-and-the-lines-to-copy-from -->
---
instruction_id: name-the-analog-file-and-the-lines-to-copy-from
title: Name the analog file and the lines to copy from
summary: A new file is pointed at the existing file it should follow and at the exact lines the pattern lives on.
capability_tags:
  - design-structure
pattern_tags:
  - project-conventions-first
conditions_applies_when: A new file has to follow an existing pattern.
conditions_does_not_apply_when: The codebase has no analogous file.
artifact_contract_output_type: pattern-map
artifact_contract_required_data:
  - the analog file
  - the lines
  - the excerpt
artifact_contract_verified_by: "every assignment names a file, a line range and an excerpt"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-pattern-mapper.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-pattern-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Name the analog file and the lines to copy from
Be concrete, not abstract. "Copy auth pattern from `src/controllers/users.ts` lines 12-25" not "follow the auth pattern."
Concrete, not abstract: Excerpts include file paths and line numbers
Extract as concrete code excerpts with file path and line numbers.
<!-- vpmodule:atom:end name-the-analog-file-and-the-lines-to-copy-from -->
<!-- vpmodule:atom:begin stop-the-analog-search-after-three-to-five-strong-matches -->
---
instruction_id: stop-the-analog-search-after-three-to-five-strong-matches
title: Stop the analog search after three to five strong matches
summary: A handful of good matches is enough; the search stops and the range that was already read is not read again.
capability_tags:
  - communicate-concisely
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: Existing files are searched for the pattern to follow.
conditions_does_not_apply_when: No match was found yet and the search space is barely explored.
artifact_contract_output_type: pattern-map
artifact_contract_required_data:
  - the matches found
artifact_contract_verified_by: the search stopped within the bound and no range was read twice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-pattern-mapper.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-pattern-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Stop the analog search after three to five strong matches
Stop analog search once you have 3–5 strong matches. There is no benefit to finding a 10th analog.
Stop at 3–5 analogs: Once you have enough strong matches, write PATTERNS.md. Broader search produces diminishing returns and wastes tokens.
Never re-read a range already in context.
For small files (≤ 2,000 lines), one `Read` call is enough — extract everything in that pass.
<!-- vpmodule:atom:end stop-the-analog-search-after-three-to-five-strong-matches -->