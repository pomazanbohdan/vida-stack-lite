# CLEAR: закриття поточного P0–P1 VIDA

Статус: погоджений обсяг у роботі. Старий локальний runtime state прибрано
з активних шляхів. Root змінює код; Luna агенти досліджують незалежні контури.

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

## Перевірений вхідний стан

- Встановлений Windows runtime: 0.1.3, Source 18c2fba, artifact 11611162050.
- У `.agent` немає старих runtime БД, ініціалізації чи pending release.
- Збережено 283 файли документації, task scope, acceptance та research.
- Повний архів: `.tmp/archive/clear-start-20261009-150132-5d269b7a/`.
  Його manifest фіксує 815 файлів, включно з 8 БД та 4 WAL/SHM.
- Архів не є активним джерелом runtime state або чергою для replay.
- Новий runtime ще не ініціалізовано. Очищення не доводить admission чи acceptance.
- [Зовнішній аудит](EXTERNAL-AUDIT-18c2fba.md) лишається джерелом findings;
  статичні findings не замінюють поведінковий доказ.

## Порядок роботи

| Етап | Робота | Результат |
| --- | --- | --- |
| 1. Чистий старт | Архівувати старі operational state та БД; зберегти задачі, research, документацію й код | Виконано; нове виконання не читає старі leases/steps |
| 2. Прибрати зайве | Узгодити поточні план і backlog; прибрати старі recovery-передумови, доведений dead code та дублікати | Один чинний порядок і мінімальна кодова пачка |
| 3. Новий P0–P1 код | Виправити актуальні F1/F2/F3; підготувати versioned upgrade/path resolver; перейти до `.vida`; реалізувати єдине сховище, Bun-native оптимізації й test tooling | Повний погоджений код готовий до фінального тестового етапу |
| 4. Фінальне тестування | Написати/доопрацювати тести готового scope на Bun; виконати coverage, CRAP/complexity і mutation | Актуальні повні результати всього scope |
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

Тести пишемо й доопрацьовуємо після реалізації всього погодженого P0–P1 коду.
До реалізації фіксуємо affected files/callers, AC, наявний baseline та обґрунтовані
function/risk CRAP/complexity budgets. Збільшувати budget під готовий код не можна.

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
