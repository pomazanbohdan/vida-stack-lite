---
instruction_id: sweep-every-reference-when-you-delete-a-file
title: Sweep every reference when you delete a file
summary: "Deletion is a sweep: the index rows, the generated manifests, the fixtures and the tests that name the file all move together."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - deprecation-decision
conditions_applies_when: A file is genuinely dead and is about to be deleted.
conditions_does_not_apply_when: The file is live and its reference is missing.
artifact_contract_output_type: deletion-sweep
artifact_contract_required_data:
  - the index rows
  - the generated manifests
  - the tests that named the file
artifact_contract_verified_by: "no index row, generated manifest or test still names the deleted file"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-unreachable-workflow-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Sweep every reference when you delete a file
Deletion is a five-step sweep, and skipping any step leaves the tree inconsistent:
**Remove its `docs/INVENTORY.md` row — in all five locales.** `docs/INVENTORY.md` plus `docs/ja-JP/`, `docs/ko-KR/`, `docs/zh-CN/`, `docs/pt-BR/`.
**Sweep tests that name the file — allowlists *and* content assertions.**
Cut the coupling in the same change — but keep any sibling assertions that guard *other* files, since these blocks are often shared across several workflows.
