---
instruction_id: force-quote-every-token-when-you-mediate-a-batch-file
title: Force-quote every token when you mediate a batch file
summary: "Every token handed to a batch interpreter is force-quoted, because an unquoted value that contains a command separator becomes a second command; a value that cannot be represented is refused."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A command line is built for a batch-file interpreter.
conditions_does_not_apply_when: The command is executed directly without an interpreter.
artifact_contract_output_type: force-quoting
artifact_contract_required_data:
  - the quoting applied to each token
  - the value that is refused
  - why the separator case matters
artifact_contract_verified_by: every token was force-quoted and the unrepresentable value was refused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/security-model.md
status: active
revision: 1
---

# Force-quote every token when you mediate a batch file
- Force-quoting is the point — an unquoted `a&calc` is split by `cmd` into two commands, while a quoted `"a&calc"` is one literal argument.
- An argument containing a carriage return or newline is refused rather than mediated.
