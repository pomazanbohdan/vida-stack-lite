---
type: Research
title: Windows safe publication — накопичені native витрати
---
# Windows safe publication

Статус: PARTIAL. Task2 native trace прив'язано до isolated t3-458292d7, Source store SHA256 `327a98d7a821c7ed32efba71376c3fd33933282214a2ea3f19416aa2fba2747f`; reusable owner `safe-repository-access.ts` не змінювався. Raw receipt і boundary logs залишаються у Task2 work evidence. Нові failed roots retained/UNKNOWN, без inspection/removal.

## Встановлено

- Один instrumented create завершився test timeout із native exit1, без signal/spawn error. Journal atomic write завершився; counter CAS terminal не отриманий.
- Counter CAS почався приблизно через5.9с після fixture creation, уже після5с budget. До нього lock acquisition витратив1.420с, owner write1.245с, counter create1.311с, journal write1.895с. Ці attributable phase durations не є throughput/production latency qualification.
- Windows store lock `.local-work-item-store-lock.lock` та counter CAS lock `.local-work-item-counter.v1.json.cas.lock.lock` різні. Self-contention не встановлена. Відсутній terminal CAS не доводить зависання CAS: budget уже минув раніше.
- [Safe owner](../../../src/config/safe-repository-access.ts) викликає `checkCreateCapability` через `loadWindowsNativeBinding`; loader перевіряє current native method/module identities і повторно рахує `fsSafePackageTreeHash`. Atomic create має кілька capability checks. Ці перевірки захищають current package bytes; прибирати їх або підміняти stale cache не дозволено.

## Direct script profile

- Один direct script із pinned Bun1.4.4 завершивсяexit0, signal/spawn error null; afterimage збігся. Case wall975.709мс, writeExclusiveAtomicAsync971.456мс, logical deadline5000мс; module import407.874мс спостерігався окремо до case. Process wall2036.613мс включає profiler/shutdown і не є startup measurement.
- Nonempty profile містить172 samples за1.39с. Target stack: atomic write → capability check → native binding loader → fresh package-tree hash → pinned file read → parent checks → lstatSync. Whole-profile lstatSync self time929.8мс/66.7%; package attestation aggregated1.29с/93% включає startup. Async totals перекриваються; sampled CPU не вимірює wall I/O, overhead не оцінений, unprofiled comparison відсутній.
- Safe owner SHA256 `bd25da345852f9586b45601869c846e4cffb2d1068c18dad68b426afb2299f8c`;311 dependency files matched pinned tree SHA256 `a4fe198d2f47d518daa2ff6e43fb9280faffafc4e788bf96c11eabf3c0507d35`. JSON CPU profile SHA256 `6278ecfdc5acedf60ed164bfb57a31c18a4e5d8a632df85429519d8554e84deb`; raw receipt/profile у isolated Task2 `evidence/profileOneAtomicCreate/`.
- Фактичний supported route — direct script із Bun CPU flags. Bun-test routes не створили profile; їхні результати не підміняють цей script diagnostic. Source, dependencies і guards не змінені; новий root retained без inspection/removal.
- Root повторно перевірив raw profiles: обидва SHA256 збігаються; execution receipt SHA256 `59559435971bed0579b5bab3d16115681c2ffde08f2e82dc606454dabd6b5a7e`. Збережені evidence files у worktree відрізняються від заборонених retained temp fixture roots; їх читання не є повторним виконанням або fixture inspection.
- Pinned [native architecture](https://github.com/openclaw/fs-safe/blob/v0.26.2/docs/native.md#the-beneath-model) описує handle-relative Windows calls та reparse rejection; [security model](https://github.com/openclaw/fs-safe/blob/v0.26.2/docs/security-model.md#containment-guarantees-by-platform) залишає best-effort containment. Read-only research не довело guard-equivalent deletion/reuse; native Rust implementation локально відсутня. Відсутність локального source не доводить його відсутності upstream.

## Наступна перевірка та межа

Owner: Agent filesystem owner; Root визначає план і інтегрує результат. Fresh package-byte hashing та method/module identity guards залишаються обов'язковими. Guard-equivalent optimization не доведено й вона не є поточним Task2 prerequisite: demonstrated store bug виправляється без filesystem rewrite. Native openBeneath не вважається повним доказом component containment без перевірки implementation. Будь-яка майбутня guard optimization потребує окремого proof/review. Не використовувати stale hash cache, timeout increase або skip для GREEN. Profile не встановлює Task2, numerical, release чи Runtime acceptance.

Candidate helper задає default5000мс. Independent plan review дозволив окремий bounded diagnostic із чинними guards; він не змінює test acceptance. Фактичні native результати наведено нижче. Після completed create понад5с Root підготував окремий план named integration-case budgets зі збереженням5000мс defaults; його review pending. Попередні timeout/UNKNOWN не змінюються.

## Fresh bounded create

Після independent plan review та Root corrections один diagnostic із30с classification/35с process ceiling отримав terminal exit2, closeObserved:true, timedOut:false, signal/childError:null. Create повернув needs_reconciliation за4993.7708мс: publication intent transition is uncertain. Raw boundary показав stale expected content hash під час journal reserved→publishing CAS. Це semantic failure, а не timeout цього запуску. Новий root retained; жодного повторного create або post-failure fixture inspection. Receipt: `.agent/work/runtime-project-model-implementation-20261102/native-create-30s-evidence/receipt.json`.

Source-bound причина в candidate store327a98d7…: journal writer вставляє policy_digest перед owner_digest; parseJournal повертає Zod shape з owner_digest перед policy_digest; saveJournal відновлює CAS preimage через JSON serialization parsed object. Семантично рівний JSON не має тих самих bytes. Repair owner — store journal transition: actual captured raw preimage через кожну transition зі строгим native CAS. SafeRepositoryAccess залишається незмінним; correction та окремий native after-check наведено нижче.

Виправлення підготовлено у store SHA256 `eed2ae4375228c1c137dc6628de77896ece1418443315b491e7a2af20e956179`: saveJournal приймає actual raw preimage та повертає published text; recoverJournal переносить його через transitions. Root реконструював попередні bytes лише з цих hunks і отримав точний327a98d7… hash; інших Source edits немає. Pinned formatter/typecheck worker пройшли; independent corrective review ще pending.

Окремо bound fresh native after-check отримав exit0, closeObserved:true, без timeout/signal/childError; create applied за5247.0734мс, case5260.6117мс. Counter/journal/record/index hashes і public UUID lookup afterimage збіглися. Новий root retained без removal. Receipt `.agent/work/runtime-project-model-implementation-20261102/native-create-after-30s-evidence/receipt.json`; попередній failed root не використовувався. Це native diagnostic конкретного create/CAS correction, не Bun suite, recovery matrix,5с performance, numerical/release чи Runtime acceptance.
