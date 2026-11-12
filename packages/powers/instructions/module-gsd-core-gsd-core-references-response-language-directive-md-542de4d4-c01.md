---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-response-language-directive-md-542de4d4-c01"
title: "gsd-core: gsd-core/references/response-language-directive.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/response-language-directive.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/response-language-directive.md\"}"
atom_ids:
  - pass-the-response-language-into-every-spawned-agent
  - translate-the-prose-and-keep-the-structure
atom_count: 2
atoms: "[{\"atom_id\":\"pass-the-response-language-into-every-spawned-agent\",\"file_sha256\":\"8c48c4864dbc2169b2a02cf1db016a84ebcc4f62dbd93e6c8311725a8fc6521a\",\"content_sha256\":\"0e9560ba9a266f64874c0a70d4c0cbe1fa6b242b150ca9050e4c2257cf60db61\",\"file_bytes\":1671,\"body_bytes\":524},{\"atom_id\":\"translate-the-prose-and-keep-the-structure\",\"file_sha256\":\"949e46cf67c89e6b2c3fbd62864fd51aa671312d4b6af5223012dac43aee2f34\",\"content_sha256\":\"a87bf8de1f035353c4f58aee23290b155edb4ab30d1438344d42d49d40252344\",\"file_bytes\":1721,\"body_bytes\":469}]"
carrier_sha256: 31212f4f3f3d4d3030b491de5836a1fa10aa3e97752645088b978a7308992f60
carrier_bytes: 3693
revision: 1
status: active
---
<!-- vpmodule:atom:begin pass-the-response-language-into-every-spawned-agent -->
---
instruction_id: pass-the-response-language-into-every-spawned-agent
title: Pass the response language into every spawned agent
summary: "A configured response language covers every user-facing output of the run, and it is passed into every spawned agent so their output stays in that language too."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A response language is configured for the run.
conditions_does_not_apply_when: No response language is configured.
artifact_contract_output_type: language-directive
artifact_contract_required_data:
  - the configured language
  - the prompts that carry it
artifact_contract_verified_by: every spawned agent received the language and every user-facing output is in it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/response-language-directive.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - operations
---

# Pass the response language into every spawned agent
**If `response_language` is set**
ALL user-facing output of this workflow MUST be in that language - narration between tool calls, status updates, progress notes, findings, banners, report prose,
questions (option menu or plain text),
and summaries. Technical terms, code, file paths, commands, and identifiers stay in English.
Pass `response_language: {value}` into every spawned subagent prompt so any user-facing output they produce stays in the configured language.
<!-- vpmodule:atom:end pass-the-response-language-into-every-spawned-agent -->
<!-- vpmodule:atom:begin translate-the-prose-and-keep-the-structure -->
---
instruction_id: translate-the-prose-and-keep-the-structure
title: Translate the prose and keep the structure
summary: "An embedded template is a structural source, not literal output: its prose is rendered in the configured language while the headings' markers, the table columns, the ids, the commands and the file paths stay as they are."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A template or banner written in one language is rendered for a run in another language.
conditions_does_not_apply_when: The block is required to be emitted byte for byte.
artifact_contract_output_type: rendered-template
artifact_contract_required_data:
  - the translated prose
  - the structural markers that stayed
artifact_contract_verified_by: "the prose is translated and the headings' markers, columns, ids, commands and paths are unchanged"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/response-language-directive.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Translate the prose and keep the structure
Literal English report/banner templates embedded in a workflow are a structural SOURCE, not literal output to copy verbatim - render their prose translated into `{response_language}` while keeping headings' structural markers, table columns, IDs, commands, and file paths unchanged. Exception: blocks a workflow explicitly requires to be emitted byte-for-byte (e.g. pre-rendered checkpoints) are output exactly as rendered.
<!-- vpmodule:atom:end translate-the-prose-and-keep-the-structure -->