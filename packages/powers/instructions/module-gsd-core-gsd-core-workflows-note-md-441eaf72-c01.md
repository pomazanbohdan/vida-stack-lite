---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-note-md-441eaf72-c01"
title: "gsd-core: gsd-core/workflows/note.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/note.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/note.md\"}"
atom_ids:
  - capture-the-text-verbatim
  - mark-the-source-as-promoted-when-you-promote-it
  - number-the-active-entries-and-keep-the-promoted-visible
  - treat-a-command-word-as-a-command-only-when-it-is-the-whole-argument
atom_count: 4
atoms: "[{\"atom_id\":\"capture-the-text-verbatim\",\"file_sha256\":\"0a0dff8979599dcc321776e46f3f3d8510029ed8953cb49eb5586c9dbbbf9dbf\",\"content_sha256\":\"4af3e961c08d43551a32bccbb27ca89a10440460bf1b06cde95ee80b040ed4e3\",\"file_bytes\":1388,\"body_bytes\":272},{\"atom_id\":\"mark-the-source-as-promoted-when-you-promote-it\",\"file_sha256\":\"f5fab5435889f601f50483fa94e182e69f6d3656150702d7407e4987744f5fcd\",\"content_sha256\":\"fd8bb285d77d9d7f3514a42b2e3729092b840b4acbe19b7a02c3f264b393fbae\",\"file_bytes\":1252,\"body_bytes\":182},{\"atom_id\":\"number-the-active-entries-and-keep-the-promoted-visible\",\"file_sha256\":\"ea286f2372f826daa8c9a2e6ba1af6d62fb265d9f8eb109184fe65e0c84af000\",\"content_sha256\":\"e1ccbe75866f68286380929fbf2160f3292c8adf9d778e397856fa7e4602e2ce\",\"file_bytes\":1423,\"body_bytes\":308},{\"atom_id\":\"treat-a-command-word-as-a-command-only-when-it-is-the-whole-argument\",\"file_sha256\":\"105404917828404620856ab53de36966bda5cb673e2f80fd8bc23413894d983a\",\"content_sha256\":\"4e2c60f601686f656b9165bceff16b9471b4d5d25475b146d1a76fbb4751a9e6\",\"file_bytes\":1341,\"body_bytes\":222}]"
carrier_sha256: 32161a0fad36120249712af1b82092cda60d112e15a61420084dc35650a8253d
carrier_bytes: 6025
revision: 1
status: active
---
<!-- vpmodule:atom:begin capture-the-text-verbatim -->
---
instruction_id: capture-the-text-verbatim
title: Capture the text verbatim
summary: "A quick capture is written exactly as it arrived — no edits, no questions, one confirmation line."
capability_tags:
  - capture-an-idea
pattern_tags:
  - evidence-analysis
conditions_applies_when: A short idea is captured for later.
conditions_does_not_apply_when: The capture is a structured form that asks for named fields.
artifact_contract_output_type: captured-note
artifact_contract_required_data:
  - the captured text
  - the scope it was captured in
  - the one confirmation line
artifact_contract_verified_by: the stored text matches the input character for character and no question was asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/note.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body defines generic verbatim idea capture and confirmation but gives no work context that supports a listed domain.
---

# Capture the text verbatim
Zero-friction idea capture. One Write call, one confirmation line. No questions, no prompts.
**Never modify the note text** — capture verbatim, including typos
**Never ask questions** — just write and confirm
Confirm with exactly one line:
<!-- vpmodule:atom:end capture-the-text-verbatim -->
<!-- vpmodule:atom:begin mark-the-source-as-promoted-when-you-promote-it -->
---
instruction_id: mark-the-source-as-promoted-when-you-promote-it
title: Mark the source as promoted when you promote it
summary: "A note that was turned into work is marked in its own record, so it is never counted or promoted twice."
capability_tags:
  - capture-an-idea
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A note is promoted into a work item.
conditions_does_not_apply_when: The note was already marked and the promotion is only being read.
artifact_contract_output_type: promotion-record
artifact_contract_required_data:
  - the note that was promoted
  - the mark that was written on it
artifact_contract_verified_by: the source record carries the promoted mark and a second promotion of it is refused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/note.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Mark the source as promoted when you promote it
Mark the source note file as promoted: update its frontmatter to `promoted: true`
Tell user "Note {N} is already promoted" and stop
<!-- vpmodule:atom:end mark-the-source-as-promoted-when-you-promote-it -->
<!-- vpmodule:atom:begin number-the-active-entries-and-keep-the-promoted-visible -->
---
instruction_id: number-the-active-entries-and-keep-the-promoted-visible
title: Number the active entries and keep the promoted ones visible
summary: The list numbers the active entries in order and shows the promoted ones dimmed instead of dropping them.
capability_tags:
  - capture-an-idea
pattern_tags:
  - output-formatting
conditions_applies_when: A list of captured entries is rendered.
conditions_does_not_apply_when: The list was already rendered and numbered.
artifact_contract_output_type: numbered-list
artifact_contract_required_data:
  - the active entries in order
  - the promoted entries shown dimmed
  - the note about how many entries were left out
artifact_contract_verified_by: the active entries are numbered sequentially and every promoted entry is still visible
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/note.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Number the active entries and keep the promoted ones visible
Sort by date, number all active entries sequentially starting at 1
Exclude files where `promoted: true` from active counts (but still show them, dimmed)
If total active entries > 20, show only the last 10 with a note about how many were omitted
<!-- vpmodule:atom:end number-the-active-entries-and-keep-the-promoted-visible -->
<!-- vpmodule:atom:begin treat-a-command-word-as-a-command-only-when-it-is-the-whole-argument -->
---
instruction_id: treat-a-command-word-as-a-command-only-when-it-is-the-whole-argument
title: Treat a command word as a command only when it is the whole argument
summary: A keyword is a subcommand only when it is the entire argument; anything else is content.
capability_tags:
  - capture-an-idea
pattern_tags:
  - strict-argument-parsing
conditions_applies_when: The input line could be read as a command or as content.
conditions_does_not_apply_when: The command was already recognised and the content was already separated.
artifact_contract_output_type: argument-parsing
artifact_contract_required_data:
  - the parsed subcommand
  - the text that was kept as content
artifact_contract_verified_by: "a keyword that was part of a longer phrase was stored as content, not executed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/note.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a command word as a command only when it is the whole argument
**Critical**: `list` is only a subcommand when it's the ENTIRE argument.
Same for `promote` — only a subcommand when followed by exactly one number.
<!-- vpmodule:atom:end treat-a-command-word-as-a-command-only-when-it-is-the-whole-argument -->