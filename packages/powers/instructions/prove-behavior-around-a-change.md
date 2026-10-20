---
instruction_id: prove-behavior-around-a-change
title: Доведи поведінку навколо зміни
summary: "Зафіксуй спостережувану поведінку до зміни й доведи, що після неї збережене саме те, що потрібно."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "Ти виправляєш наявну поведінку або перевіряєш, чи чуже виправлення справді працює."
conditions_does_not_apply_when: Поведінки ще не існує й потрібен новий сценарій з нуля.
artifact_contract_output_type: behavior-proof
artifact_contract_required_data:
  - очікувана поведінка
  - точка спостереження
  - результат до і після
  - автоматична перевірка
artifact_contract_verified_by: the same scenario executed before and after the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/correct/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/references/verify-existing-fix.md
status: active
revision: 1
---

# Доведи поведінку навколо зміни
Опиши поведінку, яка має зберегтися після зміни.
Знайди спостережувану точку, де цю поведінку видно.
Зафіксуй поточний результат до редагування.
Зміни код найменшим способом.
Повтори той самий спостережуваний сценарій.
Порівняй результат із зафіксованим.
Перевір, що зміна не зачепила сусідній сценарій.
Додай автоматичну перевірку, яка фіксує нову поведінку.
Переконайся, що перевірка падає без зміни.
Відкинь тимчасові логи й налагоджувальні виводи.
Запиши, які припущення про поведінку підтвердилися.
Назви сценарій, який залишився неперевіреним.
Не вважай успішний запуск доказом суміжних випадків.
Віддай звіт: що змінилося, що збереглося, чим доведено.
