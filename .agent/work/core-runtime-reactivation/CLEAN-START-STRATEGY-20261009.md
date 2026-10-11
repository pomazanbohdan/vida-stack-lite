# CLEAR: закриття поточного P0–P1 VIDA

Статус: погоджений CLEAR P0–P1 у роботі. Root — єдиний інтегратор Source.
Luna агенти паралельно досліджують, готують текстові пропозиції й виконують
сліпий review. Чинна межа після writer-incident: агенти не пишуть файли,
не запускають checks і не змінюють Git; Root пише Source, тести й scratch.
Чинне доповнення людини від 2026-10-10: тести пишемо паралельно з кодовими
корекціями; сліпі цикли аналізу продовжуємо. Фінальні числові перевірки
виконує один writer після стабілізації їхніх входів.
Чинне доповнення людини: підтримувані handwritten Source, CLI, dev tooling,
тести й helpers переводимо на TypeScript; TS-only gate забороняє
JS/MJS/CJS/JSX Source. Згенерований JS лишається compiler/delivery artifact.

DERIVED / NON-AUTHORITATIVE. Пріоритети й IDs визначає
[спільний беклог](../vida-013-planning-20261002/BACKLOG-PRIORITIES-20261006.md).
Поведінку визначає [системна специфікація](../../../packages/agent/docs/system-specification.md),
якість — [TESTING.md](../../../packages/agent/TESTING.md).

## Мета і межі

Чистий контур виконання з чинними задачами, research і домовленостями.
Виправляємо дефекти продукту, які стосуються нового виконання. Не відновлюємо
старі leases, Core/Test/Plugin attempts або release-операції для початку CLEAR.
Архівні UNKNOWN не перевидаються; вони не блокують незалежне нове виконання.
Пов'язаний невизначений зовнішній effect не можна повторювати під новим ID.

Активні документи містять лише чинні правила, архітектуру, стан і відкриті
питання. Історичні наративи, повторні статуси й застарілі коментарі вилучаємо.
Прийняті рішення, research, задачі та докази зберігаємо окремо від активного стану.

## Перевірений вхідний стан Cloud

- Checkout: `/workspace/vida-stack-lite`, гілка `work`; HEAD і fetched origin/main
  — `b5499511e64b2165a8c97ae3d2b455b25b1ac5b6`. Локальні зміни збережено.
- Поточні людські передумови — повний tracked
  [HANDOFF-CLEAR-CLOUD-20261009.md](HANDOFF-CLEAR-CLOUD-20261009.md) і нові прямі
  доручення. Старі handoff/recovery записи не є умовами нового виконання.
- Source package — 0.1.3. Bun 1.4.2 доступний через pinned launcher;
  системна команда `vida-agent` у цьому Cloud не знайдена. Runtime не оновлено.
- Windows install/state/архівні БД не є доказом стану Cloud. Старі БД, leases,
  attempts і release-операції не відновлюємо; архівний UNKNOWN не replay.
- Актуальні прогрес, журнали перевірок і відкриті GAP — у [WORK.md](WORK.md).
  Source type/lint PASS не означає coverage, installation або Runtime acceptance.

## Порядок роботи

| Етап | Робота | Результат |
| --- | --- | --- |
| 1. Чистий старт | Архівувати старі operational state та БД; зберегти задачі, research, документацію й код | Виконано; нове виконання не читає старі leases/steps |
| 2. Прибрати зайве | Узгодити поточні план і backlog; прибрати старі recovery-передумови, доведений dead code та дублікати | Один чинний порядок і мінімальна кодова пачка |
| 3. Новий P0–P1 код | Виправити актуальні F1/F2/F3; завершити bundle-owned `.vida` repair; реалізувати єдине сховище, Bun-native оптимізації та TS-only міграцію разом із тестами | Повний погоджений код, TS-only/strict gates і callers готові до фінального тестового етапу |
| 4. Тести та фінальна кваліфікація | Паралельно писати Bun тести по файлах; після стабілізації scope виконати coverage, CRAP/complexity і mutation | Повна матриця сценаріїв і справжні актуальні числові результати |
| 5. Review і документація | Незалежні correctness/security/final reviews, reverse validation, CLEAR поточних інструкцій і runbook | Узгоджені Source, документи та докази |
| 6. Доставка | Опублікувати reviewed Source, одна кешована CI збірка, точний artifact, maintained PowerShell installer | Увесь агент встановлений; cache та результат цього run перевірені |
| 7. Нова робота | Ініціалізувати чистий runtime, отримати новий intake/next action; активувати погоджений pre-commit після його checks | Реальний робочий flow; TeamLead та affected owners отримують перевірений результат |

Незалежні дослідження й підготовка йдуть паралельно. Root — один Source writer
та integration owner. Кожна готова зміна прибирає власні дублікати й зайві
кроки. Не виділяємо cleanup у нескінченний паралельний проєкт.

Новий failure досліджуємо на новому контурі. Старе recovery саме по собі
не є P0 або передумовою P1. Якщо реальний дефект нового admission вимагає
раннього P0 checkpoint, доставляємо лише причинне виправлення через чинний
release owner; це не повне закриття P0–P1.

## Погоджений кодовий обсяг

- P0: audit18:F1 — component-aware Host/history reads; F2 — recoverable release
  preparation; F3 — coherent readonly snapshot. Чинні F01–F07/F09 та hook bugs
  залишаються лише в частині недоставленого або відтвореного продуктного дефекту.
- P1 storage WF07/WF08: одна БД workspace, Bun SQLite та публічний Mastra client
  contract. Host/Mastra володіють власними таблицями й connections. Старі
  operational rows не імпортуємо. Release mutex не тримає спільний DB write lock
  протягом build, await чи мережевого виклику.
- P1: diagnostics, bounded reads/indexes, reuse доказів, короткий delivery flow,
  видалення доведеного dead code; audit18:F4/L1 та чинні optimization IDs.
- P1 Vida-Test: TEST-013-01..07, Bun runner/coverage, CRAP budgets, mutation,
  lint/tooling і вже погоджений pre-commit. Нові hooks/pre-push не додаємо.
- P1 TS-only: handwritten implementations, tests і helpers переходять на TS;
  compiler-generated JS/SDK і native shell/PowerShell adapters мають declared
  artifact/platform boundaries. Нові файли — TS. Filename gate, strict compiler
  та behavioral/coverage/mutation gates перевіряють різні required контракти.
- P1 CLI-HELP-CONTRACT: один каталог чинних команд/опцій; root і command help,
  типи, required/default/allowed/conflicts та приклади. Gate перевіряє відповідність
  parser/help; help працює в порожньому isolated workspace без effects.
- P1 ledger/history: прибрати повторні повні обходи; перейти до індексованих
  current records, версій історії та спільних receipt bodies. Для bounded hot path
  потрібні компактний versioned CAS і окремий materializer/export; чинний v1
  digest повного ledger не називати bounded. Спершу реалізувати bundle-owned
  atomic repair для переходу формату. Архів CLEAR не імпортувати.
- P1 release version: кожен новий білд має вищу версію за останню підтверджену
  публікацію. Типово patch; за запитом minor, major або exact higher. Єдине значення
  у package, CLI version, request та artifact. Ранній CI gate використовує сталий
  publication baseline; повторне встановлення точного artifact версію не змінює.
- P1 Bun native: зіставити чинні Node-виклики з офіційними API Bun. Переносити
  готовими пакетами після P0: SQLite, subprocess/streams, file I/O, hashing,
  CLI, build/package cache і тестовий tooling за фактичною користю. Зберігати
  no-follow, CAS, atomic write, terminal/UNKNOWN custody, SDK та переносимість.
  Не переписувати потрібну межу сумісності без рівноцінного публічного Bun API.
  Luna досліджує окремо; Root інтегрує код у цей самий план.
