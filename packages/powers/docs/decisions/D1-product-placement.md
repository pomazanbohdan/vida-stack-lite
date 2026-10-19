---
type: Decision
title: D1 — Розташування продукту Vida Powers
description: Vida Powers живе в packages/powers як третій продукт репозиторію; packages/plugin лишається Codex-прослойкою між хостом Codex і агентом.
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- product-placement
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: sidecar
  resource: /../../AGENT.sidecar.md
  title: VIDA agent and plugin source repository — sidecar
- id: readme
  resource: /../../README.md
  title: VIDA — configurable development runtime with a Codex interface
- id: openai-backends
  resource: /../../agent/docs/research/openai-execution-backends.md
  title: OpenAI execution backends — research
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '2'
---

# Рішення

Vida Powers живе в `packages/powers` як **третій продукт** цього репозиторію.
Наявний продукт `packages/plugin` (проєктний id `plugin`, видима назва «Vida Codex»)
лишається **прослойкою між хостом Codex і агентом** і не є Vida Powers. Перейменування
кореня `packages/plugin` у `packages/codex` не виконується: `plugin` — стабільний
внутрішній проєктний id (`README.md`: видимі назви відрізняються від стабільних
внутрішніх id `agent` і `plugin`).

# Контекст

- Research визначає VP як портативний агентний плагін: канонічний instruction corpus,
  єдиний Router-вхід, `vp-setup`, робота у Standalone і в Runtime.
- `packages/agent` = «Vida Agent» — runtime і єдиний публічний native delivery.
- `packages/plugin` = «Vida Codex» — Codex-інтеграція; Plugin owner підтвердив, що
  plugin цілиться в Codex, а агент лишається generic.
- Отже VP — не runtime і не Codex-інтеграція, а окремий продукт із власним шаром
  інструкцій.

# Розглянуті варіанти

> **Уточнення (D9, 2026-10-19).** Варіант (d) відкинуто загальним правилом
> репозиторію. Відкладена реєстрація (D9) — це **тимчасова** узгоджена робота поза
> картою проєкту, а не застосування варіанта (d): поточна робота VP ведеться лише
> в `packages/powers`, реєстрація продукту в спільних root-файлах відкладена (D9).

| Варіант | Суть | Висновок |
|---|---|---|
| (a) VP = `packages/plugin` | Перекваліфікувати «Vida Codex» у методологічний плагін | Відхилено: знищило б іменований продукт із власним owner'ом і підтвердженим напрямком; VP перестало б бути host-portable |
| (b) VP = `packages/powers`, третій продукт | Новий корінь Source у цьому репозиторії + реєстрація | **Прийнято** |
| (c) Окремий репозиторій | VP із власним bootstrap, bundle і release cycle | Відхилено: розрив траси B→S→C у розрізних репозиторіях, двома власниками на одній роботі; витрати на дубльований bootstrap |
| (d) Тимчасово без реєстрації | Працювати в `packages/powers` до Stage 0 | Відхилено: до Stage 0 продукт лишається поза картою проєкту — без owner'а, без doc-policy, без робочого item |

# Обґрунтування

1. VP — методологічний шар: інструкції, skills, каталог, Router. `packages/plugin` —
   транспортний шар до конкретного хоста (Codex). Шари різні за відповідальністю, і
   об'єднання знищило б один із них.
2. `packages/powers` уже є фактичним місцем напрацювань: research, план, маніфест
   донорів, знімки донорів. Рішення не створює нового переміщення.
3. Один репозиторій дає одну трасу `B → S → C`: research → S-документи → код →
   доказ, з єдиним canonical owner на кожен документ.
4. Runtime-інтеграція (Stage 7) залишається в одному trace з наявним механізмом
   runtime-запитів, а не в cross-repo контракті.

# Наслідки

**Реєстрація продукту (власник — repository owner, виконується на Stage 0):**

1. `AGENT.sidecar.md` — рядки «exactly two products», «two product roots»,
   «Repository projects are …» + рядок у ownership map.
2. `packages/agent/docs/system-specification.md` — «approved target keeps product
   Source in packages/agent and packages/plugin» і рядок проєктів.
3. `agent-runtime.config.v1.yaml` — запис у `projects` з 11 обов'язковими полями
   схеми, `repository.code_selectors`, `delivery_group`.
4. `packages/agent/knip.config.ts` — окремий workspace-блок `packages/powers`.
5. `docs/agent-instructions/documentation-policy.v1.json` — `packages/powers/docs`
   у `canonical_roots`.
6. `docs/products.map.md` — рядок VP.
7. `README.md` — рядок «Vida Powers» у таблиці продуктів.
8. Root `package.json` — `workspaces` += `packages/powers`; `packages/powers/package.json`
   та `.bun-version`.

**Споживачі VP (зафіксовано межі):**

- Standalone: сумісні AI-хости через Router skill і `vp-setup`.
- Runtime: агенти основного агента отримують instruction bundle від VP; виконання,
  дозволи й стан лишаються в VIDA Core/Mastra. VP не додає власного scheduler,
  ledger чи сховища стану.

**Не змінюється:** `packages/plugin`/`plugin` лишається Codex-прослойкою; її
canonical documents (business-requirements, system-specification, acceptance)
заповнює Plugin owner — це не входить у VP.

# Вплив на інші рішення

- D2: owner VP і реєстрація стають окремим пунктом Stage 0.
- D4: канал доставки VP не залежить від `packages/plugin`; VP — самостійний плагін.
- D7: цільовий споживацький layout VP не змінюється — це рішення про consumer-проєкт,
  а не про корінь продукту.
- D8: місце схеми методологічного профілю визначається в межах `packages/powers`.

# Повноваження

Рішення власника репозиторію від 2026-10-19, зафіксоване в поточній розмові.
Замінює попередню рекомендацію плану (варіант (c) — окремий репозиторій).
