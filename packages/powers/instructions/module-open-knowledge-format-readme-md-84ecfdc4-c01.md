---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-readme-md-84ecfdc4-c01"
title: "open-knowledge-format: README.md module"
summary: "Carrier for 2 atomic instructions from open-knowledge-format:README.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"README.md\"}"
atom_ids:
  - keep-the-knowledge-in-plain-files-so-it-diffs-and-reviews-like-code
  - keep-the-queryable-fields-in-frontmatter-and-the-prose-in-the-body
atom_count: 2
atoms: "[{\"atom_id\":\"keep-the-knowledge-in-plain-files-so-it-diffs-and-reviews-like-code\",\"file_sha256\":\"d92c535fded82b08cd667f18cdb8589ea5faafddb451387fb6b6c35393539f85\",\"content_sha256\":\"ce23fc1979657dca98a56107d48ce534416008527aa93bea8c86977d0631521a\",\"file_bytes\":2452,\"body_bytes\":1259},{\"atom_id\":\"keep-the-queryable-fields-in-frontmatter-and-the-prose-in-the-body\",\"file_sha256\":\"851bc9c15863e3322220a6795c075d81411a326effc6961334f3bb2132ac6fd1\",\"content_sha256\":\"a02a6fb5c1bfed34a77a6d3487439551c4a89d45b924969a341e461011a88dd1\",\"file_bytes\":1407,\"body_bytes\":298}]"
carrier_sha256: 9c74bc679675ad2514882bbdfeca97ff1e62a5b0e85149fa271c77b08def8a9d
carrier_bytes: 4240
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-knowledge-in-plain-files-so-it-diffs-and-reviews-like-code -->
---
instruction_id: keep-the-knowledge-in-plain-files-so-it-diffs-and-reviews-like-code
title: Keep the knowledge in plain files so it diffs and reviews like code
summary: "Knowledge lives in plain files: a reader needs no tool, the files diff and review like source code, and the whole corpus ships as a directory."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - portable-knowledge
conditions_applies_when: A corpus of knowledge is stored or handed over.
conditions_does_not_apply_when: The knowledge has to be queried at scale and a store already owns it.
artifact_contract_output_type: plain-file-corpus
artifact_contract_required_data:
  - the files of the corpus
  - the way the corpus is shipped
artifact_contract_verified_by: "the corpus is plain files that can be read, diffed and shipped without a proprietary interface"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - design-ux
---

# Keep the knowledge in plain files so it diffs and reviews like code
**Human- and agent-readable.** No SDK or query language stands between a reader and the content. An engineer can `cat` a concept; an LLM can ingest it verbatim into context.
**Version-controllable out of the box.** Bundles live in git. Pull requests, line-by-line diffs, blame, and review workflows just work — knowledge curation becomes a normal software-engineering activity.
**Portable and lock-in free.** A bundle is a directory. Ship it as a tarball, host it in any repo, mount it from any filesystem, or sync it to any system that speaks files. No proprietary API stands between you and your metadata.
**Minimally opinionated, freely extensible.** A small set of required keys ensures interoperability, but bundles can carry arbitrary extra frontmatter keys and arbitrary body sections without breaking consumers.
**Progressive disclosure built in.** Auto-generated `index.md` files let an agent or human navigate the hierarchy one level at a time instead of loading the entire bundle into context.
**Graph-shaped, not just tree-shaped.** Concepts link to each other via normal markdown links, expressing relationships richer than the parent/child implied by the directory layout.
<!-- vpmodule:atom:end keep-the-knowledge-in-plain-files-so-it-diffs-and-reviews-like-code -->
<!-- vpmodule:atom:begin keep-the-queryable-fields-in-frontmatter-and-the-prose-in-the-body -->
---
instruction_id: keep-the-queryable-fields-in-frontmatter-and-the-prose-in-the-body
title: Keep the queryable fields in frontmatter and the prose in the body
summary: "The few fields that are queried, filtered or indexed live in the frontmatter; the prose, the schemas and the examples live in the body."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A document of a knowledge corpus is written.
conditions_does_not_apply_when: The document is an index or a log file.
artifact_contract_output_type: document-layout
artifact_contract_required_data:
  - the fields in the frontmatter
  - the content of the body
artifact_contract_verified_by: the queryable fields are in the frontmatter and the prose is in the body
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the queryable fields in frontmatter and the prose in the body
Use frontmatter for the few fields you want to query, filter, or index on (`type`, `resource`, `tags`, `generated`, `status`); use the markdown body for the prose, schemas, and example queries that LLMs and humans actually read.
<!-- vpmodule:atom:end keep-the-queryable-fields-in-frontmatter-and-the-prose-in-the-body -->