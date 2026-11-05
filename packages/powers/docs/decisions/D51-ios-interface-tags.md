---
type: Decision
title: 'D51 - iOS interface tags for the H2 ios-hig-design batch'
description: 'One capability and nine pattern tags with catalog definitions let platform idiom, safe areas, Dynamic Type, semantic color, navigation, native controls, accessibility, SF Symbols and gestures carry accurate metadata.'
status: stable
stale_after: '2027-11-05T00:00:00Z'
tags:
- vida-powers
- product
- pattern-tags
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 - Blind three-protocol panel
---

# D51 — iOS interface tags for the H2 ios-hig-design batch

Date: 2026-11-05
Status: accepted

## Context

The H2 source-admission panel is applying `ios-hig-design`. The source designs
native iOS interfaces through clarity, deference and depth, with safe areas,
Dynamic Type, semantic color, native navigation, system controls, accessibility,
SF Symbols, reserved gestures and haptics. Existing product/UX tags do not cover
this platform vocabulary.

## Decision

Add one capability and nine pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-ios-interface` | Ability to design native iOS interfaces that respect platform conventions and accessibility. |
| pattern | `ios-platform-idiom` | An approach in which clarity, deference and depth guide an iOS interface. |
| pattern | `ios-safe-area` | An approach in which content and controls respect safe-area insets on every device. |
| pattern | `dynamic-type` | An approach in which semantic text styles scale with the user's preferred size. |
| pattern | `semantic-color` | An approach in which system semantic colors adapt between light and dark appearances. |
| pattern | `ios-navigation` | An approach in which tab bars, navigation stacks and modals follow iOS conventions. |
| pattern | `native-control` | An approach in which system controls are preferred over custom reimplementations. |
| pattern | `ios-accessibility` | An approach in which VoiceOver, Dynamic Type and assistive technologies are first-class requirements. |
| pattern | `sf-symbols` | An approach in which SF Symbols carry standard iconography and scale with text. |
| pattern | `ios-gesture-haptic` | An approach in which standard gestures are preserved and haptics confirm meaningful actions. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`ios-hig-design` uses `design-ios-interface` with these patterns. The score,
common-mistakes and quick-diagnostic instructions carry pattern tags only, with
capability exemptions. This is H2 source admission; structured applicability
under the H2 v2 contract remains pending.

## Consequences

`catalog.json` revision advances by the ten tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
