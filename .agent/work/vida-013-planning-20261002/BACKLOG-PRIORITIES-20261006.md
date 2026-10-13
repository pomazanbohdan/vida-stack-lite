# Беклог VIDA — чинний порядок контурів, звірено 13 жовтня 2026

Чинні пріоритети погодженого CLEAR. Збережено task IDs, критерії, research і домовленості. Root інтегрує код; агенти досліджують окремі контури. Історія виконання зберігається в архіві, не задає поточні передумови.

## Поточна звірка й один batch закриття — 2026-10-13

У базових таблицях нижче 8 P0 і 10 P1 **контурів**, а не 18 підтверджених
невиправлених дефектів. Історичне `pending` не переважає пізніший перевірений
результат. За новим дорученням користувача Root звіряє всі 18 рядків одним
пакетом із шістьма сліпими Luna-дослідженнями та одним власником перевірок.
Статуси реалізації Source, цільових доказів і фінального прийняття розділені;
підзадачі й спільні фінальні гейти не збільшують кількість контурів.

Вже звірено:9803d14 і3b69209 опубліковані; реальні ordinary pre-commit hooks
обох пакетів PASS. Старий Babel mismatch не є поточним blocker. Audit18:L1
видалений із чинного опублікованого Source. Пізніший v705 PASS закриває
конкретний Source activation-move/process-death/same-ID resume сценарій;
ранній90s FAIL збережено як provenance, він не підміняє поточний стан.
Ці результати не означають встановлений native Runtime або глобальні100%.

Source/тестовий batch пройшов свої статичні й точкові перевірки; повне
прийняття залишається відкритим. `quality:final` вимагає повний frozen CRAP
plan; стандартний `crap-budgets.v1.json` відсутній, reviewed-partial не є
заміною. Genuine baseline b549951 уже виміряний і збережений: run fe54f83c,
report SHA ab0ef6481d20a0b1dabdb9ac220eb2145818a9f0ade7026986ff9571d5ea1acb.
Він допускає використання історичних вимірювань, але його suite/quality FAIL
не стає PASS. Бракує повного актуального reviewed function correspondence;
не потрібно повторювати baseline чи підвищувати budgets за поточним кодом.
Останній повний coverage run 3ad33c8f — UNKNOWN без допустимого
підсумкового report. Source/тестові виправлення й актуальна черга зафіксовані
в [WORK](../core-runtime-reactivation/WORK.md) та
[поточному плані](../core-runtime-reactivation/PARALLEL-TESTING-IMPLEMENTATION-20261012.md).
Повні контури закриваються після власних AC; відсутній proof залишається GAP.

Звірка шести незалежних Luna-оглядів із поточними tests виправила ще три
застарілі припущення. F1 має `normal-large` повний engine test і новий
`normal-history` для ledger, що сам перевищує 10 000 nodes; останній виявив
generic receipt clone defect у retry/lookup, виправлений спільним codec.
Обидва тепер PASS. F2 вже має всі exact 3/4-target
prefixes, settled retry та drift у кожному target у `release-preparation.test.ts`;
новий дублюючий prefix suite не потрібний. SDK preparation-denial cause вже
збережено; ширша typed readonly diagnosis лишається окремою P1 реалізацією.
Readonly snapshot не надає прав на changing routes.

