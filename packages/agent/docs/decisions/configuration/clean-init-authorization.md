---
type: Decision Record
title: Дозвіл на чистий init нашого repository
---
# Дозвіл на чистий init нашого repository

Статус: прямо дозволено користувачем у межах реалізації погодженої продуктової моделі, 2026-11-02. Repository: `C:/project/vida-agent`.

Користувач дозволив після реалізації, temp-перевірки, релізу та зовнішнього оновлення системного runtime виконати чистий init цього repository й налаштувати всі продукти за затвердженою моделлю. Повторне загальне підтвердження цього самого clean-init кроку не потрібне.

Обов’язкові умови виконання:

- Працює кваліфікований delivered runtime потрібної версії, а не неперевірений Source candidate.
- Owner спочатку інвентаризує managed integration/state, активні операції та exact repository bindings; невизначені effects не повторюються.
- До зміни збережені перевірені before-images/backup та план recovery; шляхи залишаються в явно визначеному repository/store scope.
- Source, канонічні B/S/AC, wiki, work records, raw evidence, старі FAIL/UNKNOWN та чужі зміни не стираються під виглядом clean init.
- Чистий init замінює лише відомі managed integration/state об’єкти в межах owner contract; неоднозначний об’єкт потребує рішення користувача або owner reconciliation.
- Невідомі матеріальні значення запитуються у користувача. Уже затверджені значення можуть бути передані явно; мовчазний default не є відповіддю на запит.
- Виконання фіксує реально доставлену версію, backup, результат init/config і перевірку кожного продукту.

Дозвіл не поширюється автоматично на інші репозиторії та не є необмеженим дозволом видалення даних. Він зберігається в продуктовій документації для продовження цього завдання після compaction.

Пов’язано: [погоджена модель](runtime-project-model.md). Поточний operational work record: `.agent/work/runtime-project-model-implementation-20261102/WORK.md` під repository root; цей evidence store не є обов’язковою частиною кожного Source checkout.
