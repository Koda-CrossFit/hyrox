# Class-time survey: member vs non-member graphics

Re-run when more survey responses land.

1. Export the current member list from Zen Planner (one full name per line) to
   `survey-results/members.txt` (that folder is git-ignored — never commit member names).
2. Pull the responses: `curl -sL "<exec URL>?action=survey0913Roster&key=<admin key>" > survey-results/survey-roster.json`
3. `node tools/survey/match.js survey-results` — classifies each respondent by name
   (exact, first+last, nickname, initial, first-name-only), de-dupes people who submitted
   twice, tallies both groups, writes `results.json` and prints a review list. Fix any
   mis-matches in `survey-results/overrides.json` (`{"row:46": {"as": "Andy Angstrom", "group": "member"}}`).
4. `node tools/survey/render.js survey-results survey-results` — renders
   `Hyrox Class Times - Members.png/.jpg` and `... - Non-Members.png/.jpg` (1200px wide @2x)
   with Puppeteer from `hyrox_pdf/node_modules`.
5. `node tools/survey/mwf.js survey-results` — Mon/Wed/Fri vs Tue/Thu breakdown per time slot for members, non-members and everyone (people reached in each block, people who want ALL days of the block, average checks per class day). Writes `mwf.json`.