| Порядок у базовій таблиці | Звірений стан Source / доказ | Точний залишок |
| --- | --- | --- |
| P0 1 admission/ownership | Виправлення реалізовано; нового дефекту огляд не відтворив | Поточне повне прийняття та свіжий native Runtime |
| P0 2 root/unresolved writer | Bound-root renewal і terminal/quiescence fences збережено | Цільова кваліфікація; UNKNOWN не replay |
| P0 3 rollback/filesystem | Source repairs збережено | Справжні Windows/native докази окремо від Linux/simulation |
| P0 4 pre-commit | Чинний ordinary hook двічі PASS на опублікованих пакетах | Спільні фінальні гейти; старий Babel blocker знято |
| P0 5 audit18:F1 | Retry/обидва lookup clones виправлено; large-composite/history PASS | Повне числове прийняття й native delivery |
| P0 6 audit18:F2 | Exact prefix/resume/conflict matrix уже реалізована | Фінальне прийняття/доставка, без дублювання matrix |
| P0 7 audit18:F3 | Readonly snapshot і реальний конкурентний WAL commit regression PASS | Спільне фінальне прийняття |
| P0 8 delivery | Поточний Source опубліковано; це не native installation | Одна whole-agent formation/delivery та ізольований runtime matrix |
| P1 1 workspace DB | Shared project paths, Bun adapter і 5 прямих regressions PASS | Cutover/native proof; in-memory tests не доводять disk branch |
| P1 2 execution/diagnostics | Shared contracts і SDK refusal cause є | Typed readonly diagnosis: reason/evidence, advisory existing routes, без нових прав |
| P1 3 context/reads | Bounded reads і freshness guards є | Контракт history/current-owner lookup та обґрунтовані SQL improvements |
| P1 4 tests | Bun, AST/scenario tooling і strict hook є | Exact coverage, exhaustive frozen correspondence, confirmed mutation, qualified parallel custody |
| P1 5 transport | Реалізацію чинного scope завершено; wave CAS, partial-report restart, retry/foreign/prefix tests є | Спільне фінальне прийняття; нова semantics лишається P2 |
| P1 6 delivery/binding | Current cohort/version/cache bindings реалізовано | Справжній CI artifact/cache та встановлений target |
| P1 7 cleanup | audit18:L1 видалено й опубліковано; Source scope закрито | Не відновлювати видалений ланцюг або старий pending |
| P1 8 governance | Edictum dependency видалено; Mastra + VIDA інтегровано | Актуальний повний behavioral/numeric proof |
| P1 9 Bun | Maintained TS/Bun migration реалізовано | Supported native flows/option matrix; generated SDK output окремо |
| P1 10 .vida upgrade | Plan/apply/resume і last-file/activation-death cases мають Source PASS | Active init/loader cutover за ready repair та свіжий native matrix |

Disjoint writers завершили F1, F3 і adapter; Root кваліфікував TRACE та фінальні
callers. Прибрано12 повторних CLI launches зі збереженням усіх4 route checks;
виправлено stale `.mjs` synthetic provenance path, точкова перевірка PASS.
Наступна P1 корекція: transaction-local producer receipt reuse з живою перевіркою
config/identity; далі кваліфіковане перекриття5 природних quarantine waits.
Дизайн і докази — `packages/agent/docs/research/test-timeout-cost-20261013.md`.
Реальні locks не старимо, timeout не збільшуємо. Batch не закриває відсутні
числові/native докази. Старі відсотки не є кількістю продуктових дефектів.

## Правило класифікації

P0 — підтверджений дефект існуючого контракту/реалізації, блокування, security/data failure та необхідна доставка виправлення. P1 — менше роботи, читань, викликів або зайвих перевірок у вже підтримуваному механізмі. P2 — нова capability, новий контракт/режим, розвиток engine, adapters чи UI. Missing proof — окремий GAP; він не стає bug лише через відсутній PASS. Реально знайдений bug під час P1/P2 входить до поточного CLEAR scope. Старі attempts та issued effects не відновлюємо і не replay.

Пряма вказівка людини 9 жовтня: об'єднання БД перенесено до P1 як основа для P2.
P1 також може впорядковувати внутрішню реалізацію чинної поведінки. Самої користі
для майбутнього P2 недостатньо: має бути конкретне спрощення вже наявного коду
або виконання. Нові публічні можливості залишаються P2.

## P0 — доопрацювання зараз

До всіх попередніх findings, включно з F03/F05, F07/F09/audit6 та hooks, застосовується одна межа: залишаємо потрібний новому контуру продуктний дефект; окремі старі execution blockers не відновлюємо. Статичне підтвердження не підміняє фінальний поведінковий доказ.

**CLEAR state:** старий `.agent` архівовано в `.tmp/archive/clear-start-20261009-150132-5d269b7a/`; активних старих БД, ініціалізації та pending release немає. Збережено 283 документа/task scope/acceptance/research. Новий runtime ще не ініціалізовано. Original-owner recovery не є передумовою нового виконання.

