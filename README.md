# Prosper Health Assessment Scheduler

Finds the assessment times a patient can book: two 90-minute sessions with the same in-network psychologist, on different days, no more than 7 days apart. Built as plain TypeScript functions with Jest tests and mocked data (no server or database), per the [take-home instructions](INSTRUCTIONS.md).

## Running it

```bash
npm install
npm test        # Jest test suite
npm run dev     # prints Task 1, 2 and 3 results for a sample patient
```

The mock data is from August–September 2024, so the dev script and tests use a fixed `now` of `2024-08-19T00:00Z`. To switch the sample patient, change the import at the top of `src/index.ts`.

## Project structure

```
src/
  scheduling/
    assessments.ts    entry points and the shared per-clinician pipeline
    optimization.ts   Task 2: per-day slot optimization
    capacity.ts       Task 3: existing appointments and daily/weekly caps
    dates.ts          UTC day/week helpers
    types.ts          output types
  mock-data/          mock clinicians (one per rule being demonstrated) and factories
  starter-code/       provided types and data, unchanged apart from a second mock patient
  index.ts            dev script
```

## Solution overview

There is one entry point per task. Each builds on the previous one:

| Task | Function                                                    | Adds                                                                                      |
| ---- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | `findAssessmentOptions(patient, clinicians, now?)`          | Every valid session pair from eligible psychologists                                      |
| 2    | `findOptimizedAssessmentOptions(patient, clinicians, now?)` | Hides slots that would reduce how many appointments a day can hold                        |
| 3    | `findAvailableAssessmentOptions(patient, clinicians, now?)` | Respects existing appointments and daily/weekly caps. **This is the patient-facing one.** |

The Task 2 helper requested in the instructions is `maximizeAppointmentDates(dates, durationMinutes)` in `optimization.ts`.

All three share one pipeline that runs top to bottom for each clinician:

1. **Eligible clinician:** a psychologist licensed in the patient's state who accepts their insurance.
2. **Eligible slots:** 90 minutes long and starting after `now`, sorted by time.
3. **Capacity (Task 3):** remove slots that overlap an existing appointment or fall on a day or week with no capacity left.
4. **Optimize (Task 2):** within each day, keep only slots that don't cost the day an appointment.
5. **Pair:** match each first session with every valid second session.

Results are grouped by clinician, then by first session:

```ts
{ clinician: { id, firstName, lastName },
  options: [{ firstSession, secondSessionOptions: [...] }, ...] }[]
```

Clinicians with no options are left out. Clinicians keep their input order.

## How each task works

**Task 1: pairing.** Slots are sorted, so for each first session the code walks forward and keeps slots 1–7 calendar days later. It stops at the first slot more than 7 days out, since every slot after it is too far away too. "7 days" means calendar days, not 168 hours: the instructions' example pairs `08-21 12:00` with `08-28 12:15`.

**Task 2: keeping each day's maximum.** A slot is kept if booking it still lets the day reach its maximum number of appointments:

```
(most that fit before it) + 1 + (most that fit after it) >= the day's target
```

Two greedy passes give those counts in linear time:

- The _earliest_ schedule packs appointments as early as possible. The most that fit before a slot is how many of them end by its start.
- The _latest_ schedule packs them as late as possible. The most that fit after a slot is how many of them start after it ends.

For example, Dr. Doe on 2024-09-02 fits 5 appointments. Booking 12:45 leaves 0 before + 1 + 3 after = 4, so 12:45 is hidden.

This keeps every slot that belongs to _some_ maximum schedule, not just one fixed schedule, so patients see more choices (see trade-offs below).

**Task 3: capacity.**

- **Conflicts:** slots that overlap an existing appointment are removed. Back-to-back is fine. An appointment's length comes from its type.
- **Full days and weeks:** slots on a day or week that has reached its cap are removed.
- **Optimizer target:** each day's target becomes `min(remaining daily cap, remaining weekly cap, what physically fits)`. There's no point hiding slots to protect capacity the clinician can't use. Dr. Doe's daily cap is 2, so almost all of her slots are offered, even though 5 fit on some days.
- **Same-week pairs:** if both sessions fall in the same week, that week needs 2 bookings left.

Capacity runs before optimizing, so the optimizer only sees bookable slots and knows each day's real limit.

## Assumptions

Each assumption is followed by the reasoning behind it.

- **Time:**
  - One timezone (UTC) for everything, and days are UTC calendar days.
    - Handling it properly means converting to clinician and patient local time. I left that out to keep the focus on the scheduling rules (see Future enhancements).
  - A "week" is a typical U.S. calendar/work week: Monday–Sunday.
    - That's most likely how clinicians think about a weekly cap. Changing the week start is a one-line change in `dates.ts`.
  - No availability or appointment crosses midnight.
    - Clinicians are unlikely to schedule appointments past midnight, so every appointment belongs to exactly one day.
