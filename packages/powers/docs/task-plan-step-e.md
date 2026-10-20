---
type: Task Plan
title: 'Vida Powers — task-level план кроку E: скіли vp-mode і vp-setup, налаштування, маніфести'
description: 'Джерельний профіль (декларація груп і альтернатив), ефективний профіль із секцією перевірки та рівнем флоу, скіли vp-mode і vp-setup з вибором політик погодження та інвентаризацією моделей, пер-хостові маніфести й marketplace.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- task-plan
- skills
- setup
- profile
sources:
- id: design
  resource: /catalog-design.md
  title: Vida Powers — дизайн каталогу інструкцій
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — системна специфікація
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers — критерії прийняття
- id: step-d-plan
  resource: /task-plan-step-d.md
  title: Vida Powers — task-level план кроку D
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-20T19:30:00Z' }
revision: '3'
---

**Мета:** завершити ядро продукту — декларація політик, налаштування за
середовищем, оркестраційний скіл і канали доставки. Скрили, які постачаються,
живуть у `skills/*/scripts/` і залишаються runtime-агностичними.

**Специфікація, з якої цей план випливає:** `docs/system-specification.md`
(SR-22…SR-29, SR-33, SR-56…SR-62, SR-75), `docs/acceptance.md` (AC-13, AC-14,
AC-25, AC-28, AC-41), `docs/decisions/D4-delivery-channels.md`,
`D4b-marketplace-and-hosts.md`, `D7-consumer-initialization.md`,
`D8-methodology-profile.md`, `docs/catalog-design.md` (§7), `docs/task-plan-step-d.md`.

## Global Constraints

- **Runtime-агностичність.** Код у `skills/*/scripts/` — лише `node:`-модулі, без
  `Bun.*`, без `import.meta.dir`, без зовнішніх залежностей; **YAML не парситься**
  (SR-62). Шляхи з `import.meta.url`.
- **Формат машинних даних — JSON.** YAML лише для людських маніфестів. Профілі,
  інвентаризація моделей, довідник — JSON.