- P1 `.vida`: один каталог інтеграції агента з проєктом. Перенести конфігурацію,
  інструкції й робочі дані через спільний resolver. Опрацювати поділ на project,
  agents і flows з одним нормалізованим та повністю валідованим config snapshot.
  Зберегти discovery, B/S/C посилання, repair/atomic migration та UNKNOWN межі.
  Архів старого runtime не активувати. Погоджено: у `.vida` лише ініціалізований
  агент, його config/instructions/work state. Source продуктів лишається в `packages`.
- P1 upgrade: версія схеми у всіх керованих config/artifact/instruction файлах;
  schema version відокремлена від content revision і версії runtime. Один
  bundle-owned upgrade owner повторно використовує repair, fencing і журнал.
  Спочатку inspect/plan та підтримуваний converter, потім застосування й
  відновлення перерваної операції. Жодного прихованого rewrite під час читання.
- P1 governance: прибрати `@edictum/core`; Mastra лишається єдиним workflow engine,
  потрібні finite policy checks переходять до VIDA. Повторно використати Cedar,
  HostState, approval/CAS/UNKNOWN; зберегти SDK операції й persisted v1 shapes.
  Не імпортувати непотрібний універсальний ruleset engine або нові залежності.
  Оцінка цієї міграції стосується тільки коду, без оцінювання тестового етапу.
- P2: нові block IO/completion, child tasks/cancel/loops, adaptive routing,
  task management, нові API/adapters/UI та SDK exact-result capability.

## Очищення в кожному етапі

- Видаляти код лише після перевірки callers/exports та заміни потрібної поведінки.
- Не залишати старий і новий механізм для однакового підтримуваного сценарію.
- Невикористані scratch/fixture БД прибирати за точним переліком. Research,
  backlog, домовленості, Git, локальні/staged зміни та архів CLEAR зберігати.
- Початкові active docs: цей план, `WORK.md`, `P0-SEQUENCE.md`, current backlog;
  далі заторкнуті README, TESTING, installation та maintained instructions.
- Історичні frontier/handoff документи не задають поточну послідовність.
- Фінальне рознесення модулів робити лише для реального зменшення дублювання
 й читання; не додавати speculative abstractions для P2.

## Фінальні критерії

За новим прямим дорученням тести пишемо й доопрацьовуємо паралельно, файл
за файлом. До кожної корекції фіксуємо affected files/callers, AC, baseline та
обґрунтовані function/risk CRAP/complexity budgets. Остаточні числові перевірки
виконуємо на стабільному scope; збільшувати budget під готовий код не можна.

Потрібні 100% functions, lines, statements і branches; 100% підтверджених Killed
mutants; відповідність CRAP/complexity budgets та нуль lint/type errors/warnings.
Timeout, error, missing counter і невизначена еквівалентність не є PASS.
Прямий дозвіл людини охоплює mutation цього scope на фінальному етапі.

До завершення плану дозволені окремі поведінкові перевірки бінарника в
ізольованому каталозі з власною чистою БД. Вони не змінюють системний runtime
або активний стан workspace та не замінюють фінальні coverage/CRAP/mutation.

Операції мають ціль виконання до 2 секунд. Для перевищень знаходимо причину:
повторна робота й читання, відсутній або неефективний кеш, блокування, зайві
кроки. Після виправлення порівнюємо ту саму операцію. Тривалі задачі працюють
у фоні зі start/status до 2 секунд; повний elapsed time залишається видимим.
Це не таймаут. Актуальні ownership/CAS/UNKNOWN не замінюємо застарілим кешем.

Build/install не запускають suites або повторні development reviews. Реальні
Windows/Linux target докази, installation, нове runtime admission та acceptance
мають окремі результати. Закриття CLEAR потребує всіх погоджених AC.

## Загальна стратегія тестів і циклічного рефакторингу

> Для виконавців: паралельні file-owned задачі виконувати за
> `superpowers:subagent-driven-development`; Root інтегрує послідовно.
> Це деталізація чинного CLEAR/backlog, без нової ієрархії задач чи нових IDs.

**Мета:** довести чинну підтримувану поведінку та прибрати підтверджені P0–P1
дефекти, дублювання й зайві читання без зміни меж прав і UNKNOWN.
**Архітектура:** Root — один writer Source, тестів, scratch і числових доказів;
незалежні сліпі reviewers мають лише read-only контури. Тести й review використовують
один актуальний контракт, але не підміняють одне одного.
**Інструменти:** Bun 1.4.2, existing function inventory, Istanbul four-metric
coverage, frozen published CRAP/complexity, existing confirmed-mutant runner,
strict TypeScript і repository-configured Oxlint/Oxfmt.
**Spec:** системна специфікація, TESTING.md і погоджений scope вище;
нормативні контракти мають пріоритет над цим derived планом.

### Глобальні інваріанти

- Product Source у `packages`; `.vida` містить лише конфігурацію, агентні
  інструкції та робочі дані. План/evidence — у чинному Source coordination scope.
- CAS, opaque ownership, authorization, fence та post-await freshness зберігаємо.
  Схожий token/receipt-shaped JSON не дає прав.
- Старі UNKNOWN не replay і не перевидаємо під новим ID. Класифікована
  фактичним провайдером відмова без ефекту відрізняється від невідомого результату.
- Root інтегрує текстові пропозиції після перевірки актуальних bytes і callers.
  Агенти не пишуть product candidates, тестові helpers або scratch.
- Не зменшуємо test/source selection, не додаємо suppression, baseline lint,
  косметичні тести, синтетичне coverage або вигадані Killed outcomes.
- Build/install/formation не запускають suites. Numeric gates — явна
  development-команда; Git hooks активуються лише після власних required checks.
- TS-only є hard gate, не advisory score. Наявні legacy JS файли — відкрита
  migration dependency, без allowlist, suppressions або виключення зі scope.

### Критичний шлях і хвилі TypeScript

Три проходи плану: (1) повнота Source та artifact boundaries; (2) graph/caller
coupling і parallel ownership; (3) frozen correspondence та відсутність
повторних suites. Міграція, native types, regression, callers/imports і mapping
становлять одну file-owned задачу. Нові MJS тести з наступним окремим
переписуванням на TS не створюємо.

| Хвиля | Deliverable і перевірка | Залежність / ownership |
| --- | --- | --- |
| 0 — наявні P0 | `.vida` source-domain/digest, fresh SQLite PRAGMA shape, known-denial/UNKNOWN/resume; actual named regressions | Root інтегрує причинні patches; TS міграція не затримує готовий P0 |
| 1 — guard і нові tools | `tooling/ts-only-source-gate.ts`, `test-function-audit.ts`, `quality-final.ts` та власні `.test.ts`; focused Bun + strict typing/lint/format | Незалежні readonly proposals/review; Root записує candidates, package scripts і shared imports |
| 2 — спільні owners | Inventory/AST/evidence/fixture helpers з усіма callers у мінімальних зв'язаних пачках | Shared файл має одного writer; disjoint caller/test patches паралельні |
| 3 — решта tests/tooling | Міграція по файлах, типізація valid/malformed fixtures і selected SQL rows; ті самі named assertions | Exact hashes/dependencies/target/owner; readiness failures групуються за доведеною спільною причиною |
| 4 — CLI/bootstrap/repository adapters | Native TS Source, generated runnable artifacts за Node/bootstrap/SDK contract; manifests, exports, bundle closure, help і CI paths | Один owner кожного контуру; resolver/formation готові до перемикання paths |
| 5 — stable qualification | TS-only zero violations, strict compiler/lint/format і сценарна матриця; genuine baseline і final current numeric gates | Після join writers; один numeric writer без overlapping unchanged full suites |