- **What's bookable:**
  - Only slots starting strictly after `now` are offered. There's no minimum lead time and no buffer between appointments.
    - The instructions don't ask for either. A real system would likely need a configurable lead time, which would be a small addition to the slot filter.
  - Eligibility requires clinician type `PSYCHOLOGIST`, and slots must be exactly 90 minutes long.
    - The instructions say assessments are with psychologists and last 90 minutes. Checking both guards against a mislabeled clinician or slot.
- **Which appointments count:**
  - `UPCOMING`, `OCCURRED`, `NO_SHOW` and `LATE_CANCELLATION` count toward caps and block time. `CANCELLED` and `RE_SCHEDULED` don't.
    - The first four use up (or used up) the clinician's time. The last two free it.
  - Edge case: a future late cancellation whose time was reopened as a slot stays hidden.
    - This keeps one rule for every counted appointment. Handling it would mean counting late cancellations toward caps without blocking their time.
  - Caps count every appointment type. Appointments earlier in the current week count toward its weekly cap.
    - Caps protect the clinician's total workload, whatever the appointment type or whether it has already happened.
  - A clinician's `appointments` are their own.
    - The data nests them under the clinician, so they aren't filtered by `clinicianId` again.
- **Bad data:** a clinician already over a cap is treated as having 0 remaining.
  - Offering nothing is safer than overbooking them further.

## Key decisions and trade-offs

- **Every maximum schedule, not one schedule (Task 2).**
  - "Remove slots that reduce the day's maximum" could also mean "offer one fixed best schedule". I chose the first reading because it gives patients more choice.
  - Cost: for Dr. Doe, it offers 246 of 458 slots (9,999 pairs), versus 109 slots (2,067 pairs) for one greedy schedule.
- **Separate entry points, one pipeline.**
  - Tasks 1 and 2 stay runnable on their own, so the instructions' examples remain reproducible.
  - The pipeline is a single function with `optimize` and `applyCapacity` flags. Each task's steps show up as a visible `if` block rather than being spread across callbacks.
- **Readability over cleverness.**
  - Plain loops are used where input sizes are bounded.
  - Task 2 uses the "before + 1 + after" rule because it states the business rule directly. It works the same with or without caps.
- **Testable by design.** `now` is a parameter that defaults to the current time, and every function is pure.
- **Patient-facing output.** Only clinician id and name are returned, not the full record with every appointment and slot.

## Testing

Unit tests cover each rule's edge cases:

- the 7-calendar-day boundary
- back-to-back appointments
- week boundaries
- which statuses count
- caps above and below what physically fits

End-to-end tests run the instructions' examples, plus mock clinicians that each demonstrate one rule:

| Clinician                  | What it shows                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Dr. Jane Doe               | The provided slots (37,165 Task 1 pairs)                                                      |
| Jon Snow                   | The instructions' 6-slot example; in Task 3, a weekly cap that only allows pairs across weeks |
| Arya Stark                 | Task 2 removals; in Task 3, overlapping and back-to-back appointments                         |
| Ron Weasley, Percy Jackson | Task 2 removals; in Task 3, daily caps that let every slot through again                      |
| Jean Grey                  | In Task 3, a fully booked day is removed                                                      |
| Peter Parker               | In Task 3, a fully booked week is removed                                                     |
| Others                     | Excluded for state, insurance or clinician type                                               |

## Performance

After the eligibility check, all work depends only on one clinician's own slots and appointments. That makes the per-clinician work straightforward to cache, run in parallel, or recompute when a single clinician's data changes.

Cost per clinician:

| Step                              | Cost                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| Filtering slots and counting caps | Linear                                                       |
| Task 2 optimizer                  | Linear per day                                               |
| Pairing                           | Proportional to the pairs produced, thanks to the early stop |

Task 3 first drops appointments from before the current week, so years of history don't slow it down.

Benchmark: 1,000 clinicians, each with Dr. Doe's 458 slots (and, for Task 3, 2,000+ appointments each). Each task finishes in **~0.2–0.4 s**.

**The real limit at scale is output size, not CPU.** Dr. Doe alone produces 37,165 Task 1 pairs, so hundreds of clinicians mean millions of pairs. That's the main reason for the API changes below.

## Future enhancements

**Product**

- Clinician and patient timezones. Days, weeks and the "past midnight" assumption all depend on this.
- A minimum booking lead time and buffers between appointments, if clinicians want them.
- Therapy intakes: a single 60-minute session through the same pipeline.
- Ranking clinicians, for example by soonest availability or patient preferences.
- Coverage rules beyond "accepts this payer in this state", such as payer or age exceptions in specific states.

**Scale**

- A two-step API: return first-session options, then fetch second sessions once one is picked. This is a much smaller payload and fewer choices at once for patients.
- A search horizon (for example, the next 4 weeks) and pagination over ranked clinicians.
- Precompute availability per clinician and refresh it on booking, cancellation or schedule changes. Cache results per (state, payer, service), since many patients share the same answer.
- Find eligible clinicians with an indexed database query instead of scanning every clinician.
- Booking safety: re-check availability and caps inside a transaction, book both sessions together, and hold slots briefly during checkout to prevent double-booking.
