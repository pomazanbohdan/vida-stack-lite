# VIDA Core — поточна робота CLEAR

Статус: виконання погодженого P0–P1. Root інтегрує код; Luna агенти досліджують.

Єдиний порядок: [CLEAR plan](CLEAN-START-STRATEGY-20261009.md).
Чинні задачі та IDs: [backlog](../vida-013-planning-20261002/BACKLOG-PRIORITIES-20261006.md).

Старий operational state прибрано з `.agent`. Архів з manifest:
`.tmp/archive/clear-start-20261009-150132-5d269b7a/`.
Збережено документацію, task scope/acceptance, research, код і Git-зміни.
Новий runtime ще не ініціалізовано; фактичне розблокування не заявлено.

## Поточні рішення

- Старі claims/attempts/releases не відновлювати як передумову нової роботи.
- Зберігати stable task IDs та прийняті вимоги. Старі issued/UNKNOWN не replay.
- Виправляти лише потрібні новому контуру дефекти, спільні причини й дублікати.
- Код і test tooling завершити перед написанням та запуском фінальних тестів.
- Тестовий scope: Bun, 100% coverage усіх чотирьох метрик, frozen CRAP budgets,
  100% підтверджених Killed mutants. Без suites під час build/install.
- Pre-commit погоджено; pre-push не активувати.
- Усі актуальні lint/type warnings/errors у погодженому scope усунути.
- Активні документи містять тільки чинний стан і правила.
- Дозволені поведінкові перевірки бінарника в ізольованому середовищі до фіналу.
- Ціль операцій — до 2 с; перевищення потребує пошуку дублювання, проблем кешу,
  читання й блокувань. Для довгої роботи окремо вимірюємо start/status і elapsed.
- Новий білд: версія строго зростає, типово patch; minor/major/exact за запитом.
  Повторне використання вже сформованого точного artifact не є новим білдом.

## Поточний результат і прогалини

- F1: Host/CLI/history використовують спільні ledger/component codecs;
  ordinary message limits і чинні v1 bytes збережено. F2: intent/resume статично
  перевірено. F3: readonly snapshot перевіряє Work identity, journal run і
  lease-ticket binding. Фінальні поведінкові перевірки й доставка pending.
- F4: preparation denial зберігає безпечну фазу й cause, рахує спробу без writer.
  Failed abort зберігає reservation custody та обидві помилки. Статичний review
  не знайшов обходу counters або втрати UNKNOWN; behavior proof pending.
- Повний Source TypeScript і scoped Oxlint для 12 TS файлів path/config пачки —
  PASS, 0 lint diagnostics. CLI typing/lint залишається відкритим P1 scope;
  поточний повний звіт — `.tmp/clear-p0-p1-static-20261009/cli-typecheck-paths.txt`.
  Strict CLI check: 1271 diagnostics; у виправленому inventory block — 0.
  Source inventory у `local-release-artifacts.mjs` типізовано, повторні identity
  closures прибрано. Root identity кешу публікується після успішної перевірки.
  Independent static review не знайшов послаблення файлових гарантій. Scoped
  lint цього файла: 87 diagnostics поза виправленим inventory; цей файл явно
  включено до bin/tsconfig. Фінальні regression/numeric checks pending.
  Scoped Oxfmt для 14 файлів та `git diff --check` — PASS.
- Governance: `typecheck:pinned`, scoped Oxlint з `--max-warnings 0`, scoped
  Oxfmt і `git diff --check` — PASS на Mastra 1.75.0. Незалежний review знайшов
  stale blocked status після approval; корекцію підтверджено свіжим читанням.
  Review є статичним, не поведінковим доказом. Фінальні scope checks pending.