- [ ] Gate scope: agent `src/bin/tooling/tests`, declared plugin Source,
  repository `tooling/agent` і `tests/agent`. Один bounded filename walk;
  generated output виключається лише за declared output boundary. Gitignore,
  незатреканий Source, вкладення чи symlink не мають приховувати violation.
- [ ] `quality:ts-only:pinned` працює через pinned launcher; static і final
  entrypoints виконують його до costly suites. Legacy violations лишаються FAIL
  до міграції; підключення команди не означає PASS.
- [ ] Кожна job має before/after hashes, caller/import changes, focused command
  і reviewed one-to-one function identity map. Зміна розширення/позиції не
  видаляє frozen CC/CRAP ceiling і не створює unrestricted addition.
  Ordinal/body hash не є correspondence proof.
- [ ] Shared AST owner віддає один parsed snapshot для inventory/export/test
  projections. Native types замінюють дубльовані JSDoc; temporary declarations
  зв'язані з owner, checked-JS перевірені й прибираються з міграцією implementation.
- [ ] Strict quality path включає native TS tests/helpers: один combined
  CLI/tooling/test noEmit project замість окремих повторних компіляцій shared
  imports; focused `tests/tsconfig.json` command лишається доступною. Поточні
  тестові type errors не приховуємо. TS filename PASS не означає test type PASS.
- [ ] Перед CLI/bootstrap path cutover потрібна actual route acceptance:
  generated executable bytes зв'язані з migrated TS і manifest, усі public
  commands/bin/SDK exports resolve до потрібного artifact, Node/Bun invocation
  та isolated native entry виконують чинні version/help/dispatch cases.
  Existing active loader/schema paths не переключаємо до ready repair; old і
  new handwritten механізми не лишаються двома підтримуваними owners.
- [ ] TS сам по собі не обіцяє runtime acceleration. Порівнюємо ті самі inputs,
  assertions і isolation; parse/read/process counts та elapsed — окремі докази.

### Бібліотеки для цього циклу

Research npm/official published Source від 2026-10-10 збережено у
`.tmp/tooling-research/{iris-cli-fit-v1,ast-metrics-fit-v1,code-pushup-fit-v1,spaghetti-analyzer-fit-v1}`.
Для function/test audit використовуємо pinned Babel parser/traverse 8.0.4
і чинний inventory: точні lexical bindings не є semantic coverage proof.

| Кандидат | Рішення для поточного плану |
| --- | --- |
| `@iris-code/cli` 1.26.1 | Окремий static health CLI, folder/gate Pro; не додавати другий gate/hook/licence dependency. Advisory JSON лише за доведеного нового сигналу |
| `ast-metrics` 0.43.1 | Native/Tree-sitter TS pass, JS/MJS не підтримано, CC formula/IDs відрізняються. Budgets не замінює; optional architecture report потребує exact verified binary |
| `@code-pushup/cli` 0.126.4 | Пізніший display adapter до вже validated JSON reports; без нового runner, cache/upload або weighted score як gate |
| `@state-adapt/spaghetti-analyzer` / `spaghetti-core` 4.0.1 | Поточне підключення BLOCKED: inert Bun pilot не завантажує core через несумісний legacy Compiler API з pinned TS 7.0.2. Після upstream compatibility — optional command/call/resource projection, exact canonical joins; partial/truncated/duplicate IDs — GAP |

Жоден пакет не доводить scenario semantics, чотири 100% coverage dimensions,
frozen CRAP або confirmed Killed. Не підключаємо всі analyzers кожного циклу:
missing capability -> bounded pilot -> лише корисний read-only projection.
Продуктний runtime їх не потребує.

- [ ] Під TS-only умовами оцінити конкретне підключення за capability: Babel —
  canonical function/test/matrix audit; spaghetti — optional call/resource
  hotspot projection; ast-metrics — optional TS architecture view; Code PushUp —
  display чинних validated reports; Iris — лише окремий новий static сигнал.
  Exact version/API/compiler/Bun compatibility, bounded inputs, deterministic
  joins, no duplicate test runner і dependency footprint перевірити до adoption.
  Зовнішній npm dependency JS не є handwritten VIDA Source violation.

### Ефективне формування сценарних матриць

- [ ] Один captured Source/test AST дає inventory, exports/bindings, unique
  named cases, direct references та незакриті зв'язки. Генератор використовує
  цей звіт, а не перечитує/репарсить кожну функцію. Немає name-only heuristics.
- [ ] Спільні reviewed contract profiles описують applicability для pure codec,
  ingress/read boundary, state owner, upgrade/publication та delivery один раз.
  Функція явно прив'язана до profile; case зберігає точні file/name/function IDs,
  локальні overrides і justified N/A. Profiling за назвою функції не дає review.
- [ ] Autogenerated draft лишається unreviewed: empty cases, duplicate named
  tests, stale hashes, unknown profile або unproved private-function mapping
  не можуть перетворитися на reviewed/present. Profile не доводить assertions.
- [ ] Замість повного добутку input categories записати contract partitions і
  незалежні boundary/exception/state-transition cases; genuine property/fault
  test може покривати кілька exact functions через explicit mapping. Кожна
  required condition і publication/interruption point все одно має named proof.
- [ ] Сценарій має один reusable definition і explicit function/case links;
  shared fixtures/type definitions мають одного owner. Групувати jobs за target
  test file, потім за dependency/risk; спільний regression не писати кілька разів.
- [ ] Incremental update застосовується до affected function/case/profile slice
  з exact digests і reviewed disposition; shared profile change інвалідує усіх
  його consumers. Authoritative final evidence зберігає full input freshness.
  AST hints, authored matrix і measured behavior/coverage — окремі statuses.

### Ітерація 1: повнота контрактів і черга файлів

- [x] Побудувати поточну чергу через єдиний
  `packages/agent/tooling/function-inventory.ts` і
  `maintainedSourceInventory.mutationSources`. Snapshot від 2026-10-10:
  `.tmp/tooling-research/current-file-test-queue-20261010/inventory.json`,
  136 production-файлів / 7,395 функцій. Це інвентар, не доказ покриття;
  після Source-змін його оновлюємо перед final run.
- [ ] Read-only function/test audit: v127–140 strict type/runtime/class/export
  resolution, JSON, repository-agent scope, no-follow bounded read-only capture
  and single-image manifest custody implemented and independently reviewed.
  Latest captured structural refresh140 Source/7482functions/157testfiles,
  80auxiliary hashes/60Babel parses,0diagnostics/149review jobs, exit0;
  257static links/4588unresolved, not a numeric quality PASS; final single-target
  type assertion/formatting require fresh final provenance. Captured-tool owner
  89PASS/402expectations; final BOM-sensitive auditor66PASS/298. Native CLI
  declaration and portable owner migrated to TS with connected closures;
  relocated owner15PASS/138, scope5PASS/43. Full reviewed applicability matrices,
  matching-tool historical correspondence/freeze and numeric gates remain OPEN. Використовує той самий inventory та один
  captured AST/index. Звіт відділяє direct named-case links, reviewed scenario
  mapping, unresolved indirect/callbacks, no reference у scanned scope й measured
  coverage. Черга write/update/review/blocked групується за target test file;
  кожен має одного writer, exact input hashes, функції/сценарії, пріоритет і
  focused commands. Shared helpers — окремий Root-owned dependency. Changed
  hashes інвалідують affected job; authored/static pattern presence не є PASS
  semantics. Без explicit applicability matrix сценарії лишаються unreviewed.
- [ ] Для кожного файлу записати hash, owner, функції/closures, AC, callers,
  ризики, існуючі кейси, відсутні сценарії й точні commands. Статусів два:
  authored/checked і measured/qualified; перший не означає другий.
- [ ] Кожна матриця містить `contract -> regression -> fixture -> scenario ->
  named case/assertion -> result -> evidence inputs`. ZOMBIES: Zero, One,
  Many, Boundary, Interface, Exception, Simple; додатково Persistence,
  Restart/Replay і Cross-surface, Fresh/Explicit/Persisted/Replay для стану.
  N/A обґрунтовуємо властивістю контракту, не нестачею часу.
