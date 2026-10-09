# Беклог VIDA — чинний порядок контурів, 9 жовтня 2026

Чинні пріоритети погодженого CLEAR. Збережено task IDs, критерії, research і домовленості. Root інтегрує код; агенти досліджують окремі контури. Історія виконання зберігається в архіві, не задає поточні передумови.

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
| Existing pre-commit bugs, original hook work | Staged-index selection/checked-byte race, partial staging, pinned environment/root config checks. Виправлення hook — P0; активація погодженого pre-commit — P1, нові hooks/checks — P2 | Core, існуючий hook contour; без checkout commit/restage |
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

Задачі Vida-Test, Bun runner/coverage, CRAP, mutation та погоджений pre-commit входять до P1. Root інтегрує зміни без повторення вже завершеного policy patch. Нові hooks поза погодженим scope — P2. Тести пишемо та виконуємо після реалізації всього P0–P1 scope; formation/install без suites.


Порядок визначає користь для нового виконання та залежності. Це пріоритети, не видані waves або окремі версії.

| Порядок | Контур / existing IDs | Залишок P1 та межа |
| --- | --- | --- |
| 1 | Єдина БД workspace: [наявні storage WF07/WF08](WORK.md#unified-bun-sqlite-architecture-decision) | ПРИЙНЯТО ДО P1. Спільний Bun SQLite шлях зберігання для Host і Mastra; окреме володіння таблицями. Чисте створення, backup, restart і rollback входять у цю саму задачу; старі operational rows не імпортувати. Не нові Work IDs і не друга реалізація Mastra |
| 2 | Керування виконанням і діагностика: OPT01–04/14; OPT16/BL-FLOW013; BL-FLOW007/002/006; audit18:F4 | Зрозумілі сумісні FAIL/GAP/next-action, збереження безпечної причини відмови SDK, менше необов'язкових ролей і повторних bindings. Broken predicate/readiness — P0; новий profile/routing — P2 |
| 3 | Контекст і читання: OPT11/12/13; BL-FLOW003; DB01–08/11 вузька частина | Bounded reads, reuse незмінених inputs, конкретні SQL query/index поліпшення. Query/root correctness — P0; нові sidecar/read models — P2 |
| 4 | Повний локальний контур тестування: TEST-013-01..07; original test-policy/hook work; OPT15; OPT10/14/19; DB05/06 | ПРИЙНЯТО ДО P1. Завершити Bun Test/coverage migration, сценарії, scoped coverage/CRAP, mutation qualification та погоджений pre-commit. Задачі Vida-Test включено до спільного пулу; критерії й порядок нижче. Новий runtime proof framework — P2 |
| 5 | Transport і reporting: OPT05/06; OPT08/09; BL-FLOW004/005 вузька частина | Звести наявні prepare/issue ingress calls, partial reports/dedupe зі збереженням усіх CAS/accepted-prefix/UNKNOWN. Нова supported partial-report semantics спочатку як P2; bug існуючого retry — P0 |
| 6 | Поточна доставка й binding: runtime BL-RUNTIME-PATCH-VERSION-001; BL-DELIVERY-RELEASE-001/SA08 existing slices | Reuse cached build/download й відомого operation result, прибрати зайві читання/команди чинного updater. Відсутній обов'язковий identity/result binding — P0; новий allocator/Release resolver — P2 |
| 7 | CLEAR чинного коду: audit18:L1 та план очищення | Видалити доведено невикористані writer/repair ланцюги й дублікати. L1 виправлено та перевірено локально, ще не поставлено. Непотрібні історичні recovery залежності вилучити після перевірки callers і потрібної поточної поведінки |
| 8 | Governance: Mastra + VIDA | Прибрати `@edictum/core`. Mastra виконує граф і suspend/resume; VIDA зберігає потрібні finite policy checks, counters, direct SDK і чинні v1 проєкції. Host/Cedar approval, reservation, CAS та UNKNOWN лишаються у своїх власників. Код інтегровано; фінальна поведінкова перевірка та доставка pending |
| 9 | Нативні можливості Bun | Окреме дослідження Luna: фактичні Node call sites, офіційні Bun API, семантика й пріоритетні заміни. Root переносить код пакетами за користю для чинного runtime. Спільні зміни SQLite, subprocess, кешу та тестового tooling виконуються в їхніх уже наявних задачах; без дубльованих реалізацій і host-залежності |
| 10 | Єдиний каталог `.vida` та upgrade | Лише ініціалізований агент: config, instructions і work state; Source лишається в `packages`. Component schema/composer, pure v1 converter і спільний DB/config path owner інтегровано; Source static checks проходять. Bundle-owned upgrade, active loader/init, atomic activation та exact resume pending. Не активувати старий архів |

P1 validation також узгоджує числовий діапазон config schema та
`runtimeConfigDigest`: schema приймає unsafe integers, canonical digest їх
відхиляє. Новий converter зберігає наявні значення; він не активує loader або
нові права. Це статично підтверджена крайова невідповідність, не відтворений
блокер поточного workspace.

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

Остання пряма вказівка людини 9 жовтня задає виняток для цього контуру:
спочатку реалізувати весь погоджений обсяг, потім написати й доопрацювати
тести повністю, виконати coverage, CRAP та mutation testing. Під час реалізації
не запускаємо окремий обов'язковий test-authoring/test-run цикл після кожної
правки. Загальну політику інших задач у TESTING.md цей локальний виняток не змінює.

Порядок:

1. Погодити й зафіксувати склад P0–P1, affected production files/callers та AC.
   Перед реалізацією зафіксувати наявний baseline і обґрунтовані CRAP/complexity
   budgets; не виводити збільшений дозвіл із вже зміненого коду.
2. Завершити реалізацію погодженого контуру, включно з потрібним test tooling.
   Писати й доопрацьовувати його behavioral/regression тести на наступному етапі.
3. На завершеному коді написати весь потрібний набір: unit, integration,
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