- CLI help registry, єдина БД, history layout і ранній CI version gate ще не готові.
- Edictum/Mastra та альтернативи: поточне дослідження в
  [framework registry](../../../packages/agent/docs/research/agent-framework-reference-registry.md#mastra-and-edictum).
  Mastra + VIDA інтегровано в Source; `@edictum/core` прибрано з manifest/lockfile.
  Mastra 1.75.0 pinned; native runtime не оновлено. Прямий SDK, stage approval/result,
  Host/Cedar права й v1 формати збережено. Фінальна поведінкова перевірка pending.
- Правило скорочення викликів і токенів застосовується одразу під час поточної
  корекції; його єдиний instruction owner — development-lifecycle.
- P1 Bun native: дослідження офіційних можливостей і Node call sites завершено.
  Luna підготував також карту strict CLI typing. Root переносить
  код без втрати файлових, subprocess, CAS та UNKNOWN гарантій.
- До CLEAR додано `.vida` layout, поділ config project/agents/flows і versioned
  upgrade. У `.vida` лише ініціалізований агент; Source лишається в `packages`.
  Дослідження Bun і resolver/discovery/migration завершено. Висновки включено
  до чинних specification/reference registry. Pure component schema/composer і
  v1 converter реалізовано в `packages/agent/src/config/project-configuration.ts`.
  Shared YAML parser перевіряє глибину CST перед Composer. `project-paths.ts`
  тепер є єдиним місцем назв обох БД та трьох configuration paths; production
  Host/Mastra readers, writers, CLI й relative pointers використовують його.
  Старі public exports збережено; чинний configured work root не змінено.
  Функціональний upgrade, active loader/init і перенесення pending; `.vida`
  ще не створено. Static review підтвердив відсутність нового import cycle.
- Продуктні suites, build/install та системне оновлення на цьому етапі не виконано.

## Найближчі кроки

1. З'єднати готові composition/converter/path owner з bundle-owned upgrade:
   intent/beforeimages, exact resume, перевірка всього набору до activation.
   Потім переключити active loader/init та consumers на `.vida`. Не імпортувати
   старий operational state; не використовувати config-only lock як read fence.
2. Усунути CLI typing/lint прогалини без suppressions або послаблення правил.
   Готові досліджені входи: checkedRows/currentState у runtime-config-rebind,
   checkedRow у runtime-code-rebind і SQL projections у synthesis qualification.
   Inventory helpers уже типізовано; інші release helpers залишаються у scope.
3. Реалізувати storage і готові Bun-native, CLI/help, delivery/version зміни.
4. Виконати фінальні tests/reviews, доставку та новий runtime intake.

## Поточна пачка конфігурації

- Scope: `src/config/runtime-config.ts`, component composer/schema, shared
  `project-paths.ts` і його callers, package schema inventory та поточні документи.
- Independent Luna plan check підтвердив disjoint project/agents/flows split.
  Спільна YAML/snapshot межа має depth bound. Converter використовує native
  Bun strict deep comparison зі збереженням чинного v1 числового діапазону.
- AC: строгі schema tags, однаковий config_id, лише локальні фіксовані посилання,
  обмежені bytes/depth, чинна cross-reference validation, exact-input binding
  та збереження config values/paths у split/compose. Жодних writes чи admission.
- Початкові agents/flows revisions — 1; project revision зберігає config_revision.
- Нові функції: complexity ≤ 10 і CRAP ≤ 10; чотири coverage metrics та confirmed
  mutation Killed — 100% на фінальному етапі. Чинні budgets shared parser не збільшувати.
- Активний loader/init і фізичні шляхи не перемикаються до готового upgrade.
- Path helpers є pure mapping після config validation, а не новою межею
  авторизації чи validation. SafeRepositoryAccess нормалізує target перед
  перевіркою; це не заміна strict config path validation. Підтримуваний `.`
  work root дає canonical pointer без `./`. Final cases записано в TESTING.md.
- Повний Source TypeScript, scoped type-aware Oxlint (0 diagnostics), scoped
  Oxfmt та `git diff --check` — PASS. Поведінкові й numeric checks pending.
- Незалежний correction review підтвердив обидва виправлення: CST guard перед
  Composer і збереження числового діапазону при конвертації. Окремий чинний GAP:
  schema дозволяє unsafe integers, а runtimeConfigDigest їх відхиляє. Узгодження
  цієї межі входить до P1 validation; конвертер не змінює digest або admission.
