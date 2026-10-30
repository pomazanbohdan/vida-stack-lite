---
instruction_id: an-explicit-setting-beats-an-inferred-one
title: An explicit setting beats an inferred one
summary: A value the owner stated is not second-guessed; the inferred fallback only runs when no explicit value was given.
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A setting can be stated explicitly or inferred from the environment.
conditions_does_not_apply_when: There is no explicit setting.
artifact_contract_output_type: resolved-setting
artifact_contract_required_data:
  - the explicit value
  - the source that was used
artifact_contract_verified_by: the explicit value was used whenever one was given and the fallback ran only when none was
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/control-the-reported-host-runtime.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# An explicit setting beats an inferred one
Rungs 1 and 2 are *explicit* — you stated an intent, and GSD does not second-guess it. Rung 3 only ever runs when **both** are unset. This is what preserves the behavior of every existing config: if you have ever set `runtime`, nothing about your setup changes.
Detection is deliberately conservative: when it cannot tell, it reports the old default rather than guessing.
