# Work log

A running record of changes made in this project, taken from the chat history. Newest entries are at the top.

The first version of this file only covered 14–15 October 2026. Entries below that date come from earlier chats.

## 2026-10-19

### Hamlet sign-ins

- Added a separate sign-in for each of the 24 Nunavut hamlets. Iqaluit is a city, so it is not on the list. User IDs are short names such as `arviat` and `chesterfield`.
- Each hamlet gets its own workspace id (`hamlet-arviat`, and so on). A new sign-in has no saved proposals, no review reports, and no community profile. These accounts do not see the shared Chesterfield workspace.
- The spreadsheet to send is `NEDA Hamlet Logins.xlsx` on the Desktop, and a copy is `NEDA-hamlet-logins.xlsx` in the repo root. That file is gitignored. Passwords are temporary and are not copied into this log.
- On production, "Continue without signing in" is hidden. It remains available on localhost only. A request with no sign-in token no longer opens the shared workspace when the API is in Supabase mode.
- Started the frontend at http://localhost:3002 and the API at http://127.0.0.1:8000.

## 2026-10-15

### Sample filled questionnaire for a demo (local data only)

- Started a new proposal in the browser (local "Continue without signing in"). Uploaded the GN `Community_Development_Fund_Application_Form_-_ENG.pdf` as the grant package and kept the detected sections unchanged.
- Filled all 55 fields on the Application details step from `Chesterfield Inlet Learning Centre – CDF Application Answers.docx`. The draft auto-saved as proposal `df2b9ad0f74d`. Stopped there and did not generate.
- Dropdown choices (the doc's wording isn't an option): Project type "Capacity building or training", Project stage "Idea or early planning", Community support "Engagement completed", Other funding "Other funding pending".
- Single-line boxes (timeline, approvals, budget assumptions) have their lists joined on one line. Budget breakdown was built from the doc's budget table.
- Did not upload the CED plan PDF in Supporting Documents: uploading replaces the pasted excerpt with the whole plan's text. The doc's excerpt is pasted instead.
- No code changes.

## 2026-10-15

### Chesterfield community profile rewritten (local data only)

- Replaced the `dev-user` community profile in `data/proposal_workspace.sqlite3` with the details the user supplied: name "Chesterfield Inlet (Igluligaarjuk)", 2021 Census demographics, services, gaps, remoteness, governance, strengths and cultural safety.
- The user left these blank, so they are now empty: primary contact, title, email, mailing address, registration number, data governance. The old CEDO contact (David Kattegatsiak) and P.O. box were removed. Phone is now 867-898-4600.
- Not changed: local priority, partners, supporting documents text.
- No code changes. `scripts/seed_chesterfield_workspace.py` still has the old profile, so re-running it would overwrite this. A backup of the database from before the change is in the session scratchpad.

## 2026-10-15

### Environment proposal requested amount

- Restarted the frontend at http://localhost:3002 and the API at http://127.0.0.1:8000.
- The exported Environment draft shows requested funding of $196,378. That number is not printed on its own. It is the sum of the three Environment partner cells on the 5-year funding table in `Chesterfield Inlet 2023 CED Plan - July 6.pdf`, Part 2 printed page 45 (PDF page 88): $54,000 + $110,878 + $31,500. The same row is in the brochure on printed pages 18–19. The printed Environment total on that page is $218,198, which also includes Chesterfield Inlet's $21,820 share.

## 2026-10-15

### Review page: removed "Back to dashboard"

- `frontend/src/app/proposal-feedback/[reportId]/page.tsx`: removed the "Back to dashboard" link. "Back to generated report" stays when the review came from a saved proposal. The header's Dashboard link still covers the dashboard.
- Committed as `72df620` and pushed to `local-dev` and `main`.

### Proposal generator handles one-sentence answers without padding

Problem: the generator prompt required "2-5 well-developed paragraphs" per section and "3-6 substantive sentences" per question, plus phases, roles and risks. With one-sentence inputs it invented detail to fill that length. A baseline run invented:
- evidence: youth "expressed a desire for more organized sports";
- measurement methods: attendance tracking and surveys;
- outcomes: health and social skills;
- effects: "fostered a sense of ownership".

Changes in `backend/app/llm/llm_utils.py`:

- **Length follows the input.** A new `input_depth` field labels each profile answer brief, moderate or detailed. The length rules now scale with it: brief inputs get short plain answers, detailed inputs get full ones. The prompt now lists what must not be invented and tells the model not to calculate new numbers.
- **Fact-check pass (new).** Code splits each drafted answer into numbered sentences. A second model call (`OPENAI_FACT_CHECK_MODEL`, default `gpt-4.1`) names the profile fields that support each sentence. The code drops any sentence that cites no real field.
  - The checker also lists the parts of each question the inputs don't answer. Those show on the answer as needs-review notes, for example "Add how many people will benefit" or "Add how outcomes will be measured".
  - If the check fails, the unchecked draft is kept, so generation never breaks.
  - In testing, `gpt-4o-mini` was unreliable as the checker, which is why it uses `gpt-4.1`.
