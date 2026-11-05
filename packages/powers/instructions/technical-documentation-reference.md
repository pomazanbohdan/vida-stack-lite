---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-reference
title: Complete reference documentation
summary: "Document every public class, method, field, constant and enum; open with the category verb; document parameters, returns and exceptions; name replacements for deprecated elements and give CLI help a usage line, synopsis and every flag."
capability_tags:
  - write-technical-prose
pattern_tags:
  - reference-completeness
conditions_applies_when: "API reference, docstrings or CLI help."
conditions_does_not_apply_when: Internal code with no public surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every public element has a consistent entry with parameters, returns and exceptions."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L131-L148"
status: active
revision: 1
---

# Complete reference documentation

Reference documentation rules (API, docstrings, CLI help): reference text is descriptive, complete, and formulaic — every entry must exist and read the same way. Document every public class, method, field, constant, and enum value; a missing entry reads as 'unsupported'. Method descriptions open with the category verb: 'Gets the...', 'Sets the...', 'Checks whether...', 'Creates a...', 'Returns...' — never 'This method...'. Non-boolean parameters start 'The...' or 'A...'; booleans read 'If true, ... If false, ...' (action) or 'True if ...; false otherwise' (state). Document return values and exceptions ('Thrown when...') for every method that has them. A deprecated element names its replacement in the first sentence. CLI --help (convention — Google has no --help page): usage line in [optional] syntax, one-line synopsis, every flag described with the same placeholder style.