| Контур / збережені IDs | Поточний залишок і evidence | Owner / залежність |
| --- | --- | --- |
| Чинні admission/ownership контракти: F01/F02/F04/F06, P0-02/P0-04 | Зберегти доставлені виправлення. Доопрацьовувати лише недоставлений або відтворений у новому контурі дефект; старі leases та steps не відновлювати | Core; нове виконання |
| Source root / unresolved writer: F03/F05 | Bound Source root при renewal та terminal/quiescence fence у generic ownership CAS; CONFIRMED_STATIC | Core, спільний Host/run writer |
| Rollback/filesystem: F07/F09 + audit6 | Dynamic rollback closure; існуючі beforeimages; Windows private identity/link checks. Audit6 receipt/Linux atomicity/FD/FIFO/DB URL/no-effect retry зберігають власні AC; Source contributions не закривають real target proof | Core; Windows/Linux proof окремо від simulation |
| Existing pre-commit bugs, original hook work | Staged-index/custody, partial staging і pinned checks реалізовано. Ordinary hook активний і PASS на 9803d14/3b69209; історичний Babel mismatch знято. Спільний final quality proof окремо | Core, існуючий hook contour; без checkout commit/restage |
| audit18:F1 / читання складеного стану | Спільні ledger/component codecs застосовано в Host, CLI та continuation/capture history. Поточні v1 bytes і межі збережено за static review; фінальні regression/numeric checks і доставка pending | Core; поточний пакет P0 |
| audit18:F2 / підготовка релізу | Intent до першої зміни manifest, exact resume та conflict retention реалізовано. Scoped static review не знайшов дефекту; фінальні перевірки й доставка pending | Core; свіжа release operation; архівні UNKNOWN не replay |
| audit18:F3 / узгоджений inspector | Один readonly snapshot із перевіркою work identity, journal run, revision і lease-ticket binding реалізовано. Фінальні concurrency/negative checks і доставка pending | Core; разом із причинним пакетом |
| P0-01 / необхідна доставка | Одна whole-agent update виправленого результату та actual fresh admission. Не повторювати tests/reviews під час build/install | Core; чинний release owner |

Статичні F01–F07/F09 докази та AC: [валідація audit9](STATIC-AUDIT-AGENT-VALIDATION-20261009.md); попередні audit6: [пакет](P0-STATIC-AUDIT-VALIDATION-20261008.md). Coverage defect — existing task, не новий Work. Останній перевірений installed repair checkpoint CI37918197915/art11611162050/native0.1.3 доставив поточні recovery/ownership/rollback/filesystem виправлення; fresh runtime admission і повне P0 closeout ще не підтверджені.

