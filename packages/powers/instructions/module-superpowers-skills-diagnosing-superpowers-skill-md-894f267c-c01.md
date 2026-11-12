---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-diagnosing-superpowers-skill-md-894f267c-c01"
title: "superpowers: skills/diagnosing-superpowers/SKILL.md module"
summary: "Carrier for 5 atomic instructions from superpowers:skills/diagnosing-superpowers/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/diagnosing-superpowers/SKILL.md\"}"
atom_ids:
  - cite-evidence-lines
  - report-diagnosis-without-prescribing
  - require-human-authored-issue-summary
  - scrub-and-gate-artifact-sharing
  - state-diagnosis-problem
atom_count: 5
atoms: "[{\"atom_id\":\"cite-evidence-lines\",\"file_sha256\":\"bbc0b9cc81b060ca67ef42cbe066d5ce0b4edebec6e59a1fd43361f96fc76662\",\"content_sha256\":\"854b4d7921402943463a60597bbeddb57b0e63259b04cf4d3e638c2b5f8e1d21\",\"file_bytes\":1988,\"body_bytes\":791},{\"atom_id\":\"report-diagnosis-without-prescribing\",\"file_sha256\":\"562a9a2388cec3748d4390bdfc98df180f9890825e126bb929194a7e0d5086df\",\"content_sha256\":\"58423d89e7bd369452801988f751932432aeea5a919f233ce1b1cf0e8e70fd71\",\"file_bytes\":2979,\"body_bytes\":1345},{\"atom_id\":\"require-human-authored-issue-summary\",\"file_sha256\":\"217d4f2278c5ab7c06c72a2c6277420c8585f3c93375ed3b40775337feccff0a\",\"content_sha256\":\"5465f430217e9958150cee80d1c1cb057331229e46f957f892b6e3af1347eb24\",\"file_bytes\":1793,\"body_bytes\":510},{\"atom_id\":\"scrub-and-gate-artifact-sharing\",\"file_sha256\":\"4a0fa83c6d65da37ab2e9306602d074070e298a0d8e292bd6bd4bedaa542e253\",\"content_sha256\":\"bc2319a4970f58226187aa1977fabb33ea8ab631e0b4fd160ce34d6741a02e8c\",\"file_bytes\":2934,\"body_bytes\":1502},{\"atom_id\":\"state-diagnosis-problem\",\"file_sha256\":\"945589699b69663259c807094eb17bed04daaefee5749125ca42cb14c4d2f5b7\",\"content_sha256\":\"a9f70fd76de7cbebeff12a920075525faaef5ce638e296728d8d5d2c79d9ef08\",\"file_bytes\":1970,\"body_bytes\":917}]"
carrier_sha256: 775d15120119100cf7a6567e13bd1c447d16e58d61bf6c510025e8bbdf0e5086
carrier_bytes: 12243
revision: 1
status: active
---
<!-- vpmodule:atom:begin cite-evidence-lines -->
---
instruction_id: cite-evidence-lines
title: Cite a path and line for every finding
summary: "Every claim carries an absolute path, a line, a short quote, the turn range, and a confidence level; numbers come from records."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: You are writing a finding or a conclusion about an examined artifact.
conditions_does_not_apply_when: You are only describing the analysis method without making claims.
artifact_contract_output_type: cited-finding
artifact_contract_required_data:
  - path and line
  - quote
  - confidence
artifact_contract_verified_by: "every finding has a path:line citation"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/prompts/analyst-common.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Cite a path and line for every finding
Every finding cites `path:line`. No citation, no finding.
Every number comes from the transcript or from a command you ran.
Never from memory.
A finding states one sentence on what happened.
Its evidence is an absolute path and line.
Add a quote of at most 200 characters.
Record the first and last human turn the finding spans.
Record confidence as high, medium, or low.
The dispatcher discards any finding without a `path:line`, so do not write one.
If you found nothing, return `- none found` and the Checked line.
The Checked line names what you examined: files, line ranges, commands used.
Do not quote more than the evidence needs.
Do not use a paraphrase in place of the quoted source.
Never name a number you did not compute from the record.
<!-- vpmodule:atom:end cite-evidence-lines -->
<!-- vpmodule:atom:begin report-diagnosis-without-prescribing -->
---
instruction_id: report-diagnosis-without-prescribing
title: Report the evidence without prescribing a fix
summary: "State what happened with citations and confidence, name what could not be verified, and leave the change decision to the triager."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The analysis is complete and its results must be delivered.
conditions_does_not_apply_when: The report does not yet have supported findings.
artifact_contract_output_type: diagnosis-report
artifact_contract_required_data:
  - statement
  - environment
  - timeline
  - findings
  - limitations
