---
type: Decision
title: 'D6 — Product change log: a bundle log per Open Knowledge Format'
description: 'The change history of VP concepts is kept in the bundle log packages/powers/docs/log.md per the Open Knowledge Format v0.2 format (§9); a separate *changelog.md file is not maintained.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- change-log
- okf
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: okf
  resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
  title: Open Knowledge Format v0.2
- id: bundle-index
  resource: /index.md
  title: Bundle index of the Vida Powers documentation
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

# Decision

The change history of Vida Powers concepts is kept **in the bundle log
`packages/powers/docs/log.md`** per the Open Knowledge Format v0.2 format (§9): date,
kind of change, what exactly changed. A separate `*changelog.md` file is **not maintained**.

# Context

- Research §7.1 requires a separate linked change log / audit artifact that
  records the content change, the date, the actor and the reason, and that does not mix with
  the thematic research.
- Open Knowledge Format v0.2 §9 defines the log as a separate `log.md` file in
  the hierarchy, with date headings in the ISO 8601 `YYYY-MM-DD` format and entries
  newest first.
- Our bundle already has `log.md`; the research document referenced a non-existent
  `vida-powers-product-research.changelog.md` (a frontmatter error, fixed
  to `vida.changelog_ref: /log.md`).

# Consequences

1. `vida.changelog_ref` in the research document points to `/log.md` (a bundle-relative
   path).
2. Any change of a VP concept is accompanied by an entry in `log.md` (date, kind of
   change, what changed).
3. The thematic research document does **not** contain a change log in its body (§7.1).
4. Log entries are part of the bundle and pass the `check-okf.ts` check.

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) A separate `*changelog.md` per document | Its own history for research | Rejected: duplicates the bundle log and diverges from the OKF convention |
| (b) Bundle log `log.md` | One history for the whole bundle | **Accepted** |

# Impact on other decisions

- D1, D2 do not change.
- Other VP decision records keep their own history through `revision` in the frontmatter and
  the bundle log.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
