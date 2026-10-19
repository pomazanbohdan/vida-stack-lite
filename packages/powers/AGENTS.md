# AGENTS.md — Vida Powers

Product-local instructions for agents developing **Vida Powers** in this
repository. Це інструкції продукту; кореневий `AGENTS.md` репозиторію —
згенерований discovery-entry, і його правила діють повністю.

**Продукт:** Vida Powers — портативний агентний плагін із канонічним instruction
corpus, єдиним скілом оркестрації `vp-mode`, допоміжним `vp-setup` і
матеріалізацією результатів у двох режимах (Standalone / Runtime).

---

## 1. Bootstrap: що читати і в якому порядку

| # | Файл | Навіщо |
|---|---|---|
| 1 | `docs/next-actions.md` | Поточний обсяг, порядок і ворота робіт |
| 2 | `docs/research/vida-powers-product-research.md` | B-рівень: продуктова концепція (джерело істини) |
| 3 | `docs/decisions/index.md` | Ухвалені рішення D1–D9 із підставами |
| 4 | `docs/implementation-plan.md` | Roadmap етапів 0–9 і ворота якості |
| 5 | `docs/system-specification.md` (після кроку B) | S-рівень: спостережувана поведінка |
| 6 | `AGENT.sidecar.md` репозиторію | Розміщення, власники, політика, ворота перевірок |

Репозиторні правила (ownership, делегування, документаційна політика, Git) —
у `../../AGENT.sidecar.md`; вони мають пріоритет над цим файлом у спільних питаннях.

## 2. Жорсткі межі роботи

- **Працюємо лише в `packages/powers/`.** Спільні root-файли репозиторію
  (`AGENT.sidecar.md`, `agent-runtime.config.v1.yaml`, документаційна політика,
  `docs/products.map.md`, `README.md`, knip-конфігурація, root `package.json`) і
  `packages/agent` **не змінюються** без окремо погодженого запиту (D9).
- **Runtime-запити оформлюються документами** в `docs/requests/`, а не правками в
  `packages/agent`. Один спільний запит покриває D3 (розширений instruction
  registry пакета агента) і D8 (читання методологічного профілю).
- **Кожна зміна в продукті** має власника (D2): `Vida Powers owner`. Агент
  реалізує роботу, але не ухвалює продуктових рішень замість власника.
- **Жодна зміна без попереднього погодження з власником.** План, `docs/next-actions.md`
  і зафіксовані рішення визначають напрям, а не дозвіл на виконання. Кожен крок
  узгоджується окремо — до того, як створюються чи змінюються файли. Агент обирає
  лише реалізацію вже погодженого рішення; непогоджена робота не залишається в
  дереві й не комітиться.
- **Один writer на файл.** Спільні файли — тільки Root.
- Git: коміти роботи Root; публікація (push) — лише за окремим вказівним.

## 3. Інструментальний ланцюг

- **Bun 1.4.3 — єдиний ланцюг.** `node`/`npm`/`npx` не використовуються.
  На цій машині Bun **не в PATH**; повний шлях:
  `C:\Users\pomaz\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe`
- **Без зовнішніх залежностей.** `node_modules` у репозиторії відсутній, тож VP
  використовує лише вбудовані засоби Bun: `bun:test`, `Bun.YAML`, `Bun.file`,
  `Bun.spawn`. Нова залежність — тільки з погодженням власника.
- **Пін версії Bun** — `packages/powers/.bun-version` (значення `1.4.3`, як у
  `packages/agent/.bun-version`).
- **Конвенції пакета** дзеркалять `packages/agent`: `tsconfig.json` зі
  `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `types: ["node", "bun"]`; `bunfig.toml` з
  `[test] root = "./tests"`, `coverageThreshold = { lines: 1.0, functions: 1.0,
  statements: 1.0 }`, `randomize`, фіксованим seed.

## 4. Команди

Перевірені на поточний момент (виконувати з кореня репозиторію):

```sh
# Сумісність bundle з Open Knowledge Format v0.2
bun packages/powers/tooling/check-okf.ts