- **Missing sections retried.** `gpt-4o-mini` sometimes returned only the first section. The rest then fell back to the raw input dump ("Project summary: …, Timeline: …"). Missing sections are now requested again, up to twice.
- **Fallback fixes:**
  - "Who will benefit" no longer glues outcomes and priorities onto the beneficiaries.
  - Engagement questions use `community_engagement`.
  - Activities questions use activities + staffing + timeline instead of the timeline alone.
- `render.yaml` and `api/.env.example` now list `OPENAI_FACT_CHECK_MODEL=gpt-4.1`.

**Follow-up the same day: balanced length.** One-line answers were too short. The target is now about one paragraph (4-6 sentences, 60-110 words) for narrative questions, and one to two paragraphs for detailed inputs.

- The `gpt-4.1` step now writes the final answers itself, citing a source field for every sentence. Code still drops any sentence without a valid citation. It uses a worked example of building a paragraph from one-line inputs.
- Facts may be reused across answers, since each answer is read on its own.
- Narrative answers under 45 words get one expansion pass. A strict label-only check then removes claims about results or motives from the expanded text, such as "this engagement ensured…" or "demonstrates commitment".
- The main draft call caps its output and retries once on broken JSON. A run-away response had made a whole generation fall back to the raw inputs.
- Free-text drafts for sections with questions are no longer sent to the checker, because they are never shown.

Result:

- One-sentence inputs give about one paragraph (55-85 words) wherever related facts exist.
- A question whose only input is one line with nothing related stays at 1-2 honest sentences rather than padding.
- Detailed inputs give 45-130 words with all their facts kept.
- Generation takes about 25 s, up from about 12 s.

Tested with the real models: 3+ runs each of a one-sentence profile and a detailed profile.

- One-sentence answers come out short and accurate, with gaps flagged.
- Detailed answers keep their substance (percentages, counts, month-by-month plan) with no false gap notes.
- Each generation takes about 5-10 s longer because of the extra fact-check call.
- 43 of 45 existing tests pass. The 2 compliance-test failures also fail without these changes.

Committed as `a7bdaa8` and pushed to `local-dev` and `main`.

### Pushed to production

- Commits on `local-dev`, then fast-forwarded to `main` (no merge commit):
  - `89daf89`: progress overlay, white background, text wrapping. This work was already uncommitted before this session.
  - `7b55580`: documents library, Chesterfield seed, David user, PDF word wrapping.
  - `6e779e8`: seed script now works on Postgres too.
- Production build was checked in an isolated copy before pushing. Vercel deployed `7b55580` successfully.
- Left uncommitted on purpose: `frontend/.env.local`, the vector-store files, `ced_plans copy/`, `.serena/`, and `log.md`.
- Chesterfield records are only in the local SQLite DB. Production uses Supabase Postgres (`DATABASE_URL` on Render), so they are not in production yet.

### Chesterfield budgets itemized; dashboard user renamed to David

