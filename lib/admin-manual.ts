/**
 * The admin user manual: one entry per task an admin might need to do. It
 * drives both the /admin/manual page and the help search on every admin page
 * (lib/manual-search.ts), so keep it in step with the app when pages change.
 *
 * `asks` are other ways people phrase the same question and `keywords` are
 * words that should find it; both only feed the search and are never shown.
 * Pure data, so it is safe to import from client components.
 */

export interface ManualLink {
  label: string
  href: string
}

export interface ManualTopic {
  id: string
  section: ManualSectionId
  title: string
  /** One or two sentences: the direct answer. */
  summary: string
  steps?: string[]
  notes?: string[]
  links?: ManualLink[]
  asks: string[]
  keywords: string[]
}

export const MANUAL_SECTIONS = [
  { id: "start", title: "Getting started" },
  { id: "years", title: "Programme years" },
  { id: "users", title: "Users and logins" },
  { id: "themes", title: "Themes and domain selection" },
  { id: "mentors", title: "Mentors, teams and lab venues" },
  { id: "schedule", title: "Timeline and guidelines" },
  { id: "judging", title: "Judging" },
  { id: "results", title: "Scores and the leaderboard" },
  { id: "portals", title: "What teams, mentors and evaluators see" },
  { id: "help", title: "Troubleshooting" },
] as const

export type ManualSectionId = (typeof MANUAL_SECTIONS)[number]["id"]