# Локальна перевірка посилань і заголовків репозиторним інструментом
bun tooling/agent/check-documentation.ts packages/powers/docs

# Маніфест донорів (scratch-інструмент у .tmp, ігнорується Git)
bun packages/powers/.tmp/validate-donors.ts
```

Після кроку **A** (скелет продукту) додаються:

```sh
bun run --cwd packages/powers test          # bun:test без зовнішніх залежностей
bun run --cwd packages/powers typecheck     # bun check --project tsconfig.json
bun run --cwd packages/powers format:check
```

> Форма виклику: `bun run --cwd <dir> <script>`. Варіант `bun --cwd <dir> run <script>`
> друкує usage і не виконує скрипт.

Після кроку **C** — операції каталогу: `catalog.tags`, `catalog.search`,
`catalog.get`, `catalog.compose`; після кроку **D** — `convert` і
`check-corpus`.

## 5. Структура каталогу

| Шлях | Відповідальність | Крок |
|---|---|---|
| `docs/` | OKF-bundle продукту: research, канонічні документи, decision-записи, next-actions, Work Items, runtime-запити | B, F, G |
| `docs/decisions/` | Ухвалені рішення (одне рішення — одна концепція) | D1–D9 |
| `docs/work/` | Work Items VP: стабільний ID, AC, evidence, зв'язки | F |
| `docs/requests/` | Runtime-запити до agent maintainer | G |
| `config/` | Схеми VP: `VPCatalog/v1`, `VPMethodologyProfile/v1` | C |
| `corpus/` | Канонічний корпус інструкцій (дані, не код) | D |
| `skills/vp-mode/`, `skills/vp-setup/` | Поверхня скілів (launch skill і setup) | E |
| `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/` | Per-host plugin і marketplace manifests | E |
| `tooling/` | Скрипти: `catalog.ts`, `convert.ts`, `check-corpus.ts`, `check-okf.ts` | C, D |
| `tests/` | Тести harness'у VP | A–F |
| `donors.yaml` | Маніфест донорів: точні ревізії, ліцензії, лічильники | наявний |
| `package.json` | Манifest пакета VP: knip бачить `packages/powers` як workspace лише з `package.json` | A |
| `.tmp/` | Scratch: клони донорів, одноразові скрипти. **Ігнорується Git** | D |

## 6. Інваріанти — не порушувати

1. **Один activation engine.** VP не має другого resolver'а, scheduler'а, ledger'а
   чи сховища стану. У Runtime виконання належить VIDA Core/Mastra (D3).
2. **Один canonical owner на контракт.** Наявні runtime-контракти перевикористовуються;
   VP не створює паралельних версій.
3. **Тег ≠ агент/skill/крок/дозвіл.** Кожен тег — kebab-case і має ≥2 змістовні
   компоненти; `TDD` — аліас `test-first-development`.
4. **Обов'язкові інструкції й залежності не зникають через низький relevance.**
   Висока оцінка не є доказом правильності, дозволу чи завершення.
5. **Agent Fallback обов'язковий**: недоступність провайдера, timeout, помилка API,
   некоректний формат, невідомий candidate ID, недостатня впевненість → перехід до
   головного агента з матеріалізацією причини (D5).
6. **Доказ попереджає твердження.** `passed` неможливий без фактичного виконання;
   статичний аналіз або наявність коду не закривають критерій.
7. **Матеріалізація за Contract.** `artifact_contract` визначає тип виходу, дані,
   місце і спосіб перевірки; перевірка наявності/формату/digest окремо від
   семантичної.
8. **Scope-first.** Знахідка поза виданним scope — блокер із запитом дозволу, а не
   тихе розширення; сторонній баг — окремий Finding.
9. **Джерело кожної інструкції — traceable:** донор, ліцензія, ревізія з
   `donors.yaml`.
10. **Стільки стану, скільки потрібно.** Змінений вхід інвалідує лише
    прив'язаний до нього доказ.
11. **Зміни лише через погодження.** Жоден файл продукту не створюється і не
    змінюється без попереднього погодження з власником. Заплановані кроки — це
    пропозиція, а не дозвіл на виконання; виконання кроку починається лише після
    явного «так».

## 7. Ухвалені рішення (коротко; деталі — у `docs/decisions/`)

| ID | Рішення |
|---|---|
| D1 | VP живе в `packages/powers` як третій продукт; `packages/plugin` — Codex-прослойка |
| D2 | Монорепозиторій продуктів: кожен плагін має owner'а, документацію, задачі, простір роботи; Work Items VP — у продукті |
| D3 | VP самостійний: власний `VPCatalog/v1` і власні скрипти; у пакеті агента — розширений instruction registry (runtime-запит) |
| D4 | Три канали доставки; скіли: `vp-mode` (оркестрація) + `vp-setup` (налаштування) |
| D4b | `packages/powers` сам є marketplace-власником; Codex — перевірений хост, решта — заявлена підтримка |
| D5 | Provider-нейтральний `decision.evaluate`; роутінг = вибір LLM + формування агентів + рівень флоу |
| D6 | Журнал змін — bundle-лог `docs/log.md` (OKF §9) |
| D7 | `vp-setup` — ініціалізація за середовищем: instruction-файл / конфіг runtime / конфіг проєкту |
| D8 | `VPMethodologyProfile/v1` — схема VP; носій за середовищем |
| D9 | Поточний scope — лише `packages/powers`; root-реєстрація відкладена |

## 8. Відомі ризики й GAP

- **A0-гейт (до першого TS-файлу):** knip агента сканує репозиторій цілом і не має
  workspace для `packages/powers` → можливі «unlisted files» і падіння
  `lint:knip` (`--max-issues 0`). Перевірка: `bun run --cwd packages/agent
  lint:knip:pinned`. **Статус: частково закрито** — блок `packages/powers` додано до
  `packages/agent/knip.config.ts` (owner-рішення), маніфест пакета створено, але
  фактичний прогін knip **не виконано**: залежності репозиторію не встановлені.
- `packages/powers/docs` **не входить** у `canonical_roots` документаційної
  політики репозиторію: документи продукту ведуться за власною OKF-дисципліною
  (`check-okf.ts` + журнал).
- Runtime-режим VP **не доводиться** у поточному scope (немає реєстрації й
  runtime-запиту); доводиться Standalone-частина.
- Cutover `.vida/*` — зовнішній runtime-трек.
- Marketplace-публікація потребує публічного Git-репозиторію — рішення власника.

## 9. Definition of done для зміни в продукті

1. Тест або перевірка, яка падає **до** зміни і проходить **після** неї.
2. `bun --cwd packages/powers run test` → exit 0 (коли harness створено).
3. `bun packages/powers/tooling/check-okf.ts` → exit 0, якщо змінено bundle.
4. `bun tooling/agent/check-documentation.ts packages/powers/docs` → `failures: []`,
   якщо змінено документи.
5. Запис у `docs/log.md` (OKF §9): дата, вид зміни, що саме змінилося.
6. Для продуктових рішень — окрема концепція в `docs/decisions/` з підставами.

## 10. Заборонено

- Змінювати `packages/agent`, `packages/plugin` і спільні root-файли.
- Створювати другий scheduler, DAG-компілятор, ledger або сховище стану.
- Додавати залежність без погодження; використовувати `node`/`npm`/`npx`.
- Переносити донорські execution engines, tracker integrations або журнали стану.
- Заявляти `passed` без фактичного запуску перевірки.
- Створювати паралельний canonical документ там, де owner уже призначений.
