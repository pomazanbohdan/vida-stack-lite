---
type: Task Plan
title: 'Vida Powers — task-level план кроку C: каталог, операції, seed-корпус'
description: 'Побітова реалізація каталогу інструкцій: схеми VP, парсер frontmatter, операції catalog.*, детермінований decision.evaluate, seed-корпус, конвертер і валідатор корпусу — із точними файлами, інтерфейсами та командами.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- task-plan
- catalog
- implementation
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
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers — наступні дії в межах packages/powers
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

**Мета:** довести каталог інструкцій VP до робочого стану: схеми, парсер
frontmatter, чотири операції `catalog.*`, детермінований `decision.evaluate`,
seed-корпус із 8–12 інструкцій, конвертер і валідатор корпусу.

**Специфікація, з якої цей план випливає:** `docs/catalog-design.md` (rev 7) +
`docs/system-specification.md` (SR-01…SR-76) + `docs/acceptance.md` (AC-01…AC-42).

**Технології:** Bun 1.4.3, TypeScript (strict), `bun:test`, JSON Schema
(підмножина), без зовнішніх залежностей.

**Специфікація плану:** кожен крок — тест, що падає **до** зміни, й проходить
**після** неї; кожен крок завершується комітом; кожен файл має одного власника.

## Global Constraints

- **Runtime-агностичність.** Код у `skills/*/scripts/` — лише `node:` модулі, без
  `Bun.*`, без `import.meta.dir` (шляхи з `import.meta.url`), без залежностей.
  Dev-інструменти в `scripts/` можуть використовувати Bun.
- **Один writer.** `scripts/convert.ts` — єдиний writer для `instructions/`,
  `catalog.json`, `corpus-map.json`. Рантайм-скрипти лише читають.
- **Машинні формати — JSON.** YAML — лише для людських маніфестів.
- **Версія — лише в метаданих** (`revision` у frontmatter); у назвах файлів
  версій, дат і статусів немає.
- **Точність provenance.** `provenance.revision` має дорівнювати
  `donors.yaml[donor].head_sha`; `catalog.json` — єдиний перелік корпусу з `sha256`.
- **Жодного рядка «винахід» поза джерелом.** Інструкція походить із donor-файлу
  (шлях у `provenance.path`); синтетика без джерела не приймається.
