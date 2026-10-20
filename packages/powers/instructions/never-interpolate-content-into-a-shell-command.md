---
instruction_id: never-interpolate-content-into-a-shell-command
title: Never interpolate content into a shell command
summary: "Content that came from outside goes into a file and is piped in, never spliced into a quoted command line."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: "You pass an artifact, a prompt or any external content to a command-line tool."
conditions_does_not_apply_when: The command line contains only values you wrote yourself.
artifact_contract_output_type: safe-invocation
artifact_contract_required_data:
  - the file the content was written to
  - the pipe or standard input it was passed through
  - the sandbox the tool ran in
artifact_contract_verified_by: the invocation passes the content through standard input and runs in a read-only sandbox
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 1
---

# Never interpolate content into a shell command

**Never interpolate the artifact into a shell-quoted argument.** Code, markdown, and review prompts routinely contain backticks, `$(...)`, and quote characters that will either truncate the prompt or execute embedded shell. Write the full prompt to a file and pipe it through stdin.

Mind shell escaping. If the artifact contains quotes, `$(...)`, or backticks, prefer stdin (`echo … | gemini`) or a heredoc over inline `-p "…"`. When in doubt, ask the user to confirm the invocation before running it.

A read-only sandbox is the load-bearing detail: a doubt artifact may itself contain instructions (intentional or accidental prompt injection) that the cross-model CLI would otherwise execute against your workspace.