- **Керований блок у YAML-файлі містить JSON.** Маркери + блок ```json — його
  читає `JSON.parse` без парсера YAML (SR-62), і setup порівнює його зміст, а не
  текст (SR-56).
- **Ідемпотентність.** Повторний запуск `vp-setup` не створює дубля керованого
  блоку, не дублює записів, не змінює незмінені поля (AC-25).
- **Один власник на артефакт.** `catalog.json` — лише `convert.ts`; джерельний
  профіль і довідник — owner-контент; ефективний профіль — лише `vp-setup`;
  маніфести — лише збірка пакунка.
- **Без мовчазних значень за замовчуванням** (SR-19, SR-69): якщо рішення не
  прийняте — воно лишається невирішеним і позначається як таке.
- **Версія — лише в метаданих**; у назвах файлів версій, дат і статусів немає.

## Task E1 — Джерельний методологічний профіль: хто, які групи, які альтернативи

**Files:** create `config/vpmethodologyprofile.v1.schema.json`,
`config/methodology-profile.json`; test `tests/methodology-profile.test.ts`.

- **Навіщо:** setup має запитувати користувача про **політики погодження**, а для
  цього потрібна декларація: які групи існують, які з них є рішенням користувача,
  які альтернативи існують і що кожна означає.
- **Формат** (`VPMethodologyProfile/v1` — канонічна назва SR-25/D8; ефективний
  резолвнутий профіль лишається `VPEffectiveProfile/v1`, дизайн §7):
  - `groups[]`: `{ id, title, description, user_decision: boolean,
    alternatives[]: { id, title, description, instruction_ids[] } }`;
  - `id` альтернативи — **pattern-тег** (SR-25: альтернатива є методологією, а не
    ідентифікатором інструкції); `instruction_ids[]` — інструкції корпусу, що
    реалізують цю альтернативу (для валідації та пошуку; порожній масив = група
    без інструкцій);
  - `user_decision: true` — група, де вибір робить користувач; `false` — група
    визначена політикою продукту.
- **Власник:** owner-контент (затверджується власником разом із довідником тегів).
- **Обов'язковий склад:** група `approval-policy` з двома альтернативами —
  `user_decision: true` (мандат власника). **Прив'язка альтернатив (критично):**
  кожна альтернатива має **свій pattern-тег**, і саме він є `id` альтернативи, а
  інструкція альтернативи несе цей тег у своїх `pattern_tags`:
  `proceed-without-waiting-for-confirmation` → `approval-policy-proceed`,
  `size-and-gate-the-work` → `approval-policy-gate`; спільний тег
  `approval-policy` лишається маркером групи (пошук і огляд), але **не** є
  альтернативою ✓. Без окремих тегів compose не відрізнив би неактивну
  альтернативу (обидві несли б один тег) ✓.
  Групи `testing-sequence`, `review-strategy`, `architecture`, `delivery` —
  `user_decision: false` (SR-25); підтверджені групи не мають відповідного набору
  інструкцій у корпусі — тоді група не оголошується (заборонено оголосити те,
  чого корпус не має ✓).
- **Перевірка (валідатор):** кожен `instruction_ids` є в корпусі; кожна
  альтернатива має опис; `user_decision`-група має щонайменше дві альтернативи;
  `id` альтернативи — існуючий pattern-тег у словнику ✓.

## Task E2 — Ефективний профіль: рішення, рівень флоу, смуги перевірки

**Files:** **update** `config/vpeffectiveprofile.v1.schema.json` (схема існує з кроку C
і вже використовується `catalog-cli`); test `tests/effective-profile.test.ts`.

- **Вміст** (`VPEffectiveProfile/v1`):
  - `groups`: `{ <group id>: { active: <alternative id>, alternatives: [...] } }` —
    **резолвлені** рішення (активна альтернатива на групу) ✓ (SR-25, SR-26);
  - `flow_level`: рівень флоу (`full` | `medium` | `light`) ✓ (D8, SR-22);
  - `verification`: секція перевірки:
    - `available_models[]`: `{ provider, model, family, roles[]: ('main'|'agent'),
      available: boolean }` — інвентаризація оточення (мандат власника);
    - `lane_assignment`: `{ lane: string, provider, model, blind: boolean }[]` —
    яка модель обслуговує яку смугу перевірки;
    - `lane_policy`: `independent-provider` | `independent-model` |
      `blind-same-model` — **обрана** смуга;
    - `limitations`: рядок із явною позначкою обмеження середовища.
- **Хто обчислює `lane_policy`:** не користувач, а детерміноване правило за драбиною
  з інструкції `verify-with-independent-lanes` (інше сімейство іншого постачальника →
  інша модель того самого постачальника → сліпий агент на тій самій моделі) і
  наявністю моделей в інвентаризації; `lane_assignment` — призначення моделей
  смугам за інструкцією `record-available-executor-models` ✓.
- **Рівень флоу** — за D8 частина ефективного профілю ✓; визначається з
  джерельного профілю (політика продукту) або рішенням користувача — розрізняється
  полем `user_decision` ✓.
- **Заміна неактивної альтернативи (виправлення compose).** Група профілю — це
  **один вибір**: якщо залежність (`compatibility_requires`) вказує на неактивну
  альтернативу, її замінює **активна** альтернатива тієї групи (а не помилка
  `CATALOG_PROFILE_CONFLICT` і не повернення неактивної в bundle ✓). Правило
  фіксується в дизайні §7 і реалізується в `catalog.compose` + регресійний тест ✓.
  Мутажна вимога `compatibility_requires` між двома альтернативами однієї групи
  **прибирається** з корпусу: альтернативи не вимагають одна одну (перехрес
  залишається в тексті інструкцій) ✓.

## Task E3 — `vp-setup`: середовище, інвентаризація, вибір, запис

**Files:** create `skills/vp-setup/SKILL.md`, `skills/vp-setup/scripts/setup.ts`;
test `tests/setup.test.ts`.

- **Визначення середовища** (D7): Standalone (керований блок у `AGENTS.md` або
  `CLAUDE.md`; якщо жодного немає — створює `AGENTS.md` з блоком ✓), Runtime
  (розділ у конфіг-файлі runtime), хост-прослойка (конфіг-файл проєкту).
  Визначення — за наявністю носіїв; у сторонні файли не пишемо (AC-25).
- **Інвентаризація моделей:** вхід — **JSON**-контракт, який дає середовище
  (шлях передається аргументом або змінною оточення):
  `{ providers: [{ id, models: [{ id, family, roles: ['main'|'agent'], available }] }] }`.
  Якщо інвентаризації немає — пишемо порожній список і `limitations` з
  позначкою; **slug'и не вигадуємо** ✓.
- **Вибір політик:** для кожної групи з `user_decision: true` setup показує
  альтернативи (назва + опис) і просить вибір; вибір — рішення користувача
  (мандат власника); якщо користувач не обрав — група лишається **невирішеною**
  і позначається в профілі (без мовчазного значення за замовчуванням ✓).
  **Поведінка невирішеної групи:** `vp-mode` не складає bundle для неї й
  переносить питання на переговорний запит (-negotiation) — жодна з альтернатив не
  підставляється мовчки ✓; тест на цю поведінку ✓.
- **Запис:** ефективний профіль пишеться у визначений носій:
  - Standalone — керований блок у `AGENTS.md`/`CLAUDE.md`: маркери
    `<!-- vida-powers:profile:begin -->` / `<!-- vida-powers:profile:end -->` і
    всередині fenced-блок ```json з профілем ✓ (читання через `JSON.parse` ✓,
    без YAML-парсера ✓);
  - Runtime/хост-прослойка — JSON-файл профілю в узгодженому місці носія ✓.
- **Ідемпотентність (AC-25):** повторний запуск порівнює **розпарсений** профіль
  (не текст) → немає змін → немає запису; змінився лише блок, який належить VP →
  сторонні блоки не чіпаємо ✓ (AC-41: третій контент зберігається ✓).
