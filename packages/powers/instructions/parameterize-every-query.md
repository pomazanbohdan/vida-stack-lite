---
instruction_id: parameterize-every-query
title: Parameterize every query
summary: "Never build a SQL, NoSQL or shell command from an input string, and bind the input as a parameter instead."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: Code builds a query or a command from data that came from outside the program.
conditions_does_not_apply_when: The query is a fixed literal with no external input.
artifact_contract_output_type: query-hardening
artifact_contract_required_data:
  - the query
  - its parameterized form
artifact_contract_verified_by: no query string in the changed code is built by concatenation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 1
---

# Parameterize every query

Parameterize every query.
Never build SQL, NoSQL, or shell commands from input strings.
