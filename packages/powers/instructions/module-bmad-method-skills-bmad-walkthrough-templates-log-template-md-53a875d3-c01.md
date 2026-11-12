---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-walkthrough-templates-log-template-md-53a875d3-c01"
title: "bmad-method: skills/bmad-walkthrough/templates/log-template.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-walkthrough/templates/log-template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-walkthrough/templates/log-template.md\"}"
atom_ids:
  - give-every-finding-a-disposition
  - keep-each-log-entry-short
  - stamp-the-log-entry-with-the-real-session-id-and-time
  - write-the-log-for-the-session-that-continues
atom_count: 4
atoms: "[{\"atom_id\":\"give-every-finding-a-disposition\",\"file_sha256\":\"78ac301233b931f5c855683afb34be60f5b8acc1c2a3770e37f64656d824b3a1\",\"content_sha256\":\"185b804eb61e09ca4485b98434597beb7ad8dfeda276f898c42ad09308a0d624\",\"file_bytes\":2878,\"body_bytes\":1591},{\"atom_id\":\"keep-each-log-entry-short\",\"file_sha256\":\"2eaff49c951fd853cee625a10c5962e6786a2b70e21d12f63031e10cc13af827\",\"content_sha256\":\"4a4f55c5a1f7595eed916b1ca8c11cd6da1076362d25d85aeeda5962b98a124a\",\"file_bytes\":1184,\"body_bytes\":145},{\"atom_id\":\"stamp-the-log-entry-with-the-real-session-id-and-time\",\"file_sha256\":\"0589c8fdb3765797a46a4096d932fd6ddeecf460bc495ae083cfd3288f44175f\",\"content_sha256\":\"b0b820dc1c35f476a92548b89e6adcfcb8123e38eaa32fcc0ed4cc8c7fbdabb1\",\"file_bytes\":1390,\"body_bytes\":256},{\"atom_id\":\"write-the-log-for-the-session-that-continues\",\"file_sha256\":\"f6aa1f435692d988ab0c736d5b60c2850fbbc2748c0c03a41497468506e3aafc\",\"content_sha256\":\"8a8966be85f7ece3b5816e20fdaa23276dbab02d60d954595354b3896358905c\",\"file_bytes\":2391,\"body_bytes\":972}]"
carrier_sha256: 5bd280ffd6fbccd386fdbb9a09414d843b5222b79de5fd6aaded9ca0d4425f61
carrier_bytes: 8382
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-every-finding-a-disposition -->
---
instruction_id: give-every-finding-a-disposition
title: Give every finding a disposition
summary: "Every finding in the log carries one of four dispositions, and a changed disposition is appended, never rewritten."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A finding is written into the review log.
conditions_does_not_apply_when: The log entry carries no finding.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the finding
  - its disposition
artifact_contract_verified_by: "each finding names one of fixed, accepted as-is, deferred, or open"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/templates/log-template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-reviews.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Give every finding a disposition
In Result, give each finding's disposition: fixed, accepted as-is, deferred, or open. When a disposition changes, append a new entry; do not edit earlier ones.
**Record a per-finding disposition.** The counts say how many findings there were, not what happened to any of them.
one row per finding ID, defaulting to `open`
preserving any disposition already recorded, its stated reason included.
Prior rows: keep the disposition AND its source cell — the source is where a human writes the reason a finding was deferred
A prior finding the current review no longer reports is CARRIED, never dropped
the row does not claim the finding is live, it records that it was seen and never triaged.
The disposition column is an ENUM, not 'any lowercase token'.
A row that does not match now yields no prior entry, so the row falls back to 'open' -- the safe default
the id now names a different finding, so the decision no longer has a row
The review file is an audit trail and feedback input, not a second execution contract: every current actionable finding must be incorporated into the relevant plan or explicitly deferred/rejected in that plan.
**Append-only.** A later round never edits or deletes a prior round's tables. To overturn a prior round's verdict, add a new row in the current round's table whose Reason/How Addressed names the round and concern it supersedes.
**Anchoring.** Any reference to a specific review line cites the line and the snapshot it belongs to - a bare line number is meaningless once the next round rewrites the file wholesale.
<!-- vpmodule:atom:end give-every-finding-a-disposition -->
<!-- vpmodule:atom:begin keep-each-log-entry-short -->
---
instruction_id: keep-each-log-entry-short
title: Keep each log entry short
summary: An entry stays under 150 tokens and drops the fields that have nothing in them.
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A log entry is written.
conditions_does_not_apply_when: The entry is a single value with nothing to omit.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the entry fields
artifact_contract_verified_by: the entry is under 150 tokens and holds no empty field
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/templates/log-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body sets a length and empty-field rule for an unspecified log entry, but identifies no supported domain in either the text or its conditions."
---

# Keep each log entry short
Omit empty fields.
Token budget: up to 150 tokens per entry. The smaller the better, but do not sacrifice precision.
<!-- vpmodule:atom:end keep-each-log-entry-short -->
<!-- vpmodule:atom:begin stamp-the-log-entry-with-the-real-session-id-and-time -->
---
instruction_id: stamp-the-log-entry-with-the-real-session-id-and-time
title: Stamp the log entry with the real session id and time
summary: "Each entry carries the session id the environment supplied and a local-time ISO 8601 stamp; an unavailable id is written as unavailable, never invented."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A log entry is written.
conditions_does_not_apply_when: The log format carries no session field at all.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the session id
  - the ISO 8601 timestamp with local timezone
artifact_contract_verified_by: "the session id is the one the environment supplied, and an unavailable one is written as unavailable"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/templates/log-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stamp the log entry with the real session id and time
Record the actual session ID supplied by the environment and an ISO 8601 timestamp with local timezone for each entry. If the session ID is unavailable, write "unavailable" rather than inventing one.
<!-- vpmodule:atom:end stamp-the-log-entry-with-the-real-session-id-and-time -->
<!-- vpmodule:atom:begin write-the-log-for-the-session-that-continues -->
---
instruction_id: write-the-log-for-the-session-that-continues
title: Write the log for the session that continues
summary: "The log is written for the session that continues the work, not as a transcript of the current one."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A review writes a log that another session will read to resume or to analyze the work.
conditions_does_not_apply_when: The log is only a scratch pad that nobody reads again.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the decisions and their reasons
  - the user constraints
  - the unresolved findings
  - the references that recover the evidence
artifact_contract_verified_by: a reader who never saw the session can resume the review from the log alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/templates/log-template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/resume-project.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write the log for the session that continues
Append-only record of outcomes/decisions. Main purpose: persisted context for resuming or analyzing the review process. You're writing this log for consumption by another LLM session.
Record decisions and their reasons, user constraints, unresolved findings, and references needed to recover evidence. Link to large results rather than copying them here. This is NOT a transcript or internal deliberation.
Last session: [now]
Stopped at: Session resumed, proceeding to [action]
Resume file: [updated if applicable]
This ensures if session ends unexpectedly, next resume knows the state.
On context reset: File shows last checkpoint. Resume from there.
Update the `## Current Test` section with the pending test IN MEMORY ONLY
the next batched write (`process_response`'s `update_rules`) persists it alongside the test's actual result, so a resume that finds a pending row and stops without answering it performs zero writes.
<!-- vpmodule:atom:end write-the-log-for-the-session-that-continues -->