artifact_contract_verified_by: every claim cites evidence and confidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/stated-failing-direction.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/verify-command-path-grounding.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-analyzer.md
status: active
revision: 7
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Report the evidence without prescribing a fix
You report; you do not diagnose the product.
Whoever triages the bundle or the issue decides whether the product changes.
Fill every section of the report template in order.
Write it to the workspace, show it, and give the path.
Check what cited content actually proves and preserve the supporting case.
A symlink alias is not a redundant copy.
Report §7 states involvement and stops.
Never name a defect in a skill or propose a change.
Your partner pressing for a fix does not waive this.
Point at the issue step and mention that a bundle is available on request.
No advice to your partner either.
Numbers you did not compute from the transcript are invented. Cite or drop.
Approval gates: no issue or comment before they approve the exact text.
Do not attribute intent to the implementer.
Describe what the code is; the reader decides what to change.
It states what the code shares, never what to change.
It reports, it never prescribes.
A prescribed statement would be copied verbatim and carry zero information — reproducing the original defect one level up.
The payload carries the target that failed and what was missing; there is deliberately no `suggestion` field.
Choosing the replacement is the planner's job — and the planner now has the prior phase's proven command to reach for.
<!-- vpmodule:atom:end report-diagnosis-without-prescribing -->
<!-- vpmodule:atom:begin require-human-authored-issue-summary -->
---
instruction_id: require-human-authored-issue-summary
title: Require a human-authored issue summary
summary: "Before filing an issue or public comment, require a human-authored summary in the owner's own words and a named filer; a placeholder means the report is not ready."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: An issue or public comment is about to be filed.
conditions_does_not_apply_when: Nothing is being filed or shared outside its origin.
artifact_contract_output_type: issue-report
artifact_contract_required_data:
  - who is filing and for whom
  - the owner's own summary
  - confirmation that the summary is not a placeholder
artifact_contract_verified_by: the owner's words are present and no placeholder remains
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/templates/issue.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/SKILL.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Require a human-authored issue summary
Before filing an issue or comment, get the owner's own words on what went wrong and what should have happened.
Paste them as written; if they run long, ask them to trim rather than editing their words.
Record who is filing and on whose behalf, with the request that led to the diagnosis or issue.
A placeholder summary means the report is not ready to file.
Do not file an issue or comment with a placeholder summary, and do not substitute your own summary for theirs.
<!-- vpmodule:atom:end require-human-authored-issue-summary -->
<!-- vpmodule:atom:begin scrub-and-gate-artifact-sharing -->
---
instruction_id: scrub-and-gate-artifact-sharing
title: "Scrub the artifact, audit it, then wait for approval"
summary: "Rewrite a copy with stable placeholders, let a separate auditor report misses, and share only after the log and file list are approved."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: "An artifact must be sent, published, or shown outside where it was created."
conditions_does_not_apply_when: The artifact never leaves its origin and holds no sensitive values.
artifact_contract_output_type: scrubbed-artifact
artifact_contract_required_data:
  - file list
  - replacement table
  - scrub log
  - approval
artifact_contract_verified_by: an independent scrub audit returns clean
compatibility_excludes: []
compatibility_requires:
  - protect-sensitive-artifacts
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/prompts/scrub.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/prompts/scrub-audit.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Scrub the artifact, audit it, then wait for approval
The scrubber rewrites every file under the bundle so it can leave this machine, and writes the scrub log.
It never touches anything outside the bundle.
Process every file, including the environment file and the findings.
Build the replacement map as you go and apply it to every file so a value first seen in the report is also replaced in the transcripts.
After rewriting, recount occurrences in all final non-log bundle files, excluding the scrub log.
Write the scrub log as a table of placeholder, category, and count.
Never write a plaintext replacement map or an original value into the log.
The auditor finds what the scrubber missed and reports; it does not fix anything.
Read every file under the bundle in full, in chunks if a file is larger than 200 KB.
Apply the shared policy to every file, including quoted transcript text, commit messages, git author lines, and encrypted payloads.
Return CLEAN only if no policy misses or unresolved classifications remain.
Otherwise return each miss with file, line, category, and a non-sensitive description.
Never include the original sensitive value.
CLEAN addresses privacy only; it does not establish that exported findings remain supported.
No archive before your partner has seen the scrub log and file list.
No issue or comment before your partner approves the exact text, and none with a placeholder summary.
A human-authored summary is required before filing; do not substitute your own.
<!-- vpmodule:atom:end scrub-and-gate-artifact-sharing -->
<!-- vpmodule:atom:begin state-diagnosis-problem -->
---
instruction_id: state-diagnosis-problem
title: State the problem before the analysis
summary: "Ask one question at a time until the statement names the session, the expectation, what happened, and the observable that matters."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "You need to find out why an agent's work went wrong."
conditions_does_not_apply_when: The problem is already stated as one specific event with bounds.
artifact_contract_output_type: problem-statement
artifact_contract_required_data:
  - expectation
  - what happened
  - observable
  - bounds
artifact_contract_verified_by: the owner confirms the statement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# State the problem before the analysis
Ask one question at a time until you can write a statement naming the session or sessions, the turn range if known.
That statement names what your partner expected, what happened, and the observable they care about.
"It took too long" is a complaint, not a problem statement.
Note whether the goal is a bug report for the maintainers.
Nothing in the later steps starts until your partner has answered.
If they are away, write the questions and stop.
A statement you reconstructed for them is not an answer.
An already-scoped request — one specific event, what is running now, or the analysis to run — is itself the statement.
Answer it, then ask.
A whole-session "why" is a complaint.
Do not add a cause to the statement.
Do not narrow the problem to the convenient part.
Record the statement in the case file.
Steps 5-7 of the workflow run only on their stated condition.
<!-- vpmodule:atom:end state-diagnosis-problem -->