Свіжий audit18 синхронізовано з [планом CLEAR](../core-runtime-reactivation/CLEAN-START-STRATEGY-20261009.md#перевірений-вхідний-стан).
Це окремі IDs від F01–F09. Збережено зовнішню шкалу severity та нашу класифікацію
робіт. F1/F2 — P0; F3 — потрібна передумова; F4/L1 — P1; C1 — розвиток SDK P2.
Статична перевірка findings не означає виконане виправлення чи Runtime proof.

## P1 — оптимізація існуючих контурів після P0

### Прийняті межі тестування

Задачі Vida-Test, Bun runner/coverage, CRAP, mutation та погоджений pre-commit входять до P1. Root інтегрує зміни без повторення вже завершеного policy patch. Нові hooks поза погодженим scope — P2. Чинне доповнення людини: тести пишемо паралельно з причинними Source/TS patches; affected stable cases перевіряє один owner, фінальні suites/numeric gates — після стабілізації scope. Formation/install без suites.


Порядок визначає користь для нового виконання та залежності. Це пріоритети, не видані waves або окремі версії.

| Порядок | Контур / existing IDs | Залишок P1 та межа |
| --- | --- | --- |
| 1 | Єдина БД workspace: [наявні storage WF07/WF08](WORK.md#unified-bun-sqlite-architecture-decision) | ПРИЙНЯТО ДО P1. Спільний Bun SQLite шлях зберігання для Host і Mastra; окреме володіння таблицями. Чисте створення, backup, restart і rollback входять у цю саму задачу; старі operational rows не імпортувати. Не нові Work IDs і не друга реалізація Mastra |
| 2 | Керування виконанням і діагностика: OPT01–04/14; OPT16/BL-FLOW013; BL-FLOW007/002/006; audit18:F4 | Зрозумілі сумісні FAIL/GAP/next-action, збереження безпечної причини відмови SDK, менше необов'язкових ролей і повторних bindings. Broken predicate/readiness — P0; новий profile/routing — P2 |
| 3 | Контекст і читання: OPT11/12/13; BL-FLOW003; DB01–08/11 вузька частина | Bounded reads, reuse незмінених inputs, конкретні SQL query/index поліпшення. Query/root correctness — P0; нові sidecar/read models — P2 |
| 4 | Повний локальний контур тестування: TEST-013-01..07; original test-policy/hook work; OPT15; OPT10/14/19; DB05/06 | ПРИЙНЯТО ДО P1. Завершити Bun Test/coverage migration, сценарії, scoped coverage/CRAP, mutation qualification та погоджений pre-commit. Задачі Vida-Test включено до спільного пулу; критерії й порядок нижче. Новий runtime proof framework — P2 |
| 5 | Transport і reporting: OPT05/06; OPT08/09; BL-FLOW004/005 вузька частина | Звести наявні prepare/issue ingress calls, partial reports/dedupe зі збереженням усіх CAS/accepted-prefix/UNKNOWN. Нова supported partial-report semantics спочатку як P2; bug існуючого retry — P0 |
| 6 | Поточна доставка й binding: runtime BL-RUNTIME-PATCH-VERSION-001; BL-DELIVERY-RELEASE-001/SA08 existing slices | Reuse cached build/download й відомого operation result, прибрати зайві читання/команди чинного updater. Відсутній обов'язковий identity/result binding — P0; новий allocator/Release resolver — P2 |
| 7 | CLEAR чинного коду: audit18:L1 та план очищення | Source scope закрито: L1 writer chain відсутній у чинному опублікованому Source. Поточний publisher і interruption/retry tests збережено. Не повторювати вже виконане видалення |
| 8 | Governance: Mastra + VIDA | Прибрати `@edictum/core`. Mastra виконує граф і suspend/resume; VIDA зберігає потрібні finite policy checks, counters, direct SDK і чинні v1 проєкції. Host/Cedar approval, reservation, CAS та UNKNOWN лишаються у своїх власників. Код інтегровано; фінальна поведінкова перевірка та доставка pending |
| 9 | Нативні можливості Bun | Окреме дослідження Luna: фактичні Node call sites, офіційні Bun API, семантика й пріоритетні заміни. Root переносить код пакетами за користю для чинного runtime. Спільні зміни SQLite, subprocess, кешу та тестового tooling виконуються в їхніх уже наявних задачах; без дубльованих реалізацій і host-залежності |
| 10 | Єдиний каталог `.vida` та upgrade | Component composer/converter, shared paths і bundle-owned plan/apply/resume реалізовано. Last-file та activation-move interruption/same-ID resume мають пізніші Source PASS v670/v705. Залишок: active init/loader cutover за готового repair і свіжий native Runtime proof. Старий архів не активувати |

P1 numeric domain Source узгоджено: schema/canonical snapshot/revision boundary
відхиляють unsafe integers; scoped Ajv regression має PASS. Фінальний connected
proof і доставка pending. Converter зберігає accepted values; активний loader
і нові права цим не активуються. Не повторювати вже інтегрований domain patch.

Єдина БД означає одну налаштовану БД на workspace, а не спільну БД всіх незалежних
репозиторіїв. Шлях задає конфігурація. Інвентаризація охоплює також службові
release admission/worker БД: для їх об'єднання слід зберегти mutex/UNKNOWN
семантику та не утримувати write transaction протягом build або очікування.
Їх готовність не виводиться з переносу Host/Mastra. Один файл сам по собі не
робить операції різних компонентів атомарними. Backlog, research, документи,
stable IDs, original attempts і невизначені результати зберігаються.

Storage WF07/WF08 тут означають рядки наявного рішення Unified Bun SQLite,
а не однойменні adapter slices в інших історичних таблицях. Owner — Core;
Vida-Test зберігає власний test/runner scope. Залежні P2 storage slices
використовують цей результат. Незалежні P1 роботи не чекають об'єднання БД.

Погоджені P1 scopes виконуються за залежностями нового CLEAR контуру. Старий Core continuation не є trigger. Готові незалежні дослідження йдуть паралельно; Root один раз інтегрує спільні Source paths.

### Прийнятий контур Vida-Test

Пряма вказівка людини 9 жовтня: прийняти задачі
[Vida-Test](codex://threads/01a0f6f4-1f88-7bf3-a22b-b07b2f358245)
та активацію повного тестування до спільного P1. Core інтегрує пул; stable task IDs і вимоги збережено. Старі attempts — лише provenance в архіві, без transfer або recovery gate. Root — єдиний writer.

Джерела: [TEST-013-01..07](../test-patterns-013-20261002/WORK.md#code-task-test-013-semantic-regression-proof),
[handoff тестувальника](../test-authoring-policy-20261008/HANDOFF.md),
[original hook work](../test-local-git-hooks-20261001/WORK.md) та
[TESTING.md](../../../packages/agent/TESTING.md).
Policy вже внесена. Залишок: independent review, документація, numeric proof і активація погодженого pre-commit. Старий lease/resume blocker вилучено з поточного виконання.

| Збережена задача / робота | Результат у нашому пулі |
| --- | --- |
| `test-authoring-policy-20261008` | Завершити актуальні незалежні перевірки й documentation closeout; внесений policy patch не повторювати. Старий attempt лишається в архіві |
| Bun Test та coverage migration | P1: чинні test phases працюють на Bun; coverage counters відповідають актуальному Source. Зберегти failed10733 і Bun/V8 GAP до виправлення; не замінювати runner на Node |
| TEST-013-01/02 | P1: shrinking та seed/path replay; виконувані ZOMBIES scenarios замість placeholder/truthiness доказу. Статично підтверджені недоліки ще потребують поведінкового доказу виправлення |
| TEST-013-03/04 | P1: Fresh/Explicit/Persisted/Replay fixtures, незалежна модель, restart/CAS/duplicate/fault cases. Потрібні storage cases приєднати до єдиної БД |
| TEST-013-05/06 | Перенесено з P2 до P1: еквівалентність підтримуваних CLI/SDK/inspector та прогалини чинних public happy paths. Тести нових P2 capabilities залишаються з ними |
| TEST-013-07 | Перенесено з P2 до P1: один узгоджений локальний прогін, reuse актуального доказу, один writer numeric outputs; без дублювання ordinary/coverage виконання для того самого доказу |
| Coverage та CRAP tooling | P1: AST/scenario inventory, точні 100% functions/lines/statements/branches у погодженому scope; виконувані frozen per-function/risk CRAP/complexity budgets без погіршення baseline |
| Mutation tooling та qualification | P1: сумісний із Bun запуск і 100% підтверджених Killed у погодженому scope. Survived, NoCoverage, timeout/error та неперевірені equivalent mutants не дають PASS |
| `test-local-git-hooks-20261001`, lint/tooling залишок | P1: завершити hook checks, прибрати errors/warnings і активувати погоджений pre-commit. CLI modules та shared source inventory включено до bin/tsconfig. Inventory типізовано; інші strict typing і unsafe-value діагностики відкриті. Source TS checks проходять. Нові pre-push/CI перевірки не додаються |

Наявність БД не є умовою незалежного виправлення test tooling. Пов'язані
storage/CLI сценарії приєднуються до реалізованого результату через спільний
фінальний етап нижче. Політика збереження результатів та owner boundaries чинна.

### Правило тестування поточного P0–P1 контуру

Чинне доповнення людини від 10 жовтня: тести пишемо паралельно з причинними
код-корекціями й connected TS migration. Під час редагування — статичні checks;
один owner запускає affected stable cases без повтору незмінених PASS. Повний
погоджений scope, coverage, CRAP та mutation перевіряємо після стабілізації
Source/tooling/tests. Не потрібен окремий full suite після кожної правки;
formation/install не запускають suites. Політика інших задач має свого owner
у TESTING.md; exact quality вимоги цього контуру не послаблено.

Порядок:

1. Погодити й зафіксувати склад P0–P1, affected production files/callers та AC.
   Перед реалізацією зафіксувати наявний baseline і обґрунтовані CRAP/complexity
   budgets; не виводити збільшений дозвіл із вже зміненого коду.
2. Завершити реалізацію погодженого контуру, включно з потрібним test tooling;
   behavioral/regression тести писати паралельно з causal patches і TS migration.
3. На стабільному коді завершити весь потрібний набір: unit, integration,
   property/ZOMBIES та застосовні persistence/concurrency/fault/security cases.
   Зіставити maintained functions і AC з конкретними assertions та сценаріями.
4. Провести повну застосовну перевірку погодженого контуру на Bun, потім coverage,
   CRAP/complexity та mutation testing на стабільному Source. Пряма вказівка
   людини включає mutation у цей фінальний етап; повторний дозвіл на нього не
   потрібен після погодження точного контуру. До такого погодження запусків немає.
5. Зібрати FAIL/GAP, виправити причини однією пачкою, оновити заторкнуті докази.
   Не повторювати незмінені PASS і не приховувати провалені прогони. Активувати
   погоджений pre-commit після його справжніх checks; отримати незалежне закриття.

Повнота означає весь погоджений P0–P1 scope і його залежності, не довільне
переписування незміненого legacy. CODE_DONE не означає завершений контур без
цього фінального етапу. Цілі coverage/mutation — 100%; відсутні метрики,
непройдені сценарії або missing baseline лишаються FAIL/GAP. Mutation не
вмикається автоматично в усіх майбутніх задачах, hooks або CI.

Повний test contour локальний і відокремлений від build/install: вони не
запускають suites повторно. Відсутній numeric proof не стає новим gate
необхідного P0 runtime update/unblock, але й не закриває тестовий контур.
Старі БД архівовано; нові БД, hooks і runner ще не активовано.

Офіційна [Bun coverage документація](https://bun.com/docs/test/code-coverage#coverage-thresholds)
описує неперевірюваний `statements` threshold і LCOV-only exit 0 поза parallel
без контролю порогу. Для повного coverage потрібні достовірні counters і
негативні controls усіх заявлених метрик; вбудований exit code не є достатнім.
Це вимога до реалізації, не нове локальне відтворення. Shrinking звірено з
[fast-check Parameters](https://fast-check.dev/docs/api/interfaces/Parameters/#endonfailure).

### Прийнятий наскрізний shared/оптимізаційний прохід — 2026-10-11

За прямим дорученням власника підтверджене спрощення всіх підтримуваних файлів
Agent/Core приєднано до чинних BL-FLOW006/007, OPT01/06/08/13, storage і TEST-013
scopes. Виконувана черга, file families, знайдені дублікати/зайві читання,
готові packets і acceptance мають одного owner у
[CLEAR плані](../core-runtime-reactivation/CLEAN-START-STRATEGY-20261009.md).
P0 — відтворений дефект чинної поведінки; P1 — shared contracts, fewer reads/
calls, TS/dead-code/tooling simplification. Public/persisted boundaries, exact
quality, CAS/ownership/authorization/UNKNOWN і attribution лишаються чинними.
Нових task IDs, engine capabilities або budget allowances це доручення не додає.
Already implemented/issued роботу не дублювати; Source evidence не є Runtime
unblock. Решта P2 пропозицій нижче не стають прийнятими автоматично.

### Кандидати до P1 як основа для P2

Це пропозиції за поточним запитом, не автоматичне перенесення всього P2 чи
видані завдання. БД і тестовий контур уже прийняті до P1 вище. Кожна пропозиція
має давати самостійну користь чинному runtime до появи нового engine.

| Кандидат / наявний scope | Користь зараз і для P2 | Межа P1 |
| --- | --- | --- |
| Спільні валідатори та менші модулі: чинна частина BL-FLOW006/007, P2 core contracts | Менше розбіжностей між callers і менше контексту при зміні HostState; наступні блоки повторно використовують перевірені контракти | Винести згуртовані pure validators/readers. Зберегти чинні public/persisted schemas і одного власника CAS. Нові block IO/completion profiles залишаються P2 |
| Спільна реалізація чинного continuation/retry: OPT01/06/08/13, existing repair paths | Виправлення спільної причини діє для всіх поточних callers; менше одноразових recovery handlers | Лише доведені дублікати однакової семантики. Окремі межі довіри, lease, CAS і UNKNOWN зберігаються. Нові child tasks/cancel/loops/restart modes — P2 |
| Відокремлення завершеної історії: G01, storage historical segmentation | Обсяг звичайного читання не росте разом з усіма завершеними запусками; основа для довготривалих P2 flows | Спершу визначити потрібний чинним readers обсяг і контракт lookup/збереження. Жодного видалення backlog/research/FAIL/UNKNOWN. Новий формат потребує підтримуваного repair до переходу; це не передумова вузького F1 fix |

SQL indexes, bounded reads, діагностика та reuse доказів уже є в P1; повторних
задач для них не додаємо. Рекомендований порядок після P0: потрібне спрощення
поточних контрактів і storage adapter → перевірений перенос БД → індекси та
читання → видалення перехідного коду. Легкі незалежні виправлення йдуть поруч.
Кількість етапів не задає кількість поставок; інтегруємо готові сумісні зміни.

Уточнення 2026-10-10 за [перевіреним зовнішнім аудитом](../core-runtime-reactivation/EXTERNAL-ARCHITECTURE-AUDIT-20261010.md):
BL-FLOW006/007 shared-validator slice завершує вже початий session bridge
contract extraction і два runtime back-edges без нової схеми чи execution owner.
Audit18:F4/OPT01–04/14 diagnostics slice використовує чинні read-only inspect
views і command contracts для reason/evidence/allowed existing route IDs, без
нових прав або generic repair engine. DB01–08/11 bounded-read slice перевіряє
законну unrelated-history denial на чинному256-row/8MiB census перед indexed
owner predicate/pagination; incomplete/cap exhaustion не absence PASS.
Це уточнення наявних scopes, не closure і не нові IDs. WF07/WF08 target однієї
workspace DB збережено; різні transactions і filesystem не стають одним commit.
Нові DAG/effects/routes/telemetry framework лишаються P2 за власними prerequisites.

Підстава: чинні `host-state.ts`, `mastra-session-bridge.ts`, `research-decision.ts`,
`tooling/agent/git-quality-hooks.mjs` та `TESTING.md#new-and-modified-files`.
Перевірені офіційні механізми: [Bun SQLite](https://bun.com/docs/runtime/sqlite)
для prepared queries/transactions та [SQLite backup](https://www.sqlite.org/backup.html)
для узгодженої копії. Наявність SQLite API не доводить сумісності Mastra adapter
чи готовності міграції; це залишається частиною задачі об'єднання БД.

## P2 — розвиток за контурами та залежностями

| Порядок | Контур / existing IDs | Результат / передумова |
| --- | --- | --- |
| 1 | Portable core contracts та repair: EPIC-CONFIGURABLE-AGENT-SYSTEM-001; BL-FLOW006/007; WF05/06 | Мінімальні typed block IO/execution evidence/completion contracts на чинних WorkItem/kinds; функціональний repair до active-v1 effects. Не custom business task-type registry |
| 2 | Blocks та flow: OPT16/BL-FLOW013 complex; BL-FLOW006/007; G02 | Registered agent/tool/subflow execution, configurable compile/conditional/failure/dependency-ready joins. Host authority та Mastra execution; full task boards/provider mapping не prerequisite |
| 3 | Child execution/recovery: BL-FLOW008/009; OPT01/06/08/13 complex | Child identity/inputs/AC/dependencies/admission/ownership, cancel/loops/restart/partial paths на готових core/flow contracts |
| 4 | Adaptive routing: OPT16/BL-FLOW013 complex; existing routing research | Model/effort selection із allowlisted profiles/current policy, після typed block/outcome contracts; незалежне від UI |
| 5 | Context/discovery/skills/impact: OPT11/12/13/WF06; BL-FLOW006; TEST complex | Sidecar refs, tags, discovery/skill selection, change-impact flows після потрібних blocks/child contracts |
| 6 | Storage/API та SDK extensions: DB01–08/11/WF09 new-model; F08; audit18:C1; G01 | Нові read models/API та SDK exact-result contract. Об'єднання чинних Host/Mastra БД перенесено до P1; базове обслуговування завершеної історії запропоноване до P1 вище. Порушення чинного release/recovery контракту — bounded P0 |
| 7 | Developer hook extensions, isolation та delivery extensions: P0-03 feature slice; BL-RUNTIME-PATCH-VERSION-001 full allocator; BL-DELIVERY-RELEASE-001/SA08 new route | Нові hooks/checks, optional canonical-Host worktree; allocator перед new Release-only resolver. Активація погодженого pre-commit вже належить до P1 testing. Окремі capabilities можуть плануватись незалежно від engine, після own prerequisites |
| 8 | Task management та external adapters: BL-FLOW010/011; WF10/DB09; WF07/08/OPT18 | Hierarchy/planning/sprint, Jira/Azure mapping, durable Issues/PR і platform integrations. Повна task-management модель — окремий контур, не blocker мінімального engine |
| 9 | UI: WF11/12, Dashboard01–09, DB10; Plugin/Codex owners | Boards/tree/Wiki/settings/events/flow editor після реального потрібного API; generic Core не привласнює adapter контур |
| 10 | Broad upgrades/cutover: DEP013/BL-DEPENDENCY-UPGRADE-001; WF05/06 migration | Кваліфіковане оновлення бібліотек й selected migration/cutover після власних compatibility proofs. Concrete dependency bug — P0; доступна нова версія сама не bug |

Кожний новий contour має свої prerequisites, Source scope/AC/current ownership та applicable assurance. Номери — сортування, не нові IDs/issued waves. P2 не запускається автоматично цим переглядом. Нові capabilities лишаються P2; fixed common kinds і цей порядок визначають залежності.

## GAP, які не видані як підтверджені баги

- TEST01–07/OPT10/14: поточний Vitest V8 provider несумісний із Bun; розширити наявний Bun instrumentation pipeline без переходу на Node або дублювання AST inventory. Це P1 testing, не build/install gate.

- G01 finite ledger budget: structural limit confirmed, actual законний closure failure у чинному owner state не відтворено; bounded validation до implementation, без видалення історії/підняття limits як удаваного fix.
- ZOMBIES fallback matrix — inventory, не behavioral coverage; відсутній export case/placeholder сам по собі не runtime defect. Якщо matrix реально використана як universal PASS — окремий verifier bug P0 після точного caller proof.
- Frozen CRAP policy vs legacy fixed <5/complexity10 executable gate: known unimplemented policy enforcement/GAP; виконання погодженої політики включено до P1 testing. Це не доказ false accepted runtime. Concrete wrongful gate decision → P0; нова політика поза погодженим scope — P2.
- Mutation full capture/CAS coverage та numeric deficits — missing proof, не license запускати mutation/новий framework. Required changed-risk checks лишаються з чинним developer.
- Linux/Windows actual target proof, fresh issued assurance, current ownership/admission і DocFlow — відкриті потрібні докази; planning update не дає PASS.

- 2026-10-10, нове пряме доручення: усі26 direct Agent/Core pins узгоджені з lock/install; strict Knip6.41 pre-commit приєднано до одного raw staged snapshot без restage/install/suites. Активація не є closure: unused/unresolved findings блокують commit. Captured63 findings класифіковано у поточному WORK/ignored evidence, без нового full scan та blanket suppressions; preserved local src-check і stale provenance/coverage tests не видаляти заради green. Existing export surface, dynamic dependency ownership і test drift — погоджений P1, не нові engine capabilities. Lexical alias guard correction/review завершено, локальний precommit активовано без prepush; Source/checked-JS і bounded qualification не замінюють фінальні100% coverage/frozen CRAP/confirmed-Killed докази.
- 2026-10-10, поточний cleanup:63→7 Knip findings; internal exports/dead code та shared implementation-scope validator інтегровані після blind-review. Залишаються4 збережені локальні src-check файли,2 старі тести без чинного producer і1 CI observer/caller GAP; strict gate лишається FAIL. Точкові Bun8 PASS і статичні PASS не закривають повну міграцію/числові гейти. Service-custody-v8 продовжується в тому самому P0 scope, з обома producers; runtime activation/unblock pending.

- 2026-10-10, current dispatch: custody/fresh-merge producers, read-only retarget verifier and function/scenario auditor joined with causal corrections and split named behavior proofs; current Source/checked-JS/scoped native types and lint pass. Exact four-metric100%, frozen CRAP and assertion-confirmed Killed still pending. Whole TS-only is FAIL; raw-index filename integration and fresh full lifecycle/interruption tests are private next packets. Existing DB upgrade remains blocked by unproved legacy-opener exclusion; no toggle, loader/schema/runtime activation or unblock claim. Six useful Luna scopes use blind reviews/private immutable candidates and one Root integrator/verifier. See current CLEAR practical queue and WORK for measured limits; no percentage or task closure inferred from authored code.

- Same dispatch follow-up: raw-index TS-only filename gate joined, two bounded controls/static PASS; actual commit remains FAIL on preserved staged JS and index unchanged. CI cache directory now shared at job scope for both frozen installs; static YAML PASS, live formation/cache proof GAP. Next private packets cover fresh lifecycle/interruption and one ledger schema discovery instead of seven reads; scope help syntax parity is a bounded P1 follow-up. No full numerical/runtime/task closure inferred.

- Current measured delta:26 native files registered once; fresh-process same-ID UNKNOWN recovery PASS (63 assertions), existing-storage admission4 PASS, configuration contract migration10 PASS, inline throw-assertion audit2 PASS and optional CLI contract3 PASS. Ledger metadata regression12 PASS; public corrective cache-hit fixture remains under Root verification. Four synchronous upgrade read duplicates removed; effectful callback revalidation retained. Root native CI configured typed lint and release-adapter closure remain open. One behavioral verifier serializes shared package CAS use; six blind Luna scopes prepare private candidates/reviews. Frozen baseline, exhaustive correspondence, exact numeric gates, legacy exclusion and actual runtime qualification remain open; no task closure or percentage inferred from these bounded proofs.


### Чинне уточнення фінальної перевірки — 2026-10-11

За прямим рішенням користувача працюємо на чистому середовищі: перевірку
розблокування старих споживачів та пов'язані notices вилучено з поточної задачі.
Заміна — **OPEN: прогін реального сформованого native Runtime у свіжому
ізольованому проєкті через всі підтримувані команди, опції та флоу**.
Власник порядку, меж і критеріїв — [поточний CLEAR plan](../core-runtime-reactivation/CLEAN-START-STRATEGY-20261009.md#current-human-decision--clean-isolated-runtime-qualification-2026-10-11).
Пов'язана задача збережена також у WORK та актуальному handoff.

Потрібні реальні виконання, persistence/restart та CAS/authorization/UNKNOWN
denials; help/install/version не замінюють доказу. Source checkout має бути
фактично недоступним для runtime, а не лише виключеним із PATH/cwd.
Матриця покриває всі підтримувані опції через перевірені класи значень і
конфліктів; відсутній необхідний target/provider лишається GAP. Непідтримувана
на конкретному target операція може мати N/A лише з посиланням на контракт.
Старі Host state, leases, attempts та UNKNOWN не переносити й не replay.
Чинні P0/P1, exact quality gates та ownership не послаблено.
