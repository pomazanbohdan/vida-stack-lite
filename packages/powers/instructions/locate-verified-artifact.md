---
instruction_id: locate-verified-artifact
title: Locate and confirm the artifact
summary: "Resolve the named session to an absolute path and confirm its identity by id, directory, timestamps, and content, not recency."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The analysis needs one specific artifact or session.
conditions_does_not_apply_when: The exact path is already confirmed and belongs to this analysis.
artifact_contract_output_type: located-artifact
artifact_contract_required_data:
  - absolute path
  - identity evidence
  - rejected candidates
artifact_contract_verified_by: "identity confirmed by id, time, and content"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/references/session-discovery.md
status: active
revision: 1
---

# Locate and confirm the artifact
Resolve the session your human partner named using the tools and information available in this environment.
Your knowledge can suggest where to look; verify the result against the actual history.
Use the harness's exposed session tools, configured storage, local help, documentation, or bounded filesystem inspection.
Measure files before reading their content and follow context safety.
Inspect archives or indexes when the environment points to them.
A supplied usable path does not need another search.
Confirm identity using the available session id, working directory, timestamps, and matching conversation content.
Recency alone is not confirmation.
Distinguish the requested session from its children and unrelated candidates.
Ask for a missing identifying fact when the available evidence cannot distinguish them.
For each filesystem source, obtain its full absolute path from the environment, with home-directory shorthand and variables expanded.
Use that same path in the case record and in the discovery answer you give your human partner.
If history is missing, inaccessible, or ambiguous, state the specific limitation and ask for the missing path, export, or identifying detail.
Do not modify the artifact you found.
