---
instruction_id: stop-on-a-failed-install-instead-of-trying-an-alternative-name
title: Stop on a failed install instead of trying an alternative name
summary: "When an install fails, the run stops and surfaces the failure; it does not silently try a second package name, because the alternative may be the malicious one."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: An install of a named package fails.
conditions_does_not_apply_when: The install succeeded.
artifact_contract_output_type: failed-install
artifact_contract_required_data:
  - the package whose install failed
  - the failure that is surfaced
  - what the run does instead of retrying
artifact_contract_verified_by: the run stopped with the failure surfaced and no alternative name was tried
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/security-model.md
status: active
revision: 1
---

# Stop on a failed install instead of trying an alternative name
- If an install fails, `gsd-executor` **surfaces a checkpoint and stops**. It does not silently try an alternative package name — which could itself be malicious.
