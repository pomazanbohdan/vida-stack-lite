---
type: Decision
title: D2 — Модель власності й робочого простору VP у монорепозиторії
description: 'VP реалізується в цьому репозиторії як монорепозиторій продуктів: кожен плагін має власного owner''a, власну документацію, власний набір задач і власний простір роботи; Work Items і докази VP живуть у продукті, координація — у репозиторії.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- ownership
- work-space
- monorepo
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: sidecar
  resource: /../../AGENT.sidecar.md
  title: VIDA agent and plugin source repository — sidecar
- id: runtime-config
  resource: /../../agent-runtime.config.v1.yaml
  title: AgentRuntimeConfig/v1
- id: documentation-policy
  resource: /../../agent-instructions/documentation-policy.v1.json
  title: DocumentationPolicy/v1
- id: gitignore
  resource: /../../.gitignore
  title: VIDA repository ignore rules
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

# Рішення

Vida Powers реалізується **в цьому репозиторії як монорепозиторій продуктів**:
кожен плагін має власного owner'а, власну документацію, власний набір задач
(Work Items) і власний простір роботи. Спільними лишаються репозиторні
policy-файли — `AGENT.sidecar.md`, `agent-runtime.config.v1.yaml`, документаційна
політика, `docs/products.map.md`, root `package.json`, Git.

Конкретно для VP:

- **Owner:** окрема роль **«Vida Powers owner»** у ownership map — як «Plugin owner»
  і «Agent maintainer». Роль тримає canonical документи VP, ухвалює D3–D8,
  затверджує методологічні зміни, приймає release VP. Спочатку цю роль виконує
  repository owner; роль існує окремо, тому передача не потребує переписування
  карти власності.
- **Робочий простір:** **гібрид** — Work Items і докази VP живуть **у продукті**
  (`packages/powers/docs/work/`) як версіоновані OKF-концепції; координація,
  ownership ledger і checkpoints — у репозиторії (`.agent/`), як у репо зараз.
- **Реєстрація продукту:** VP отримує власний `project_id`, `wiki_root`,
  `internal_root`, `ledger_root` (продуктний), `code_selectors`, `delivery_group`
  і окремий `task_prefix`, щоб не ділити префікс `TASK` з іншими продуктами.

# Модель монорепозиторію

| Продукт | Корінь | Owner | Документація | Work Items | Лідер |
|---|---|---|---|---|---|
| Vida Agent | `packages/agent` | Agent maintainer | `packages/agent/docs` | `packages/agent/docs/work` | `.agent/work` |
| Vida Codex | `packages/plugin` | Plugin owner | `packages/plugin/docs` | `packages/plugin/docs/work` | `.agent/work` |
| Vida Powers | `packages/powers` | Vida Powers owner | `packages/powers/docs` | `packages/powers/docs/work` | `.agent/work` |
| Наступні плагіни | `packages/<name>` | власна роль | `packages/<name>/docs` | `packages/<name>/docs/work` | `.agent/work` |

Спільне для всіх продуктів: репозиторні policy-файли, root tooling, CI, Git.
Окреме для кожного: owner, canonical документи, bundle, Work Items, докази,
release-цикл.

# Контекст

- Ownership map має колонку Owner: «Agent maintainer», «Plugin owner»
  (`AGENT.sidecar.md:33-47`). Owner — це роль, а не обов'язково людина: «Plugin
  canonical documents are filled by the Plugin owner under a fresh scope»
  (`AGENT.sidecar.md:49`).
- Обидва наявні продукти мають `ledger_root: .agent/work` і `task_prefix: TASK`
  (`agent-runtime.config.v1.yaml:77, 89` та plugin-блок) — це спільний префікс
  для двох продуктів у спільному ledger'і.
- `.agent/` — у `.gitignore` (`.gitignore:5`): нові work-записи не версіонуються за
  замовчуванням, хоча вже tracked-файли лишаються в Git.
- Research §6/§7.3 вимагають Work Item як **продуктовий артефакт** зі стабільним
  ID, AC і evidence: споживач читає його, а не покладається на пам'ять агента.
  Тому Work Item ≠ execution-стан репозиторію.

# Розглянуті варіанти

| Варіант | Суть | Висновок |
|---|---|---|
| (a) Окрема роль «Vida Powers owner» | Роль, аналогічна «Plugin owner»; канонічні документи, D-рішення, release | **Прийнято** |
| (b) Repository owner = Powers owner | Одна особа й repository owner, і owner VP | Відхилено: зливає ухвалення S-контрактів із володіння Git; роль не передається |
| (c) Agent maintainer | VP під Agent maintainer'ом | Відхилено: VP — методологічний продукт, плутанина owner'ів зруйнує межу runtime-запитів |
| (d) Work Items у `.agent/work` | Як в агенті | Відхилено: робоча історія VP не потрапляє в Git і не переживає клонування репозиторію; Work Item за research — артефакт |
| (e) Уся історія в продукті | Крім Work Items і координацію теж у продукті | Відхилено: розмиває межу між продуктовим артефактом і репозиторним execution-станом |

# Наслідки

1. **Owner VP** додається рядком у ownership map `AGENT.sidecar.md`; роль розмежовується
   з Agent maintainer'ом: зміни в `packages/agent` оформлюються окремим
   runtime-запитом, owner VP їх не підписує.
2. **Product-space реєстрація** у `agent-runtime.config.v1.yaml`: `project_id`,
   `title`, `project_root: packages/powers`, `wiki_root`/`internal_root`:
   `packages/powers/docs`, `ledger_root: packages/powers/docs/work`, `task_prefix`:
   окремий від `TASK`, `code_selectors: packages/powers/**`, `delivery_group`.
3. **Doc-policy**: `packages/powers/docs` у `canonical_roots`; changelog-події
   продукту — у bundle-журналі `packages/powers/docs/log.md`.
4. **Work Items VP** — OKF-концепції типу `Work Item` у `packages/powers/docs/work/`
   зі стабільними ID, AC і evidence; навігація — через індекс bundle.
5. **Узагальнення на наступні плагіни:** реєстраційний патерн (owner + docs bundle +
   product work space + окремий префікс) стає повторюваним, а не разовим для VP.
6. **Product KEY** (для `<KEY>-W<NNNN>` / `<KEY>-<N>`) і правило алокації ID
   фіксуються на Stage 0; префікс має бути відмінним від `TASK`, щоб не було
   колізій у спільному namespace ідентифікаторів.

# Вплив на інші рішення

- D3, D4, D5, D7, D8 — ухвалює «Vida Powers owner» за рекомендацією автора
  плану; технічні (D3, D5, D8) не потребують бізнес-входження.
- D4 (канал доставки) залишається бізнес-рішенням owner'а, бо визначає, чи VP
  доставляється як плагін монорепозиторію, чи окремо.
- Stage 0 (реєстрація) виконується за патерном, описаним вище.

# Повноваження

Рішення власника репозиторію від 2026-10-19, зафіксоване в поточній розмові.
