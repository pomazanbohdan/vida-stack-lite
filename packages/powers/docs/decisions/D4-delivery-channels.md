---
type: Decision
title: 'D4 — Канали доставки VP: окремий плагін, збірка в пакет агента, marketplace'
description: 'У поточний scope входять три канали доставки VP — окремий плагін, збірка в пакет поставки агента та публічний marketplace-канал; поверхня скілів VP: vp-mode (основний скіл оркестрації) і vp-setup (допоміжний налаштування).'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- distribution
- delivery-channel
- skills
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: superpowers-plugin-manifest
  resource: https://github.com/obra/superpowers/blob/main/.codex-plugin/plugin.json
  title: Superpowers — plugin manifest для Codex
- id: superpowers-marketplace
  resource: https://github.com/obra/superpowers/blob/main/.claude-plugin/marketplace.json
  title: Superpowers — marketplace manifest
- id: cursor-plugins-marketplace
  resource: https://github.com/cursor/plugins/blob/main/.claude-plugin/marketplace.json
  title: Cursor plugins — marketplace монорепозиторію
- id: cloud-pstack-setup
  resource: /../../tooling/agent/cloud-pstack-setup.ts
  title: Cloud Pstack setup — встановлення плагінів через Git marketplace
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '2'
---

# Рішення

**У поточний scope входять три канали доставки VP:**

1. **Окремий плагін VP** — самостійний плагін зі своїми скілами, хуком і скриптами
   каталогу; встановлення через `vp-setup`; працює в сумісних хостах без Runtime.
2. **Збірка в пакет поставки агента** — VP-інструкції їдуть у нативну поставку
   агента разом із розширеним instruction registry (D3); канонічна копія лишається
   в VP, у пакет — згенерований артефакт із декларованим Source-зв'язком.
3. **Marketplace-канал** — публічний розподіл VP як плагіна через Git-маркетплейс
   хоста; вимагає власного marketplace-визначення, яке в репозиторії ще немає.

**Поверхня скілів VP:**

- **`vp-mode`** — **основний скіл оркестрації**: запит звичайною мовою → вибір
  інструкцій → bundle → делегування або виконання. Це та сама «одна робоча точка
  входу», яку research називає Router Skill.
- **`vp-setup`** — **допоміжний скіл налаштування**: виявлення проєктів, ідемпотентне
  керування інтеграційним блоком, налаштування доступних hooks, зіставлення layout,
  перевірка активації. Не запускається на кожен запит.

# Як влаштована доставка плагінів (доказ із наявних донорів)

**Plugin manifest — по директорії хоста.** Один репозиторій публікує себе в
багато хостів через окремі каталоги маніфестів:

| Хост | Файл |
|---|---|
| Codex | `.codex-plugin/plugin.json` |
| Claude Code | `.claude-plugin/plugin.json` |
| Cursor | `.cursor-plugin/plugin.json` |
| Muse | `.muse-plugin/plugin.json` |
| Antigravity | `.antigravity-plugin/plugin.json` |
| Devin | `.devin-plugin/plugin.json` |
| Kimi | `.kimi-plugin/plugin.json` |

Поля `plugin.json` (за `superpowers`): `name`, `version`, `description`,
`author{name,email,url}`, `homepage`, `repository`, `license`, `keywords[]`,
`skills` (шлях до каталогу скілів), `hooks{}`, а для Codex — `interface{}`
(`displayName`, `shortDescription`, `longDescription`, `developerName`,
`category`, `capabilities[]`, `defaultPrompt[]`, URL-поля, `brandColor`,
`composerIcon`, `logo`, `screenshots[]`).

**Marketplace manifest — теж по директоріях хостів:** `.claude-plugin/marketplace.json`,
`.cursor-plugin/marketplace.json`, `.muse-plugin/marketplace.json`,
`.agents/plugins/marketplace.json`. Поля: `name`, `description`, `owner{name,email}`,
`plugins[]{name, description, version, source, author}`. Монорепозиторійний
патерн (`cursor/plugins`): marketplace у корені репозиторію, кожен плагін — у
власному каталозі зі своїм маніфестом, а `source` вказує шлях (`./<dir>`).
`superpowers` — гібрид: сам є і marketplace, і плагіном.

**Встановлення в репозиторії вже вміє:** `codex plugin marketplace add <git-url>`
(`tooling/agent/cloud-pstack-setup.ts:49`) — Git-репозиторій як джерело
маркетплейсу.

# Наслідки

> **Уточнення (D9).** Три канали — у scope. Відкладено не канал, а **публікація**
> marketplace: для неї потрібен публічний Git-репозиторій, рішення власника ще не
> прийнято. Канал 1 (окремий плагін) і канал 2 (збірка в пакет агента) від
> публікації не залежать.

1. **Stage 5** постачає: скіли `vp-mode` і `vp-setup`, хук, власні скрипти
   `catalog.*`, per-host plugin manifests VP і marketplace-визначення.
2. **Stage 9** більше не містить marketplace як «поза scope»: канал 3 переходить у
   робочий scope (разом із ним — інфраструктура marketplace, якої в репо немає).
   Поза scope лишаються domain packs, UI поверх VIDA API та зовнішня синхронізація
   issue-трекерів.
3. **Канал 1 не потребує Runtime**; канали 2 і 3 мають різні докази готовності:
   канал 2 — збірка з provenance у нативний пакет, канал 3 — інстальований
   marketplace-канал із власною матрицею хостів.
4. **Публікація** marketplace — публічна поверхня: вона потребує окремого рішення
   про те, де живе marketplace-визначення і хто споживає (D4b).

# Розглянуті варіанти

| Варіант | Суть | Висновок |
|---|---|---|
| (a) Канали 1 + 2 | Плагін і збірка в пакет агента | Відхилено: розповсюдження без маркетплейсу не досягає нових хостів; D3 уже передбачає два режими, а marketplace — окремий публічний канал |
| (b) Лише standalone-плагін | Один канал | Відхилено: VP не доходить до VIDA-контуру як методологічний шар |
| (c) Канали 1 + 2 + 3 | Плагін, пакет агента, marketplace | **Прийнято** |

# Вплив на інші рішення

- D7 (цільовий споживацький layout) не змінюється: канали доставки не визначають
  layout consumer-проєкту.
- D5 (Decision Provider) не змінюється: provider-нейтральний інтерфейс однаковий
  для всіх каналів.
- Наступне уточнення: **D4b** — де живе marketplace-визначення і який набір хостів
  входить у перший реліз.

# Повноваження

Рішення власника репозиторію від 2026-10-19, зафіксоване в поточній розмові.