- Traced every proposal's "Requested Funding". It is the plan's projected **partner share** for that direction: the three "Partners" cells of the funding table, added up. Example: Environment $196,378 = 54,000 + 110,878 + 31,500 (full plan Part 2 p. 45; brochure p. 18). No funder ever requested these amounts.
- The full plan has a detailed line-item budget (Part 2, p. 46) that the seed had not used. Every direction's line items add up exactly to its total ($2,547,885 overall).
- Rewrote each proposal's budget section to list those line items. Each now says which action items have no money, for example: Learning Centre (feasibility study only), recreation facilities (study only), fish plant upgrades, the KIA cultural centre, and the fishing and clean-tech projects.
- Rewrote the summaries that promised unbudgeted work.
- Environment is retitled "Care for the land and hunting grounds".
- Wellness total corrected to the plan's stated $588,437.
- Removed the wrong claim that HR costs were a "separate" budget. They are inside each direction's line items.
- Automated check: every $ figure and percentage in the six proposals appears verbatim in the plan, except the five-year Chesterfield and partner subtotals, which are sums of plan cells.
- Regenerated the real readiness review for the Arctic College proposal.
- Shared workspace user changed from "Prave" (prave@example.com) to "David" (edo_hamlet@qiniq.com, the CEDO's public email). Files: `frontend/src/lib/localAuth.ts`, `backend/app/auth.py`, and the commented defaults in `api/.env` and `api/.env.example`.

### Chesterfield Inlet accuracy audit

Checked every seeded Chesterfield claim against the source plans in `ced_plans copy/Chesterfield Inlet/`, the Hamlet website, the Government of Nunavut community contact list (July 2025), and the 2021 Census.

Key finding: "Chesterfield Inlet 2023" is the plan's **name**. It was written in 2018 (consultation May 2018, by Canadian Ecotourism Services), and the full plan says it stays a draft until the Hamlet approves it.

`scripts/seed_chesterfield_workspace.py`, community profile:

- Population: replaced the 2011 count (313) and "about 400" with the 2021 Census (397), the 2016 census (437) and the 2023 NBS estimate (433).
- Contact: replaced the 2013 Hamlet switchboard number with the CEDO's current line and email from the Hamlet site (867-898-4603, edo_hamlet@qiniq.com). Also updated the website (chesterfield-inlet.ca) and mailing address (P.O. Box 10).
- Blanked `registration_number` (it held the Hamlet's name) and `operating_name`.
- `year_established` is now 1980, from the Hamlet site. It previously gave the 1911 HBC post.
- "Ratified" changed to: draft recommendations were reviewed by Mayor, Council, SAO and CEDO.
- Removed the invented data-governance policy. It now quotes the plan's confidentiality notice.
- Services list is now from the 2025 GN list.

Six proposals:

- Culture had two Environment action items and was missing its own: KIA cultural centre, arts and crafts, archaeological mapping, heritage buildings. Rewritten, and the proposal is retitled.
- Tourism, Business and Environment now list the plan's actual key action items.
- Removed embellishments such as "whaling-era meeting place".
- All budget figures were re-added and match the plan's table. Added the plan's HR budget lines where relevant.
- Grant label changed from "Chesterfield Inlet 2023 CED Plan — X" to "No funder selected · CED plan direction: X".
- Statuses kept as they were: Education and Environment Exported, Wellness and Culture Ready, Tourism and Business Draft.
- Removed the fake backdated created/updated times.

Readiness review:

- Removed the hand-written review (score 78).
- Generated a real one with the app's analyzer for the Arctic College proposal: 86, with 4 warnings.

Deleted from the workspace DB (approved by the user):

- `fci_saved_run`: gibberish test data with an unrelated book as the grant file.
- `final_ced.pdf`: a generic AI-generated plan.
- The stuck "Chesterfield Inlet 2023 CED Plan - July 6.pdf" upload.
- The fictional Water System CDF demo proposal, which claimed 1,200 residents, and its two reviews.

Backup of the DB before these changes: `data/proposal_workspace.sqlite3-before-chesterfield-audit` (gitignored).

### Shared sign-in bypass on deployed sites

- `frontend/src/lib/localAuth.ts`: "Continue without signing in" is no longer limited to localhost. It is available on any host.
- `frontend/src/components/LoginScreen.tsx`: helper text now says the button opens the shared workspace without a Supabase account.
- `backend/app/auth.py`: in Supabase auth mode, a request with no bearer token uses the shared dev user. A real Supabase token is still verified.
- Commit `c3e12f1` pushed to `local-dev`.
- `main` was not updated. Vercel production has been deploying from `main`, so the live production URL does not have this until `local-dev` is merged.

## 2026-10-14

### Local app

- Started the frontend at http://localhost:3002 and the backend at http://localhost:8000.
- Later, a production build ran while the dev server was still using the `.next` folder. The page showed `TypeError: __webpack_modules__[moduleId] is not a function`. Cleared `frontend/.next` and restarted the dev server.

### Chesterfield Inlet workspace

- Read the Chesterfield CED plans in `ced_plans copy/`, mainly the 2023 brochure and the 2013 Hamlet plan.
- Seeded the local workspace database (`data/proposal_workspace.sqlite3`, user `dev-user`) with:
  - Community profile for the Hamlet of Chesterfield Inlet (Igluligaarjuk), Kivalliq, Nunavut.
  - Six saved proposals from the 2023 plan directions: Arctic College Learning Centre and local training (exported), mental health worker and youth recreation, traditional knowledge and time on the land, cultural tourism, fish plant and local business, commercial fishing and hunting grounds.
  - One readiness review of the Arctic College draft, score 78. It notes that the dollar amounts are the plan's five-year allocations, and that the population figures are the 2013 plan's "about 400" and the 2011 census count of 313.
- Added `scripts/seed_chesterfield_workspace.py` so the same records can be loaded again.
- The database itself is gitignored, so the Chesterfield records stay on this machine. Two older records, `fci_saved_run` and `final_ced.pdf`, were left in place.

### Community profile saves

- Edits looked unsaved because Save disabled itself as soon as typing started, before the request was sent. A click did nothing, and leaving or refreshing within about a second dropped the change.
- `frontend/src/components/CommunityProfileEditor.tsx`: the button stays clickable, the click sends the current fields immediately, and leaving the page still sends a pending change.
- `frontend/src/lib/api.ts`: the profile save request can use `keepalive` so a refresh does not cancel it.
- Checked in the browser: changing the community name, saving, and reloading kept Chesterfield Inlet.

### Push to `local-dev`

Commit `ca8677d` included the profile-save fix, the local sign-in bypass, account-page links, theme-toggle removal, and the Chesterfield seed script.

Left uncommitted on purpose:

- `frontend/.env.local`
- generated vector-store files under `backend/app/data/app_library/vector_store/`
- `ced_plans copy/`

### Failed Vercel preview

- The preview for `ca8677d` failed type checking. Account and other pages pass `asChild` to `Button`, and `Button` did not accept that prop.
- `frontend/src/components/ui/button.tsx`: `asChild` now renders the button styles on a child link.
- Local `npm run build` completed after the change.
- Commit `afd9953` pushed to `local-dev`.

## 2026-10-13

### Localhost only

- Started the frontend at http://localhost:3002 and the API at http://127.0.0.1:8000. No code changes.

## 2026-10-11 to 2026-10-13

### Theme experiments, then a revert

These were tried on localhost and then undone, except where noted:

- Dark mode contrast was softened, then put back to black and gray with the blue tint removed.
- A Pantone trial used navy `#32497F`, red `#DC3338`, and pale yellow `#FEF0AF`, then dropped white panels, then made red dominant.
- A second palette used cream, purple, and orange, then shifted more of the UI to purple.
- Cream was replaced with white and the layout was made more animated. That experiment was reverted back to the last committed NEDA blue, crimson, and gold look.

What stayed after the revert:

- Dark mode and the theme toggle were removed. A saved dark preference is cleared on load.
- Page and card surfaces use warm cream instead of white. Blue, crimson, and gold accents stayed.
- Files touched across this stretch included `globals.css`, `layout.tsx`, `AppShell.tsx`, `LoginScreen.tsx`, `DashboardScreen.tsx`, `ThemeToggle.tsx`, `button.tsx`, `input.tsx`, `textarea.tsx`, `proposal/page.tsx`, `resources/page.tsx`, `improve-draft`, `ReportView.tsx`, and `CommunityForm.tsx`.
- `ThemeToggle.tsx` was deleted and is in commit `ca8677d`. `input.tsx`, `textarea.tsx`, and `DashboardScreen.tsx` match `main` again. `CommunityForm.tsx` still has an uncommitted change: after a supporting document is parsed, it also tries to save it to the document library and shows a success or failure toast.

### Services check and OpenAI key

- Frontend, API health, workspace database, and basic draft, parse, and export were working.
- Real model enhancement was broken until `OPENAI_API_KEY` was set. The key had been pasted into `api/.env.example`. It was moved into `api/.env`, the example file was reset to a placeholder, and the backend was restarted. The API then reported the key as configured.
- No quotes are needed around a normal key in `api/.env`.
- The local sign-in bypass had disappeared in the theme revert and was put back on the login screen.
- Supabase in `frontend/.env.local` was still a placeholder, so email sign-in still could not reach Supabase.

### Dashboard label and Resources button

- The first saved proposal's grant name was changed so the dashboard subtitle reads `fci_saved_run - Exported`.
- On Resources, the arrow on Start New Proposal stays on the same line as the text.

## 2026-09-24

- Hosted the app on localhost: frontend http://localhost:3002, API http://127.0.0.1:8000, using local dev auth. No code changes. This was the start of the theme chat above.

## 2026-09-23

### Look, navigation, and local sign-in

- Dark mode moved from blue to matte black.
- The yellow wash was removed from the top-left logo and the page background.
- Buttons that did not go anywhere were wired to real routes, including account actions.
- Files touched: `globals.css`, `AppShell.tsx`, `LoginScreen.tsx`, `Providers.tsx`, `account/page.tsx`, `resources/page.tsx`, `proposal/page.tsx`, `proposals/[proposalId]/page.tsx`, `proposal-feedback/[reportId]/page.tsx`, `improve-draft/[proposalId]/page.tsx`, `DashboardScreen.tsx`, `CommunityForm.tsx`, `ReportView.tsx`, `button.tsx`.
- Added `frontend/src/lib/localAuth.ts` and a **Continue without signing in** button. At this point it only worked on localhost.
- Sign-in showed **Failed to fetch** because `frontend/.env.local` pointed at a placeholder Supabase host, `https://xyzcompany.supabase.co`. The local API on port 8000 had also been stopped during that check.

## 2026-09-22

### Repo setup

- Pulled https://github.com/future-cities-institute/Grant-Proposal-Tool-NEDA- and ran the app once.
- Created local branch `local-dev` from `main` at `2f7f30b`.
- Nothing was committed or pushed. The only working-tree edit then was placeholder Supabase values in `frontend/.env.local`, added so the login page could load.
