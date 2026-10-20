---
instruction_id: instrument-component-boundaries
title: Збирай докази на кожній межі компонентів
summary: "Коли збій у багатокомпонентній системі, спершу запиши дані на вході й виході кожної межі."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Збій відбувається в системі з кількома компонентами або межами.
conditions_does_not_apply_when: Збій локалізовано в одному компоненті без передавання даних.
artifact_contract_output_type: boundary-evidence
artifact_contract_required_data:
  - межі
  - дані на вході
  - дані на виході
  - винний компонент
artifact_contract_verified_by: one instrumented run locates the failing boundary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/SKILL.md
status: active
revision: 1
---

# Збирай докази на кожній межі компонентів
Визнач компоненти й межі між ними.
Запиши, які дані входять у кожен компонент.
Запиши, які дані виходять із кожного компонента.
Перевір передавання налаштувань і середовища.
Записуй значення до небезпечної дії.
Запусти сценарій один раз з увімкненими записами.
Порівняй записи й визнач компонент, де дані змінюються неправильно.
Досліджуй лише цей компонент.
Не змінюй код до збору доказів.
Не вмикай записи навмання в усьому проєкті.
Не покладайся на припущення про передавання значення.
Прибирай тимчасові записи після підтвердження причини.
Залиш постійну діагностику лише там, де вона потрібна.
Не вважай один компонент винним без доказу на його межі.
Повідом, якщо межу не вдалося перевірити.
