---
instruction_id: return-generic-errors-in-production
title: Return generic errors in production
summary: "A production error carries a code and a generic message, never the exception text, the stack or the query."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A request fails and the error is turned into a response.
conditions_does_not_apply_when: The work returns no error response.
artifact_contract_output_type: error-response-review
artifact_contract_required_data:
  - the error code
  - the message returned
  - where the details went
artifact_contract_verified_by: "the production response body carries no message, stack or query from the internals"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Return generic errors in production
Production: generic error, no internals
`error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }`
// NEVER in production:
res.status(500).json({
  error: err.message,
  stack: err.stack,         // Exposes internals
  query: err.sql,           // Exposes database details
});
