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

- **Bun 1.4.3 — рантайм проєкту.** `node`/`npm`/`npx` не використовуються.
  На цій машині Bun **не в PATH**; повний шлях:
  `C:\Users\pomaz\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe`
- **Жодної власної інфраструктури в плагіні.** Немає власного рантайму,
  бандлера, пакетного менеджера, CLI-фреймворку чи тестового раннера: усе
  запозичується з проєкту.
- **Код плагіна — runtime-агностичний.** Модулі VP мають працювати в будь-якому
  середовищі (Bun, Node, Deno) без зовнішніх залежностей: лише стандартні
  `node:` модулі (`fs`, `path`, `process`, `child_process`). Bun-специфічні API
  (`Bun.YAML`, `Bun.file`, `Bun.spawn`, `import.meta.dir`) дозволені **лише в
  dev-інструментах** (вони працюють під рантаймом проєкту); у коді, що
  постачається в скілах, їх немає.
- **Машинні формати — JSON.** Канонічні дані, які читає код (корпус, профілі,
  реєстр інструкцій) зберігаються в JSON: `JSON.parse` доступний у будь-якому
  середовищі. YAML — лише для людських маніфестів (`donors.yaml`), де розбір
  виконує інструмент проєкту.
- **Скрипти, що постачаються в скілах** (налаштування, пошук інструкцій), —
  звичайний TS **без збірки**: виконуються під Bun, Node або Deno. Обмеження:
  лише `node:` модулі, `import type` для типів, без `enum`/`namespace`/
  parameter properties (щоб проходило type-stripping), шляхи виводяться з
  `import.meta.url` через `node:url` (а не з `import.meta.dir`), YAML не
  парситься.
- **Тести — під рантаймом проєкту** (`bun test`); це тестовий раннер репозиторію,
  а не власна інфраструктура плагіна.
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
bun packages/powers/scripts/check-okf.ts

# Локальна перевірка посилань і заголовків репозиторним інструментом
bun tooling/agent/check-documentation.ts <явний список .md-файлів bundle>

# Тести продукту
bun run --cwd packages/powers test

# Типізація продукту (bun check; tsconfig з erasableSyntaxOnly)
bun run --cwd packages/powers typecheck

# Репозиторний lint-гейт, який охоплює й код VP
bun run --cwd packages/agent lint:knip:pinned

# Маніфест донорів (scratch-інструмент у .tmp, ігнорується Git)
bun packages/powers/scripts/validate-donors.ts
```

> Форма виклику: `bun run --cwd <dir> <script>`. Варіант `bun --cwd <dir> run <script>`
> друкує usage і не виконує скрипт.

**Встановлення залежностей.** VP має власну install-теку (`packages/powers/bun.lock`,
`packages/powers/node_modules`) — як `packages/agent`; у VP лише dev-типи
(`@types/bun`, `@types/node`). Команда: `bun install --cwd packages/powers`.
Для репозиторію: `bun install --frozen-lockfile --cwd packages/agent` (tracked-файл
`packages/agent/bun.lock` не змінюється).

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
| `config/` | Схеми VP: `VPCatalog/v1` (маніфест каталогу), `VPInstruction/v1` (frontmatter інструкції), `VPEffectiveProfile/v1` (резолвнутий профіль для `compose`; джерельний — `VPMethodologyProfile/v1`, D8), `VPCorpusMap/v1` (мапа обробки) | C |
| `instructions/` | канонічні інструкції: `.md` + метадані, плоско | D |
| `corpus-map.json` | мапа обробки корпусу: донор + файл → converted/split/merged/rejected | D |
| `skills/vp-mode/`, `skills/vp-setup/` | Скіли (оркестрація, налаштування) разом із їхніми `scripts/` — тулінг каталогу й setup; постачаються в плагіні | C, D, E |
| `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/` | Per-host plugin і marketplace manifests | E |
| `scripts/` | Скрипти підтримки продукту: `check-okf.ts`, `check-corpus.ts`, `convert.ts`, `validate-donors.ts` | C, D |
| `skills/*/scripts/` | Тулінг, що постачається в скілах (каталог, setup) | C, D, E |
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
12. **Немає власної інфраструктури.** Плагін не вводить рантайм, бандлер,
    пакетний менеджер, CLI-фреймворк чи тестовий раннер: усе береться з проєкту.
    Код плагіна має бути runtime-агностичним і працювати без зовнішніх залежностей.
13. **Версія — лише в метаданих.** Назва файлу не містить версії, дат, статусів
    (`draft`, `done`, `final-v2`); версія контенту живе у `revision` у frontmatter,
    а історія змін — у bundle-журналі `docs/log.md`. Виняток — імена **схем**
    (`*.v1.schema.json`): там версія формату в самій назві, за конвенцією
    репозиторію (`packages/agent/schemas/…`).

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
  lint:knip:pinned`. **Статус: закрито** — залежності встановлено
  (`bun install --frozen-lockfile --cwd packages/agent`), гейт повертає
  `{"issues":[]}` і exit 0. Workspace `packages/powers` додано до
  `packages/agent/knip.config.ts` (owner-виняток, D9 rev 2) з
  `ignoreBinaries: ['check']` (підкоманда Bun `check` — не npm-бінарник);
  scratch-тека `.tmp` виключена вже самим `.gitignore`, окремий `ignore` не потрібен.
  На кроці **C** до entry-патернів додано `skills/*/scripts/*.ts` — одразу з
  появою першого скрипта скіла (`skills/vp-mode/scripts/schema.ts`); без нього
  knip не бачить `skills/` і дає config hint. Це той самий owner-виняток D9 rev 2.
- `packages/powers/docs` **не входить** у `canonical_roots` документаційної
  політики репозиторію: документи продукту ведуться за власною OKF-дисципліною
  (`check-okf.ts` + журнал).
- Runtime-режим VP **не доводиться** у поточному scope (немає реєстрації й
  runtime-запиту); доводиться Standalone-частина.
- Cutover `.vida/*` — зовнішній runtime-трек.
- Marketplace-публікація потребує публічного Git-репозиторію — рішення власника.

## 9. Definition of done для зміни в продукті

1. Тест або перевірка, яка падає **до** зміни і проходить **після** неї.
2. `bun run --cwd packages/powers test` → exit 0.
3. `bun packages/powers/scripts/check-okf.ts` → exit 0, якщо змінено bundle.
4. `bun tooling/agent/check-documentation.ts <явний список .md-файлів>` → `failures: []`
   і `selectedDocuments > 0`; передавання каталогу замість списку файлів обирає
   один документ і перевірку фактично робить порожньою.
5. Запис у `docs/log.md` (OKF §9): дата, вид зміни, що саме змінилося.
6. Для продуктових рішень — окрема концепція в `docs/decisions/` з підставами.

## 10. Заборонено

- Змінювати `packages/agent`, `packages/plugin` і спільні root-файли.
- Створювати другий scheduler, DAG-компілятор, ledger або сховище стану.
- Додавати залежність без погодження; використовувати `node`/`npm`/`npx`.
- Переносити донорські execution engines, tracker integrations або журнали стану.
- Заявляти `passed` без фактичного запуску перевірки.
- Створювати паралельний canonical документ там, де owner уже призначений.
