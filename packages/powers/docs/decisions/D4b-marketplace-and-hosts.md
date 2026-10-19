---
type: Decision
title: 'D4b — Marketplace-власник VP і набір хостів першого релізу'
description: 'packages/powers сам є marketplace-власником VP із per-host маніфестами; Codex — перевірений перший хост, решта хостів — заявлена підтримка з позначеним обмеженням.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- marketplace
- delivery-channel
- host-compatibility
- decision
sources:
- id: d4
  resource: /decisions/D4-delivery-channels.md
  title: D4 — Канали доставки VP
- id: superpowers-marketplace
  resource: https://github.com/obra/superpowers/blob/main/.claude-plugin/marketplace.json
  title: Superpowers — marketplace manifest (репозиторій = плагін і marketplace)
- id: cursor-plugins-marketplace
  resource: https://github.com/cursor/plugins/blob/main/.claude-plugin/marketplace.json
  title: Cursor plugins — marketplace монорепозиторію
- id: cloud-pstack-setup
  resource: /../../tooling/agent/cloud-pstack-setup.ts
  title: Cloud Pstack setup — встановлення плагінів через Git marketplace
- id: native-delivery-workflow
  resource: /../../.github/workflows/agent-native-delivery.yml
  title: Agent native delivery — патерн дзеркала Source для публікації
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
relation: refines D4
revision: '1'
---

# Рішення

**`packages/powers` сам є marketplace-власником VP.** Він несе per-host
`marketplace.json` (перелік плагінів) і `plugin.json` (опис самого плагіна) з
`source: "./"`, публікується як Git-репозиторій і встановлюється через
`codex plugin marketplace add <git-url>`.

**Набір хостів першого релізу:** **Codex — перевірений** (є інструмент встановлення
і кваліфікація trusted hook у репозиторії). **Claude Code, Cursor, Muse, Antigravity,
Devin, Kimi — заявлена підтримка**: per-host маніфести й конвенції їхніх
каталогів підтримуються, але в матриці сумісності неперевірене позначається
обмеженням, а не рівним PASS.

# Контекст і докази

- `superpowers` — гібрид: сам і плагін, і marketplace (`.claude-plugin/marketplace.json`
  + `.codex-plugin/plugin.json`); `source` вказує на корінь репозиторію.
- `cursor/plugins` — marketplace у коренні репозиторію, плагіни у підкаталогах зі
  своїми маніфестами; `source: "./<dir>"`. Схема для багатьох плагнів, коли їх
  стане кілька.
- `.agents/plugins/marketplace.json` — і ще один host-каталог конвенції, який уже
  присутній у репозиторії як `.agents/skills/`.
- Репозиторій уже вміє встановлювати плагіни з Git-маркетплейсу:
  `codex plugin marketplace add <source>` (`tooling/agent/cloud-pstack-setup.ts:49`).
- Репозиторій уже вміє публікувати дзеркало Source-каталогу окремою репозиторієм
  (патерн `Copy-SourceDirectory packages/agent → $package` у
  `.github/workflows/agent-native-delivery.yml`).

# Наслідки

1. **Публікація marketplace** використовує наявний патерн дзеркала Source-каталогу:
   CI збирає `packages/powers` (з per-host маніфестами) у публічний Git-репозиторій.
   Канонічна копія лишається в монорепозиторії; published-копія — згенерований
   артефакт із декларованим Source-зв'язком.
2. **Пер-хостові маніфести** (`plugin.json` + `marketplace.json`) стають
   артефактом Stage 5; їх схеми валідуються тестом.
3. **Матриця хостів** (Stage 8) розрізняє `verified` і `declared`: для Codex —
   фактична інсталяція з доказом; для решти — заявлена підтримка з явним
   обмеженням (research §3: host-specific адаптер без вигаданих гарантій).
4. **Публічна поверхня** marketplace вимагає метаданих продукту: `version`,
   `license`, `owner`, URL-поля privacy/terms (як у `interface{}` у
   `superpowers/.codex-plugin/plugin.json`).
5. **Окремий marketplace-репозиторій** (варіант «як cursor/plugins») не
   заводиться зараз; він стане доречним, коли плагнів стане кілька.

# Розглянуті варіанти

| Варіант | Суть | Висновок |
|---|---|---|
| (a) Marketplace у коренні `vida-stack-lite` | Репозиторій агента одночасно є marketplace | Відхилено: змішує native-доставку агента з публічним marketplace; marketplace має належати продукту VP |
| (b) `packages/powers` сам є marketplace | Власні маніфести, `source: "./"`, публікація як Git-репозиторій | **Прийнято** |
| (c) Окремий marketplace-репозиторій | Перелік плагнів у власному репо | Відхилено: розриває зв'язок VP↔marketplace й додає репозиторій до моделі; доречний, коли плагнів стане кілька |
| Хости: усі з обов'язковим PASS | Перевірити інсталяцію на кожному | Відхилено: зовнішніх залежностей більше, ніж цінність першого релізу |
| Хости: лише Codex | Один хост у першому релізі | Відхилено: per-host конвенції вже відомі, а заявлена підтримка з чесним обмеженням не створює ризику |

# Вплив на інші рішення

- D5 (Decision Provider), D7 (layout споживача), D8 (схема профілю) не змінюються.
- Stage 5: додаються пер-хостові маніфести й патерн публікації дзеркала.
- Stage 8: матриця хостів із розрізненням `verified` / `declared`.

# Повноваження

Рішення власника репозиторію від 2026-10-19, зафіксоване в поточній розмові.
Уточнює D4; D4 не скасовується.
