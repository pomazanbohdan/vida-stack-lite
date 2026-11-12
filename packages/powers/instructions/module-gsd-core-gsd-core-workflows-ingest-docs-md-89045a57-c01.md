---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-ingest-docs-md-89045a57-c01"
title: "gsd-core: gsd-core/workflows/ingest-docs.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/ingest-docs.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/ingest-docs.md\"}"
atom_ids:
  - a-hard-cap-on-the-input-set-stops-the-run
  - never-nest-a-repository-inside-an-existing-worktree
  - the-manifest-is-authoritative-over-the-heuristic
atom_count: 3
atoms: "[{\"atom_id\":\"a-hard-cap-on-the-input-set-stops-the-run\",\"file_sha256\":\"28b8c78de69090feb5fdfadf5ef1f77fdd036ef802208c08a508086202773f45\",\"content_sha256\":\"f032d61fafb59871f6d8dfc59aaf3f7aa324c96a3a10cece725fb2f81835b478\",\"file_bytes\":1376,\"body_bytes\":271},{\"atom_id\":\"never-nest-a-repository-inside-an-existing-worktree\",\"file_sha256\":\"4e9f88db6d932260e5c42fc4dc28c6313e750c41a7b2794225d7548608986821\",\"content_sha256\":\"c3e36d4fdda383c6d6a6ac81409feefa56fa08be6e77411b430ec6b10f8f041c\",\"file_bytes\":1484,\"body_bytes\":225},{\"atom_id\":\"the-manifest-is-authoritative-over-the-heuristic\",\"file_sha256\":\"e0535e886f75261d16c20cda2dccefd52b3f68152313b1ec60dc2961d73ca172\",\"content_sha256\":\"94918447e27232dcf70dafc8baee8273f33749696278ef617e521e6e4215f470\",\"file_bytes\":1699,\"body_bytes\":535}]"
carrier_sha256: ed7660d4fc2f683f7eef7e377eeb46696035b1e31aa8fa1c66e711286dcb27e6
carrier_bytes: 5012
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-hard-cap-on-the-input-set-stops-the-run -->
---
instruction_id: a-hard-cap-on-the-input-set-stops-the-run
title: A hard cap on the input set stops the run
summary: "When the discovered set is larger than the cap, the run stops and says how to narrow the scope instead of proceeding with more input than the run can hold."
capability_tags:
  - harden-validation
pattern_tags:
  - resource-bounds
conditions_applies_when: A run collects a set whose size it cannot bound.
conditions_does_not_apply_when: "The set is within the cap, or the caller narrowed it explicitly."
artifact_contract_output_type: cap-refusal
artifact_contract_required_data:
  - the number found
  - the cap
  - the way to narrow the scope
artifact_contract_verified_by: the run stopped at the cap and the caller was told how to narrow the scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# A hard cap on the input set stops the run
Cap: hard limit of 50 docs per invocation (documented v1 constraint). If the discovered set exceeds 50:
Discovered {N} docs, which exceeds the v1 cap of 50.
Exit without proceeding.
On Revise: exit with guidance to re-run with
<!-- vpmodule:atom:end a-hard-cap-on-the-input-set-stops-the-run -->
<!-- vpmodule:atom:begin never-nest-a-repository-inside-an-existing-worktree -->
---
instruction_id: never-nest-a-repository-inside-an-existing-worktree
title: Never nest a repository inside an existing worktree
summary: Inside an existing worktree the repository is left alone and a warning says that the new files are tracked by the outer repository.
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A run is about to initialise a repository inside a directory that already belongs to one.
conditions_does_not_apply_when: The directory is not part of an existing repository.
artifact_contract_output_type: repository-init-decision
artifact_contract_required_data:
  - the decision
  - the warning about the outer repository
artifact_contract_verified_by: no nested repository was created and the outer tracking was reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never nest a repository inside an existing worktree
never create a nested `.git` inside an existing worktree
do NOT run `git init`.
Surface a warning that planning files will be tracked by the outer repo at
skip `git init`
<!-- vpmodule:atom:end never-nest-a-repository-inside-an-existing-worktree -->
<!-- vpmodule:atom:begin the-manifest-is-authoritative-over-the-heuristic -->
---
instruction_id: the-manifest-is-authoritative-over-the-heuristic
title: The manifest is authoritative over the heuristic
summary: "A supplied manifest decides what is in scope and what type each item has; the directory conventions only run when there is no manifest, and the union of the two is de-duplicated."
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: A set of documents has to be collected and classified.
conditions_does_not_apply_when: The set of documents was given as an explicit list of files.
artifact_contract_output_type: scoped-input-set
artifact_contract_required_data:
  - the entries and their types
  - the source each entry came from
  - the de-duplicated set
artifact_contract_verified_by: the manifest decides the set and each file appears exactly once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# The manifest is authoritative over the heuristic
1. Manifest (if provided) — authoritative:
2. Directory conventions (skipped when manifest is provided):
De-duplicate the union (a file matched by multiple patterns is one doc).
Each entry provides `path` (required, relative to repo root) + `type` (required, one of ADR|PRD|SPEC|DOC) + `precedence` (optional integer).
Content heuristics (run during classification, not here) — the classifier handles frontmatter `type:` and H1 inspection for docs that didn't match a convention.
<!-- vpmodule:atom:end the-manifest-is-authoritative-over-the-heuristic -->