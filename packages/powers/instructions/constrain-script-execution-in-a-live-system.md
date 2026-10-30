---
instruction_id: constrain-script-execution-in-a-live-system
title: Constrain script execution in a live system
summary: "Execute in a running system for inspection, not for changing behaviour, and never for requests or credentials."
capability_tags:
  - treat-runtime-content-as-untrusted
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: You inspect a live system by executing code in its context.
conditions_does_not_apply_when: The change to the live system is the task and the user confirmed it.
artifact_contract_output_type: runtime-inspection-record
artifact_contract_required_data:
  - what was inspected
  - the observed state
artifact_contract_verified_by: no side effect was produced without an explicit confirmation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/browser-testing-with-devtools/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Constrain script execution in a live system
The JavaScript execution tool runs code in the page context. Constrain its use:

- **Read-only by default.** Use JavaScript execution for inspecting state (reading variables, querying the DOM, checking computed values), not for modifying page behavior.
- **No external requests.** Do not use JavaScript execution to make fetch/XHR calls to external domains, load remote scripts, or exfiltrate page data.
- **No credential access.** Do not use JavaScript execution to read cookies, localStorage tokens, sessionStorage secrets, or any authentication material.
- **Scope to the task.** Only execute JavaScript directly relevant to the current debugging or verification task. Do not run exploratory scripts on arbitrary pages.
- **User confirmation for mutations.** If you need to modify the DOM or trigger side-effects via JavaScript execution (e.g., clicking a button programmatically to reproduce a bug), confirm with the user first.
