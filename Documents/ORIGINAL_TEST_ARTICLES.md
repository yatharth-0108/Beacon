# Original Test Articles and Model Answers

These six fictional articles were written for testing the website. They are not reports about real events. Paste an article into the website and compare its result with the answer key below.

Predictions were generated on 2026-09-29 with model `2026-09-28-lr-v1`.

| Article | Style to test | Expected model label | Raw fake score | UI score |
|---|---|---|---:|---:|
| A. Northbridge water repairs | Straight local-service report | REAL | 0.0946 | 9% |
| B. Sensational energy claim | Sensational unsupported claim | FAKE | 0.9695 | 97% |
| C. Bellford school repairs | Neutral municipal report; near threshold | FAKE | 0.5003 | 50% |
| D. Secret moon announcement | Conspiracy-style claim | FAKE | 0.9868 | 99% |
| E. Lakeshore market report | Straight event notice | REAL | 0.2140 | 21% |
| F. Opinion on the transit plan | Opinion/editorial | FAKE | 0.6716 | 67% |

## A. Northbridge Water Repairs

```text
Northbridge residents will see overnight water-service interruptions on three streets next week while crews replace aging valves, the municipal utilities office announced Tuesday. Work is scheduled from 9 p.m. to 5 a.m. on Monday, Wednesday, and Thursday. The office said notices have been delivered to affected homes and that a temporary water station will operate beside the community center. Drivers are asked to follow posted detours. The project is part of the town's annual maintenance program, and officials expect the repaired section to return to normal service before Friday morning.
```

**Model answer:** REAL, fake score `0.0946` (UI: 9%).

## B. Sensational Energy Claim

```text
UNBELIEVABLE: A hidden energy device has reportedly powered an entire neighborhood for months without a single connection to the grid, and officials are scrambling to keep the discovery quiet. Anonymous insiders say the machine uses a frequency that can pull unlimited electricity straight from the air. One blurry photo is being shared as proof, while the company behind the device promises a shocking announcement at midnight. They do not want ordinary people to know how simple it is. Share this story before it disappears.
```

**Model answer:** FAKE, fake score `0.9695` (UI: 97%).

## C. Bellford School Repairs

```text
Bellford School District trustees approved a maintenance package for two elementary schools during Thursday's public meeting. The work includes roof repairs at Cedar Lane School and replacement of the heating controls at West Park School. District staff estimate that both projects can be completed during the summer break, limiting disruption to classes. The approved budget uses funds already set aside for building maintenance. Meeting minutes and contractor bids will be posted on the district website after the agreements are signed.
```

**Model answer:** FAKE, fake score `0.5003` (UI: 50%). The raw score is just above the model's 0.5 decision threshold, so it is labeled FAKE even though the UI rounds the score to 50%.

## D. Secret Moon Announcement

```text
BREAKING: Researchers have discovered a second moon hidden behind the clouds, according to a leaked memo that no major news outlet will discuss. The document supposedly proves that the object changes shape whenever scientists point a telescope at it. A self-described former astronaut says the public will receive undeniable proof within 48 hours, but offers no records or names. The truth is finally coming out, and anyone questioning the story is part of the cover-up. Send this to everyone you know before the evidence is erased.
```

**Model answer:** FAKE, fake score `0.9868` (UI: 99%).

## E. Lakeshore Market Report

```text
Lakeshore's weekly produce market will move indoors for the first two Saturdays in November while the outdoor square is resurfaced, the town events office said. Vendors will use the ground-floor hall at the civic center, with the usual opening time of 8 a.m. The office said signs will be placed at the square entrance and that the temporary location has step-free access. The resurfacing is scheduled to finish before the winter market begins. Organizers said vendor lists and parking information will be updated online.
```

**Model answer:** REAL, fake score `0.2140` (UI: 21%).

## F. Opinion on the Transit Plan

```text
The proposed transit plan is being sold as a bold solution, but its promises deserve more scrutiny. Riders have waited years for reliable service, and another glossy announcement will not fix missed connections or confusing schedules. The city should publish the costs, explain which routes will change, and show how residents can comment before contracts are signed. Supporters may be right that new buses would help, but the public should not be asked to accept a slogan in place of a clear plan. A useful policy begins with details people can check.
```

**Model answer:** FAKE, fake score `0.6716` (UI: 67%).

## Score Note

The label is selected using the raw fake score: `FAKE` at or above `0.5`, otherwise `REAL`. The UI rounds the score to a whole percent, so a displayed 50% can still correspond to either side of the threshold. Scores are uncalibrated model outputs, not probabilities that an article is true or false.
