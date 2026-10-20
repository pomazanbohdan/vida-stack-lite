---
instruction_id: prove-regression-test-detects-bug
title: "Доводь, що регресійний тест ловить помилку"
summary: "Перевір регресійний тест зворотним експериментом: із виправленням він проходить, без нього падає."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "Ти додаєш тест, який має захистити від повторення помилки."
conditions_does_not_apply_when: Тест перевіряє нову поведінку без попереднього збою.
artifact_contract_output_type: regression-proof
artifact_contract_required_data:
  - тест
  - запуск із виправленням
  - запуск без виправлення
  - відновлення
artifact_contract_verified_by: reverse run fails without the fix and passes with it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/verification-before-completion/SKILL.md
status: active
revision: 1
---

# Доводь, що регресійний тест ловить помилку
Напиши тест, який відтворює помилку.
Запусти тест із виправленням і підтверди проходження.
Тимчасово прибери виправлення.
Запусти тест і підтверди очікуване падіння.
Поверни виправлення.
Запусти тест знову й підтверди проходження.
Перевір, що падіння спричинене саме помилкою.
Не вважай тест, який проходить одразу, доказом.
Не залишай тест без перевіреного падіння.
Не змінюй тест під час експерименту.
Зафіксуй команду й результати обох запусків.
Не використовуй ручну перевірку замість зворотного запуску.
Запусти суміжні перевірки після відновлення.
Залиш тест у наборі.
Повідом, якщо зворотний запуск неможливий.
