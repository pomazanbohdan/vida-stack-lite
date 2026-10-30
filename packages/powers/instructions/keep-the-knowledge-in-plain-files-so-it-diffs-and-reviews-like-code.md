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
