---
instruction_id: delete-code-written-before-test
title: "Видаляй код, написаний до тесту"
summary: "Якщо реалізація з'явилася раніше за тест, видали її й почни цикл заново."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Ти виявив, що код написано до тесту або тест написано після коду."
conditions_does_not_apply_when: Тест існував і падав до появи реалізації.
artifact_contract_output_type: restarted-tdd-cycle
artifact_contract_required_data:
  - видалений код
  - новий тест
  - очікуване падіння
artifact_contract_verified_by: new test fails before the replacement implementation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md
status: active
revision: 1
---

# Видаляй код, написаний до тесту
Перевір, чи існував тест до реалізації.
Якщо код написано першим, видали його.
Не зберігай код як довідку.
Не адаптуй код під час написання тесту.
Не перенось фрагменти коду в нову реалізацію.
Почни з тесту, який описує потрібну поведінку.
Підтверди очікуване падіння.
Напиши найменшу реалізацію із чистого стану.
Не використовуй видалений код як підказку.
Не роби винятку для простої зміни.
Дозволь виняток лише з явного дозволу власника.
Запиши виняток і його межу.
Не вважай ручну перевірку заміною тесту.
Не залишай тест, написаний після коду.
Повтори повний цикл для наступної зміни.
