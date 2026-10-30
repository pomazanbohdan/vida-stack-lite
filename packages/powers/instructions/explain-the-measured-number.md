---
instruction_id: explain-the-measured-number
title: Explain the measured number
summary: "Report a performance number with its baseline, conditions, spread, and limiter, so the reader can interpret it instead of trusting it."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "You report a measurement of speed, size, throughput, or another quantity."
conditions_does_not_apply_when: The number is background reference and no decision depends on it.
artifact_contract_output_type: measurement-report
artifact_contract_required_data:
  - metric and unit
  - baseline
  - conditions
  - spread
  - components
artifact_contract_verified_by: repeated runs of the recorded measurement command
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/benchmark-checklist/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/perf-issue.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-explain-the-number/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Explain the measured number
Use this when you produce a performance number: a before and after, a regression claim, a harness, or a library or configuration choice.
Answer each question with evidence from a run, not a guess about the code.
Write down the claim you expect to make, in the words you would ship.
Read the measurement script. Note what it times, counts, and ignores.
Check the load average and the core count. If the machine is busy, find out what is running. If you cannot stop it, interleave the sides so both see the same noise, and say so.
Ask why not double: name the resource or code path that bounds the result, such as a core, a lock, the disk, the network, or the load generator itself. Get it from a profile or from system counters taken during a run, then map it to source. A guess from reading the code is not a limiter.
List what else the number could be measuring, and rule out each one with evidence: errors, skipped or cached work, code that never ran, an untuned side, noise, and a piece too small to matter end to end.
Run every side the way production runs it: release builds, production flags and environment, batching and transaction settings, connection pools, caches as warm or cold as production sees them, and the same versions and data.
Do the arithmetic against limits: bytes per second against bandwidth, operations per second times cost per operation against the cores, and the time saved against the time the changed piece took.
Count failures and non-success responses, and check that outputs are correct, not just present.
Run each side at least five times, alternating, so warmup, lazy initialization, caches, and drift favor neither. Report the median and range. A gap smaller than the run-to-run variation is no measurable difference.
Next to any micro result, measure the end-to-end path a user waits on, with realistic data sizes and concurrency, and report the micro result as a share of the whole.
Confirm the work ran inside the timed region: the request reached the server, the rows were written, the bytes were read, and the code used the result.
Lead with the verdict: faster, slower, no measurable difference, or inconclusive.
Give the number with its unit, the run count, the range, and the limiter.
Call the verdict inconclusive when you claim a difference but cannot name the limiter, when a side ran untuned, or when you could not check errors and whether the work happened. Name the gap.
Keep the run count, the spread, and the limiter with the number, in the notes or a linked artifact.
