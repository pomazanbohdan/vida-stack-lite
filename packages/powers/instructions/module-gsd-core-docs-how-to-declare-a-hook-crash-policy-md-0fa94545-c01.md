---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-declare-a-hook-crash-policy-md-0fa94545-c01"
title: "gsd-core: docs/how-to/declare-a-hook-crash-policy.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/declare-a-hook-crash-policy.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/declare-a-hook-crash-policy.md\"}"
atom_ids:
  - name-the-failure-mode-not-the-mechanism-in-the-reason
  - never-read-a-check-that-could-not-run-as-a-clean-result
atom_count: 2
atoms: "[{\"atom_id\":\"name-the-failure-mode-not-the-mechanism-in-the-reason\",\"file_sha256\":\"899b5651701d7a865bd10bf15397835a4ec19882bc9193f0db606a9404f91827\",\"content_sha256\":\"7d8b8e32514ce042bbd99aafd028625f2bea2b3b5bde89f9ae52da042f3d660c\",\"file_bytes\":1578,\"body_bytes\":472},{\"atom_id\":\"never-read-a-check-that-could-not-run-as-a-clean-result\",\"file_sha256\":\"716f0f97fbdb47f008572e2bd2076a1f84bd477fda4259c6fdf4cfd4562e429b\",\"content_sha256\":\"0300d25387017a5f6f54235c6ad6cae052818c57d5aa1d9a471047fdad0d4857\",\"file_bytes\":1567,\"body_bytes\":454}]"
carrier_sha256: 7fadf7337f83fd23cbd3edb07786146defd3bc9bbd516621ebc329c222f6debe
carrier_bytes: 3476
revision: 1
status: active
---
<!-- vpmodule:atom:begin name-the-failure-mode-not-the-mechanism-in-the-reason -->
---
instruction_id: name-the-failure-mode-not-the-mechanism-in-the-reason
title: "Name the failure mode, not the mechanism, in the reason"
summary: A reason that repeats the label states nothing; it names what breaks if the decision fires wrongly and what breaks if it stays silent.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A policy choice has to be justified in writing.
conditions_does_not_apply_when: The choice has no trade-off to state.
artifact_contract_output_type: justification
artifact_contract_required_data:
  - what breaks if the decision fires wrongly
  - what breaks if it stays silent
artifact_contract_verified_by: the reason names both failure modes instead of restating the label
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/declare-a-hook-crash-policy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Name the failure mode, not the mechanism, in the reason
**A useful reason names the failure mode, not the mechanism.** "Fails open" restates what `ALLOW` already means. What the code cannot say is *why this hook, specifically*: what breaks if it fires wrongly (a legitimate call blocked) versus what breaks if it stays silent (a narrow threat model, a check that runs again downstream, an advisory that was never load-bearing). Write the trade-off, not the translation.
<!-- vpmodule:atom:end name-the-failure-mode-not-the-mechanism-in-the-reason -->
<!-- vpmodule:atom:begin never-read-a-check-that-could-not-run-as-a-clean-result -->
---
instruction_id: never-read-a-check-that-could-not-run-as-a-clean-result
title: Never read a check that could not run as a clean result
summary: "A check that could not run and a check that ran and found nothing are different outcomes; the first is reported, the second passes."
capability_tags:
  - harden-validation
pattern_tags:
  - empty-result-policy
conditions_applies_when: A check inside a working step can fail to run without failing the step.
conditions_does_not_apply_when: The check ran and produced a verdict.
artifact_contract_output_type: check-outcome
artifact_contract_required_data:
  - whether the check ran
  - the outcome of the check
artifact_contract_verified_by: a check that could not run is reported as such and never as a clean result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/declare-a-hook-crash-policy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never read a check that could not run as a clean result
**crash() covers your hook's own bugs. It does not cover the more common defect: a check inside a *working* hook that silently reads "could not run" as if it were "ran, found nothing"** — passing every case it should have inspected.
a `try { ... } catch { /* silently pass */ }` around a check is the shape to be suspicious of, whether or not it happens to route through `hook-exit.js` at all.
<!-- vpmodule:atom:end never-read-a-check-that-could-not-run-as-a-clean-result -->