---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-audit
title: "Run the audit, rewrite or write protocol"
summary: "Confirm mode, reader and language; honor local style; read the checklist; verify facts before style; apply severity order; output the mandatory audit template, a scored rewrite with change log, or a document with TODO(verify) gaps."
capability_tags:
  - write-technical-prose
pattern_tags:
  - documentation-audit
conditions_applies_when: "Running a documentation audit, rewrite or write."
conditions_does_not_apply_when: A quick style-only edit.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The output follows the mandatory template and severity order, and no fact is invented or deleted."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L166-L192"
status: active
revision: 1
---

# Run the audit, rewrite or write protocol

Three modes share one discipline: intake -> local conventions -> read as the reader -> verify facts -> apply rules by severity -> output in a fixed shape. Protocol: (1) Intake — confirm mode (audit, improve, or write), document type, reader and level, and language; for write mode the reader's task and fact sources (code paths, existing docs) are required, do not start without them. (2) Local style guide — look for CONTRIBUTING.md, STYLE.md, docs/style-guide.md, .vale.ini, and conventions existing docs already follow; they win over Google; Vale with the Google package can automate the [EN] word/punctuation layer if wanted. (3) Read references/audit-checklist.md before any audit or improve pass; never cite a rule ID not read there. (4) Read the doc cold as the target reader, then check every command, flag, parameter, and behavior against the code before judging style. (5) Apply rules in severity order: Blocking -> High (structure, accessibility, missing reference entries) -> Medium (voice, notices, intro sentences) -> Low (word list, punctuation [EN]). (6) Output — a finding's location is one the reader can find (heading path plus line number when auditing a file); improve mode outputs a one-line 'Score before -> after', the full rewritten document, then a '## Change log' table (Change | Rule ID + name | Why); write mode outputs the document with TODO(verify) for every gap. Facts stated in the source document count as received from the user: keep them, marked TODO(verify) when unconfirmed, never delete them; never include a command, flag, or parameter not seen in code or received from the user. Audits must always use the fixed template: '# Documentation Audit: [path or title]' with Score X/10 and band, Shippable yes/no, Diagnostic N/10 with failed rows and reasons, Doc type/reader, Language, Local style guide, Blocking findings, a Findings table (# | Location | Rule ID+name | Before | After | Severity), and a Rewrite plan ordered structure -> voice -> words.