- [ ] Named cases явно покривають чинні TESTING.md межі: єдиний committed
  Work/Ledger/Journal snapshot і concurrent-commit denial; release resume у кожній
  publication точці з exact beforeimages/conflict/UNKNOWN; governed-write
  preparation denial, failed abort до commit (zero writer calls і обидві причини),
  post-markCommitStarted UNKNOWN; config split/compose ownership, refs/revisions/
  metadata binding; failed root inspection без partial identity. Відсутній named
  case лишається GAP, навіть коли загальна назва контуру вже є у таблиці.
- [ ] Спочатку обирати файли, які блокують інші тести або володіють правами,
  persistence/CAS/UNKNOWN; далі shared codecs/config і callers; потім CLI,
  platform/resource, numerical tooling та решту незакритого inventory.

| Контур | Перший доказ | Обов'язкові ризики | Розподіл |
| --- | --- | --- | --- |
| Shared codec / ingress | Exact bytes/digest, незалежні очікування | числа, Unicode, nodes/depth/bytes, accessors без виконання | Один файл codec і власний тест; consumer integration окремо |
| Config / schema / paths | Реальний strict compile/import і split/compose | conditional domains, metadata digest, source brand, revision overflow, local refs | Окремі writers schema/path/composition tests |
| Host / Ledger / Journal | Реальна ізольована Bun SQLite та restart | coherent snapshot, foreign/orphan rows, CAS, leases, indexed reads | DB owner fixtures, disjoint тестові файли |
| Upgrade / activation / release | Точні frozen intent і before/afterimages | кожне переривання, known denial, UNKNOWN, fences, conflict/rollback, same-ID resume | Один product owner, тестові контури розділені |
| Workflow / governance / CLI | Genuine configured roles/actions і публічні surfaces | sparse waves, stale/revoked/foreign rights, help/parser parity, diagnostic redaction | Бounded file tasks, інтеграція прямих callers |
| Resources / delivery boundary | Інертні owned fixtures і bytes closure | no-follow, collision/no-replace, cleanup custody, finite child outcome | Локальні contract tests; actual formation/install у delivery lane |
| Numeric tooling | Справжні runner receipts і відмови на malformed evidence | missing/stale mappings/counters, assertion-cause, timeout/errors | Один numerical owner; helpers мають окремий writer |

### Ітерація 2: ефективність і причинний рефакторинг

- [ ] Перед новим тестом зіставити його з наявним: повторний кейс не додає
  впевненості. Спільний fixture/helper виділяти лише для доведено еквівалентної
  семантики; він не надає synthetic Host rights і не маскує invalid inputs.
- [ ] Для оптимізації записати фактичний caller-to-owner шлях і кількість
  SQL reads, повних сканів/хешів, compilations, process launches, awaits та
  транзакцій. Відокремлювати static call bound від виміряного latency.
- [ ] Reuse дозволений у доведеному coherent scope: exact captured inputs,
  приватний immutable snapshot або реальна транзакція/fence. Нова async межа,
  effect, custody transfer чи mutable input потребує чинної повторної перевірки.
  Metadata/mtime самі по собі не є SHA або доказом незмінних bytes.
- [ ] Shared function зводить однакові контракти, не різні права. Публічні
  signatures/errors, strict parsing, CAS revisions і forbidden paths зберігаємо.
  Dead code видаляємо лише з callers/exports evidence; branch coverage не є
  причиною видалити потрібний fail-closed guard.
- [ ] Property tests мають детермінований seed, незалежну модель/invariant і
  bounded inputs. Fault fixtures відрізняють failure before effect, failure
  after issued effect, failed persistence/cleanup та справжній UNKNOWN.
- [ ] Writers виконують тільки власні exact-file focused checks і static checks.
  Повторно не запускаємо той самий unchanged failure; спочатку корекція причини.
  Collection failure не означає failed assertions і не доводить виконання кейсів.
- [ ] У кожному кроці оцінити collection, fixture setup, case execution, SQL/file
  reads/hash/compilation і child startup/wait/cleanup. Записати фактично
  виміряний або unmeasured bottleneck, той самий named scenario/inputs, elapsed
  time, count і critical path. Рішення звірити з актуальною офіційною документацією
  Bun/використаної бібліотеки: URL, дата, застосовність до pinned версії. Зміна
  має порівнюваний before/after, ті самі assertions, selection, isolation і
  custody; збільшення timeout не є прискоренням. Diagnostic focused run може
  мати явно задекларовану finite межу для повного сценарію; owner effect/cleanup
  deadlines не послаблюємо. Окрему benchmark-ієрархію не створюємо.

### Ітерація 3: сліпий цикл, інвалідація і final qualification

- [ ] Новий reviewer завжди `fork_turns=none`, новий immutable packet і актуальні
  нейтральні критерії. Без історії, WORK/findings і очікуваного висновку.
  Перевірити всі input hashes до/після. Independent контури: correctness/data;
  ownership/security/UNKNOWN; shared semantics/cost/platform/tooling.
- [ ] Reviewer повертає actual caller, trigger, before/after, contract violation,
  P0/P1, exact evidence і мінімальну причинну корекцію. Root перевіряє finding
  перед implementation. Відхилення finding має пояснення й залишає оригінал.
- [ ] Цикл: `current snapshot -> blind findings -> Root cause validation ->
  isolated patch + named regression -> statics/focused check -> blind corrected
  snapshot -> exact-preimage Root integration -> affected recheck`.
  Наступний цикл бачить поточний код і критерії, а не попередні findings.
- [ ] Після кожного actual contract change оновити лише affected scenario/function
  mapping, callers і докази. Invalidation охоплює кожен релевантний member
  captured input manifest: src/bin, усі tests, quality tooling, package/runtime
  pin/lock/config, schemas/templates/instructions та resolved budget bytes.
  Selection/Source digest самі по собі недостатні; changed member інвалідує
  affected evidence. Reuse можливий лише для доказів з повністю актуальними inputs.
- [ ] Локальна збіжність: останні незалежні reviews цього стабільного scope не
  мають підтверджених відкритих P0/P1; усі findings мають checked disposition.
  Це не твердження, що майбутніх помилок/оптимізацій немає. Цикл продовжується
  при новій зміні/знахідці; не завершуємо через задане число ітерацій.
- [ ] Після join writers закрити syntax/strict tests typing/configured lint/format,
  усі file/contract matrices й behavioral integration. Один stable
  `test:coverage:pinned` full-current run одночасно дає final behavior та
  coverage/CRAP, якщо captured selection містить усі required completion cases.
  Окремо запускаємо лише exact additional cases поза selection; не запускаємо
  перед ним unchanged overlapping full behavior suite. Після failure виправляємо
  і recheck affected cases/callers; повний final proof потребує актуальних inputs.
- [ ] Один numeric writer готує isolated checkout точного published `b549951`,
  disjoint sealed published fixture/current measurement roots і pinned Bun;
  запускає current tooling `bun tooling/run-bun-coverage.ts --published-baseline=b549951`.
  За прямим дозволом користувача 2026-10-10 published tools виконуються лише
  як subjects точних frozen tests за BASELINE-FIXTURE-PROTOCOL-20261010.md,
  з child receipts; current tools єдині вимірюють і приймають quality evidence.
  Selection відтворює published four-file Bun set; усі
  published test inputs fingerprinted. Зберігає genuine report/manifest/process
  receipts; current gate лишається full-current. Завершує exhaustive reviewed
  one-to-one correspondence та frozen per-function/risk budgets з окремими CC,
  baseline coverage і CRAP. Candidate metrics/ordinals/body hashes не задають
  відповідність або allowance; відсутня відповідність лишається GAP.
