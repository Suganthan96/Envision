/**
 * How EnVision works, for a connected agent. Served by the get_app_guide tool
 * and the envision://guide resource. Keep it in step with the app when pages
 * or workflows change.
 */
export const APP_GUIDE = `# EnVision: how the app works

EnVision is LICET's interdepartmental prototype contest. Student teams pick a
problem domain, get a mentor, build a project, and present it in judging rounds
that faculty mark. Site: envisionlicet.vercel.app

## Who signs in, and what they see
| Role | Login ID | Portal | What they do |
|---|---|---|---|
| Team ("member") | team number, e.g. 4 | /member | Edit team name and roster, pick a domain, write the project, see their mentor, timeline, guidelines, leaderboard |
| Mentor | 12-digit reg. no. starting 3111 | /mentor | Edit profile, pick domains, see their (max 2) teams, timeline, guidelines, leaderboard |
| Faculty / Jury | any, e.g. vjsharmila | /evaluate | Mark the teams in their judging venues against the live round's criteria |
| Admin | e.g. envisionlicet | /admin | Everything below |

New team and mentor accounts start with password licet@123 and must change it on
first sign-in. Faculty and jury don't have to.
Public pages: /showcase (every team's project) and /mentors, with a year selector
for earlier years.

## Programme years
The programme runs in years (editions) like 2026-27. Each year keeps its own
teams, rosters, projects, mentors, allocations, rounds, scores, rooms, timeline,
guidelines and settings side by side; nothing is ever deleted.
- One year is *current*: the one teams, mentors and evaluators sign in to.
- Every tool works on the current year unless you pass year: "2026-27".
- list_years shows each year's counts. start_year creates the next year (copying
  themes, round templates, rooms, timeline and guidelines if wanted, and creating
  team and mentor logins). set_current_year switches everyone over; last year's
  logins then stop working, but its data stays and admins can still open it.
- Admin accounts work in every year.

## Admin portal: pages, and the tools that do the same job
- Home (/admin): the dashboard. get_overview; preview_leaderboard matches its Leaderboard panel
- Users (/admin/users): list_users, add_user, update_user, reset_password, set_user_hidden, delete_users
- Programme years (/admin/years, and the Year dropdown on every admin page): list_years, start_year, set_current_year
- User manual (/admin/manual, and the help search on every admin page): search_manual
- Domain Selection (/admin/domain-selection): list_domain_selections, get_settings / set_setting (open domain viewing / picking)
- Mentor Allocation (/admin/matching): list_mentors, assign_mentor, unassign_mentor
- Timeline (/admin/timeline): get_timeline, set_timeline, set_feedback_link
- Domains (/admin/domains): list_domains, add_domain, update_domain, delete_domain, set_domain_capacity
- Mentor / Team Profiles: list_teams, get_team, list_mentors
- Guidelines (/admin/guidelines): get_guideline, set_guideline
- Judging (/admin/judging), one hub with these pages:
  - Submissions (/admin/judging/submissions): list_teams, set_judging_assignment (team overrides)
  - Venues (/admin/judging/venues): get_judging_schedule, manage_judging_venue, set_judging_assignment
  - Documents (/admin/judging/documents): set_judging_settings (headings, faculty timing; the PDFs and Excel are downloaded in the browser)
  - Rounds (/admin/judging/rounds): list_rounds, save_round, activate_round, delete_round
  - Faculty & Jury (/admin/judging/evaluators): list_evaluators, set_evaluator_scope
  - Scores (/admin/judging/scores): get_round_scores, set_team_score, set_round_tiebreak, publish_round
  - Evaluator Sheets (/admin/judging/sheets): set_evaluator_sheet
- Leaderboard (what teams and mentors see): get_leaderboard; preview_leaderboard for any mix of rounds

## Core ideas
**Domains (themes).** Ten problem areas such as "Smart Agriculture & Food
Security". Each team picks one; each mentor picks some. Capacities cap how many
can pick each domain. Two switches per role control picking: "view" opens the
Domains page, "select" allows choosing.

**Mentors.** Each team has at most one mentor, and each mentor at most two
teams. Assigning a mentor also moves the team into the mentor's lab venue.

**Two kinds of venue. Don't mix them up.**
- *Lab venues* (manage_lab_venue): where teams sit and work during the programme.
- *Judging venues* (manage_judging_venue): rooms where teams present. Each has a
  matching *waiting* venue kind, where teams wait before presenting.
  Assignment is layered: a team's own venue wins, then its mentor's, then its
  domain's. Setting a mentor's venue places both their teams.

**Judging rounds.** A round is a named rubric (criteria, each with a max mark),
e.g. "PoC presentation": Problem Statement/Solution 10, Feasibility 15, Market
Reliability 15, Presentation Skills 10.
- Exactly one round is *live*. Students see its rubric, the judging PDFs print
  it, and every evaluator marks against it.
- Each round keeps its own scores, so starting a new round never overwrites the last.
- Faculty / jury cover judging venues (plus optional extra teams). On /evaluate
  each files a sheet per team. A team's round score is the per-criterion average
  of its sheets, updated whenever an evaluator saves. An admin can edit the
  round score afterwards (set_team_score); the next evaluator save recalculates it.
- A round can be *published* to the leaderboard. With two or more published,
  teams are ranked by the average across them, and a missing round counts as 0.
- Each round has a *tie-break order* of its criteria (set_round_tiebreak). Equal
  totals are separated by the first criterion, then the next, and so on; teams
  equal on every one share a rank.

## Typical jobs
- **Run a new judging round:** save_round (name and criteria), then activate_round,
  then make sure the venues and evaluators are right (get_judging_schedule,
  set_evaluator_scope), then watch progress with get_round_scores
  (only_unscored: true).
- **Seat a room:** set_judging_assignment with scope "mentor" for each mentor
  whose teams present there. Add a waiting venue of the same name if teams wait
  in the same room.
- **Swap an evaluator:** update_user (rename the faculty account) or add_user
  role faculty with judging_venues, then set_evaluator_scope on the old account
  with venues: [].
- **Fix a mark:** set_evaluator_sheet changes one evaluator's sheet, which
  recalculates the team's score. set_team_score sets the round score directly.
- **Publish results:** preview_leaderboard to check the ranking, set_round_tiebreak
  if ties need deciding, then publish_round and check with get_leaderboard.
- **Start next year:** list_years, then start_year (confirm the copy options,
  number of teams and mentor numbers with the user), set it up with year: "…",
  then set_current_year when the user says so.
- **Look at last year:** pass year: "2026-27" to any read tool.
- **"How do I … on the website?"** search_manual.

## Ground rules for agents
- Read before you write. Use get_overview first, then the specific list or get tool.
- Confirm with the user before delete_users, delete_round, delete_domain,
  start_year, set_current_year, set_timeline or set_guideline. The last two replace the whole document, so
  send back the full edited list.
- Prefer set_user_hidden to deleting.
- Report what changed: team numbers, names and totals, and the year if it isn't
  the current one.
`
