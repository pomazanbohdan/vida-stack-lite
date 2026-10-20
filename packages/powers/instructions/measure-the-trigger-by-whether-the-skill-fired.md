---
instruction_id: measure-the-trigger-by-whether-the-skill-fired
title: Measure the trigger by whether the skill fired
summary: "A trigger is measured by what the harness actually loaded, not by how the wording matches; an attempt that failed is unmeasured and rerun, never scored."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: The rate at which a skill fires is measured over a set of queries.
conditions_does_not_apply_when: Firing is known from the routing decision itself and needs no run.
artifact_contract_output_type: trigger-measurement
artifact_contract_required_data:
  - the per-query trigger rate
  - the threshold the rate is judged against
  - the verdicts against the labels
artifact_contract_verified_by: every scored query comes from completed runs that loaded the skill or did not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/description-optimization.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/harness.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/SKILL.md
status: active
revision: 1
---

# Measure the trigger by whether the skill fired
Trigger mode detects a load with a canary: the staged skill's body asks for a token at the start of the reply, and the token in the output is the load, on any CLI.
Run every query through the harness with the current description in place, several times per query because firing is probabilistic.
The trigger rate for a query is the fraction of completed runs that loaded the skill; a query with a failed attempt is unmeasured and rerun, never scored.
Turn each rate into a verdict against a threshold (a query "triggers" when its rate clears the bar, for example more than half its runs loaded the skill), then score against the labels:
A result from fewer than 3 runs per case (or per trigger query) is reported as a quick look, never as settled.
Token counts are read when the output is line-delimited JSON with usage blocks; otherwise elapsed time is the measure.
