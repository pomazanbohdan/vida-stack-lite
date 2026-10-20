---
instruction_id: announce-dynamic-changes-to-assistive-technology
title: Announce dynamic changes to assistive technology
summary: "Content that changes after the page loads is announced, either politely at the next pause or immediately for errors."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Content appears, changes or finishes loading without a page reload."
conditions_does_not_apply_when: The surface never changes after it loads.
artifact_contract_output_type: dynamic-change-announcement-review
artifact_contract_required_data:
  - the dynamic change
  - the live region that carries it
  - the politeness level
artifact_contract_verified_by: every dynamic change reaches a live region with the politeness level that matches its urgency
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/accessibility-checklist.md
status: active
revision: 1
---

# Announce dynamic changes to assistive technology
Dynamic content changes announced (`aria-live` regions)
`aria-live="polite"` | Announced at next pause | Status updates, saved confirmations
`aria-live="assertive"` | Announced immediately | Errors, time-sensitive alerts
`role="status"` | Same as `polite` | Status messages
`role="alert"` | Same as `assertive` | Error messages
<!-- Loading states -->
<div aria-busy="true" aria-label="Loading tasks">
  <Spinner />
</div>
Autoplaying media | Disorienting, can't be stopped | Add controls, don't autoplay
