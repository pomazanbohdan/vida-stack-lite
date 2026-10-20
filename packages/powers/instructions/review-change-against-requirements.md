---
instruction_id: review-change-against-requirements
title: Перевіряй зміну насамперед проти вимог
summary: "Зістав реалізацію з планом і специфікацією, назви пропущене й необґрунтовані відхилення."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Готова зміна потребує оцінки перед приєднанням.
conditions_does_not_apply_when: Зміна не має вимог або плану для порівняння.
artifact_contract_output_type: requirements-review
artifact_contract_required_data:
  - межі зміни
  - вимоги
  - пропущене
  - відхилення
artifact_contract_verified_by: each requirement mapped to the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/code-reviewer.md
status: active
revision: 1
---

# Перевіряй зміну насамперед проти вимог
Визнач точні межі зміни.
Прочитай план і специфікацію.
Перевір, чи все заплановане присутнє.
Перевір, чи немає зайвої роботи поза вимогами.
Перевір, чи відхилення обґрунтовані.
Перевір, чи виконані глобальні обмеження.
Перевір, чи кожна вимога має доказ.
Познач вимоги, які неможливо перевірити за дифом.
Не оцінюй код поза межами зміни.
Не вважай відсутність у плані дозволом на довільну поведінку.
Не підмінюй перевірку вимог перевіркою стилю.
Не приймай часткову відповідність за повну.
Цитуй вимогу й місце реалізації.
Познач розбіжність із планом.
Дай окремий висновок про відповідність.
