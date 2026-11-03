---
type: Decision Record
title: Робота через runtime та цикл виправлень
---

# Робота через runtime та цикл виправлень

Статус: чинна пряма інструкція користувача від 2026-11-03 з уточненням «одна задача на цикл поставки» для розробки VIDA Agent у цьому repository. Координатор: Root. Lifecycle та operation owners зберігають свої межі повноважень.

## Межі одного циклу

На початку циклу обрати одну поточну задачу. Якщо runtime блокує її через продемонстрований дефект, scope циклу становлять ця задача та виправлення причинного runtime-багу. Завершити обидва поза runtime, виконати потрібні перевірки, випустити новий PATCH build і оновити системний runtime. До наступної задачі перейти через оновлений runtime після перевіреної поставки та актуалізації Markdown.

Інші задачі залишаються в черзі. Не виконувати весь implementation plan перед поставкою поточного циклу. Не додавати незалежні виправлення, рефакторинги або поліпшення. Якщо інша обов'язкова передумова блокує поставку, зафіксувати цей gate і його owner. Не скасовувати перевірки й не розширювати scope мовчки.

## Робочий цикл

1. Обрати одну задачу й почати її через фактично встановлений runtime. Прочитати persisted work, перевірити bindings, lease і CAS, видати підтримувану дію та передати її фактичний результат. Перед dispatch перевірити строк lease й застосувати підтримуваний renewal, коли він потрібний і допустимий.
2. Якщо задача проходить через runtime, підтвердити її фактичне закриття та оновити Markdown. Реєстрація, INTAKE та невидана хвиля не є проходженням, завершенням або блокуванням.
3. Якщо перехід блокується, зберегти work, attempt, installed version, команду, terminal result і невизначені effects. Застосувати допустимий recovery. Встановити причинний дефект або відсутню потрібну capability до початку repair. Відсутня відповідь користувача, потрібний дозвіл, помилка виклику й коректна захисна відмова залишаються окремими gates.
4. Якщо дефект runtime продемонстровано, виправити поза runtime лише цей дефект і завершити поточну задачу. Використовувати чинних owners для Source, configuration, binding, lease та installation. Зберігати один writer, scoped review, CAS, усі потрібні перевірки та fenced UNKNOWN. Не починати інші задачі плану.
5. Перевірити acceptance поточної задачі та застосовні виправлення runtime. Окремо зафіксувати Source та test результати, стан старої runtime-спроби й залишкові gates. Оновити канонічні Markdown перед поставкою фактичними результатами. Поставка та системна інсталяція до їх виконання залишаються pending.
6. Виконати звичайні commit і push з hooks. Через чинні build, release та install owners сформувати й опублікувати новий PATCH release зі збірками поточного scope. Фактично оновити системний runtime зовнішнім інсталятором. Звірити версію, artifact bytes, hashes, ресурси та потрібний сценарій. Source fix або local build не доводить системного оновлення.
7. Після перевіреного системного оновлення актуалізувати Markdown фактичними Delivery та installation результатами. Новий номер версії, build, release і системна інсталяція мають збігатися. Не підмінювати ці докази завершенням коду.
8. За потреби виконати вже дозволену чисту повторну реєстрацію актуальних незавершених задач через підтримуваний admission/reset owner. Спочатку інвентаризувати tasks та operations, зберегти backup і disposition попередніх спроб. Нові identities пов'язати з попередниками. Завершену поза runtime реалізацію не виконувати повторно лише для отримання зеленого статусу. Старі journals, evidence, completed tasks і UNKNOWN зберегти. Відсутній reset owner є repair item, а не дозволом редагувати приватний стан.
9. Обрати наступну одну незавершену задачу й почати новий цикл через оновлений runtime. Якщо потрібна повторна перевірка попереднього сценарію, провести її як явну перевірку доставленої версії. Не видавати її за повторну реалізацію або заднє закриття старої спроби. Attributable користувацьке Runtime acceptance має власні докази.

## Markdown і докази

Вимоги, рішення, findings та blocker status актуалізуються одразу. Для задачі окремо вказувати завершені Source та check результати, фактичний стан runtime-спроби й стан поставки. Після позарантаймного завершення поточної задачі можна зафіксувати саме цей результат. Старий runtime work залишається у своєму фактичному стані до підтримуваного disposition його owner. Не ставити йому runtime-completed заднім числом і не називати Source або Delivery результат користувацьким Runtime acceptance.

Публічні intake/scope/acceptance DTO є вхідними даними підтримуваної операції. Persisted tasks, journals, counters, leases і службовий configuration state створює або змінює їхній operation owner. Ручне редагування цих об’єктів для імітації реєстрації чи завершення не дозволене.

Task-state re-registration обмежена runtime work state. Source, wiki, канонічні продуктові документи, backups та UNKNOWN мають чинний preservation contract. Окремий [дозвіл на clean init repository](../configuration/clean-init-authorization.md) зберігає свої delivered-version, inventory та backup prerequisites.

## Підстави та validation

- Інструкція користувача та уточнення «одна задача на цикл поставки». Вихідний capture — `.agent/work/runtime-task-registration-20261103/runtime-first-cycle-proposal.md`; уточнення — `cycle-policy-update/user-clarification.md` у тому самому work store.
- [Погоджений PATCH build/release та adoption](../configuration/runtime-project-model.md), [implementation plan](../../plans/runtime-project-model.md).
- [Lifecycle Source fallback](../../../instructions/development-lifecycle.md), [правило поточних записів](../documentation/current-state-records.md).
- DeepSeek V4.1 Flash перевіряв вихідний draft: CHANGES, 0 Critical, 2 Important, 5 Minor. Попередні findings враховано; цей verdict не поширюється автоматично на уточнений текст. Користувач призначив Luna для окремої перевірки поточного оновлення. Review та його результати не є proof runtime execution.
