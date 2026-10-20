---
instruction_id: require-verifiable-intermediate-outputs
title: "Вимагай проміжні результати, які можна перевірити"
summary: "Будуй процес так, щоб кожен етап давав артефакт, придатний для перевірки до переходу далі."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Процес складається з кількох етапів із передаванням результату.
conditions_does_not_apply_when: Робота є однією дією без проміжних результатів.
artifact_contract_output_type: stage-artifact
artifact_contract_required_data:
  - етапи
  - артефакти
  - спосіб перевірки
artifact_contract_verified_by: each stage checked before the next
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
status: active
revision: 1
---

# Вимагай проміжні результати, які можна перевірити
Розбий процес на етапи з результатом.
Для кожного етапу назви артефакт.
Зроби артефакт придатним для перевірки.
Вкажи, хто і як перевіряє етап.
Не переходь далі без перевіреного результату.
Не замінюй артефакт описом наміру.
Не приховуй проміжний стан у пам'яті.
Зберігай артефакти разом із задачею.
Познач, які етапи не дали артефакту.
Виправ етап, якщо результат неможливо перевірити.
Не додавай етап без результату.
Використовуй артефакт для наступного етапу.
Повідом про пропущений проміжний результат.
Онови перелік артефактів після зміни процесу.
Заверши лише після перевірки останнього артефакту.
