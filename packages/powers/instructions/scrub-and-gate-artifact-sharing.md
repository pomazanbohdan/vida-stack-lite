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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/scrub.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/scrub-audit.md
status: active
revision: 4
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
