/**
 * How EnVision works, for a connected agent. Served by the get_app_guide tool
 * and the envision://guide resource. Keep it in step with the app when pages
 * or workflows change.
 */
export const APP_GUIDE = `# EnVision 2026: how the app works

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
Public pages: /showcase (every team's project) and /mentors.

## Admin portal: pages, and the tools that do the same job
- User Management (/admin): list_users, add_user, update_user, reset_password, set_user_hidden, delete_users
- Domain Selection (/admin/domain-selection): list_domain_selections, get_settings / set_setting (open domain viewing / picking)
- Mentor Allocation (/admin/matching): list_mentors, assign_mentor, unassign_mentor
- Timeline (/admin/timeline): get_timeline, set_timeline, set_feedback_link
- Domains (/admin/domains): list_domains, add_domain, update_domain, delete_domain, set_domain_capacity
- Mentor / Team Profiles: list_teams, get_team, list_mentors
- Submissions (/admin/submissions): get_judging_schedule, manage_judging_venue, set_judging_assignment, set_judging_settings
- Guidelines (/admin/guidelines): get_guideline, set_guideline
- Scores (/admin/scores): list_rounds, get_round_scores, set_team_score, publish_round
- Judging Rounds (/admin/evaluation): save_round, activate_round, delete_round, list_evaluators, set_evaluator_scope, set_evaluator_sheet
- Leaderboard (what teams and mentors see): get_leaderboard

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
- **Publish results:** publish_round, then check with get_leaderboard.

## Ground rules for agents
- Read before you write. Use get_overview first, then the specific list or get tool.
- Confirm with the user before delete_users, delete_round, delete_domain,
  set_timeline or set_guideline. The last two replace the whole document, so
  send back the full edited list.
- Prefer set_user_hidden to deleting.
- Report what changed: team numbers, names and totals.
`
