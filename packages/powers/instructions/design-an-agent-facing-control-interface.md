---
instruction_id: design-an-agent-facing-control-interface
title: Design an agent-facing control interface
summary: "Give agents one control interface that implements the contract for the target app: real user actions, stable handles, read-only inspection, and explicit capabilities."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: An agent needs to start and drive the app to prove behavior.
conditions_does_not_apply_when: A control interface that already implements the contract is configured.
artifact_contract_output_type: control-interface
artifact_contract_required_data:
  - capabilities
  - user actions
  - stable handles
  - read-only inspection
  - cleanup
artifact_contract_verified_by: an agent completing the task from the help text alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/06-verify-and-ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Design an agent-facing control interface
One control skill or adapter implements the contract for the target app.
If the skill, the feature map, or a required capability is absent, ambiguous, or incomplete, the work must fail closed.
Start the requested app revision in the requested test environment.
The adapter must distinguish the target app from a similar window, shell, or production instance.
Perform real user actions: click, type, press keys, scroll, drag, resize, and navigate through app controls.
Prefer roles, labels, and stable selectors, and use coordinates only after a fresh screenshot.
Do not set internal state, call hidden app methods, write directly to storage, or inject DOM changes to create the symptom.
Use roles, accessible names, ARIA relationships, stable component markers, and purpose-named data attributes.
Never use generated CSS or StyleX classes, dynamic hashes, child indexes, or brittle DOM position.
Inspection is read-only; if a query changes state, it belongs in drive and must represent a real user action.
Report capabilities before the work starts, and report which feature-map sections it can drive and which are blocked.
Use the same environment inputs for baseline and patched builds.
Surface startup failures as failures.
Bound retries.
Keep secrets out of logs and artifacts.
Keep captures outside the repository.
Avoid production changes unless the user explicitly configured a safe test action.
When agents keep writing throwaway scripts to drive the app, ask for a small control CLI that the skill calls instead.
A control CLI that agents use well has a few composable commands, each doing real work, rather than many thin ones.
It has a dry-run option on anything destructive, and error messages that say what to do instead.
Its subcommands reveal features gradually instead of all at once, its help text is rich, and its output is machine-readable, such as JSON.
