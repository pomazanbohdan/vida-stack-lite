---
instruction_id: converge-on-target-architecture
title: Рухайся до цільової архітектури
summary: "Перебудовуй систему кроками, кожен з яких залишає її робочою й наближає до описаного цільового стану."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Поточна структура заважає змінам і потребує поетапної перебудови.
conditions_does_not_apply_when: Достатньо локального виправлення без зміни структури.
artifact_contract_output_type: convergence-plan
artifact_contract_required_data:
  - цільовий стан
  - поточний стан
  - кроки
  - тимчасові компроміси
artifact_contract_verified_by: "the project's checks passing after every step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/refactoring.md
status: active
revision: 1
---

# Рухайся до цільової архітектури
Опиши стан, до якого має прийти система.
Порівняй поточний стан із цільовим.
Розбий різницю на кроки, кожен з яких залишає систему робочою.
Почни з кроку, який зменшує найбільше безладу.
Оціни кожен крок так, щоб його можна було відкотити.
Познач місця, де стара й нова структура тимчасово співіснують.
Видали тимчасову сумісність, щойно вона перестала бути потрібною.
Не роби велику перебудову без проміжних перевірок.
Познач тимчасові компроміси й умову їх прибирання.
Не додавай новий шар, який потім доведеться зносити.
Оновлюй цільовий опис, якщо змінилася вимога.
Перевіряй після кожного кроку, що поведінка не змінилася.
Запиши, на якому кроці система зараз.
Віддай план переходу й поточну позицію.
