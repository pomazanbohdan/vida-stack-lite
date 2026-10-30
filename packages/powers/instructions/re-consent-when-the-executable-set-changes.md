---
instruction_id: re-consent-when-the-executable-set-changes
title: Re-consent when the executable set changes
summary: "An update that adds or removes a surface that can run asks for consent again, even when the update is otherwise benign; an update that touches only documentation does not."
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: An update to an already-installed extension is about to be applied.
conditions_does_not_apply_when: The extension is the shipped package itself.
artifact_contract_output_type: re-consent-trigger
artifact_contract_required_data:
  - the executable set before and after
  - the change that forces a new consent
  - the surfaces that need no new consent
artifact_contract_verified_by: a change to the executable set forced a new consent and the documentation-only change did not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-trust-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Re-consent when the executable set changes
- When it is enabled, a change to the *executable set* (the set of hooks, MCP servers, command modules, or reviewer lanes the capability declares) triggers a re-consent prompt before the update applies. Updating a non-executable capability (documentation, agents, skills) does not require re-consent.
- the new version cannot silently gain a hook that the previous version did not have.
