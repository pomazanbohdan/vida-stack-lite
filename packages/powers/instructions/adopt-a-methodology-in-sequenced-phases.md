---
instruction_id: adopt-a-methodology-in-sequenced-phases
title: Adopt a methodology in sequenced phases
summary: "An established codebase is approached protectively first: the practices that read and protect it come first, the ones that change it come later, and the whole lifecycle is never loaded in one go."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A methodology is being introduced into a codebase that already exists.
conditions_does_not_apply_when: The project is new and has no existing behaviour to protect.
artifact_contract_output_type: adoption-order
artifact_contract_required_data:
  - the phases
  - what each phase adds
  - the gate each phase leaves on
artifact_contract_verified_by: the phases are ordered protective-first and each names the gate it leaves on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/adoption-guide.md
status: active
revision: 1
---

# Adopt a methodology in sequenced phases
In an established codebase, the risk profile inverts: the danger isn't building the wrong thing, it's _changing_ something whose behavior nobody fully specified. The adoption order therefore starts with the skills that **read and protect** the codebase, and only later moves to the skills that **change** it.
Goal: the agent understands the codebase before it modifies anything.
Goal: two-speed adoption, legacy code stays under the Phase 1–2 regime; **new features get the greenfield treatment**.
The five-step triage (reproduce → localize → reduce → fix → guard) shines in unfamiliar code, and the "guard" step starts building the regression suite you don't have.
Legacy code is exactly the "unfamiliar code, high cost of being wrong" scenario this skill targets. Adversarial fresh-context review of the agent's claims about how the legacy system works catches confident hallucinations before they become commits.
Run it once across the existing attack surface (auth, input handling, dependencies, the dependency audit alone usually pays for the exercise), file what you find, then enforce it on new changes.
code-as-liability, compulsory vs. advisory deprecation, and zombie-code removal give you a disciplined way to shrink the legacy surface instead of just wrapping it.
retrofitted along the paths you actually debug: structured logging and RED metrics on the top incident sources first.
its measure-first rule prevents the classic legacy trap of optimizing code that was never the bottleneck.
**"Big bang" adoption.** Loading the full lifecycle onto a legacy codebase on day one produces specs for code that already exists and refactors without safety nets. Sequence it.
**Letting the agent refactor untested code.**
**Skipping
the project rules file
because "the code is the documentation."**
**Loading all skills into every session.** It wastes context and dilutes the ones that matter. Load by phase
**Deferring observability until "there's something to observe."** Instrument as you build, retrofitting structured logging is a brownfield problem you're choosing to create.
**Skipping the spec
because "it's just a prototype."** Prototypes become products. The spec is the cheapest artifact you'll ever write for this codebase.
Greenfield gets there in days; brownfield gets there in a quarter, and the difference is exactly the safety nets (context, characterization tests, boundaries) that the old codebase never had.
**From the start, treat these as always-on**
coverage debt is cheapest to avoid at zero.
