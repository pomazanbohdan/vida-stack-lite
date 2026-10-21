---
instruction_id: verify-every-checkable-claim-in-the-document-against-the-filesystem
title: Verify every checkable claim in the document against the filesystem
summary: "Every checkable statement is checked against a file, and the check goes past the first piece of evidence that fits."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A document with checkable claims is verified.
conditions_does_not_apply_when: The document contains no checkable claim.
artifact_contract_output_type: verification-result
artifact_contract_required_data:
  - the claims checked
  - the failures
artifact_contract_verified_by: every checkable claim was checked against the filesystem
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-verifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-verifier.compact.md
status: active
revision: 1
---

# Verify every checkable claim in the document against the filesystem
Every checkable claim must be verified — do not assume claims are correct because the doc was recently written.
Accepting "the file exists" without verifying the specific content the claim describes (e.g., a function name, a config key)
Stopping verification after finding the first PASS evidence for a claim rather than exhausting all checkable sub-claims
Marking claims UNCERTAIN when the filesystem can answer the question with a grep
