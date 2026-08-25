# snack20-v1 Automated Ground Truth Stress Test

**Provisionally Stable · Automatically Stress-tested · Pending Human Validation**

This report measures agreement and instability in stored AI observations. It does not verify ground truth and does not replace human adjudication.

- Stored observations only; API requests: 0
- Records: 160
- STABLE: 81
- QUESTIONABLE: 34
- UNRESOLVED: 45
- Stable coverage: 50.6%

## Model accuracy

| Model | All GT | Stable only |
|---|---:|---:|
| gpt-5.6-luna | 66.3% | 98.8% |
| gpt-5.6-terra | 63.7% | 100.0% |

## Coverage / accuracy trade-off

| Score threshold | Coverage | Mean GT hit rate |
|---:|---:|---:|
| 0.5 | 90.6% | 71.6% |
| 0.6 | 81.9% | 76.0% |
| 0.7 | 70.6% | 83.0% |
| 0.8 | 56.3% | 99.3% |
| 0.9 | 53.8% | 100.0% |

## Attribute summary

| Attribute | Tier | Stable | Questionable | Unresolved | Stable coverage | Stable accuracy | Suitability |
|---|:---:|---:|---:|---:|---:|---:|---|
| spiciness | B | 13 | 7 | 0 | 65.0% | 98.7% | HUMAN_REVIEW_RECOMMENDED |
| fried | A | 20 | 0 | 0 | 100.0% | 99.2% | AUTOMATION_READY |
| broth | A | 15 | 3 | 2 | 75.0% | 97.8% | AUTOMATION_READY |
| hearty | C | 0 | 5 | 15 | 0.0% | 0.0% | NOT_READY |
| sweetness | C | 0 | 5 | 15 | 0.0% | 0.0% | NOT_READY |
| cheesy | A | 18 | 1 | 1 | 90.0% | 100.0% | AUTOMATION_READY |
| chewy | C | 0 | 8 | 12 | 0.0% | 0.0% | NOT_READY |
| crispy | B | 15 | 5 | 0 | 75.0% | 100.0% | HUMAN_REVIEW_RECOMMENDED |

## Consensus/GT conflicts (27)

- tteokbokki.hearty: GT 0.58–0.82, AI median 0.5, hit 0.0%
- spicy-tteokbokki.hearty: GT 0.58–0.82, AI median 0.5, hit 16.7%
- rose-tteokbokki.hearty: GT 0.68–0.92, AI median 0.5, hit 0.0%
- cheese-tteokbokki.hearty: GT 0.73–0.97, AI median 0.5, hit 16.7%
- gimbap.hearty: GT 0.63–0.87, AI median 0.5, hit 16.7%
- gimbap.chewy: GT 0.23–0.47, AI median 0.5, hit 0.0%
- gimbap.crispy: GT 0.03–0.27, AI median 0, hit 0.0%
- tuna-gimbap.chewy: GT 0.23–0.47, AI median 0.5, hit 0.0%
- tuna-gimbap.crispy: GT 0.03–0.27, AI median 0, hit 0.0%
- cheese-gimbap.hearty: GT 0.73–0.97, AI median 0.5, hit 16.7%
- cheese-gimbap.chewy: GT 0.23–0.47, AI median 0.5, hit 0.0%
- cheese-gimbap.crispy: GT 0.03–0.27, AI median 0, hit 0.0%
- sundae.hearty: GT 0.63–0.87, AI median 0.5, hit 16.7%
- fried-set.sweetness: GT 0.03–0.27, AI median 0, hit 0.0%
- gimmari.sweetness: GT 0.03–0.27, AI median 0, hit 0.0%
- vegetable-fried.sweetness: GT 0.13–0.37, AI median 0, hit 0.0%
- fishcake.sweetness: GT 0.08–0.32, AI median 0, hit 16.7%
- fishcake.chewy: GT 0.53–0.77, AI median 0.5, hit 0.0%
- fishcake-soup.sweetness: GT 0.08–0.32, AI median 0, hit 16.7%
- fishcake-soup.chewy: GT 0.53–0.77, AI median 0.5, hit 0.0%
- udon.sweetness: GT 0.03–0.27, AI median 0, hit 16.7%
- jjolmyeon.hearty: GT 0.63–0.87, AI median 0.5, hit 0.0%
- jjolmyeon.crispy: GT 0.03–0.27, AI median 0, hit 0.0%
- fried-dumplings.hearty: GT 0.53–0.77, AI median 0.5, hit 0.0%
- fried-dumplings.chewy: GT 0.18–0.42, AI median 0.5, hit 16.7%
- rice-ball.sweetness: GT 0.03–0.27, AI median 0, hit 0.0%
- rice-ball.chewy: GT 0.18–0.42, AI median 0.5, hit 16.7%

## Model disagreement (10)

- tteokbokki.broth: difference 0.5
- spicy-tteokbokki.broth: difference 0.5
- spicy-tteokbokki.sweetness: difference 0.5
- rose-tteokbokki.broth: difference 0.5
- rose-tteokbokki.cheesy: difference 0.5
- cheese-tteokbokki.sweetness: difference 0.5
- rabokki.sweetness: difference 0.5
- tuna-gimbap.sweetness: difference 0.5
- squid-fried.hearty: difference 0.5
- jjolmyeon.sweetness: difference 0.5

## Input sensitivity (6)

- gimbap.sweetness: robustness 0.5
- tuna-gimbap.sweetness: robustness 0.5
- cheese-gimbap.sweetness: robustness 0.5
- cheese-gimbap.cheesy: robustness 0.5
- ramyeon.hearty: robustness 0.5
- fried-dumplings.sweetness: robustness 0.5

## Description sensitivity (25)

- tteokbokki.broth
- spicy-tteokbokki.broth
- spicy-tteokbokki.sweetness
- rose-tteokbokki.spiciness
- rose-tteokbokki.broth
- rose-tteokbokki.sweetness
- rose-tteokbokki.cheesy
- cheese-tteokbokki.broth
- cheese-tteokbokki.sweetness
- rabokki.sweetness
- gimbap.sweetness
- tuna-gimbap.hearty
- tuna-gimbap.sweetness
- cheese-gimbap.sweetness
- cheese-gimbap.cheesy
- gimmari.hearty
- squid-fried.hearty
- vegetable-fried.hearty
- fishcake.broth
- ramyeon.hearty
- udon.chewy
- jjolmyeon.sweetness
- fried-dumplings.sweetness
- fried-dumplings.crispy
- rice-ball.hearty

## Human review handoff

79 QUESTIONABLE/UNRESOLVED records are exported in JSON for the existing adjudication queue.