- [ ] На актуальному Source потрібні exact 100% functions/lines/statements/branches
  за every selected production file та whole selected scope. Missing file/function/
  branch/counter — FAIL/GAP. Retained budgets не ростуть; new budgets <=10.
  `CRAP = CC^2 * (1 - function_coverage)^3 + CC`.
- [ ] Перед ручною mutation закрити declared pending partition
  `pending-project-upgrade-behavior-tests`: genuine complete behavior tests і
  повна Source/test partition mapping. Саме denial regressions не знімають
  весь blocker; статус змінюємо після перевірки owner-контракту. Pending блокує
  запуск і лишається GAP, не mutant FAIL/PASS.
- [ ] Ручна mutation має 100% confirmed Killed. Кожен outcome зв'язаний із
  exact mutant, passing baseline, реальним assertion failure і runner receipt.
  Survived/NoCoverage/timeout/signals/errors/unproved equivalence — не PASS.
- [ ] Measurement trust boundary: selected captured Source/tests/tools довірені;
  Istanbul counters не автентифікують hostile in-process test code. Installed npm
  dependencies, Bun files, non-module reads і live generated modules мають
  чинні custody limits TESTING.md/runner; generated bytes явно declared. Не
  заявляємо новий sandbox або сильнішу authenticity за поточний контракт.
- [ ] Pre-commit за новим прямим дорученням включає strict Knip: zero issues,
  config/tag hints як errors, без ignore/baseline/fix/cache. Один raw Git-object
  snapshot індексу для Knip, AST test.only/aliases denial, pinned format/Source
  types і configured type-aware Oxlint zero warnings. Валідний partial staging
  перевіряємо за staged bytes; unstaged bytes не restage/форматуємо. CAS identity
  та bytes індексу після checks; alternate index, filters і cleanup faults мають
  focused proofs. Активація погодженого pre-commit не є closure: чинні
  unused/unresolved/static findings блокують commit до виправлення. Pre-push
  автоматично не активуємо; numeric suites не запускаються у commit/build/install.
- [ ] Явний final-quality entrypoint reuse чинних gates; не дублює suites і
  перевіряє незмінні inputs між coverage/CRAP та score. Pending baseline/budgets
  або stale evidence блокують команду. Підключений gate не дорівнює passing gate.
- [ ] Після числових checks — lifecycle fresh independent reviews/reverse/CLEAR,
  reviewed Source publish, одна CI formation/cache proof, реальний native update,
  fresh runtime intake/unblock і лише тоді once-only повідомлення affected owners.

### 2026-10-10 — TS migration with causal repair and test evidence

Current user direction: execute file-owned TS migration together with proven bug,
duplication/read-call corrections and native tests. Keep this strategy and WORK as
the plan/ledger owners; Superpowers does not add a parallel plan hierarchy.

- [x] First packet: `tooling/function-inventory.mjs` + `.d.mts` to
  `tooling/function-inventory.ts`. Preserve `functionInventory(source: string,
  file: string, parsedAst?: unknown): FunctionRow[]`, function IDs, original
  positions/complexity and the four exact body coordinates. Update maintained
  callers and captured tool identities in the same reviewed packet; original
  published test-subject bytes remain original. No new JS compatibility wrapper.
- [x] Causal mapping repair: actual Babel/Istanbul named-function regression
  failed under declaration-position join; exact body start/end join is now used
  by the existing baseline gate through `baselineFunctionEvidenceForSource`.
  Native mapping/math cases pass14/14. Baseline admission itself remains open.
- [x] Numeric schema boundary repair: all13 unbounded integer slots agree with
  canonical safe integers; actual Ajv RED then focused2 PASS/28 assertions.
  Installed consumer schema/loader are not activated by Source development.
- [ ] Initial Source timing: `runWithInitialSourceTiming<T>(args,
  action: () => Promise<T>): Promise<T>` is test-only, opt-in, bounded start/end
  output. Stable recovery trace is captured: writer issue is the unfinished eighth CLI call. Identify its internal long phase, then apply only
  a measured correction; unchanged180s timeout and operational identities stay.
- [ ] Next file packet is selected from actual strict compiler/Knip/scenario
  gaps after the preceding join. Readonly agent returns textual delta, exact input paths, causal test proposal
  and consumer/capture changes; Root records candidates and alone joins Source.

A packet cycle has separate checkpoints: parity migration; causal RED for a
behavioral correction; bounded implementation and shared-helper consolidation;
strict TS/lint/format; independent frozen-diff review; serial affected Bun checks.
Keep static link, invocation, coverage, assertion, property and mutation proofs
separate. Never derive semantic correspondence from renaming or shifted ordinals.
Generated scenarios stay unreviewed; N/A keeps an attributable reason.

Heavy compiler/lint/scans are parallel with private development and readonly
review, and finish before timed behavior checks. One Root owns behavior and final
numeric execution; no duplicate full suite/AST/hash traversal. A changing input
invalidates its dependent capture rather than being hidden by a cache.

### Практична черга і самоперевірка плану

Актуальний dispatch 2026-10-11, v175–v176: до шести незалежних Luna-контурів
плюс Root. Root єдиний writer Source, тестів, плану та receipts і єдиний
власник поведінкових/числових перевірок. Агенти повертають текстові proposals
або review; не пишуть файли й не запускають checks. Кожен новий агент сліпий
(`fork_turns=none`), читає AGENTS -> весь sidecar -> self-development-protocol
-> TESTING -> весь tracked handoff -> чинні plan/WORK/backlog. WORK tail не
замінює handoff. У prompt: точні inputs, один результат, acceptance і stop.

| Контур / чинний scope | Один результат поточної хвилі | Залежність та stop |
| --- | --- | --- |
| P0: dependable upgrade completion | Гіпотеза manifest/raw-byte reuse перевірена: NONE. Наступний пакет тільки з новою причинною діагностикою read cost за v167 | NONE закриває цю гіпотезу. Не повторювати загальний scan/reuse research; не прибирати authority checks, не розширювати timeout. Наступна діагностика має новий причинний input |
| P0: existing-storage exclusion | Карта supported openers, private raw-open exceptions, finite negative cases і справжня quiescence/delivery передумова | Cooperative gate не виключає ungated old process. Guard лишається false; code-only proof не закриває host GAP |
| P0: repair interruption matrix | v172 exact-intent foreign-ID refusal і no-reissue directory identity пройшли2cases/45assertions. Далі лише відсутні boundary/no-effect/lost-ACK/conflict сценарії | Не повторювати qualified slices. Typed initial-write seam лишається GAP. UNKNOWN roots не відкривати/replay |
| TEST-013: correspondence/frozen budgets | Наступна мала connected Source family, disjoint identity sets, nested closures і additions/removals за готовими inventories | Не повторювати 151 reviewed upgrade rows. Семантичний review, не path/name/ordinal/hash match; global executable plan і freeze ще pending |
| P1: TS-only та gate closure | Dispatcher rename відкладено: caller closure охоплює release/mutation/standalone fixtures. Наступна міграція лише після exact connected closure | Source/CLI strict TS та Knip уже PASS у receipts. Старі1271diagnostics не поточний blocker. Не дублювати migrated files, gate або build/install suites |
| Незалежний plan/candidate review | Сліпий review замороженого плану, потім готового actual diff | Шостий слот для незалежного review. Немає нового stable input — не запускати повторний цикл тієї самої проблеми |

Root інтегрує за залежностями, не за порядком повернення агентів:

- [x] Вузький v172 repair evidence: exact initial-intent foreign-ID recovery
  refusal; directory device/inode custody через відмови;2PASS/45assertions.
- [ ] Решта причинних P0 patches та missing repair scenarios.
  Typed initial-write no-effect без qualified provider seam лишається GAP.
  Зберегти CAS/fence/authorization/UNKNOWN; dependable завершення за чинними
  bounds залишається OPEN. Guard-false denial не доводить detection old opener.
