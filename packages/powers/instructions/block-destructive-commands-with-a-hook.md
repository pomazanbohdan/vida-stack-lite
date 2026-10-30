---
instruction_id: block-destructive-commands-with-a-hook
title: Block destructive commands with a hook
summary: "Intercept and block destructive version-control commands before they execute, and verify the hook actually blocks them."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: An executor could run a destructive version-control command by mistake.
conditions_does_not_apply_when: The commands are already guarded by the environment.
artifact_contract_output_type: blocking-hook
artifact_contract_required_data:
  - blocked commands
  - hook scope
  - block test result
artifact_contract_verified_by: a blocked command exits with the block signal and a message
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/misc/git-guardrails-claude-code/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Block destructive commands with a hook
Set up a pre-tool hook that intercepts and blocks dangerous version-control commands before the agent executes them.
## What Gets Blocked
- `git push` (all variants including `--force`)
- `git reset --hard`
- `git clean -f` / `git clean -fd`
- `git branch -D`
- `git checkout .` / `git restore .`
When blocked, the agent sees a message telling it that it does not have authority to access these commands.
## Steps
### 1. Ask scope
Ask the user: install for **this project only** or **all projects**?
### 2. Copy the hook script
Copy the bundled script to the target location based on scope. Make it executable.
### 3. Add hook to settings
Add to the appropriate settings file. If the settings file already exists, merge the hook into the existing hook array. Don't overwrite other settings.
### 4. Ask about customization
Ask if the user wants to add or remove any patterns from the blocked list. Edit the copied script accordingly.
### 5. Verify
Run a quick test:
```
echo '{"tool_input":{"command":"git push origin main"}}' | <path-to-script>
```
Should exit with a block code and print a BLOCKED message to stderr.