- **Обов'язкові обов'язки, які НЕ губимо:** активаційна перевірка (SR-59) —
  чекліст у SKILL.md, що перевіряє наявність скілів і профілю; карта джерел
  (SR-75) — фіксує походження інструкцій і змін налаштування; захист
  встановленого пакета агента (SR-57) — setup не змінює файли пакета агента ✓.
- **Хуки** (D4 Stage 5, SR-60) — **відкладено**: це залежність від runtime; owner
  і умова відкладення фіксуються в записі рішення (D10).

## Task E4 — `vp-mode`: оркестрація

**Files:** create `skills/vp-mode/SKILL.md`; тулінг уже є в
`skills/vp-mode/scripts/` (`catalog.ts`, `catalog-cli.ts`, `frontmatter.ts`,
`schema.ts`).

- Єдиний основний вхід (D4): приймає запит звичайною мовою → `catalog.search` →
  `catalog.compose` → bundle (роль, task contract, ефективна методологія, Work
  Scope, вимоги матеріалізації, посилання на артефакти) → виконання або
  делегування ✓ (SR-22, SR-23, AC-13).
- **Поважає ефективний профіль:** активна альтернатива групи визначає активну
  політику; bundle не містить неактивну альтернативу ✓ (вже реалізовано в
  `catalog.compose` ✓).
- **Рівень флоу** — з профілю; `workflow.options` описує допустимі варіанти, а
  `decision.evaluate` оцінює передані кандидати; **VP не компілює граф виконання**
  (SR-24, AC-14) ✓.
- **Agent Fallback обов'язковий** (SR-18): недоступність, timeout, помилка API,
  некоректний формат, невідомий candidate ID, недостатня впевненість → головний
  агент; матеріалізація: джерело рішення, обрані ID, причина fallback ✓ (SR-20).
- **Межі bundle** (SR-58, AC-26): bundle ≤ 20 інструкцій і ≤ 64 КБ тексту —
  зафіксовано в контракті SKILL.md і перевіряється в тесті ✓.
- Матеріалізація за `artifact_contract` ✓ (інваріант 7).

## Task E5 — Канали доставки: пер-хостові маніфести й marketplace

**Files:** `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`,
`.agents/plugins/`, `marketplace.json`; create the manifest schemas
`config/vppluginmanifest.v1.schema.json` (пер-ходовий маніфест) and reuse it for
the marketplace listing.

- `packages/powers` — marketplace-власник (D4b): `marketplace.json` із
  `source: "./"` ✓; пер-ходові маніфести перелічують постачавані скіли
  (`vp-mode`, `vp-setup`) і каталог інструкцій ✓.
- Розкладка: **пер-ходові** `marketplace.json` і `plugin.json` у своїй теці
  (`.claude-plugin/`, `.cursor-plugin/`, `.codex-plugin/`, `.agents/plugins/`) —
  за патерном D4b; опис пакета для marketplace — у корені пакета (`source: "./"`) ✓.
  Власник маніфестів — **збірка пакунка** (окремий крок пакування, не в цьому
  scope) ✓.
- Маніфести валідні схемою ✓; вантаж не дублюється (D4b) ✓.
- Новий AC: «пер-ходові маніфести та marketplace-опис валідні схемою й не дублюють
  вантаж» — **пропозиція** (затвердження власника).

## Поза цим планом

- Крок **F**: Work Items VP у `docs/work/`, findings JSONL, `artifact_contract` на
  рівні роботи.
- Крок **G**: runtime-запит D3+D8 — документи, не код; Runtime-режим VP не
  доводиться в цьому scope.
- **Хуки** setup (D4 Stage 5, SR-60) — відкладено до runtime-треку; owner і
  умова — у записі рішення **D10** (`docs/decisions/D10-…`), який створюється в
  цьому ж кроці разом із правками D7/D8 (керований блок: JSON у YAML-носієві) ✓.
- **Розширений instruction registry пакета агента** (D3) — runtime-запит (G).

## Визначення завершення кроку E

1. `bun run --cwd packages/powers test` → 0 failures; `test:coverage` → поріг 1.0.
2. `bun run --cwd packages/powers typecheck` → 0 помилок.
3. `bun packages/powers/scripts/check-corpus.ts` → `issues: []`, exit 0.
4. `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0.
5. `bun packages/powers/scripts/check-okf.ts` → `failures: []`.
6. `bun tooling/agent/check-documentation.ts <явний список .md>` → `failures: []`.
7. Постачавані скрипти виконуються під **bun і node** (AC-28) + статична перевірка
   відсутності Bun-специфічних API (grep по `skills/*/scripts/`). **deno** на цьому
   хості не встановлений — це зафіксоване обмеження середовища (GAP, не гейт);
   коли deno з'явиться, критерій доповнюється ✓.
8. Повторний запуск `vp-setup` → **порожній diff** (AC-25); сторонній контент у
   `AGENTS.md`/`CLAUDE.md` збережено (AC-41).
9. Пер-ходові маніфести й `marketplace.json` валідні схемою.
10. Запис у `docs/log.md` (OKF §9) про кожну зміну кроку.