- [x] Вузький `await import` static-link repair у `tooling/test-function-audit.ts`
  та його існуючому test file:76PASS/391assertions; strictTS/lint/Knip PASS;
  blind review поточного target handling без actionable findings. Static link
  не execution/assertion/coverage. Immutable literal namespace, lexical shadow,
  nested/typed write, loop-declaration, bare-specifier/type-only/mock cases;
  зберегти Babel -> inventory -> test links -> scenario matrices, Ajv/Bun owners.
- [ ] Dependency-ready tooling/TS deltas та migration gate closure. Не називати
  ці scoped PASS повним TS-only, quality чи Runtime закриттям.
- [ ] Source correspondence продовжити незалежними family batches. Коли Source,
  tests/config і auditor стабільні, один capture owner збирає актуальні links;
  старий test graph не називати поточним. Згенеровані сценарії unreviewed до
  review; N/A має rationale. Закрити всі reviewed dispositions та frozen plan.
- [ ] Один full-current Bun behavior/coverage run і matching frozen CRAP/complexity;
  після їх prerequisites — mutation з assertion-confirmed Killed. Змінений input
  інвалідує залежний доказ; unchanged passing suites не запускати повторно.
- [ ] Необхідна P0 whole-agent доставка після functional repair та її чинних
  prerequisites: точний artifact/cache proof, actual target update і fresh
  admission. Missing numeric proof не додає gate для необхідного P0 update;
  exact coverage/frozen budgets/Killed лишаються відкритими quality вимогами.
  Existing-storage exclusion блокує відповідний effect, не незалежну доставку
  gated bundle. Active loader/schema не перемикати до functional repair;
  installation не unblock. Notices лише після verified unblock, без дублювання.
  Реальна quiescence й delivered-cohort передумова потрібна перед DB effects.

Після цієї хвилі dependency-ready P1 черга зберігає єдину workspace DB,
ledger/history та Initial Source timing, Bun-native оптимізації, help/parser
parity, version progression, CI cache і мінімальну whole-agent delivery.
Готові receipts повторно використовуються; ці scopes не вилучені й не закриті.
Reviewed proposals: project-paths.ts/initialization-record.ts13current/8historical;
project-layout.ts10current/9historical; v2 initialization record/binding11new
complementary functions. Root звірив closures/body roles і виправив три неточні
research labels. V1 залишається окремим підтримуваним owner; не переносити його
historical IDs до v2. Наступна family — runtime-initialization.ts: public binder
wrapper і selected-source helper, з exact one-to-one correspondence або typed
GAP. Removal/predecessor search обов'язковий; ці proposals і 151 upgrade
dispositions не є executable global plan/frozen budgets.

Після завершення пакета виправлень і його applicable checks commit та non-force
push обов'язкові за чинною Source authorization. Єдиний owner правила —
development-lifecycle; sidecar/bootstrap дають pointer. Зберігати чужий/частковий
index; required gate failure або непідтверджений push лишають publication pending.
Source checkpoint не закриває numeric gates, delivery чи Runtime acceptance.

Один пакет проходить чотири кроки; review не має окремого повторного scan:

1. **Prepare.** Root передає готовий receipt, exact affected paths/preimages,
   залежності, assertions, forbidden effects. Агент повертає executable delta
   або обґрунтований NONE/GAP; Root відсіює дублікати й повтори старих findings.
2. **Integrate/freeze.** Root звіряє inputs, робить один connected join, запускає
   batched strict TS/typed lint/format за зміненими входами і зберігає immutable
   BEFORE/AFTER з binding. План перевіряється незалежно до Source implementation.
3. **Review/verify.** Сліпий reviewer читає frozen actual delta; Root виконує лише
   affected stable Bun cases після review та статичних checks. Timed cases йдуть
   без конкуруючих важких scans. Failure повертається causal owner з exact log;
   поправка створює новий frozen delta і перевіряє лише invalidated evidence.
4. **Reconcile/dispatch.** Root фіксує PASS/FAIL/GAP/UNKNOWN у WORK, перевіряє
   acceptance та дає звільненому слоту наступний dependency-ready packet.
   Повторний аналіз потребує нових inputs/критеріїв; до десяти корисних ітерацій,
   далі unresolved причина й наступна передумова замість нескінченного poll.

Reuse parsed AST/inventory/results лише за чинними bound inputs. Один capture
owner, без агентних full AST/scan/hash проходів; тестова зміна не дає підстав
назвати Source inventory stale, а Source equality не робить test graph current.
Exact f/l/s/b100%, frozen per-function budgets, assertion-confirmed Killed,
ownership/CAS/authorization і UNKNOWN semantics не послаблюються. Timeout,
compile/runtime error чи NoCoverage не Killed. Статична перевірка й локальний
passing case не закривають whole P0/runtime. Немає нових backlog IDs, паралельної
quality registry або tests у build/install.

### Уточнення після зовнішнього архітектурного аудиту 2026-10-10

Повна [перевірка A1–A9](EXTERNAL-ARCHITECTURE-AUDIT-20261010.md) зіставляє
checkpoint зі зміненим Source та фактичними receipts. Нових backlog IDs немає.
Спершу причинний lock custody/cleanup P0 і bundle-owned `.vida` repair;
потім готові незалежні P1 deltas у чинних scopes: завершити вже початий
`mastra-session-bridge-contract.ts` і два runtime back-edges; read-only typed
diagnosis поверх чинних inspect/readers; законний history census proof перед
indexed owner-scoped pagination. Pure contracts не читають filesystem context.
Спільна workspace DB лишається погодженою, а між owners/connections/filesystem
немає спільного атомарного commit. Existing storage activation лишається blocked.

DAG scheduling, typed effects, adaptive/low-risk routes, Durable Agents і новий
cost/tracing framework не стають P1 через labels R1/R2 зовнішнього аудиту.
Quality sequencing/strict Knip уже існують; не додавати другий scan/gate/registry.
Branch protection не підтверджено через GitHub API403. Byte counts не є tokens,
configured slots не є calls, static cycles не є доведеним runtime crash.
Подальші агенти повертають proposals/review текстом; Root зберігає packets і
пише maintained файли за чинною межею dispatch. Фінальні gates не послаблено.

### v139–140 — next dispatch after native help and locked-read correction

The canonical help matrix now has real child proof:139 native children,
9 commands/102 nested routes/5 aliases and direct package executables, each
within2s and without workspace effects. Surplus-selector and premature
runtime-import defects are fixed. Nested alias coverage is representative;
parser parity remains its own gate. run-cli-options is now native TS with
runtime AST parity and connected owner22PASS/1957expectations. Next bounded
TS slice is reconcile-cli-contracts with its exact consumer/package/mutation
closure; no broad rewrite or emitted compatibility shim.

Locked reads reuse the acquired parent descriptor; CAS/orphan-backup semantics
and all fresh bundle barriers stay. Parent-open count2→1 is verified, but the
activation lost-ack case still times out at the unchanged60s bound, retaining
its genuine UNKNOWN fixture. Do not switch to unlocked package capture or
reuse digests across effects; blind call-graph review found no safe removal.
Next causal P0 work must address locked read/cleanup cost while preserving
those guarantees, then qualify the actual staging-write/reconcile path.

Historical mapping has an explicit unreviewed/stale-v138 proposal only,
5450candidate pairs/251historical-unresolved/2031current-unresolved. No accepted
budget plan exists. Final current capture, reviewed exhaustive correspondence,
exact four-metric100 coverage and assertion-confirmed100 Killed remain open;
no active schema/loader change or Runtime unblock notice is authorized by
these local development receipts alone. Uploaded A1–A9 audit was freshly
rechecked and adds no duplicate P0/P1 beyond the existing v109 dispositions.

