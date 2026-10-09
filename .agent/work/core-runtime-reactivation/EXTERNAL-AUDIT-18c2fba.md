# Незалежний аудит vida-stack-lite

## Результат і межі доказу

Перевірена default branch: **main**. Commit: **18c2fba4881ec81c13717aa80e34b4fd02e1c8df**.
Дата commit: **2026-10-09T10:31:36Z**. Дата аудиту: **2026-10-09**.
[Commit](https://github.com/pomazanbohdan/vida-stack-lite/commit/18c2fba4881ec81c13717aa80e34b4fd02e1c8df).

Основні доведені причини блокування — обробка накопиченого стану як одного обмеженого JSON та публікація release manifest до створення відновлюваного intent. Виявлено також неузгоджене читання SQLite для діагностики та втрату конкретної причини SDK-відмови. Окремо зафіксовано навмисну one-shot поведінку generic SDK, яка не відповідає заданому замовником інваріанту exact retry, і латентний дефект внутрішнього research publisher без поточного публічного caller.

Це **Code/Static аудит**. Проєктний код, тести, native executable, build, install, update, release і mutation не запускалися. Контрприклади нижче виведено з гілок коду та допустимого порядку подій; це не звіт про фактичні Runtime-відтворення. Змін production code, інструкцій, конфігурації, журналів або прав не внесено. Наприкінці HEAD повторно звірено, git status --porcelain і git diff --stat порожні. Звіт створено окремо від checkout.

Шкала пріоритетів: P1 — системне блокування звичайного прогресу; P2 — істотна відмова відновлення або контрактна прогалина; P3 — локальна діагностика чи обмежений/латентний ризик. Підтвердженого P0 або виконання Source без дозволу в досліджених шляхах немає; це не доказ відсутності таких дефектів у всій системі.

## 1. Авторитетні джерела

[AGENT.sidecar.md:7–27](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/AGENT.sidecar.md#L7-L27) визначає власників вимог. Чинна поведінка agent належить packages/agent/docs/system-specification.md; lifecycle та політика перевірок — packages/agent/instructions/development-lifecycle.md і TESTING.md. Код, схеми та тести є доказами реалізації; вони не змінюють інваріанти лише тим, що тест очікує поточну поведінку. TESTING.md сам відділяє Code, Static, Runtime і GAP: [packages/agent/TESTING.md:205–221](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/TESTING.md#L205-L221).

README та installation.md — похідні пояснення. Research-документи — факти й відкриті питання. Історичні .agent/work записи не прийнято за чинний контракт, крім явно призначених sidecar джерел рішень. Назва commit не використана як доказ виправлення.

Відсутні в pinned tree:

- .agent/work/core-cloud-continuation-20261002/WORK.md, на який sidecar посилається як на джерело native-only public delivery decision: **GAP**.
- packages/plugin/docs/business-requirements.md, system-specification.md, acceptance.md: **GAP**. У packages/plugin є package.json; поведінку відсутнього продукту не реконструйовано.
- Фактичний installed runtime, native qualification, історичні операційні артефакти та attributable human acceptance не надані й не перевірялися.

Для read-only дослідження застосовано режим R0 з repository instructions. Запит користувача про незмінність і відсутність запусків має пріоритет над звичайними workflow-правилами саморозробки.

## 2. Самостійно встановлена модель

| Ланка | Фактичний шлях та власник |
| --- | --- |
| Public entrypoint | packages/agent/bin/vida-agent.mjs маршрутизує до bin/run.mjs; root SDK експортує RuntimeKernel і proof-backed host surface. |
| Validation | Project root/config/registry, canonical JSON, Ajv/Zod schemas, identities, exact digests та source bindings перевіряються до видачі дії. |
| Workflow | MastraSessionBridge створює createWorkflow/createStep, відкриває LibSQLStore, викликає createRun/start/resume. Це фактичні call sites, а не лише залежності в manifest. |
| Authorization/ownership | Cedar приймає allow/deny; Edictum перевіряє configured stages та approval. HostStateStore володіє Work, shared coordination ledger, generation, lease, assignment і reservation CAS. |
| Effect | Host резервує і фіксує effect-start до виклику native adapter/host CAS callback. Native session reports — кооперативні свідчення, не криптографічна автентифікація людського дозволу. |
| Persistence | Host SQL і Mastra SQL — окремі бази. Файлові artifacts мають окрему publication/rollback логіку. |
| Recovery | Читає immutable original, кваліфіковані переходи та current projection; зберігає identity/attempt/run, UNKNOWN і accepted results. |
| Completion | Exact report binding, завершення attempt, запис observation та звільнення file ownership; downstream review не повинен повторювати writer. |

Опорні джерела: [packages/agent/bin/vida-agent.mjs:9–48](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/bin/vida-agent.mjs#L9-L48), [packages/agent/src/index.ts:160–168](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/index.ts#L160-L168), [packages/agent/src/orchestration/mastra-session-bridge.ts:584–640](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/mastra-session-bridge.ts#L584-L640), [packages/agent/src/orchestration/mastra-session-bridge.ts:892–937](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/mastra-session-bridge.ts#L892-L937), [packages/agent/src/authorization/cedar-boundary.ts:109–127](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/authorization/cedar-boundary.ts#L109-L127), [packages/agent/src/orchestration/source-preflight-operations.ts:1088–1109](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/source-preflight-operations.ts#L1088-L1109).

**Власники транзакцій.** session-handoff.v1.sqlite через bun:sqlite містить Host state, coordination, session journal та governance/recovery state. Mastra працює з mastra-workflows.v1.sqlite через @mastra/libsql. Host може ко-комітити Work/Ledger/Journal: [packages/agent/src/host-state.ts:17288–17335](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/host-state.ts#L17288-L17335). Це не включає другу SQLite-базу чи filesystem rename. Release admission SQLite є mutex; його rollback не відновлює package.json.

**Межа кооперації.** Система прямо не обіцяє фізичного виключення іншого процесу з повними filesystem-правами: [packages/agent/docs/system-specification.md:29–47](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/docs/system-specification.md#L29-L47). Linux wrapper повідомляє, що expected target identity/content перевіряються під кооперативним .cas.lock, а native rename не є conditional replace за displaced inode: [packages/agent/src/config/safe-repository-access.ts:2438–2451](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/config/safe-repository-access.ts#L2438-L2451). Наявність fencing token у JSON сама по собі не зупиняє сторонній raw filesystem write.

## 3. Інваріанти до оцінювання тестів

1. Тривалість Work не дорівнює TTL lease. Renewal змінює живе володіння того самого owner; expiry не доводить no-effect.
2. Original history незмінна, current projection отримується з підтвердженого lineage, нові права потребують актуального дозволу.
3. Перед ефектом перевіряються identity, attempt, owner, generation, exact scope і версії. Await потребує повторної перевірки mutable authority.
4. Exact retry прийнятої операції повертає збережений результат без ефекту; UNKNOWN не обходиться новою operation/attempt/controller identity.
5. Кожна persistence-межа має визначене відновлення. SQL commit і rename не є однією транзакцією; rollback порівнює очікуваний postimage.
6. Законна історія в межах доменного контракту залишається читабельною. Ліміти компонентів і aggregate мають узгоджуватися.
7. Inspection і next action ґрунтуються на одному узгодженому persisted стані; відмова дає безпечний конкретний предикат.
8. Code/Static не підміняють actual Runtime, authorization чи human acceptance. Mocked business time не доводить wall-clock deadline.

## 4. Пріоритетний список

| ID | Severity | Статус | Вплив |
| --- | --- | --- | --- |
| F1 | P1 | Підтверджено статично | Shared ledger та recovery history впираються в загальний JSON budget задовго до заявленої доменної місткості. |
| F2 | P2 | Підтверджено статично | Crash під час release preparation залишає стан без підтримуваного продовження. |
| C1 | P2 | Підтверджена контрактна прогалина | Generic SDK свідомо відхиляє exact retry applied write; не відповідає інваріанту замовника. |
| F3 | P3 | Підтверджено статично | Inspection змішує SQLite snapshots і може радити зайве recovery. |
| F4 | P3 | Підтверджено статично | Generic SDK стирає справжню причину preparation denial. |
| L1 | P3 | Латентний внутрішній дефект | Unused canonical research publisher повертає replay-success для неповної record/changelog пари. |

### F1. Накопичений доменний стан обробляється як один untrusted JSON

**Інваріант.** Законний ledger/lineage повинен залишатися доступним усім writers/readers/recovery в задекларованих межах; історія не втрачається.

**Доказ і callers.** Звичайний canonical validator обмежує весь обхід 10 000 вузлів і 8 MiB: [packages/agent/src/contracts/public-ingress.ts:72–74](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/contracts/public-ingress.ts#L72-L74), [packages/agent/src/contracts/public-ingress.ts:121–149](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/contracts/public-ingress.ts#L121-L149). Host snapshot повторно запускає цей validator на всьому об'єкті, який містить Work, shared ledger і всю code history: [packages/agent/src/host-state.ts:1495–1498](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/host-state.ts#L1495-L1498), [packages/agent/src/host-state.ts:6808–6853](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/host-state.ts#L6808-L6853). Generic Host commit окремо серіалізує весь ledger, потім читає composite snapshot: [packages/agent/src/host-state.ts:17288–17335](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/host-state.ts#L17288-L17335).

Ланцюг ledger: public run admission/suspend → local-work-admission → suspendLocalWork → Host CAS/snapshot. Admission додає ticket/claim; suspension залишає їх історію і додає release operation: [packages/agent/src/orchestration/local-work-admission.ts:294–360](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/local-work-admission.ts#L294-L360), [packages/agent/src/orchestration/suspend-local-work.ts:784–866](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/suspend-local-work.ts#L784-L866).

Ланцюг recovery: CLI/SDK packet або preflight → Host.readQualifiedRuntimeCodeContinuations/readHostStateSnapshot → configuredFrontierRecoveryViewDigest або sourcePreflightContinuationDigest → canonicalJson. Навіть виправивши Host snapshot, reader знову застосує ordinary budget до повного history array: [packages/agent/src/orchestration/failed-prewriter-transition.ts:156–173](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/failed-prewriter-transition.ts#L156-L173), [packages/agent/src/orchestration/persistent-session-handoff.ts:157–166](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/persistent-session-handoff.ts#L157-L166). Останній використовується в повторній перевірці після await: [packages/agent/src/orchestration/persistent-session-handoff.ts:321–347](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/persistent-session-handoff.ts#L321-L347).

**Статичний контрприклад A.** Один project, незалежні Work з одним execution resource, послідовно завершені readonly waves та release. Ticket має 18 required fields, claim — 11, release operation — 13. Навіть без вкладених елементів це (1+18)+(1+11)+(1+13)=45 JSON nodes на цикл. Для 223 циклів: **10 035 nodes**, але лише **669 records**. Доменний validator дозволяє 4096 records і 65536 resource slots: [packages/agent/src/contracts/envelopes.ts:254–285](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/contracts/envelopes.ts#L254-L285); required fields: [packages/agent/schemas/coordination-ledger.v1.schema.json:53–125](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/schemas/coordination-ledger.v1.schema.json#L53-L125), [packages/agent/schemas/coordination-ledger.v1.schema.json:343–375](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/schemas/coordination-ledger.v1.schema.json#L343-L375). Арифметику required fields окремо перевірено Python-читанням JSON schema без імпорту коду проєкту. 223 цикли — достатня верхня межа кількості циклів для перетину ліміту; 10 035 — нижня оцінка вузлів, а не виміряний перший failing cycle. Додаткові поля/Work/history зменшать практичний поріг.

**Контрприклад B.** 250 невеликих семантично зв'язаних QualifiedRuntimeCodeContinuationReceipt одного attempt, кожен з коротким шляхом, коректними old→current digest/manifest/install і наступним Work revision. Кожна квитанція мала; навіть консервативна нижня оцінка 41 nodes на квитанцію дає понад 10 000 на array. Повний обсяг далеко нижче 64 MiB, передбачених combined continuation view: [packages/agent/docs/system-specification.md:1708–1714](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/docs/system-specification.md#L1708-L1714). Форма/chain: [packages/agent/src/orchestration/qualified-runtime-code-continuation.ts:35–104](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/qualified-runtime-code-continuation.ts#L35-L104), [packages/agent/src/orchestration/qualified-runtime-code-continuation.ts:316–365](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/qualified-runtime-code-continuation.ts#L316-L365). Це цільова законна послідовність; нинішній код зупинить її раніше, а не успішно накопичить 250 receipts.

**Межа ефекту.** Для наведеного readonly/admission сценарію нова дія відхиляється під час read/preflight або serialization усередині SQL transaction. Новий SQL transition не комітиться при винятку; повторного Source effect не доведено. Це нічого не каже про відсутність ефектів попередніх завершених задач. Заблокований completion після вже виконаного зовнішнього ефекту потребує окремого Runtime fault check.

**Найменше виправлення спільної причини.** Розділити доменні immutable компоненти, current projection і transport JSON validation. Для continuation — один спільний component-aware serializer/reader: перевіряти кожну квитанцію на її справжній глибині, серіалізувати повну історію послідовно зі збереженням канонічних bytes/full-body digest та чинного aggregate bound. Прибрати повторне пропускання повного history через generic snapshot. Обидві digest-гілки — configuredFrontierRecoveryViewDigest і initial-receipt branch у sourcePreflightContinuationDigest — мають використовувати той самий component-aware контракт; виправлення лише однієї гілки залишить блокування. Для shared ledger — зберігати immutable history окремими зв'язаними записами й мати bounded current projection/index; міграція має зберігати всю історію та exact CAS. Просто підняти MAX_CANONICAL_NODES, відкинути старі записи або вимкнути validation не є виправленням.

**Regression.** Детермінована state-machine admission→readonly completion→release до сотень циклів; write/reopen/read/next independent work; окремо code-update lineage та CLI/SDK/preflight consistency. Перевіряти component/aggregate межі незалежно, depth, tamper і незмінність digest старих малих v1 fixtures. Потрібна також перевірка обсягу повторного обходу: читання всього префікса на кожному переході створює сумарний обхід 1+2+…+n; latency не вимірювалася.

### F2. Release preparation змінює manifest до появи recoverable intent

**Інваріант.** Перед першою зміною потрібна стійка operation identity з before/after bindings. Restart має продовжувати саме її.

**Доказ і callers.** prepareRelease / prepareReleaseAfterDisposition / prepareSystemUpdate → prepareCandidate. Послідовність: manifest save :1009 → random operation_id :1010 → directories → pending save :1020 → journal save :1021. [tooling/agent/release-local.mjs:888–923](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/tooling/agent/release-local.mjs#L888-L923), [tooling/agent/release-local.mjs:986–1022](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/tooling/agent/release-local.mjs#L986-L1022).

withReleaseAdmission захищає одночасний доступ SQLite BEGIN IMMEDIATE, але rollback стосується лише mutex DB: [packages/agent/bin/local-release-artifacts.mjs:171–209](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/bin/local-release-artifacts.mjs#L171-L209).

**Мінімальні crash traces.**

| Межа зупинки | Persisted стан | Наступна відмова |
| --- | --- | --- |
| Після manifest save, до operation_id | Confirmed baseline v, manifest v+1, нового pending/journal немає | Normal prepare відхиляє manifest!=confirmed і радить reconcile pending, якого немає. System update теж вимагає baseline version. |
| Після pending save, до journal save | pending існує, per-operation journal відсутній | Exact prepare відхиляє missing journal; disposition/system-update/repair readers також потребують journal. |

Функції pending disposition та repair не створюють відсутній початковий intent. Без ручного редагування поза підтримуваним маршрутом перший стан не має наступного кроку. Це конструктивний сценарій для законного successful baseline; фактичні release журнали користувача не досліджувалися.

**Межа ефекту.** Manifest уже змінений. У цих traces build/install worker ще не запускався: reserveReleaseWorker спочатку читає journal, потім викликає launch: [tooling/agent/release-local.mjs:858–869](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/tooling/agent/release-local.mjs#L858-L869). Висновок спирається на порядок коду, не на відсутність PID.

**Виправлення.** Durable preparation intent з operation_id, confirmed baseline, manifest before/after hashes та цільовими pending/journal до першої публікації. Один reducer завершує лише exact missing writes або робить conditional rollback при expected afterimage. Перестановка pending і journal сама не закриє manifest seam. Для операції, worker якої вже міг початися, UNKNOWN зберігається.

**Regression.** Ізольований fixture та faults після кожного save, restart зі збереженим intent, точний retry без другого version bump, чужа зміна manifest, stale pending, lost ACK. Launch spy для pre-worker traces має залишатися 0; реальний release/install для цього тесту не потрібен.

### F3. Inspection читає Work/Ledger/Journal з різних snapshots

**Інваріант.** Публічна діагностика повинна відповідати одному committed стану.

**Доказ і callers.** inspectLocalSession відкриває readonly DB, далі три окремі SELECT без BEGIN: journal :71, Work :72, ledger :73. Checksums кожного рядка правильні, але сумісність моменту читання не забезпечена. Pending і recovery_required обчислюються з цієї суміші: [packages/agent/src/orchestration/inspect-local-session.ts:32–46](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/inspect-local-session.ts#L32-L46), [packages/agent/src/orchestration/inspect-local-session.ts:62–133](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/inspect-local-session.ts#L62-L133). Public run --inspect: [packages/agent/bin/run.mjs:4534–4544](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/bin/run.mjs#L4534-L4544); preparation guard також споживає inspector: [packages/agent/bin/run.mjs:3984–4005](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/bin/run.mjs#L3984-L4005).

**Контрприклад.** Inspector читає старий journal з observation=null. Інший процес комітить completed report разом із Work і новою ownership projection. Inspector читає нові Work/Ledger та повертає стару pending action/recovery_required. Host справді має атомарний co-write цих рядків: [packages/agent/src/host-state.ts:17288–17335](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/host-state.ts#L17288-L17335).

SQLite implicit read transactions завершуються після statement; спільний snapshot потребує явної read transaction: [SQLite transactions](https://www.sqlite.org/lang_transaction.html). Точна pinned Bun 1.4.2 документація підтверджує get/transaction/deferred semantics: [Bun source](https://github.com/oven-sh/bun/blob/bun-v1.4.2/docs/runtime/sqlite.mdx).

**Межа ефекту.** Доведена можливість неузгодженої діагностики. Блокувальної відмови саме з цього co-commit не доведено. Прямого надання прав або виконання Source за цим snapshot не знайдено; mutation paths мають власні CAS.

**Виправлення.** Усі три читання в одній короткій deferred readonly transaction, після цього cross-binding validation. Один captured now для expiry labels усуває зайву часову неузгодженість.

**Regression.** Два DB handles/processes і детермінований barrier між SELECT: concurrent terminal co-commit; результат повністю належить старому або новому snapshot. Порівняти --inspect з Host snapshot. Відсутність exception сама не є достатньою assertion.

### F4. Generic SDK стирає причину відмови підготовки

**Інваріант.** Denial зберігає конкретний безпечний предикат і не веде користувача до зайвого ремонту іншої стадії.

**Доказ.** RuntimeKernel.runGovernedWrite → governance.runGovernedWrite → prepareGovernedWrite. ResultAsync.match rejection arm :2370 ігнорує exception і передає raw input до guard. Той не бачить private ingress_token і повертає canonical Cedar ingress denial: [packages/agent/src/runtime-kernel.ts:680–694](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/runtime-kernel.ts#L680-L694), [packages/agent/src/governance/edictum-boundary.ts:2363–2404](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/governance/edictum-boundary.ts#L2363-L2404), [packages/agent/src/governance/edictum-boundary.ts:2041–2070](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/governance/edictum-boundary.ts#L2041-L2070).

**Мінімальний приклад.** Trusted configured SDK kernel отримує malformed envelope wrapper. Preparation має точне пояснення runtime envelope wrapper required :2164–2166; caller замість нього отримує ingress denial. Так само губиться розрізнення approval rejection та already reserved operation. [packages/agent/src/governance/edictum-boundary.ts:2160–2174](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/governance/edictum-boundary.ts#L2160-L2174), [packages/agent/src/governance/edictum-boundary.ts:2220–2226](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/governance/edictum-boundary.ts#L2220-L2226).

**Вплив і межа.** Це зайві кроки відновлення/авторизації у SDK. Відсутній ingress capability блокує casWriter, тому цей приклад не виконує effect. Native run report path не ототожнюється з generic SDK.

**Виправлення.** Зберегти structured preparation error; за потреби записати policy denial, але повертати stable sanitized reason і безпечний наступний крок. Не повертати raw payload, токени чи приватні подробиці policy.

**Regression.** Окремі malformed envelope, wrong binding, expired approval, denied approval, applied/unknown reservation cases: перевіряти reason code і 0 effect calls, а не тільки клас EdictumDenied.

## 5. Окремі контрактні та латентні проблеми

### C1. Generic SDK exact retry має one-shot semantics

**Статус.** Це підтверджена невідповідність інваріанту замовника D, а не прихована регресія поточної специфікації або дефект native workflow retry. Наявний тест свідомо очікує denial другого виклику: [packages/agent/tests/governance-completeness.test.mjs:160–186](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/tests/governance-completeness.test.mjs#L160-L186).

**Очікування.** Повтор того самого прийнятого operation повертає прийнятий результат без writer effect.

**Факти/callers.** Root export → RuntimeKernel.runGovernedWrite → prepareGovernedWrite → reservationStore.reserve. Host.reserveOperation повертає null для будь-якого наявного marker, включно з applied: [packages/agent/src/host-state.ts:5838–5870](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/host-state.ts#L5838-L5870). У тому самому guard consumeGovernedWriteOnce теж відхиляє operation hash. OperationReservation зберігає тільки result_digest, а finalize повертає результат без збереження його body/custody pointer: [packages/agent/src/governance/edictum-boundary.ts:1385–1421](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/governance/edictum-boundary.ts#L1385-L1421), [packages/agent/src/governance/edictum-boundary.ts:1950–1961](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/governance/edictum-boundary.ts#L1950-L1961), [packages/agent/src/governance/edictum-boundary.ts:2311–2329](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/governance/edictum-boundary.ts#L2311-L2329).

**Контрприклад і межа.** Writer повернув canonical result, complete зберіг applied marker, ACK загубився. Exact input повторено в незміненому допустимому контексті. Повертається denial, відновити первинний довільний result із digest неможливо. Перший effect уже міг бути виконаний; повторний casWriter заблокований. Це fail-closed availability gap, а не доведений duplicate effect.

**Виправлення.** Persist accepted result або immutable result reference у тому самому owner/operation protocol; відрізняти exact applied, conflict і UNKNOWN до видачі нових effect rights. Читання старого результату потребує належного доступу, але не нового writer authorization. Не обходити UNKNOWN новим key.

**Regression.** Exact retry в тому самому guard, новому guard та після reopen; lost ACK; altered input; lost result custody; UNKNOWN; foreign identity. Assert той самий result і рівно один effect для applied case. Для UNKNOWN — без нового effect та без auto-reissue.

### L1. Внутрішній research publisher визнає часткову publication успішним replay

**Scope.** recordResearchResult / recordResearchSynthesis / recordDecisionRecord → recordCanonical → recordUnderLock. У pinned tree немає non-test callers цих writer APIs і немає root SDK export. Current CLI використовує інший recordObservedResearchResultAsync: [packages/agent/bin/run.mjs:5006–5007](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/bin/run.mjs#L5006-L5007), [packages/agent/bin/run.mjs:5106–5123](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/bin/run.mjs#L5106-L5123). Тому прямий blocker поточного CLI тут не заявляється.

**Інваріант.** Exact retry успішний лише для повної прийнятої record+changelog publication.

**Доказ/контрприклад.** recordUnderLock записує record :3370 і лише потім appendChange :3371. Kill процесу між ними втрачає in-memory undo. Після restart той самий valid record потрапляє до digest-equality branch :3337, який повертає replay:true,event:null без перевірки event. [packages/agent/src/research-decision.ts:3334–3382](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/research-decision.ts#L3334-L3382), [packages/agent/src/research-decision.ts:3387–3448](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/research-decision.ts#L3387-L3448).

**Межа ефекту.** Target record уже опублікований; changelog не записаний. Retry повертає успіх неповної пари. Це статично підтверджений внутрішній crash defect, без доказу його current public reachability.

**Виправлення.** Видалити/закрити unused writer surface або перевести його на один durable pair publisher з exact before/after bindings. Current observed route вже перевіряє record hash і наявність саме reserved changelog extension: [packages/agent/src/research-decision.ts:4122–4149](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/research-decision.ts#L4122-L4149). Не копіювати ще одну скорочену replay branch.

**Regression.** Process interruption після record replacement і до changelog, reopen та exact retry; complete pair, missing event, foreign event, foreign record, conditional rollback. Закритий API перевірити статичним inventory exports/callers.

## 6. Що перевірено і не визнано дефектом

**Long task і ownership.** Renewal має реальний public caller: run.mjs:3808–3950 → HostStateStore.renewActiveLocalLease:14705–14877. Це explicit renewal, автоматичного heartbeat loop в дослідженому main run path не знайдено. Lifecycle прямо покладається на --renew-lease true і розрізняє expired readonly recovery: [packages/agent/instructions/development-lifecycle.md:126–145](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/instructions/development-lifecycle.md#L126-L145). Відсутність автоматичного timer не названа порушенням нинішнього контракту. Фактичний long-running controller має забезпечувати виклики renewal; це operational verification GAP.

Writer completion переходить до execution-only ownership у shared Host transaction: [packages/agent/src/orchestration/persistent-session-handoff.ts:2290–2325](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/persistent-session-handoff.ts#L2290-L2325), [packages/agent/src/host-state.ts:15931–16048](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/host-state.ts#L15931-L16048). Retained completed evidence дозволяє завершити вже прийняте cleanup за вузьких умов, а не повторювати Source effect. Незалежна робота не повинна блокуватися старими file resources; підтвердженої протилежної гілки в цих paths немає.

**Recovery після зміни коду.** Admitted packet, engine reader та completed report recovery мають lineage-aware projections: [packages/agent/src/orchestration/admitted-development-packet.ts:264–316](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/admitted-development-packet.ts#L264-L316), [packages/agent/src/orchestration/session-engine-snapshot.ts:1464–1482](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/session-engine-snapshot.ts#L1464-L1482), [packages/agent/src/orchestration/completed-source-report-recovery.ts:1085–1187](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/orchestration/completed-source-report-recovery.ts#L1085-L1187). Не знайдено конкретного current прикладу, де законний нащадок відхиляється саме через старий afterimage. F1 окремо доводить відмову на довгій історії.

**Fencing/UNKNOWN.** Admitted execution і Host перевіряють lease, assignment та approval до effect-start; невизначений початий effect не перетворюється на unentered reservation. Completed workflow retry має окрему гілку без повторної dispatch із наступною перевіркою результату/context: [packages/agent/src/runtime-kernel.ts:2022–2110](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/src/runtime-kernel.ts#L2022-L2110). Це сильніше за generic SDK C1; поверхні не змішано.

**Locks/nested transactions.** Research canonical route бере Host→changelog/CAS, observed/normalization routes беруть changelog/history→Host. Порядок неоднаковий. Linux file lock використовує exclusive creation, Windows задає timeoutMs:0; Host busy timeout 1000 ms. Виведено можливу transient contention refusal, але не безстроковий deadlock. Synchronous withWorkingMutation відхиляє Promise-like callback; async route має окремий owner. Native конкуренція і справжній process crash не запускалися.

**Filesystem.** Технічні path/root/file identity, symlink/hardlink controls реально є в safe-repository-access; їх actual OS effectiveness не підтверджена цим аудитом. Unconditional restoreAtomic у старому research helper варто переглянути, але overwrite іншого cooperating writer на доведеному current public schedule не встановлено. Не видається за підтверджену physical-isolation vulnerability.

## 7. Pinned dependencies і порівняльні патерни

Pins узяті з package.json та bun.lock, а не з встановленого середовища: [packages/agent/package.json:285–297](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/package.json#L285-L297). Lock фіксує @libsql/client 0.18.0.

| Dependency | Перевірений API |
| --- | --- |
| Bun 1.4.2 | bun:sqlite get, synchronous transaction, deferred/immediate; [exact tagged docs](https://github.com/oven-sh/bun/blob/bun-v1.4.2/docs/runtime/sqlite.mdx). Bun wrapper підтримує nested savepoints, тоді як raw SQLite BEGIN не вкладається; Host додатково забороняє nested paths. |
| @mastra/core 1.71.0 | createRun/start/resume/getWorkflowRunById у [tagged workflow.ts](https://github.com/mastra-ai/mastra/blob/%40mastra%2Fcore%401.71.0/packages/core/src/workflows/workflow.ts). |
| @mastra/libsql 1.23.3 | LibSQLStore та окремий client у [tagged storage](https://github.com/mastra-ai/mastra/blob/%40mastra%2Flibsql%401.23.3/stores/libsql/src/storage/index.ts). |
| Cedar WASM 4.13.0 | isAuthorized/checkParsePolicySet/validate у [official tag](https://github.com/cedar-policy/cedar/blob/v4.13.0/cedar-wasm/src/lib.rs); app додатково перевіряє decision=allow. |
| fs-safe 0.5.6 | root, advanced і file-lock; [tagged README](https://github.com/openclaw/fs-safe/blob/v0.5.6/README.md) явно відділяє guardrail від OS sandbox. |
| canonicalize 4.0.0 | Default export string або undefined у [tagged declarations](https://github.com/erdtman/canonicalize/blob/v4.0.0/lib/canonicalize.d.ts); app валідовує значення перед ним. |
| neverthrow 8.2.0 | Result/ResultAsync і fromPromise/match: [tagged source](https://github.com/supermacro/neverthrow/blob/v8.2.0/src/result-async.ts). F4 спричинений app rejection arm. |
| Ajv 8.20.0 | Default Ajv2020 constructor/compile: [tagged source](https://github.com/ajv-validator/ajv/blob/v8.20.0/lib/2020.ts). |
| yaml 2.9.0 | parseDocument/stringify/Document.toJS; maxAliasCount=0 та mapAsMap у [exact options](https://github.com/eemeli/yaml/blob/v2.9.0/src/options.ts). |
| Zod 4.4.3 | Root default z export у [tagged source](https://github.com/colinhacks/zod/blob/v4.4.3/packages/zod/src/index.ts). |
| @babel/parser 8.0.4 | parse(source, options) у [tagged source](https://github.com/babel/babel/blob/v8.0.4/packages/babel-parser/src/index.ts). |
| @edictum/core 0.5.0 | Direct imports/calls підтверджені в app; immutable upstream tag для exact published 0.5.0 не встановлено. Main metadata недостатня для всіх version-specific semantics: GAP. |

API-порівняння не виявило доведеного mismatch у перевіреному subset; це не verification завантаження WASM/native libraries або всіх transitive dependencies.

[Mastra suspend/resume](https://mastra.ai/docs/workflows/suspend-and-resume) використано як патерн persisted continuation, [etcd 3.6 lease/keepalive](https://etcd.io/docs/v3.6/dev-guide/api_reference_v3/) і [locks](https://etcd.io/docs/v3.6/dev-guide/api_concurrency_reference_v3/) — як розділення lease та ownership check, [Temporal heartbeat](https://docs.temporal.io/encyclopedia/detecting-activity-failures) — як відділення прогресу й timeout. Це не рекомендація встановлювати ці системи. Нові API з current Mastra documentation не приписані pinned 1.71.0.

## 8. Перевірки і regression backlog

Виконано: GitHub default-branch/commit/tree retrieval; isolated exact-SHA checkout; читання repository instructions, spec, lifecycle, contracts, callers, tests і pinned upstream source; rg-пошук callers/exports/locks/retry/readers; schema-node arithmetic; повторну перевірку HEAD/clean checkout.

**Не виконано:** жодного project test, import модуля runtime, build, native execution, installation/update/release, mutation або human acceptance. У звіті немає synthetic PASS.

Наявні тести, прочитані як код:

- initial-source-continuation.test.mjs:2033–2109,2448–2548 — completed report retry та qualified descendants; :2982–3240 — stale, UNKNOWN, FIFO, TOCTOU/CAS denials.
- admitted-development-packet.test.mjs:612–683 — omitted/empty history і одна невелика receipt; це не long-history budget regression.
- run-entrypoint.test.mjs:2037–2077 — immediate report retry; не повний public retry після довгої multi-rebind history.
- governance-completeness.test.mjs:160–186 — навмисна one-shot denial C1.
- property.test.mjs і fuzz.test.mjs — generic JSON/config/path/governance properties; не модель довгого Host lifecycle.
- zombies.test.mjs:298–310,440–453 — документація/public exports; не заміна recovery state-machine.
- Clock fixtures мають cleanup Date mocks; фактичні wall-clock deadlines не перевірялися.

[Основні recovery tests](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/tests/initial-source-continuation.test.mjs#L2033-L2109), [history fixture](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/tests/admitted-development-packet.test.mjs#L612-L683), [public report tests](https://github.com/pomazanbohdan/vida-stack-lite/blob/18c2fba4881ec81c13717aa80e34b4fd02e1c8df/packages/agent/tests/run-entrypoint.test.mjs#L2037-L2077).

Мінімальний набір наступних development checks, без реальної доставки:

| Ризик | Перевірка |
| --- | --- |
| Long lawful history | Deterministic state machine, багато послідовних work і code transitions, компоненти окремо/разом, restart та cross-surface reads. |
| Межі persistence | Fault injection до intent, між публікаціями, після effect, до/після completion commit, перед ACK і після restart. |
| UNKNOWN | Відсутність ефекту не виводиться з timeout/PID/expiry; жодна нова identity не обходить unresolved original. |
| Concurrency/fencing | Barrier після await; expiry/takeover між validation та effect; stale generation; peer FIFO; inspector co-commit. |
| Retry | Accepted result незмінний, effect count=1; conflict/foreign identity deny; missing result custody не synthetic success. |
| Filesystem | Expected-postimage rollback, root/target drift, symlink/reparse/hardlink, часткове cleanup; native-specific cases окремо. |
| Business time vs wall time | Mock лише expiry-time для business checks; окремий реальний deadline/child observer з monotonic elapsed time і явним cleanup. |
| ZOMBIES | Zero/one/many transitions; boundaries; interface consistency; exceptions на кожному seam; прості exact assertions. Не дублювати один ризик п'ятьма назвами тестів. |

## 9. Порядок виправлень і зайві кроки

1. **F1:** усунути shared aggregate/snapshot bottleneck. Це розблоковує звичайну тривалу роботу, наступні незалежні tasks і recovery.
2. **F2:** додати durable prep intent та одну підтримувану recovery action для обох сирітських станів.
3. **C1:** узгодити generic SDK з exact-retry вимогою, зберігаючи UNKNOWN і authority.
4. **F3/F4:** coherent inspection і stable denial reasons, щоб оператор отримував правильний наступний крок.
5. **L1:** закрити unused publisher або перевести на спільний durable protocol до повторного підключення.

Можна прибрати повторну canonicalization тих самих immutable receipt bodies у Host snapshot, configured digest і preflight; залишити перевірку їх повного binding і актуального набору versions після await. Можна звести recovery readers до одного lineage projection/validation contract, зберігши boundary-specific current checks. Можна видалити окрему слабшу recordCanonical replay реалізацію після перевірки callers. Після atomic accepted result не потрібні новий writer/report/effect або повторна writer approval для читання цього результату. Для release intent один reducer замінить ручні repair ladders і пораду створити/reconcile відсутню operation.

Не слід прибирати current authority checks після await, FIFO для конфліктних ресурсів, original operation custody, UNKNOWN fences, beforeimages, conditional rollback, semantic validation, full history або окрему human acceptance. Уже реалізоване звільнення file ownership перед readonly review треба зберегти.

## 10. Неперевірені межі та гіпотези

- Generic casWriter freshness після await: wrapper повторює runtime revision/config, але не всі time checks. Trusted callback отримує повний request і може виконувати потрібний atomic check. Конкретного production writer callback, який доводить commit після expiry, не знайдено. Це callback-contract/Runtime GAP, не підтверджений Source bypass.
- Opposite research lock order може давати contention refusals; безстроковий deadlock не доведений.
- Старий unconditional research rollback потребує targeted foreign-change fixture; overwrite іншого cooperating writer не підтверджений.
- Не перевірені native Windows reparse semantics, macOS/Linux OS races, фактичні storage power-loss guarantees, installed package migration і зовнішні executor side effects.
- Немає actual public end-to-end long task з renewal, multiple runtime updates, accepted writer report, restart і downstream readonly completion.
- Немає актуального виконаного coverage/mutation evidence цього commit у межах аудиту. Заяви чи історичні PASS у документах не прийняті за результати цього дослідження.

Ці межі не виправдовують F1–F4 і не дозволяють оголосити всю систему справною. Для них наведено конкретні Code/Static докази; для решти залишено рівно ту впевненість, яку підтримують доступні джерела.