export const MANUAL: ManualTopic[] = [
  /* ------------------------------------------------------------ start -- */
  {
    id: "what-is-envision",
    section: "start",
    title: "What this admin portal is for",
    summary:
      "EnVision is LICET's interdepartmental prototype contest. Teams pick a theme, get a mentor, build a project and present it in judging rounds. The admin portal runs all of it: accounts, themes, mentor allocation, timeline, guidelines, judging, scores, the leaderboard and programme years.",
    steps: [
      "Home shows where the programme stands and what needs you.",
      "Users holds every account: teams, mentors, faculty, jury and admins.",
      "Domain Selection and Domains control the themes teams and mentors choose from.",
      "Mentor Allocation pairs mentors with teams and seats them in lab venues.",
      "Timeline and Guidelines are what teams and mentors read.",
      "Judging covers decks, rooms, rounds, evaluators, scores and documents.",
      "The year switcher under the menu chooses which programme year you are working in.",
    ],
    links: [{ label: "Admin home", href: "/admin" }],
    asks: ["what is this", "what does this website do", "what is envision", "overview of the admin panel", "where do i start", "i am a new admin", "how does this work", "explain the app", "what can admins do"],
    keywords: ["overview", "introduction", "about", "new admin", "beginner", "start", "basics", "tour", "guide", "help", "portal", "contest", "hackathon", "iic", "licet"],
  },
  {
    id: "admin-home",
    section: "start",
    title: "Reading the admin home page",
    summary:
      "Home is the cockpit: a one-line status of the programme, the timeline as a line of sessions, then panels for what needs you, people, the live round, the leaderboard, themes, latest decks and the portal switches.",
    steps: [
      "Needs you lists loose ends with a count, worst first: unscored teams, teams without a judging room, missing decks, teams without a mentor or theme, accounts still on the starting password. Click a line to go straight to the fix.",
      "People counts teams, students, mentors and evaluators.",
      "The live round bar shows which judging round evaluators are marking and how far scoring has got.",
      "Leaderboard lets you switch rounds on and off to preview rankings (see the leaderboard topic).",
      "Themes shows how full each theme is for teams and mentors.",
      "Portal switches open or close theme viewing, theme picking and team renaming.",
    ],
    links: [{ label: "Admin home", href: "/admin" }],
    asks: ["what is the dashboard", "what does needs you mean", "home page panels", "cockpit", "what are these numbers on home"],
    keywords: ["dashboard", "home", "cockpit", "needs you", "overview", "panels", "status", "summary", "stats", "people", "attention", "todo", "pending"],
  },
  {
    id: "admin-password",
    section: "start",
    title: "Change your own admin password",
    summary: "Sign in, then open /change-password and set a new password. Admin accounts work in every programme year, so the new password applies everywhere.",
    links: [{ label: "Change password", href: "/change-password" }],
    asks: ["change my password", "update admin password", "my login", "i forgot my admin password"],
    keywords: ["password", "admin", "account", "security", "change", "my"],
    notes: ["If you are locked out of the only admin account, a developer must reset it in the database (see README)."],
  },
  {
    id: "search-help",
    section: "start",
    title: "Finding answers with the help search",
    summary:
      "Type any question into the help box under the menu on any admin page, in your own words. Press / to jump to it. Results open right there; the full manual is at Manual.",
    links: [{ label: "User manual", href: "/admin/manual" }],
    asks: ["how do i search", "where is the manual", "help", "instructions", "documentation"],
    keywords: ["help", "manual", "search", "faq", "docs", "guide", "question"],
  },

  /* ------------------------------------------------------------ years -- */
  {
    id: "start-new-year",
    section: "years",
    title: "Start a new programme year",
    summary:
      "Manage years → Start a new year creates a fresh year (for example 2027-28) with its own logins. Earlier years are never changed or deleted.",
    steps: [
      "Click Manage years under the menu (or open /admin/years).",
      "Under Start a new year, type the year as 2027-28 and choose which year to start from.",
      "Tick what to copy as a starting point: themes and capacities, judging round templates, rooms, timeline, guidelines. Teams, projects, mentors, allocations, selections and scores are never copied.",
      "Enter the number of teams. Team logins 1, 2, 3 … are created with the password licet@123.",
      "Paste the mentor registration numbers, one per line (12 digits starting 3111). Each gets a login with the password licet@123.",
      "Leave Make it the current year off so you can set the year up first, then press Review and Create.",
      "You are switched into the new year straight away. Check themes, rounds and the timeline, then make the year current when you are ready.",
    ],
    notes: [
      "Admin accounts work in every year automatically.",
      "Everyone with a new login is asked to change the password on first sign-in.",
      "You can add more teams or mentors later under Users.",
    ],
    links: [{ label: "Programme years", href: "/admin/years" }],
    asks: ["how do i start next year", "new academic year", "reset everything for next year", "create a new batch", "begin 2027", "fresh start for the next event", "new edition", "set up next year's contest", "clear data for new year"],
    keywords: ["year", "new year", "next year", "edition", "batch", "season", "session", "academic", "reset", "fresh", "rollover", "2027", "2028", "start", "create", "wizard", "archive", "cycle"],
  },
  {
    id: "switch-year",
    section: "years",
    title: "View or edit a past year",
    summary:
      "Use the Year dropdown under the menu. Every admin page then shows and edits that year, with a banner reminding you which year you are in. Back to … returns you to the current year.",
    steps: [
      "Pick the year in the Year dropdown, or click Work in … on the Manage years page.",
      "Edit anything as usual: changes apply only to that year.",
      "Click Back to <current year> in the banner when you are done.",
    ],
    notes: ["Only admins can switch years. Teams, mentors and evaluators always use the current year."],
    links: [{ label: "Programme years", href: "/admin/years" }],
    asks: ["see last year's data", "open previous year", "edit old scores", "go back to 2026", "where did last year go", "view old projects", "change past data"],
    keywords: ["past", "previous", "old", "last year", "history", "archive", "switch", "year", "dropdown", "edition", "view", "edit", "banner"],
  },
  {
    id: "make-year-current",
    section: "years",
    title: "Make a year the current year",
    summary:
      "On Manage years, click Make current on the year and confirm. Teams, mentors and evaluators then sign in to that year, and logins from the previous year stop working.",
    notes: [
      "Nothing is deleted. You can still open the previous year as an admin, and its projects stay on the public Showcase.",
      "You can switch back at any time.",
    ],
    links: [{ label: "Programme years", href: "/admin/years" }],
    asks: ["go live with the new year", "switch everyone to the new year", "activate next year", "make 2027 live", "when do students see the new year"],
    keywords: ["current", "live", "activate", "go live", "switch", "year", "edition", "launch", "default"],
  },
  {
    id: "year-data-kept",
    section: "years",
    title: "Is last year's data kept?",
    summary:
      "Yes. Every year keeps its teams, rosters, projects, logos, decks, mentors, allocations, rounds, scores, evaluator sheets, rooms, timeline, guidelines and settings. Starting or switching years never deletes anything, and there is no button to delete a year.",
    links: [{ label: "Programme years", href: "/admin/years" }],
    asks: ["will old projects be deleted", "do we lose data", "is data saved", "backup old year", "delete a year", "remove old year"],
    keywords: ["kept", "saved", "lost", "delete", "backup", "archive", "history", "data", "safe", "year", "remove", "permanent"],
  },
  {
    id: "public-past-years",
    section: "years",
    title: "Past years on the public site",
    summary:
      "Once there are two or more years, Showcase and Mentors show a year selector so anyone can browse earlier projects and mentors, read-only.",
    links: [
      { label: "Public showcase", href: "/showcase" },
      { label: "Public mentors", href: "/mentors" },
    ],
    asks: ["can students see old projects", "public archive", "show last year's teams to everyone"],
    keywords: ["public", "showcase", "mentors", "past", "archive", "visitors", "year", "selector"],
  },

  /* ------------------------------------------------------------ users -- */
  {
    id: "add-user",
    section: "users",
    title: "Add a team, mentor, faculty or jury login",
    summary: "Users → Add New User. Choose the role, enter the login ID and (optionally) a name and password, then Add User.",
    steps: [
      "Teams (Member) use the team number as the login ID, for example 63.",
      "Mentors use their 12-digit registration number starting 3111.",
      "Faculty and External Jury can use any login ID, for example vjsharmila. You can give them judging rooms right in the form.",
      "Leave the password empty to use licet@123.",
    ],
    notes: [
      "Teams and mentors must change the password at first sign-in; faculty and jury don't.",
      "A login ID can be reused in a different programme year, but not twice in the same year.",
      "To create many team and mentor logins at once at the start of a year, use Start a new year.",
    ],
    links: [{ label: "Users", href: "/admin/users" }],
    asks: ["create an account", "register a new team", "make a login for a judge", "add a mentor", "add faculty", "new evaluator account", "add a student", "create user"],
    keywords: ["add", "create", "new", "user", "account", "login", "register", "team", "mentor", "faculty", "jury", "evaluator", "judge", "student", "member", "signup"],
  },
  {
    id: "reset-password",
    section: "users",
    title: "Reset someone's password",
    summary: "Users → find the account → Reset Password. The password goes back to licet@123 and they must set a new one when they sign in.",
    links: [{ label: "Users", href: "/admin/users" }],
    asks: ["team forgot password", "mentor cannot log in", "unlock an account", "reset login", "student forgot password", "change a team's password"],
    keywords: ["password", "reset", "forgot", "forgotten", "locked", "unlock", "login", "signin", "credentials", "default", "licet@123"],
  },
  {
    id: "edit-user",
    section: "users",
    title: "Edit a login: name, email, phone or login ID",
    summary: "Users → click the pencil (Edit this login) on the row. You can change the name, phone, email and login ID, and switch an evaluator between Faculty and External Jury.",
    notes: ["Teams and mentors can't change role; only faculty ⇄ jury can."],
    links: [{ label: "Users", href: "/admin/users" }],
    asks: ["rename a login", "change a team's email", "fix a typo in a name", "update phone number", "change jury to faculty", "change faculty to jury", "make a judge external jury", "rename user"],
    keywords: ["edit", "rename", "change", "update", "name", "email", "phone", "login id", "role", "faculty", "jury", "typo", "fix"],
  },
  {
    id: "hide-user",
    section: "users",
    title: "Hide an account instead of deleting it",
    summary: "Users → Hide on the row. A hidden account disappears from lists, counts, the leaderboard and the public site, but nothing is deleted and you can Show it again any time.",
    notes: ["Prefer hiding to deleting: it is reversible."],
    links: [{ label: "Users", href: "/admin/users" }],
    asks: ["remove a team from the showcase", "disable an account", "team dropped out", "hide a test account", "deactivate user"],
    keywords: ["hide", "hidden", "show", "unhide", "disable", "deactivate", "remove", "dropout", "withdraw", "inactive", "test"],
  },
  {
    id: "delete-user",
    section: "users",
    title: "Delete accounts",
    summary: "Users → tick the accounts → Delete Selected (or Delete on one row) and confirm. This permanently removes team and mentor accounts with their roster, project, selections and scores in this year.",
    notes: ["Deleting can't be undone. Hide the account instead if you might need it."],
    links: [{ label: "Users", href: "/admin/users" }],
    asks: ["remove a user permanently", "delete test accounts", "bulk delete teams", "erase an account"],
    keywords: ["delete", "remove", "erase", "permanent", "bulk", "select", "accounts", "users", "purge"],
  },
  {
    id: "find-user",
    section: "users",
    title: "Find an account",
    summary: "Users has a search box (login ID or role) and sorting. Team Profiles and Mentor Profiles have their own search for names, projects and themes.",
    links: [
      { label: "Users", href: "/admin/users" },
      { label: "Team profiles", href: "/admin/team-profiles" },
      { label: "Mentor profiles", href: "/admin/mentor-profiles" },
    ],
    asks: ["look up a team", "search for a mentor", "where is team 17", "find login id"],
    keywords: ["find", "search", "look up", "lookup", "where", "locate", "user", "team", "mentor", "login"],
  },
  {
    id: "login-trouble",
    section: "users",
    title: "Someone can't sign in",
    summary: "Check, in order: the login ID (team number or 12-digit registration number), that the account exists in the current year, that it isn't hidden, then reset the password to licet@123.",
    steps: [
      "Search for the login on Users.",
      "If it's missing, add it, or check you are viewing the current year (the Year dropdown).",
      "Reset the password and ask them to sign in with licet@123.",
      "Mentors must type the full 12-digit number starting 3111; the login page rejects anything else.",
    ],
    notes: ["After a new year is made current, last year's logins stop working by design."],
    links: [{ label: "Users", href: "/admin/users" }],
    asks: ["students cant login", "team cannot log in", "mentor can't sign in", "login not working", "invalid login id or password", "cannot sign in", "student says wrong password", "mentor id error", "account doesn't exist"],
    keywords: ["login", "signin", "sign in", "cannot", "error", "invalid", "wrong", "password", "access", "trouble", "problem", "locked"],
  },
  {
    id: "team-email",
    section: "users",
    title: "Why teams are asked for an email",
    summary: "The first time a team signs in (after changing the password) it must add the team lead's email. You can see or change it on Users.",
    links: [{ label: "Users", href: "/admin/users" }],
    asks: ["add email page", "team lead email", "students stuck on email screen"],
    keywords: ["email", "team lead", "contact", "first login", "add email"],
  },

  /* ----------------------------------------------------------- themes -- */
  {
    id: "edit-themes",
    section: "themes",
    title: "Add, edit or delete themes",
    summary: "Domains → edit a theme's title, description, icon and SDGs, or Add New Theme at the bottom. Delete removes a theme.",
    notes: ["Deleting a theme also removes teams' and mentors' picks of it; check Domain Selection first."],
    links: [{ label: "Domains", href: "/admin/domains" }],
    asks: ["change a domain name", "add a new topic", "remove a theme", "edit sdgs", "create problem area"],
    keywords: ["theme", "domain", "topic", "track", "category", "sdg", "add", "edit", "delete", "icon", "description", "problem area"],
  },
  {
    id: "theme-capacity",
    section: "themes",
    title: "Set how many teams or mentors a theme can take",
    summary: "Domain Selection → Students (or Mentors) → Theme Capacities. Change the number for each theme; it saves immediately.",
    links: [
      { label: "Student selections", href: "/admin/students" },
      { label: "Mentor selections", href: "/admin/mentors" },
    ],
    asks: ["limit teams per theme", "theme is full", "increase capacity", "how many teams per domain", "seats per theme"],
    keywords: ["capacity", "limit", "seats", "full", "maximum", "max", "quota", "theme", "domain", "slots"],
  },
  {
    id: "open-selection",
    section: "themes",
    title: "Open or close theme picking",
    summary:
      "Two switches per role. Visibility shows the Domains page (otherwise they see the timeline); Selection lets them actually choose. Flip them on Domain Selection → Students/Mentors, or under Portal switches on Home.",
    links: [
      { label: "Domain selection", href: "/admin/domain-selection" },
      { label: "Home switches", href: "/admin" },
    ],
    asks: ["let students choose domains", "stop teams from changing theme", "lock selection", "open domain selection", "students can't see domains"],
    keywords: ["open", "close", "lock", "unlock", "selection", "visibility", "choose", "pick", "switch", "toggle", "domain", "theme", "enable", "disable"],
  },
  {
    id: "see-selections",
    section: "themes",
    title: "See which team picked which theme",
    summary: "Domain Selection → Students lists every team's theme, and Mentors lists every mentor's themes. Pending shows who hasn't picked yet.",
    links: [
      { label: "Student selections", href: "/admin/students" },
      { label: "Mentor selections", href: "/admin/mentors" },
    ],
    asks: ["who chose agriculture", "teams without a domain", "which mentors picked health", "pending selections"],
    keywords: ["selection", "picked", "chose", "choice", "pending", "domain", "theme", "list", "who"],
  },
  {
    id: "team-rename",
    section: "themes",
    title: "Allow or stop teams renaming themselves",
    summary: "Domain Selection → Students → Team Name Editing (also on Home under Portal switches).",
    links: [{ label: "Student selections", href: "/admin/students" }],
    asks: ["lock team names", "team wants to change name", "stop renaming"],
    keywords: ["team name", "rename", "lock", "edit", "switch", "name"],
  },

  /* ---------------------------------------------------------- mentors -- */
  {
    id: "allocate-mentor",
    section: "mentors",
    title: "Allocate a mentor to a team",
    summary: "Mentor Allocation → drag a team from Unassigned Teams onto a mentor's card. A team has one mentor and a mentor has at most two teams; the team moves into the mentor's lab venue automatically.",
    notes: [
      "Click × next to a team on a mentor's card to unassign it; it goes back to Unassigned Teams.",
      "Search and the theme and venue filters help find teams and mentors.",
    ],
    links: [{ label: "Mentor allocation", href: "/admin/matching" }],
    asks: ["assign a mentor", "pair mentors with teams", "change a team's mentor", "team has no mentor", "team without mentor", "teams with no mentor", "match mentors", "unassign mentor"],
    keywords: ["mentor", "allocate", "allocation", "assign", "match", "matching", "pair", "guide", "unassign", "team", "two teams"],
  },
  {
    id: "lab-venues",
    section: "mentors",
    title: "Lab venues (where teams sit during the programme)",
    summary: "Mentor Allocation → Venues: add a room code (for example F11) with a team capacity, or remove one. Set each mentor's venue with the picker on their card. Download PDF prints the full allocation.",
    notes: ["Lab venues are different from judging venues (the rooms teams present in)."],
    links: [{ label: "Mentor allocation", href: "/admin/matching" }],
    asks: ["add a classroom", "where do teams sit", "room capacity", "print mentor allocation", "venue list pdf"],
    keywords: ["venue", "lab", "room", "class", "hall", "capacity", "seat", "pdf", "print", "allocation", "download"],
  },
  {
    id: "profiles",
    section: "mentors",
    title: "View team and mentor profiles",
    summary: "Team Profiles shows each team's roster, logo, project and deck; Mentor Profiles shows each mentor's photo, bio and themes. Open one to see or edit details.",
    links: [
      { label: "Team profiles", href: "/admin/team-profiles" },
      { label: "Mentor profiles", href: "/admin/mentor-profiles" },
    ],
    asks: ["see team members", "who is in team 5", "team roster", "mentor bio", "project details of a team", "edit a team's project"],
    keywords: ["profile", "roster", "members", "team", "mentor", "bio", "photo", "logo", "project", "details", "students"],
  },

  /* --------------------------------------------------------- schedule -- */
  {
    id: "timeline",
    section: "schedule",
    title: "Edit the programme timeline",
    summary: "Timeline → edit phases and their sessions: label (Day 1 / Week 1), date, title, venue and resource person. Save when done; teams and mentors see it at once.",
    notes: [
      "Write dates as 21.08.2026 (AN). The home page uses them to mark sessions done or today.",
      "Each session can have a feedback form link.",
    ],
    links: [{ label: "Timeline", href: "/admin/timeline" }],
    asks: ["change the schedule", "add a session", "update dates", "add week 13", "edit calendar", "change resource person"],
    keywords: ["timeline", "schedule", "calendar", "session", "dates", "agenda", "phase", "day", "week", "event", "plan"],
  },
  {
    id: "feedback-links",
    section: "schedule",
    title: "Add a feedback form to a session",
    summary: "Timeline → paste the Google Form link in the session's Feedback Form URL. Teams see a feedback button on that session.",
    links: [{ label: "Timeline", href: "/admin/timeline" }],
    asks: ["google form for session", "collect feedback", "feedback link"],
    keywords: ["feedback", "form", "google form", "survey", "link", "session"],
  },
  {
    id: "guidelines",
    section: "schedule",
    title: "Edit the guidelines",
    summary: "Guidelines → set the title, add, reorder or delete slides (text or image), and upload a downloadable PPTX. Teams and mentors read it under Guidelines.",
    links: [{ label: "Guidelines", href: "/admin/guidelines" }],
    asks: ["upload the template ppt", "change pitch deck instructions", "add a slide", "guideline file"],
    keywords: ["guideline", "guidelines", "instructions", "slides", "template", "ppt", "pptx", "deck", "upload", "rules"],
  },

  /* ---------------------------------------------------------- judging -- */
  {
    id: "judging-hub",
    section: "judging",
    title: "How the Judging section is organised",
    summary:
      "Judging opens on cards in three groups. Before judging: Submissions, Venues, Documents. Judging: Rounds, Faculty & Jury. Results: Scores, Evaluator Sheets. The live round is shown at the top of every Judging page.",
    links: [{ label: "Judging", href: "/admin/judging" }],
    asks: ["where are scores", "where is submissions", "judging rounds page", "how judging works"],
    keywords: ["judging", "evaluation", "hub", "cards", "submissions", "venues", "documents", "rounds", "scores", "sheets", "overview"],
  },
  {
    id: "create-round",
    section: "judging",
    title: "Create or edit a judging round",
    summary: "Judging → Rounds. Add a round with a name and its criteria, each with a maximum mark (for example Problem Statement 10, Feasibility 15). Edit or delete it there too.",
    notes: [
      "Each round keeps its own scores, so a new round never overwrites the last one.",
      "A round that is live or still has scores can't be deleted.",
    ],
    links: [{ label: "Rounds", href: "/admin/judging/rounds" }],
    asks: ["make a rubric", "add criteria", "change maximum marks", "new evaluation round", "poc presentation round", "create rubric"],
    keywords: ["round", "rubric", "criteria", "criterion", "marks", "maximum", "evaluation", "create", "edit", "phase", "presentation"],
  },
  {
    id: "activate-round",
    section: "judging",
    title: "Make a round live",
    summary: "Judging → Rounds → Activate on the round. Only one round is live: it's what evaluators mark, what the judging PDFs print and what teams see as the rubric.",
    links: [{ label: "Rounds", href: "/admin/judging/rounds" }],
    asks: ["switch to the next round", "which round are judges marking", "start judging", "change active round"],
    keywords: ["live", "active", "activate", "current", "round", "switch", "start", "judging"],
  },
  {
    id: "judging-rooms",
    section: "judging",
    title: "Set up judging and waiting rooms",
    summary: "Judging → Venues. Add judging rooms (where teams present) and waiting rooms, then assign them by theme or by mentor. Override a single team on Judging → Submissions.",
    notes: [
      "A team's room is its own assignment if set, otherwise its mentor's, otherwise its theme's.",
      "Assigning a mentor's room seats both of their teams.",
      "Rooms belong to the year, so every round in the year uses them.",
    ],
    links: [
      { label: "Venues", href: "/admin/judging/venues" },
      { label: "Submissions", href: "/admin/judging/submissions" },
    ],
    asks: ["assign rooms for presentation", "which room does team 5 present in", "teams without a room", "waiting room", "seat teams for judging"],
    keywords: ["room", "venue", "hall", "judging room", "waiting", "assign", "presentation", "seat", "schedule", "theme", "mentor"],
  },
  {
    id: "evaluators",
    section: "judging",
    title: "Give faculty and jury their rooms",
    summary: "Judging → Faculty & Jury. Choose each evaluator's judging rooms, plus any extra individual teams. They mark every team in those rooms.",
    notes: ["Create the faculty or jury login first on Users."],
    links: [{ label: "Faculty & Jury", href: "/admin/judging/evaluators" }],
    asks: ["assign judges", "which teams does a judge mark", "add a judge to a room", "swap an evaluator", "replace faculty"],
    keywords: ["evaluator", "faculty", "jury", "judge", "examiner", "assign", "room", "scope", "teams", "swap", "replace"],
  },
  {
    id: "evaluator-marking",
    section: "judging",
    title: "How evaluators mark teams",
    summary:
      "Faculty and jury sign in and land on /evaluate. They pick a team in their rooms and enter marks for each criterion of the live round. A team's round score is the average of all its evaluators' sheets, criterion by criterion, and it updates as soon as anyone saves.",
    links: [{ label: "Evaluator sheets", href: "/admin/judging/sheets" }],
    asks: ["how do judges enter marks", "how is the score calculated", "average of judges", "what does faculty see"],
    keywords: ["evaluate", "marking", "marks", "judge", "faculty", "jury", "average", "calculate", "sheet", "score"],
  },
  {
    id: "documents",
    section: "judging",
    title: "Download judging sheets, faculty schedule, team details or Excel",
    summary: "Judging → Documents. Download the Judging Sheets PDF, Faculty PDF, Team Details PDF or the Excel of all submissions. Report Settings sets the headings, faculty timing and the sheet rubric.",
    links: [{ label: "Documents", href: "/admin/judging/documents" }],
    asks: ["print judging sheets", "export to excel", "faculty schedule pdf", "download team details", "change pdf heading"],
    keywords: ["pdf", "excel", "xlsx", "download", "export", "print", "sheet", "report", "faculty", "schedule", "documents", "heading"],
  },
  {
    id: "submissions",
    section: "judging",
    title: "Check team decks (submissions)",
    summary: "Judging → Submissions lists every team's deck (Drive file and Canva link) with filters for theme, room and status. You can also set a team's judging or waiting room there.",
    notes: ["Teams submit on their Project page by pasting the Google Drive file link from the shared folder."],
    links: [{ label: "Submissions", href: "/admin/judging/submissions" }],
    asks: ["who hasn't submitted", "see the ppt", "deck link", "missing presentations", "drive link"],
    keywords: ["submission", "submit", "deck", "ppt", "presentation", "drive", "canva", "file", "upload", "missing"],
  },

  /* ---------------------------------------------------------- results -- */
  {
    id: "enter-scores",
    section: "results",
    title: "Enter or correct a team's score yourself",
    summary: "Judging → Scores → open the round → pick the team and type the marks per criterion. Save & next moves down the list; filter by room to follow the presentation order.",
    notes: ["If an evaluator saves a sheet for that team later, the score is recalculated from the sheets."],
    links: [{ label: "Scores", href: "/admin/judging/scores" }],
    asks: ["change a mark", "fix a wrong score", "type marks manually", "add marks for a team", "edit score"],
    keywords: ["score", "marks", "mark", "enter", "correct", "edit", "fix", "change", "manual", "grade", "points"],
  },
  {
    id: "fix-sheet",
    section: "results",
    title: "Correct one evaluator's sheet",
    summary: "Judging → Evaluator Sheets → choose the round → open the team → edit the evaluator's marks in place. The team's average updates immediately.",
    links: [{ label: "Evaluator sheets", href: "/admin/judging/sheets" }],
    asks: ["judge entered wrong marks", "delete a judge's marks", "see each judge's marks", "change evaluator marks"],
    keywords: ["sheet", "evaluator", "judge", "faculty", "wrong", "correct", "edit", "marks", "individual"],
  },
  {
    id: "publish-leaderboard",
    section: "results",
    title: "Publish results to the leaderboard",
    summary: "Judging → Scores → turn on Show on leaderboard for the round. Teams and mentors then see the ranking. With two or more rounds on, teams are ranked by the average across them.",
    notes: [
      "A team with no score in a published round counts as 0 in the average, so finish scoring before publishing a second round.",
      "Turn the switch off to hide the round again.",
    ],
    links: [{ label: "Scores", href: "/admin/judging/scores" }],
    asks: ["show results to students", "make leaderboard visible", "release rankings", "hide leaderboard", "combine two rounds", "average of rounds"],
    keywords: ["publish", "leaderboard", "ranking", "rank", "results", "release", "visible", "show", "hide", "average", "combine", "rounds"],
  },
  {
    id: "preview-leaderboard",
    section: "results",
    title: "Preview a ranking before publishing",
    summary: "On Home, the Leaderboard panel has a switch per round. Turn on one round to rank by it, or several to rank by their average. It's a preview only; teams see the published rounds.",
    links: [{ label: "Admin home", href: "/admin" }],
    asks: ["see top teams", "who is winning", "average two rounds", "check ranking", "winners", "top 10"],
    keywords: ["preview", "top", "winner", "ranking", "leaderboard", "average", "rounds", "switch", "best"],
  },
  {
    id: "tie-break",
    section: "results",
    title: "Break ties between teams with the same score",
    summary: "Judging → Scores → open the round → Tie-break order. Put the criteria in priority order: equal totals are separated by criterion 1, then criterion 2, and so on.",
    notes: ["Teams equal on every criterion share a rank."],
    links: [{ label: "Scores", href: "/admin/judging/scores" }],
    asks: ["two teams have same marks", "equal score", "who ranks higher when tied", "change priority of criteria", "draw"],
    keywords: ["tie", "tiebreak", "tie-break", "equal", "same", "draw", "priority", "order", "criteria", "rank"],
  },

  /* ---------------------------------------------------------- portals -- */
  {
    id: "team-portal",
    section: "portals",
    title: "What teams do in their portal",
    summary:
      "Teams sign in with their team number. They edit the team name, logo and roster; pick a theme when selection is open; write the project (title, problem, solution) and submit the deck link; see their mentor, the timeline, guidelines and the leaderboard.",
    links: [{ label: "Public showcase", href: "/showcase" }],
    asks: ["what do students see", "how do teams submit", "student dashboard", "member portal"],
    keywords: ["team", "student", "member", "portal", "dashboard", "project", "roster", "submit", "logo"],
  },
  {
    id: "mentor-portal",
    section: "portals",
    title: "What mentors do in their portal",
    summary: "Mentors sign in with their registration number. They add a photo and bio, pick themes when selection is open, and see their teams, the timeline, guidelines and the leaderboard.",
    links: [{ label: "Public mentors", href: "/mentors" }],
    asks: ["what do mentors see", "mentor dashboard", "mentor profile"],
    keywords: ["mentor", "portal", "dashboard", "profile", "bio", "photo", "teams"],
  },
  {
    id: "public-pages",
    section: "portals",
    title: "The public pages",
    summary: "Anyone can see the landing page, Showcase (every team's project) and Mentors. Hidden accounts never appear there.",
    links: [
      { label: "Showcase", href: "/showcase" },
      { label: "Mentors", href: "/mentors" },
    ],
    asks: ["what can visitors see", "public website", "remove team from public page"],
    keywords: ["public", "showcase", "visitors", "website", "landing", "mentors", "gallery"],
  },
  {
    id: "ai-agent",
    section: "portals",
    title: "Run the admin portal from an AI assistant",
    summary: "Add https://envisionlicet.vercel.app/api/mcp as an MCP server in Claude, VS Code or Cursor, sign in with an admin account and click Allow. The assistant can then do most admin jobs for the current year.",
    asks: ["use claude to manage", "connect chatgpt", "mcp server", "automate admin tasks"],
    keywords: ["ai", "mcp", "claude", "assistant", "agent", "automation", "cursor", "copilot", "bot"],
  },

  /* ------------------------------------------------------------- help -- */
  {
    id: "not-updating",
    section: "help",
    title: "A change isn't showing",
    summary: "Pages refresh themselves about every 30 seconds; reload the page to see it at once. Also check the Year dropdown: you might be editing a different year from the one teams use.",
    asks: ["page not updating", "changes not saved", "students don't see my change", "old data showing", "refresh"],
    keywords: ["refresh", "reload", "not showing", "not updating", "cache", "stale", "saved", "delay", "old"],
  },
  {
    id: "wrong-year-banner",
    section: "help",
    title: "There's a yellow banner saying I'm working in another year",
    summary: "You've switched the admin pages to an earlier (or upcoming) year, and every change goes into that year. Click Back to <current year> in the banner to return.",
    asks: ["yellow banner", "why does it say working in", "editing wrong year"],
    keywords: ["banner", "warning", "yellow", "year", "working in", "wrong", "switch back"],
  },
  {
    id: "developer-help",
    section: "help",
    title: "Something is broken or needs a developer",
    summary: "The README in the code repository explains how the app is built, how to run it, the database and how to deploy. Errors usually come with a message; note it, the page and what you clicked.",
    asks: ["bug", "error message", "site is down", "contact developer", "technical documentation"],
    keywords: ["bug", "error", "broken", "crash", "down", "developer", "technical", "readme", "support", "issue"],
  },
]
