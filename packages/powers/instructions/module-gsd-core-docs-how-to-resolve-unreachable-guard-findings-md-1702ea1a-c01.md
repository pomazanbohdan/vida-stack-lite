---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-unreachable-guard-findings-md-1702ea1a-c01"
title: "gsd-core: docs/how-to/resolve-unreachable-guard-findings.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/resolve-unreachable-guard-findings.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-unreachable-guard-findings.md\"}"
atom_ids:
  - a-guard-that-cannot-run-is-silently-useless
  - make-the-acknowledged-baseline-shrink-only
atom_count: 2
atoms: "[{\"atom_id\":\"a-guard-that-cannot-run-is-silently-useless\",\"file_sha256\":\"7e6ab4504a3051be0edc8107288e2b24a5fd5fc09a17b9e316990c8c394f8c54\",\"content_sha256\":\"f7d413b90100b67401a933c79b5319feca14cecde8885956afcdd5ca1ef00d13\",\"file_bytes\":1595,\"body_bytes\":454},{\"atom_id\":\"make-the-acknowledged-baseline-shrink-only\",\"file_sha256\":\"e7e88a61c59ee8a979e53d2cb38a611dafefbf97a478962a7d01540bfe51744f\",\"content_sha256\":\"e16219e53e7ee86b4eea83dd497dbc0372642fb4a4967a284827af5ec89cabe8\",\"file_bytes\":1498,\"body_bytes\":428}]"
carrier_sha256: f2a19f41bba6f5bd40dd43a7d37425985c46a068963eacb0e65187e62435ca3d
carrier_bytes: 3378
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-guard-that-cannot-run-is-silently-useless -->
---
instruction_id: a-guard-that-cannot-run-is-silently-useless
title: A guard that cannot run is silently useless
summary: A fallback arm that can never fire is output-identical to the success path and silently does nothing.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A guard is written as a fallback around a command that may match nothing.
conditions_does_not_apply_when: The guard is known to be reachable in the context it runs in.
artifact_contract_output_type: guard-shape-decision
artifact_contract_required_data:
  - the command the guard wraps
  - the existence test that replaces the fallback
artifact_contract_verified_by: the guard tests for existence instead of relying on a fallback that cannot fire
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-unreachable-guard-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# A guard that cannot run is silently useless
That guard finds shell in shipped prompt files where a fallback arm **cannot run** — the command it guards succeeds even in the case the fallback was written for, so the guard is output-identical to the success path and silently does nothing.
Under `shopt -s nullglob` an unmatched glob expands to **zero operands**, so the command still succeeds:
**Fix — collect into an array and test for existence:**
<!-- vpmodule:atom:end a-guard-that-cannot-run-is-silently-useless -->
<!-- vpmodule:atom:begin make-the-acknowledged-baseline-shrink-only -->
---
instruction_id: make-the-acknowledged-baseline-shrink-only
title: Make the acknowledged baseline shrink-only
summary: "A recorded acknowledgement set ratchets down only: a stale entry fails as loudly as a new one."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A finding has to be acknowledged instead of fixed.
conditions_does_not_apply_when: The finding can be fixed now.
artifact_contract_output_type: acknowledged-baseline
artifact_contract_required_data:
  - the acknowledged sites
  - the stale entries that were removed
artifact_contract_verified_by: no acknowledged entry is older than the site it acknowledges and the baseline shrank
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-unreachable-guard-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make the acknowledged baseline shrink-only
The baseline is **shrink-only**: a stale entry fails as loudly as a new one, so it cannot quietly become a parking lot.
The guard ships with a **zero-entry** baseline. Growing it is a real decision, not a way to make the build green — if you find yourself running `--update` because the finding is inconvenient, you are turning a gate back into a suggestion. Fix the site instead.
<!-- vpmodule:atom:end make-the-acknowledged-baseline-shrink-only -->