### v141–144 — current dispatch and remaining closure

Native reconcile CLI contracts and their consumer/package/mutation closure are
implemented with erased runtime AST parity. Borrowed lock descriptors retain
fresh positional owner rereads; three genuine FIFO replacements now deny
without blocking. Informational run/reconcile help is metadata-only with actual
stdout completion. Research repair now accepts the pinned callable Ajv default
and shares its exact-byte/digest/shape plan parser without dropping the consumer's
single-link boundary. Connected development owners71PASS; affected final help/main
owners24PASS; research plan/apply/foreign-byte/resume owners4PASS.

Fresh positive upgrade passed the unchanged60s bound at54.68310s on its v143
inputs. Interrupted activation inspection required a causal read-only fixture
correction; no release authority was fabricated. Default/direct UNKNOWN
activation resume now refuse after validated same-operation journal and before
costly Host/bundle work, preserving the effect-adjacent consent guard and all
explicit-consent checks. Actual regression removed621 extra bundle reads.
The final interrupted case nevertheless FAILS at63.21617s with12627 reads;
its fresh failed fixture stays retained and is never a replay queue.

The v144 static checks and its single structural capture are complete.
Investigate the actual remaining per-read cost;
do not remove effect-bound bundle barriers, substitute unlocked captures,
increase60s, or reuse current passing evidence under changed hashes. A scoped
synchronous root-fd batch is only a proposal: no current batch API, and live root
identity, per-file CAS/backup/ownership/cleanup plus portable fallback must be
proven before adoption. Research descriptor readers and frozen-plan review
receipts use their existing ownership boundaries; neither is completed yet.

Continue the existing P0 fault/recovery matrix and legacy-opener exclusion,
then dependency-ready P1 without new IDs or a second plan. Final reviewed
historical/current correspondence, exact100 all-four coverage, assertion-confirmed
100 Killed, whole-system delivery and fresh admission remain mandatory OPEN gates.
Selected regression counts do not establish task completion percentages.

### v145 — bounded slabs and advisory marker correction

The bounded reader now fills and reuses slabs across short syscalls, using the
already-owned fstat size only as its first allocation hint. It has constant
stack usage, reads to EOF including growth, preserves the one-byte overflow
probe and independently owns returned bytes. The resource regression is genuine
RED393216B/327680B before the fix, then PASS. No root-fd batch, new shared read
scope, extra fstat or effect-bound bundle cache was introduced.

The fresh interrupted activation owner passed its unchanged60s bound at
54.80512s/74assertions on reader-validated Source before the later marker-only
change. This is one development observation, not full current lifecycle or
timing-reliability qualification. A connected check exposed the existing Linux
canonical `.git` marker exception being blocked by the ordinary CAS wrapper.
The marker is now an advisory no-follow/nonblocking existence probe; ordinary
files retain CAS, metadata bytes/descendants and symlinks remain denied.
Final affected owners51PASS/0FAIL, three fresh blind reviews, Source/CLI/scoped
strict TS, typed lint, strict Knip and format are clean. One stable-input capture
reports7471functions; static links are not execution, coverage or mutation proof.

Next keep the existing full P0 upgrade fault/recovery and legacy-opener closure,
then reviewed exhaustive frozen correspondence and dependency-ready P1. Do not
derive total closure percentages or Runtime unblock from this development packet.

### v146 — fresh storage consent and exact bootstrap move proof

The shared activation/fresh-storage UNKNOWN refusal now denies only after
validated same-operation journal and mode, before unnecessary package/schema
preflight. Genuine RED207 extra reads is repaired. Effect-adjacent guards and
explicit-true bundle/schema/owner/afterimage checks remain. New real bootstrap
move lost-ACK proof reconciles its exact afterimage with one total move call.
Final current selected owners4PASS/0FAIL/209assertions include activation stage
54.37301s on unchanged60s. This is partial development evidence, not complete
fault/recovery, reliable timing or numeric qualification. Three fresh blind
Source reviews plus new-test review, strict Source/CLI/test TS, lint, Knip and
format pass. Stable capture7471functions retains unreviewed generated profiles.

Legacy-opener exclusion remains false: current cooperative gate cannot certify
older installed executables honor it. Do not convert a version string or
synthetic marker into exclusion authority. Complete remaining supported fresh
mutation seams, and continue the existing connected native-TS CLI/caller closure
while this dependency is open. Current defensive internal boolean-boundary
proposal does not imply a supported public authorization bypass. All final
frozen/coverage/Killed/delivery/admission gates remain OPEN; no new IDs or plan.

### v147 — TS closure and newly exposed connected failures

Two supported CLI adapters and22 caller/manifest/config paths migrated to native
TS.12 erased-AST/CC correspondence pairs and two independent blind reviews
preserve runtime semantics; static Source/CLI/lint/Knip pass. Behavioral closure
remains pending: the connected run exposes policy mode parser requiredness,
fixture import registering other suites, and schema CAS sidecar copying. Fresh
Bun explicit same-ID consent also reaches its existing45s bound and retains a
failed root; no timeout relaxation/replay. Prior v146 proofs remain scoped to
their Source/test/config hashes. Keep one final verifier, separate fixture data
from suite registration, and optimize repeated bundle preflights only with
request-local custody/revalidation proof. No active/runtime admission or final
coverage/CRAP/mutation acceptance follows from native TS parity.

### v148–v149 — actual policy execution and dependency closure corrections

Policy execution mode parser no longer requires planning-only attribution; saved
plan remains authority. Shared native TS fixture removes accidental suite imports
and synthetic payload copy excludes undeclared scratch/transient CAS nodes.
The new mode contract matrix has one normal test owner and directly checks
no-effect DB/baseline/policy/events/selector custody. Connected proof14PASS/1FAIL;
current fs-safe native loader flow remains unrecognized and blocks public sealed
authority. Bare imports and empty reexport-from now contribute runtime dependency
edges; scanner5PASS/1FAIL (native-flow case). Do not claim overall pass/unblock.
Current static/Knip/format checks pass; one stable capture7473functions/158tests
keeps the149 jobs review-only. Generated/candidate correspondence is not accepted.

Next repair the bounded maintained native attestation flow with exact root/target/
metadata/entry relationships and adversarial mutations. Retain global computed
loader refusal, sealed complete byte manifest and external dependency inputs.
Then return to the retained45s fresh CLI performance blocker without replaying
its failed root or increasing its bound. Live bundle proofs across async/effect
checkpoints cannot be cached without actual immutable custody. Legacy opener
exclusion stays false; final frozen/coverage/Killed/delivery/admission stay OPEN.

### v150–v154 — bounded native admission repaired

The scanner reuses its parsed AST and traversal for finite native attestation
recognition. Unique bindings, exact validated call identities, full hash/read/
ABI bodies and native package/binary relationships bound the exception. Shared
native binding extraction and optional/computed resolver checks preserve generic
loader refusal. Three exact package directory locators have separate resource
handling; original URL expressions remain after a rejected UNC-incompatible
rewrite. No general directory exemption or runtime authority was introduced.

Current connected43PASS/0FAIL/155assertions; subsequent scanner-only review
regressions53PASS/0FAIL/109assertions with unchanged product Source. One capture
143Sources/7505functions/158tests yields151review-only jobs and0diagnostics.
Static links and regression failures are neither coverage nor Killed evidence.
The earlier v150 RED is historical, not the current native admission status.

Next: diagnose the fresh public CLI resume45s blocker using a new independent
fixture and the unchanged bound. Keep child timing separate from parent read
counters; do not infer a cause from a different activation fixture. Preserve
every live bundle/owner/journal/fence/CAS/afterimage proof across await/effect
boundaries. Full recovery, old-opener exclusion and final numeric/runtime gates
remain OPEN. Do not replay the retained failed fixture or announce unblock.

