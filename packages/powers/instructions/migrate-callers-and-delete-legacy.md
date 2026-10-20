---
instruction_id: migrate-callers-and-delete-legacy
title: Переноси виклики й видаляй старий інтерфейс
summary: "Переводь усі місця виклику на новий інтерфейс і видаляй старий, щоб не тримати дві паралельні правди."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: "Ти замінюєш функцію, формат або інтерфейс, який уже має виклики."
conditions_does_not_apply_when: Старий інтерфейс лишається публічним контрактом для зовнішніх споживачів.
artifact_contract_output_type: migration
artifact_contract_required_data:
  - місця виклику
  - перенесені виклики
  - видалений інтерфейс
  - зовнішні споживачі
artifact_contract_verified_by: "the project's checks passing after the old interface is removed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md
status: active
revision: 1
---

# Переноси виклики й видаляй старий інтерфейс
Знайди всі місця, де використовують старий інтерфейс.
Перенеси виклики на новий інтерфейс по одному.
Перевіряй поведінку після кожного перенесення.
Не залишай паралельні інтерфейси без причини.
Познач виклики, які неможливо перенести одразу.
Для кожного такого виклику назви причину й власника.
Збережи тимчасову сумісність лише з датою видалення.
Перевір, що новий інтерфейс покриває всі варіанти старого.
Порівняй поведінку старого й нового шляху на одному прикладі.
Видали старий інтерфейс, щойно викликів не залишилося.
Прибери сумісні обгортки й застарілі перевірки.
Онови документацію й приклади.
Перевір, що видалення не зламало зовнішніх споживачів.
Віддай зміну з видаленим старим шляхом і списком перенесених викликів.
