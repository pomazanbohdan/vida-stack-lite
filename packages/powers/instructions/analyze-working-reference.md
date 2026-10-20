---
instruction_id: analyze-working-reference
title: Порівнюй зламаний шлях зі справним
summary: "Знайди робочий аналог, прочитай його повністю й випиши всі відмінності від зламаного."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "Є схожий робочий шлях або приклад, з яким можна порівняти збій."
conditions_does_not_apply_when: Аналога немає і збій досліджується ізольовано.
artifact_contract_output_type: comparison-evidence
artifact_contract_required_data:
  - робочий приклад
  - перелік відмінностей
  - перевірка
artifact_contract_verified_by: difference list tested one item at a time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/SKILL.md
status: active
revision: 1
---

# Порівнюй зламаний шлях зі справним
Знайди робочий приклад тієї самої поведінки.
Прочитай робочий приклад повністю.
Визнач його залежності, налаштування й припущення.
Порівняй робочий і зламаний шлях.
Випиши кожну відмінність.
Не відкидай відмінність як незначущу без перевірки.
Не вважай документацію заміною повного читання прикладу.
Змінюй одну відмінність за раз.
Перевір, чи відтворюється збій після наближення до робочого прикладу.
Не копіюй робочий приклад без розуміння.
Не адаптуй приклад частково, якщо різниця не встановлена.
Закріпи знайдену відмінність перевіркою.
Зафіксуй, що саме відрізняється.
Перевір суміжний шлях після виправлення.
Повернися до пошуку, якщо різниця не пояснює збій.
