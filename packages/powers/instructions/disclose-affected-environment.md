---
instruction_id: disclose-affected-environment
title: Disclose the environment and affected versions
summary: "Every report names the product, harness, models, plugins, OS, and shell, with a provenance label and a supporting location for each."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: A report or a diagnosis describes a failure that depends on the environment.
conditions_does_not_apply_when: The failure reproduces regardless of environment and versions.
artifact_contract_output_type: environment-disclosure
artifact_contract_required_data:
  - product and version
  - environment
  - provenance
  - supporting location
artifact_contract_verified_by: every environment field has a source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/templates/issue.md
status: active
revision: 1
---

# Disclose the environment and affected versions
Every environment field carries a value, a provenance label, and a supporting evidence location.
Record the product version and whether it is a checkout.
Record the harness, the harness version, and the model ids seen.
Record all plugins installed, the OS, and the shell.
Label each field as historical evidence, unverified snapshot, current observation, or unknown.
State whether the reporter confirmed the issue does not occur without the product installed.
The reporter has not tried reproducing without the product installed.
Evidence for involvement does not establish cause.
Record the session ids and the redaction level of any delivered archive.
Attach a bundle only after approval.
List the model, harness, and harness version in the issue itself.
List the installed plugins there too.
Do not hide the environment that produced the contribution.
Do not claim a reproduction that was not run.