### v156–v157 — fresh CLI attribution and file consent preflight correction

Bounded child-local diagnostic proves package byte reads dominate the measured
explicit-consent child, not pure artifact/schema preparation. An early file
UNKNOWN guard removes the demonstrated420 redundant package reads on refusal,
after full journal/root/ID/progress validation. Explicit consent still performs
all live proofs. Observe-only preload remains opt-in, bounded and separate from
actual uninstrumented latency acceptance; its environment cannot inherit stops.

Final existing CLI owner1PASS/77assertions, explicit-consent child42.777s under
its unchanged45s bound; default refusal0package reads. The direct completion
candidate failed its unchanged60s limit and stays an explicit OPEN receipt.
Never replay either retained failed fixture. One new current AST capture7505
functions/151review-only jobs binds this changed Source/test closure.

Next investigate the measured per-read safe-access cost within owned descriptor
intervals. Do not remove checkpoint bundle digests or add cross-effect caching.
Resolve the direct60s completion and reliable fresh45s acceptance along with
the remaining full recovery matrix; old-opener exclusion and final gates stay
OPEN. No active format/runtime switch or unblock notice.

### v158 — owned read API diagnostic, acceptance still OPEN

The new optional filesystem observer attributes28113.078ms to54126JavaScript
fsyncSync calls within33959.094ms of partial package byte reads. Native helper
syscalls are unobserved; nested API timers are inclusive. The explicit-consent
child hit its unchanged45s bound, while replacement-ID/default UNKNOWN refusals
performed0package reads. Keep v157's passing diagnostic and this failed receipt
as separate evidence; stable uninstrumented acceptance remains unqualified.

Retain /tmp/project-upgrade-lifecycle-crVrAR without opening/replaying it. No
blind reviewer established a safely removable lock flush or cross-effect bundle
proof. Next examine stable-read parent descriptor custody and redundant traversal
with a deterministic fresh fixture; do not label it the measured timeout cause.
All remaining recovery/old-opener/final-quality/runtime gates stay OPEN.

### v159 — owned namespace race repaired, full P0 still OPEN

Actual native regressions reproduced root-replacement races in stable read,
readText and ordinary fileExists. All now observe the acquired CAS parent's
descriptor; shared byte/text/existence helpers remove reopened paths. Keep
twice-observed stable absence, double byte capture, links/bounds/errors/backup
checks, all flushes and the special advisory .git marker behavior. Native
closure16PASS/108assertions; Source/CLI/test TS, typed lint and strict Knip pass.

Fresh unprofiled completion2PASS/121assertions: direct59.006s/60s, explicit-consent
child44.216s/45s. Small headroom is not stable latency qualification. Current
capture7504functions/151review-only jobs/0diagnostics has one parse/hash pass;
reuse its inputHashes, do not rerun unchanged scans or full suites.

Next: finish the typed no-effect activation/release and conflict recovery cases,
then retirement/fresh-intent interruption gaps. Preserve existing merge denial:
current gate excludes cooperative current openers, not ungated old processes.
Full recovery/frozen exact quality/active cutover/runtime remain OPEN; no notices.

### v160 — release preflight and two missing recovery cases

Typed no-effect activation and release-before-effect cases are implemented and
reviewed. Bounded closure including existing release lost ACK3PASS/126assertions.
A real default-release-denial RED found630excess package reads; shared validated
consent preflight removes them. Explicit consent keeps all live owner/bundle/
fence/closure checks and never reissues release from a held UNKNOWN beforeimage.
Retain both failed oNZIdZ and expected UNKNOWN RjtuwP fixtures without access or
replay. Source/CLI/test TS, typed lint and strict Knip pass; one current capture
7504functions/151review-only jobs/0diagnostics binds this packet.

Next: conflict UNKNOWN file/activation images, typed no-effect retirement and
fresh intent interruption. Direct SDK history fast-path late refusal is a
bounded review limit for non-retirement history placement, not release authority.
Stable deadlines, old-opener exclusion, frozen exact quality and runtime remain
OPEN. Do not flip legacyStorageOverlapExcluded or issue unblock notices.

#### Current conflict recovery evidence v161

Two reviewed real conflicting UNKNOWN afterimages (file and activation staging)
now pass unchanged60s bounds:2PASS/60assertions. They preserve exact journal,
conflicting bytes/inode, held fence and no replay/activation/history; retained
nonterminal roots are never reused. Product Source unchanged; v160 inventory
remains provenance, with v161 selected test/evidence hashes. Initial-intent
interruption, retirement no-effect, old-opener exclusion, stable completion,
frozen exact final gates and actual runtime update remain OPEN.

#### Initial intent no-reissue evidence v162

Initial atomic-create UNKNOWN with absent journal now preserves acknowledged
.vida/work directory custody before provider invocation; shared in-lock guard
blocks another publication. Exact canonical lost ACK still commits/reconciles
the same ID; legacy intent move rules unchanged. Bounded3PASS/57assertions.
Directory-only custody is not an operation or automatic recovery proof. Full
intent matrix, retirement, old-opener exclusion, stable completion and all final
quality/runtime gates remain OPEN.

#### Retirement no-effect evidence and remaining deadline failure v163

New typed no-effect retirement61.639s PASS under its new90s two-attempt bound:
released CAS restoration, frozen plan/token, no foreign effects, one successful
history move and one release. Existing retirement lost ACK still FAILS its
unchanged60s deadline (60.017s); retained failed root is never reused. Whole
candidate1PASS/1FAIL/103assertions is not accepted qualification. Reliable
completion, full initial-intent matrix, old-openers, final exact quality and
actual runtime update remain OPEN. Source unchanged; reuse v162 as provenance.

#### Initial intent conflict and recovery refusal v165–v166

Real atomic create plus same-inode foreign bytes/lost ACK is now covered.
Replacement inspection, repeated planning, planned inspection and same-ID
recovery preserve bytes/device/inode, beforeimages, no-reissue directory and
absent DB/activation/history, without another create or package verification.
Initial three-case3PASS/68assertions; after the review's recovery assertion,
only the changed conflict case reruns:1PASS/51assertions,13.148s under60s.
Two blind reviews and scoped strict TS/lint/Knip/format pass. Source and raw
staged index unchanged. Reuse v162 Source inventory as provenance only; its
test graph is stale. No mirror, duplicate suite/capture or runtime activation.

Next isolate existing retirement lost ACK using a fresh fixture in the restored
executor. Keep prior60.017s FAIL and all retained UNKNOWN custody; no old root
access/replay or bound increase. Full boundary matrices, stable deadlines,
old-opener exclusion, frozen exact gates and actual runtime remain OPEN.

#### Isolated retirement observation v167

Fresh isolated lost-ACK case1PASS/42assertions at57.588s under unchanged60s,
with2.412s headroom. Keep v16360.017s FAIL; stable qualification remains OPEN.
Existing counters observe12810package reads/438.68MB/46.903s, not raw syscall
timing. No safe read/flush removal is established and no mirror is adopted.
Current inventory selected file151functions has noCC>10; frozen published/current
correspondence and CRAP plan remain GAP. Locate/reuse genuine baseline inputs
before refactoring merely for complexity. No numerical/runtime/unblock claim.

#### Selected upgrade correspondence review v168–v169

Genuine5701-row measurement input is located; baseline suite/quality remain false.
Six blind disjoint reviews and Root identity/evidence join classify all151upgrade
functions as new behavior beyond the pure published converter. The selected-file
review and budget candidates live in package-local upgrade-budget-partition-v168;
they are not the executable plan or frozen qualification. Use the existing global
VidaCrapBudgetPlan/v1 owner for remaining published/current additions/removals and
reviewed budgets. Keep current Source inventory versus stale test links distinct.
No ordinal/hash inference, candidate-derived allowances or new quality hierarchy.
