---
instruction_id: present-integration-options
title: Показуй варіанти завершення роботи власнику
summary: Після зелених перевірок покажи власнику погоджений набір варіантів інтеграції й дочекайся його вибору.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Завершена зміна готова до інтеграції або закриття.
conditions_does_not_apply_when: Робота ще не завершена або інтеграція вже відбулася й перевірена.
artifact_contract_output_type: integration-options
artifact_contract_required_data:
  - результат перевірок
  - базова гілка
  - варіанти
  - вибір власника
artifact_contract_verified_by: full test suite before and after integration
compatibility_excludes: []
compatibility_requires:
  - integrate-completed-work
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 2
---

# Показуй варіанти завершення роботи власнику
Перевірки перед меню бери з integrate-completed-work.
Зупини завершення, якщо перевірки мають невдачі.
Визнач, чи робота в звичайному дереві, окремій гілці чи відокремленому стані.
Встанови базову гілку з плану або історії.
Уточни базову гілку, якщо її не можна визначити надійно.
Покажи варіанти: злити локально, опублікувати й створити запит, залишити як є.
Для відокремленого стану покажи лише доступні варіанти.
Не додавай варіант видалення роботи до меню.
Дочекайся вибору варіанта завершення.
Не припускай бажаний варіант із контексту.
Виконуй лише обраний варіант.
Не зливай у непогоджену гілку.
Не вважай завершення задачі дозволом на злиття.
Якщо перевірки після злиття падають, зупини очищення.
Повідом результат обраного варіанта.
