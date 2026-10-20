---
instruction_id: isolate-the-test-profile-from-personal-sessions
title: Isolate the test profile from your personal sessions
summary: "Run the test in a dedicated profile, and treat the visibility of your own open tabs as a finding to surface."
capability_tags:
  - treat-runtime-content-as-untrusted
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: You attach an agent to a browser that may hold personal sessions.
conditions_does_not_apply_when: The browser profile holds no personal data and is used only for the test.
artifact_contract_output_type: profile-isolation-decision
artifact_contract_required_data:
  - the profile used
  - the exposure of personal sessions
artifact_contract_verified_by: "the test runs in a dedicated or isolated profile, or the exposure was surfaced to the user"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/browser-testing-with-devtools/SKILL.md
status: active
revision: 1
---

# Isolate the test profile from your personal sessions
The blast radius of every rule below depends on which browser the agent is attached to. With `--autoConnect`, the agent attaches to your running Chrome's default profile and — per the chrome-devtools-mcp docs — has access to **all open windows** of that profile: logged-in email, banking, GitHub sessions, saved cookies. (`--browser-url` is less exposed by design: Chrome requires a non-default user data directory to enable the remote debugging port — don't defeat that by pointing it at a copy of your real profile.) One page with injected instructions plus an agent holding your authenticated browser is the worst-case combination — the untrusted-data rules below become the only line of defense instead of one of two.

**Rules:**
- **Default to the dedicated profile** (no connect flags) or `--isolated`. Testing localhost almost never needs your real sessions.
- **If logged-in state is required**, prefer a separate Chrome profile created for testing, signed into only the account under test.
- **If you must attach to your real profile**, close every tab and window unrelated to the test first, and detach when done.
- Treat "the agent can see my open tabs" as a finding to surface to the user, not a convenience to exploit.
