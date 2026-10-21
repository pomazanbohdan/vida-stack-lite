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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/detail/elaboration.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sync-skills.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/security-hardening.md
status: active
revision: 2
---

# Never interpolate content into a shell command

**Never interpolate the artifact into a shell-quoted argument.** Code, markdown, and review prompts routinely contain backticks, `$(...)`, and quote characters that will either truncate the prompt or execute embedded shell. Write the full prompt to a file and pipe it through stdin.

Mind shell escaping. If the artifact contains quotes, `$(...)`, or backticks, prefer stdin (`echo … | gemini`) or a heredoc over inline `-p "…"`. When in doubt, ask the user to confirm the invocation before running it.

A read-only sandbox is the load-bearing detail: a doubt artifact may itself contain instructions (intentional or accidental prompt injection) that the cross-model CLI would otherwise execute against your workspace.
Never shell-interpolate the prompt — always pipe via stdin to prevent injection
never run it unbounded
feed it on STDIN through a QUOTED heredoc
never as a shell argument, so the shell never parses, expands or word-splits it
Reject any value that is not a runtime-id shape BEFORE it reaches them, so a hostile value (e.g. `--to '$(cmd)'`, captured wholesale by the parser) cannot execute via command substitution in an error message.
Shell argument validation — sanitizes user text before shell interpolation