- **Ворота кроку:** `bun run --cwd packages/powers test` → 0 failures;
  `bun run --cwd packages/powers test:coverage` → 0 failures, поріг 1.0;
  `bun run --cwd packages/powers typecheck` → 0 помилок;
  `bun packages/powers/scripts/check-okf.ts` → `failures: []`;
  `bun packages/powers/scripts/check-corpus.ts` → exit 0;
  `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0.

## Review Focus

1. **Повторний `vp-setup`** не створює дубля керованого блоку (idempotence — на рівні
   конфігурації, не лише рядків).
2. **Інструкція з тегом, якого немає в словнику**, не приймається — навіть якщо
   тег виглядає придатним.
3. **`compose` із конфліктною групою** повертає помилку з обома ідентифікаторами, а
   не мовчки відкидає одну альтернативу.
4. **Файл інструкції, змінений поза `convert.ts`**, ламає зв'язок manifest ↔ диск
   (digest) — перевірка має це помітити, а не пропустити.
5. **Пsearch-відповідь не містить повного тексту** — лише метадані.

## Структура файлів (усе в `packages/powers/`)

| Файл | Відповідальність | Залежності |
|---|---|---|
| `config/vpcatalog.v1.schema.json` | контракт маніфесту каталогу | — |
| `config/vpinstruction.v1.schema.json` | контракт інструкції | — |
| `config/vpeffectiveprofile.v1.schema.json` | контракт ефективного профілю | — |
| `skills/vp-mode/SKILL.md` | скіл оркестрації (мінімальний, наповнюється на кроці E) | — |
| `skills/vp-mode/scripts/frontmatter.ts` | парсер frontmatter (обмежена підмножина YAML) | — |
| `skills/vp-mode/scripts/schema.ts` | міні-валідатор JSON Schema-підмножини | — |
| `skills/vp-mode/scripts/catalog.ts` | модель каталогу + `catalog.*` + `decision.evaluate` | frontmatter, schema |
| `skills/vp-mode/scripts/catalog-cli.ts` | CLI: `tags`/`search`/`get`/`compose`/`evaluate` | catalog |
| `scripts/check-corpus.ts` | валідація корпусу: інструкції, manifest ↔ диск, мапа, словник | catalog, schema |
| `scripts/convert.ts` | конвертер: специфікація → `.md` + manifest + мапа | catalog, frontmatter |
| `instructions/*.md` | seed-корпус (8–12 інструкцій) | — |
| `catalog.json` | маніфест каталогу (перелік корпусу з `sha256`) | — |
| `corpus-map.json` | мапа обробки | — |
| `tests/*.test.ts` | тести harness'у | усі модулі |

---

### Task 1 — Схеми VP і міні-валідатор

**Files:** create `config/vpcatalog.v1.schema.json`, `config/vpinstruction.v1.schema.json`,
`config/vpeffectiveprofile.v1.schema.json`; create `skills/vp-mode/scripts/schema.ts`;
test `tests/schema.test.ts`.

**Interfaces:**
- `validateAgainstSchema(value: unknown, schema: Schema): string[]` — повертає
  повідомлення про порушення; порожній масив = валідно.
- `Schema` — тип входу валідатора.

**Підмножина схем (межа валідатора):** `type`, `required`, `properties`,
`additionalProperties` (`false` **або** схема — для динамічних мап), `enum`,
`const`, `pattern`, `minLength`, `maxLength`, `minimum`, `maximum`, `minItems`,
`maxItems`, `items`, `$ref` → `#/definitions/*`, `allOf`, `if`/`then`, `not`.
Анотації `title`/`description` приймаються та **ігноруються** (документація
схем, без валідаційної семантики); `$schema`/`$id` — також ігноруються. Решта —
не підтримується і має бути відсутня у схемах VP. Guard-тест: кожен файл
`config/*.schema.json` має проходити `inspectSchema` без помилок.

**Кроки:**
1. Тест `tests/schema.test.ts`: валідний об'єкт → `[]`; відсутній обов'язковий
   ключ → повідомлення; зайвий ключ → повідомлення; `enum`/`const`/`pattern`/
   `minItems` → повідомлення; `$ref` у `#/definitions` → розкриття; `if`/`then` →
   перевірка умовного правила. **Крок:** `bun run --cwd packages/powers test` → тест
   падає (модуля ще немає).
2. Створити `skills/vp-mode/scripts/schema.ts` з `validateAgainstSchema` і
   `SUPPORTED_KEYWORDS` (експортований список — валідатор має відмовити схему з
   непідтримуваним ключем).
3. Створити три схеми: `vpcatalog.v1` (manifest: `schema`, `catalog_id`,
   `revision`, `source_revision`, `updated_at`, `tag_dictionary`, `tag_aliases`,
   `tag_exemptions`, `instructions[]` з `instruction_id`/`path`/`sha256`),
   `vpinstruction.v1` (усі поля інструкції за дизайном §5), `vpeffectiveprofile.v1`
   (`groups` → `active` + `alternatives`).
4. `bun run --cwd packages/powers test` → усі тести проходять;
   `bun run --cwd packages/powers typecheck` → 0 помилок.
5. Коміт: `build(powers): add VP schemas and a dependency-free schema validator`.

### Task 2 — Парсер frontmatter і модель інструкції

**Files:** create `skills/vp-mode/scripts/frontmatter.ts`; test
`tests/frontmatter.test.ts`.

**Interfaces:**
- `parseFrontmatter(text: string): { data: Record<string, unknown>; body: string }` —
  кидає `FrontmatterError` (з `line`), якщо блок відсутній, не парситься або має
  не підтримувану конструкцію.
- Підмножина YAML: `key: value` (скаляр, у подвійних лапках або без), блок-список
  (`- item`), коментарі (`#`), порожн�� значення, числа, `true`/`false`.
  Вкладені мапи, багаторядкові блоки та anchors — **не підтримуються** і мають
  бути відхилені явною помилкою, а не розібрані мовчки.

**Кроки:**
1. Тест `tests/frontmatter.test.ts`: розбір `key: value` + блок-список + коментар;
   відхилення вкладеної мапи; відхилення відсутнього блоку; збереження тіла після
   frontmatter; значення з `;` і `=` не ламаються. → тест падає.
2. Створити `frontmatter.ts`.
3. `bun run --cwd packages/powers test` → проходить; `typecheck` → 0 помилок.
4. Коміт: `build(powers): add a bounded frontmatter parser`.

### Task 3 — Модель каталогу, операції `catalog.*`, зв'язок manifest ↔ диск

**Files:** create `skills/vp-mode/scripts/catalog.ts`; test `tests/catalog.test.ts`.

**Interfaces:**
- `loadCatalog(catalogPath: string): Promise<Catalog>` — читає маніфест,
  валідує його за `config/vpcatalog.v1.schema.json` (схема — поруч із
  маніфестом), парсить `provenance` і `tag_aliases`.
- `loadInstructions(catalog: Catalog): Promise<Map<string, Instruction>>` — для
  кожного запису маніфесту читає `path` відносно каталогу, рахує `sha256` і
  **звіряє з маніфестом**; розбіжність → `CatalogError` з
  `code: 'CATALOG_DIGEST_MISMATCH'`. Frontmatter валідується за
  `config/vpinstruction.v1.schema.json` → `CATALOG_INVALID`; тег поза словником →
  `CATALOG_TAG_UNKNOWN` (з урахуванням `tag_exemptions`).
- `Instruction` — точні поля: `instruction_id`, `title`, `summary`,
  `capability_tags[]`, `pattern_tags[]`, `roles[]`, `products[]`,
  `conditions{applies_when,does_not_apply_when}` (скаляри, як у frontmatter),
  `artifact_contract{output_type,required_data[],verified_by}`,
  `compatibility{excludes[],requires[]}`,
  `provenance[{donor,license,revision,path}]` (масив — джерела після злиття),
  `status`, `revision`, `content` (тіло файлу).
- `catalogTags(catalog): { capability: TagEntry[]; pattern: TagEntry[] }` —
  `TagEntry = { tag, description, aliases[] }`; стабільний порядок, без текстів
  інструкцій (SR-09).
- `catalogSearch(catalog, instructions, query): InstructionMetadata[]` —
  фільтри: `capability_tags[]`, `pattern_tags[]`, `instruction_ids[]`, `roles[]`,
  `products[]`, `conditions[]`; результат **без** `content` (AC-05); семантика —
  дизайн §7 («хоча б один» у вимірі, «і» між вимірами, аліаси → канонічні,
  disabled не потрапляє, `roles`/`products` — порожній список = будь-який,
  `conditions` — токени є в `applies_when` і немає в `does_not_apply_when`).
- `catalogGet(catalog, instructions, id): Instruction` — невідомий ID →
  `CATALOG_ID_UNKNOWN`, вимкнений → `CATALOG_INSTRUCTION_DISABLED`.
- `catalogCompose(catalog, instructions, query): ComposedBundle` — required +
  збіги + транзитивні `compatibility.requires`; конфлікт `excludes` →
  `CatalogError`.
  `ComposedBundle` містить: `catalog_id`, `catalog_revision`, `tag_dictionary`,
  `instructions[]` (кожна — `instruction_id`, `title`, `summary`, `content`,
  `capability_tags`, `pattern_tags`, `artifact_contract`, `provenance`,
  `selection_reason`) і **контекст виконання** (SR-23): `role`, `task_contract`,
  `effective_methodology`, `work_scope`, `materialization_requirements`,
  `artifact_references` — усі з `query` або з порожнім значенням.
- `CatalogError` має поле `code` (набір: `CATALOG_INVALID`, `CATALOG_TAG_UNKNOWN`,
  `CATALOG_DIGEST_MISMATCH`, `CATALOG_ID_UNKNOWN`, `CATALOG_INSTRUCTION_DISABLED`,
  `CATALOG_REQUIRED_CONFLICT`, `CATALOG_PROFILE_CONFLICT`,
  `CATALOG_DEPENDENCY_MISSING`, `CATALOG_DEPENDENCY_DISABLED`).

**Кроки:**
1. Тести `tests/catalog.test.ts` на фікстурах `tests/fixtures/valid/`:
   search не повертає `content`; пошук за роллю/продуктом/умовою; compose включає
   required і залежності; compose без профілю на конфлікті → помилка; compose з
   профілем відкидає неактивну альтернативу; compose повертає контекст виконання
   (роль, task contract, ефективна методологія, scope, вимоги матеріалізації,
   посилання на артефакти — SR-23); `get` на невідомому/вимкненому id →
   помилка; інструкція з тегом поза словником → помилка; змінений файл → помилка
   digest. → тести падають.
2. Створити `catalog.ts`.
3. `bun run --cwd packages/powers test` → проходить; `typecheck` → 0 помилок.
4. Коміт: `build(powers): add catalog model and search/get/compose operations`.

### Task 4 — `decision.evaluate` (детермінована версія) і CLI

**Files:** extend `skills/vp-mode/scripts/catalog.ts` (операція `decision.evaluate` —
чиста функція каталогу); create `skills/vp-mode/scripts/catalog-cli.ts`; test
`tests/catalog-cli.test.ts`.

**Interfaces:**
- `decisionEvaluate(catalog, instructions, request): DecisionResult` — вхід:
  `{ operation, product?, context?, tags?, candidates[] }`; вихід:
  `{ selected: string[], score, rationale, provider: 'catalog' | 'agent', fallback: boolean, fallbackReason: 'no-candidates' | 'unknown-candidate' | 'candidate-not-allowed' | 'invalid-format' | null }`.
  Детермінована поведінка (SR-16, SR-18, SR-20): некоректний запит →
  `invalid-format`; порожні кандидати → `no-candidates`; невідомий ID →
  `unknown-candidate`; вимкнений кандидат → `candidate-not-allowed`; усі
  кандидати допустимі → shortlist за тегами (alias → канонічний; «хоча б один» у
  вимірі, «і» між вимірами), `provider: 'catalog'`, `score` = число збігів
  вимірів у найкращого кандидата (шкала **не** відкалібрована — це видно з
  rationale), `fallback: false`. Жодного збігу кандидатів — **не** відмова: порожній
  shortlist із `provider: 'catalog'`.
- CLI: `bun catalog-cli.ts <tags|search|get|compose|evaluate> [--catalog <path>]
  [--capability a,b] [--pattern c,d] [--id x] [--required a,b] [--role r]
  [--product p] [--condition text] [--profile <path>] [--operation name]
  [--context text] [--tag t]... [--candidate id]... [--json]`; JSON на stdout,
  помилки — JSON `{code,message,details}` на stderr + exit 1. Каталог
  знаходиться **від власного файлу** (`import.meta.url`), перекриття — `--catalog`.

**Кроки:**
1. Тести `tests/catalog-cli.test.ts`: JSON на stdout; помилка → JSON на stderr і
   ненульовий exit; `evaluate` без кандидатів → `fallback: true`; пошук каталогу
   відносно файлу (без cwd). → тести падають.
2. Створити `catalog-cli.ts` і додати `decisionEvaluate` у `catalog.ts`.
3. `bun run --cwd packages/powers test` → проходить; `typecheck` → 0 помилок.
4. Коміт: `build(powers): add deterministic decision evaluation and the catalog CLI`.

### Task 5 — Seed-корпус, маніфест, мапа і валідатор корпусу

**Files:** create `instructions/*.md` (8–12), `catalog.json`, `corpus-map.json`,
`scripts/check-corpus.ts`; test `tests/check-corpus.test.ts`.

**Кроки:**
1. Тест `tests/check-corpus.test.ts`: seed-корпус проходить перевірку; фікстура з
   відсутнім `provenance`, невідомим тегом, невідомим `requires`, дублем id,
   розбіжним digest, `rejected` без причини → помилка. → тест падає.
2. Створити 8–12 seed-інструкцій із research/SR (напр. `test-first-development`,
   `test-after-development`, `define-acceptance-criteria`, `evidence-based-research`,
   `scope-first-execution`, `independent-review`, `risk-based-testing`,
   `verify-acceptance`), кожна — з frontmatter за дизайном §5 і provenance на
   донорів із `donors.yaml`; `provenance.revision` = `head_sha` донора.
3. Створити `catalog.json` (перелік корпусу з `sha256`) і `corpus-map.json`
   (записи `rejected`/`merged`/`converted`).
4. Створити `scripts/check-corpus.ts`: інструкції за схемою, словник, alias-напрям,
   manifest ↔ диск ↔ digest, мапа ↔ корпус, provenance ↔ `donors.yaml`.
   Обов'язкові семантичні правила, яких **не виражає** схема (крос-файлові зв'язки,
   `donors.yaml`, унікальність, зв'язок зі словником) і які перевіряє саме цей
   валідатор:
   - `artifact_contract_output_type` ≠ `none` → `artifact_contract_verified_by`
     непорожній (SR-08); для guidance `output_type` = `none` і `required_data` порожній;
   - `capability_tags`/`pattern_tags` ≥ 1 — окрім інструкцій із `tag_exemptions`
     у `catalog.json` (виняток потребує `reason`);
   - `provenance`: список із щонайменше одного джерела; кожне джерело —
     `donor` ∈ `donors.yaml`, `license` збігається з маніфестом, `revision` дорівнює
     `donors.yaml[donor].head_sha`, `path` існує в клоні; те саме джерело двічі — не
     приймається;
   - `compatibility_requires`/`_excludes` — відомі `instruction_id`; `requires` не
     містить себе;
   - `instruction_id` у frontmatter дорівнює імені файлу; унікальність id у корпусі;
   - `tag_aliases`: напрям «**аліас → канонічний**»; канонічний тег має бути в
     `tag_dictionary`; аліас не є канонічним тегом;
   - мапа обробки (`corpus-map.json`): `status: split` → щонайменше два
     `instruction_ids` (§5a: «файл розщеплено на кілька атомарних інструкцій»);
     `status: converted` → рівно один `instruction_id`; `status: rejected` →
     `reason` обов'язковий, `instruction_ids` відсутній (схема мапи); `merged` →
     `instruction_ids` і `contributed_sources` присутні.
5. `bun run --cwd packages/powers test` → проходить; `bun packages/powers/scripts/check-corpus.ts` → exit 0;
   `typecheck` → 0 помилок.
6. Коміт: `build(powers): add seed corpus, manifests and the corpus validator`.

### Task 6 — Конвертер (єдиний writer)

**Files:** create `scripts/convert.ts`; test `tests/convert.test.ts`.

**Interfaces:**
- `convert(specPath: string, options: { root: string }): ConversionResult` — читає
  специфікацію інструкції (JSON), пише `instructions/<id>.md`, оновлює
  `catalog.json` (додає/замінює запис із `sha256`) і `corpus-map.json` (запис за
  джерелом); повертає `{ instructionId, written, manifestUpdated, mapUpdated }`.
- Специфікація інструкції: JSON із полями інструкції + `source: { donor, path }`.

**Кроки:**
1. Тест `tests/convert.test.ts`: конвертація специфікації → `.md` із frontmatter і
   `sha256` у маніфесті; повторна конвертація зміненої специфікації → оновлений
   digest; конвертація без `source` → помилка (синтетика без джерела заборонена);
   запис у мапі оновлюється.
2. Створити `scripts/convert.ts`.
3. `bun run --cwd packages/powers test` → проходить; `typecheck` → 0 помилок;
   `bun packages/powers/scripts/check-corpus.ts` → exit 0.
4. Коміт: `build(powers): add the corpus converter as the single writer`.

## Хід виконання

| Task | Статус | Доказ |
|---|---|---|
| 1. Схеми VP + міні-валідатор | **закрито** | `config/vpcatalog.v1.schema.json`, `config/vpinstruction.v1.schema.json`, `config/vpeffectiveprofile.v1.schema.json`, `skills/vp-mode/scripts/schema.ts`, `tests/schema.test.ts` — 32 тести, coverage 100 %, typecheck 0, knip `{"issues":[]}`; 4 незалежні рев'ю-раунди, фінальний вердикт ACCEPT |
| 2. Парсер frontmatter | **закрито** | `skills/vp-mode/scripts/frontmatter.ts`, `tests/frontmatter.test.ts` — 47 тестів, coverage 100 %, typecheck 0, knip `{"issues":[]}`; 3 рев'ю-раунди, фінальний вердикт ACCEPT |
| 3. Модель каталогу + `catalog.*` | **закрито** | `skills/vp-mode/scripts/catalog.ts`, `tests/catalog.test.ts`, `tests/fixtures/catalog/` — 96 тестів, coverage 100 %, typecheck 0, knip `{"issues":[]}`; 3 рев'ю-раунди, фінальний вердикт ACCEPT |
| 4. `decision.evaluate` + CLI | **закрито** | `skills/vp-mode/scripts/catalog.ts` (+`decisionEvaluate`), `skills/vp-mode/scripts/catalog-cli.ts`, `tests/catalog-cli.test.ts` — 126 тестів, coverage 100 %, typecheck 0, knip `{"issues":[]}`; 2 рев'ю-раунди, фінальний вердикт ACCEPT |
| 5. Seed-корпус + манифести + валідатор | у черзі | — |
| 6. `convert.ts` (єдиний writer) | у черзі | — |

---

## Поза цим планом

- Скіл `vp-mode` у повному вигляді, `vp-setup`, пер-хостові маніфести, marketplace —
  крок **E**.
- Конвертація реальних донорів (понад seed) — крок **D**.
- Runtime-запит D3+D8 — крок **G**.
- Реєстрація продукту в спільних root-файлах — крок **0** (відкладено за D9).

## Визначення завершення кроку C

1. `bun run --cwd packages/powers test` — 0 failures, `test:coverage` — поріг 1.0.
2. `bun run --cwd packages/powers typecheck` — 0 помилок.
3. `bun packages/powers/scripts/check-okf.ts` — `failures: []`.
4. `bun packages/powers/scripts/check-corpus.ts` — exit 0.
5. `bun run --cwd packages/agent lint:knip:pinned` — `{"issues":[]}`, exit 0.
6. `bun tooling/agent/check-documentation.ts <явний список .md>` — `failures: []`.
7. Кожен Task — окремий коміт; жодного файла не редагують дві лейни.
