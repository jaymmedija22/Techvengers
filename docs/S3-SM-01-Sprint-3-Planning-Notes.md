# HOPE ERP — Sprint 3 Planning Notes

**Task ID:** S3-SM-01
**Document:** Sprint 3 Planning Notes and Board
**Project:** HOPE ERP
**Team:** Techvengers
**Scrum Master:** Jay M
**Planning snapshot:** November 24, 2026
**Sprint dates:** To be confirmed by the team
**Status:** Draft — pending team review and Project board synchronization

---

## 1. Sprint Goal

Deliver a coherent Human Resources foundation for HOPE ERP: maintain departments, jobs, and employees; record and present job-history changes; protect employee and salary information through permissions; and provide the database integrity, design handoffs, and operational checks needed to support those workflows.

## 2. Sprint Objectives

- Provide usable Department, Job, and Employee management workflows.
- Support employee profiles and a chronological promotion/transfer history.
- Enforce database relationships, effective-date validation, and role-based visibility.
- Keep design and implementation aligned through wireframes, mockups, handoffs, and usability review.
- Prepare reliable demonstration data, database performance support, and backup/restore procedures.
- Coordinate carryover decisions, progress checks, risks, and the Sprint 3 review/retrospective.

## 3. Team and Responsibilities

| Team member | Role | Sprint 3 responsibility |
|---|---|---|
| Jay M (`jaymmedija22`) | Scrum Master | Facilitate planning and progress checks, resolve coordination blockers, maintain the risk/velocity records, and prepare the sprint review and retrospective. |
| Sean (`tito-mo-sean`) | Developer | Implement HR screens and workflows, integrate with the database and permissions, and address usability findings. |
| Macline (`Macline19`) | Database Administrator | Maintain HR schema relationships, queries, validation, delete protections, demo data, indexes, and backup/restore procedures. |
| Ace (`aldtaf`) | UI/UX Designer | Prepare wireframes and high-fidelity handoffs, design the job timeline, and review the implemented screens for usability. |
| Kenchie (`1stNPC`) | Tester | Prepare and execute Department, Job, Employee, Job History, permission, and regression tests; document defects and verify fixes with the Developer. |

Task ownership below follows the assignees on the linked GitHub issues. The team should confirm that these assignments and supporting roles remain current.

## 4. Sprint 3 Task Register

Priority and points in this register are **proposed planning values**, not values already recorded on the GitHub issues. Use the team's Fibonacci scale (1, 2, 3, 5, 8, 13); confirm or revise them with the task owners before using them for capacity or velocity reporting. GitHub issue state is shown as observed in the issue list, not inferred from a Project board column.

| Task ID / issue | Scope and expected deliverable | Owner / role | Priority | Proposed points | GitHub issue state |
|---|---|---|---:|---:|---|
| [S3-SM-01 (#161)](https://github.com/jaymmedija22/Techvengers/issues/161) | Sprint 3 planning notes and organized task register, including goals, scope, assignments, estimates, priorities, and dependencies. | Jay M — Scrum Master | P1 | 3 | Open |
| [S3-SM-02 (#162)](https://github.com/jaymmedija22/Techvengers/issues/162) | Review Sprint 2 unfinished work and record carryover decisions, owners, priority, and impact on the Sprint 3 goal. | Jay M — Scrum Master | P1 | 2 | Open |
| [S3-SM-03 (#163)](https://github.com/jaymmedija22/Techvengers/issues/163) | Mid-sprint check and an impediment log with progress, at-risk work, blockers, owners, and follow-up actions. | Jay M — Scrum Master | P1 | 2 | Open |
| [S3-SM-04 (#164)](https://github.com/jaymmedija22/Techvengers/issues/164) | Sprint 3 actual-versus-planned velocity and an updated Sprint 4 risk register. | Jay M — Scrum Master | P2 | 3 | Open |
| [S3-SM-05 (#165)](https://github.com/jaymmedija22/Techvengers/issues/165) | Sprint review and retrospective report covering outcomes, feedback, lessons learned, and owned Sprint 4 actions. | Jay M — Scrum Master | P1 | 3 | Open |
| [S3-UIX-01 (#156)](https://github.com/jaymmedija22/Techvengers/issues/156) | Low-fidelity Department and Job list/create/edit wireframes with navigation and interaction states. | Ace — UI/UX Designer | P1 | 3 | Open |
| [S3-UIX-02 (#157)](https://github.com/jaymmedija22/Techvengers/issues/157) | Low-fidelity Employee list, create/edit, and profile wireframes, including search, status, and employee-information fields. | Ace — UI/UX Designer | P1 | 5 | Open |
| [S3-UIX-03 (#158)](https://github.com/jaymmedija22/Techvengers/issues/158) | Reusable employee Job Timeline design showing chronological job, department, effective-date, and appropriately protected salary details. | Ace — UI/UX Designer | P1 | 3 | Open |
| [S3-UIX-04 (#159)](https://github.com/jaymmedija22/Techvengers/issues/159) | High-fidelity Department, Job, Employee, and Profile mockups with implementation-ready handoff notes. | Ace — UI/UX Designer | P1 | 5 | Open |
| [S3-UIX-05 (#160)](https://github.com/jaymmedija22/Techvengers/issues/160) | Usability review of implemented Department, Job, Employee, and Profile screens with prioritized findings. | Ace — UI/UX Designer | P2 | 3 | Open |
| [S3-DBA-01 (#136)](https://github.com/jaymmedija22/Techvengers/issues/136) | Employee current-job/department query or view, with documented behavior for job-history data. | Macline — DB Admin | P1 | 3 | Closed |
| [S3-DBA-02 (#137)](https://github.com/jaymmedija22/Techvengers/issues/137) | Database validation preventing duplicate job-history effective dates for an employee. | Macline — DB Admin | P1 | 2 | Closed |
| [S3-DBA-03 (#138)](https://github.com/jaymmedija22/Techvengers/issues/138) | Link `app_user.empno` to the employee record with the appropriate relationship and integrity behavior. | Macline — DB Admin | P1 | 2 | Closed |
| [S3-DBA-04 (#139)](https://github.com/jaymmedija22/Techvengers/issues/139) | Verify child-record/delete protections for employees, departments, and jobs and document the expected behavior. | Macline — DB Admin | P1 | 2 | Closed |
| [S3-DBA-05 (#140)](https://github.com/jaymmedija22/Techvengers/issues/140) | Reusable HR demo/seed data covering department, job, employee, and job-history workflows. | Macline — DB Admin | P2 | 2 | Closed |
| [S3-DBA-06 (#141)](https://github.com/jaymmedija22/Techvengers/issues/141) | Relevant HR indexes and reusable database backup/restore scripts with usage guidance. | Macline — DB Admin | P2 | 5 | Closed |
| [S3-DEV-01 (#128)](https://github.com/jaymmedija22/Techvengers/issues/128) | Department list and create/edit management with validation, persistence, feedback, and permission checks. | Sean — Developer | P1 | 5 | Closed |
| [S3-DEV-02 (#129)](https://github.com/jaymmedija22/Techvengers/issues/129) | Job list and create/edit management with validation, persistence, permissions, and consistent department/job relationships. | Sean — Developer | P1 | 5 | Closed |
| [S3-DEV-03 (#130)](https://github.com/jaymmedija22/Techvengers/issues/130) | Employee listing with search/filter and employee status, backed by the HR schema. | Sean — Developer | P1 | 5 | Closed |
| [S3-DEV-04 (#131)](https://github.com/jaymmedija22/Techvengers/issues/131) | Employee create/edit form with required-field validation, persistence, and authorized actions. | Sean — Developer | P1 | 5 | Closed |
| [S3-DEV-05 (#132)](https://github.com/jaymmedija22/Techvengers/issues/132) | Employee soft-delete/restore and separation-date behavior, including appropriate status handling. | Sean — Developer | P1 | 3 | Closed |
| [S3-DEV-06 (#133)](https://github.com/jaymmedija22/Techvengers/issues/133) | Add, edit, and delete employee job-history entries for promotions or transfers. | Sean — Developer | P1 | 8 | Closed |
| [S3-DEV-07 (#134)](https://github.com/jaymmedija22/Techvengers/issues/134) | Employee profile with a chronological job timeline and the permitted employee/job-history details. | Sean — Developer | P1 | 5 | Closed |
| [S3-DEV-08 (#135)](https://github.com/jaymmedija22/Techvengers/issues/135) | Apply the View Job History permission to job-history and salary visibility. | Sean — Developer | P1 | 3 | Closed |
| [S3-TST-01 (#166)](https://github.com/jaymmedija22/Techvengers/issues/166) | Test Department and Job listing, create/edit, search/filter, validation, permissions, and persistence; record execution results. | Kenchie — Tester | P1 | 5 | Open |
| [S3-TST-02 (#167)](https://github.com/jaymmedija22/Techvengers/issues/167) | Test Employee listing, search/filter, create/edit, required and invalid data, duplicate employee number, soft-delete/restore, and separation date. | Kenchie — Tester | P1 | 5 | Open |
| [S3-TST-03 (#168)](https://github.com/jaymmedija22/Techvengers/issues/168) | Test job-history add/edit/delete, promotions/transfers, effective dates, duplicate-date prevention, and salary-related behavior. | Kenchie — Tester | P1 | 5 | Open |
| [S3-TST-04 (#169)](https://github.com/jaymmedija22/Techvengers/issues/169) | Verify job-history and salary visibility for users with and without the View Job History right across relevant HR screens. | Kenchie — Tester | P1 | 3 | Open |
| [S3-TST-05 (#170)](https://github.com/jaymmedija22/Techvengers/issues/170) | Regression-test Sprints 1–2 authentication, users/roles/permissions, customer/product workflows, and other applicable existing features. | Kenchie — Tester | P1 | 5 | Open |
| [S3-TST-06 (#171)](https://github.com/jaymmedija22/Techvengers/issues/171) | Log Sprint 3 defects with reproduction details, expected/actual results and severity; track fixes and verify retests. | Kenchie — Tester | P1 | 3 | Open |

**Proposed total:** 113 points (Developer 39, DB Admin 16, UI/UX Designer 19, Tester 26, Scrum Master 13). This is an estimate of the listed issues, not actual completed velocity; validate estimates and the sprint commitment with the team. At this snapshot, 13 issues are closed and 17 are open according to GitHub issue state.

The six Tester tasks are linked to the Department/Job, Employee, Job History, permission, regression, and defect-tracking work above. Their P1 priorities and point estimates are proposed for team confirmation; the GitHub issues themselves do not specify point estimates or priority fields.

## 5. Priority Guidance

- **P1 — Core / required:** HR management and history workflows, access control, supporting schema integrity, design handoffs needed for implementation, and essential Scrum coordination.
- **P2 — Supporting / follow-up:** demo data, indexes and backup/restore, usability review, and velocity/risk reporting. Escalate any item to P1 if it blocks the Sprint Goal or a release decision.

These are relative planning priorities. The Scrum Master and owners should confirm order against carryover, team capacity, and current issue status.

## 6. Dependencies and Recommended Coordination

The following links combine dependencies stated in the GitHub issue descriptions with the practical integration order for the HR workflows:

1. **Design to implementation:** UIX-01 informs DEV-01/02; UIX-02 informs DEV-03/04/07; UIX-03 and UIX-04 inform DEV-06/07/08. UIX-05 needs the implemented screens and a build ready for review.
2. **Schema to application:** DBA-01 and DBA-03 support employee list/profile and employee-to-account behavior. The department/job schema and DEV-01/02 support employee assignment and history flows.
3. **Job-history integrity:** DBA-02 must be coordinated with DEV-06 so effective-date validation is enforced by the database and surfaced appropriately by the application. DEV-06 and DEV-07 feed DEV-08's restricted history/salary presentation.
4. **Lifecycle protections:** DBA-04 verifies delete constraints alongside DEV-05/06 and the department/job relationships; coordinate expected user-facing behavior with the Developer.
5. **Data and operations:** DBA-05 should follow the required HR schema and provide repeatable data for demonstration and verification. DBA-06 should be checked against the actual HR queries and schema.
6. **Testing and defects:** TST-01 through TST-03 depend on the corresponding Department/Job, Employee, and Job History functionality and supporting schema/validation being available in a testable build. TST-04 follows DEV-08's View Job History permission behavior. TST-05 runs against the integrated changes and existing Sprint 1–2 modules. TST-06 collects findings from all test tasks, with Developer fixes and Tester retests tracked to resolution.
7. **Sprint control:** SM-02 reviewed Sprint 2 issues and found no carryover candidate among the 30 closed task issues; see [`S3-SM-02-Sprint-2-Carryover-Review.md`](./S3-SM-02-Sprint-2-Carryover-Review.md). SM-03 checks progress mid-sprint; SM-04 and SM-05 use verified completion and feedback at sprint end.

**Dependency validation required:** the current issue descriptions contain a possible ordering cycle around DBA-01/02 and DEV-06 (some database tasks list DEV-06 as a prerequisite while DEV-06 requires job-history database support). Confirm whether an existing schema is the prerequisite, then update issue dependencies to reflect a buildable order.

## 7. Board Organization and Communication

Use the existing Sprint 2 workflow columns: **Todo**, **In Progress**, **Review**, and **Done**. Keep the GitHub issue as the source for task acceptance criteria and use Project fields/views for sprint status, owner, role, priority, estimate, and dependency tracking. Group or filter work by role and priority so cross-role handoffs are visible.

The linked issues currently show assignees and open/closed issue state, but their issue descriptions do not record priority or story points. The active GitHub Project board could not be inspected or updated during this planning pass because the authenticated GitHub CLI lacks the `project` scope. Therefore, this document does **not** claim that the Project board has been updated; board synchronization remains to be completed after Project access is authorized. Verify each estimate, priority, and Project column against the board before treating this register as approved.

At planning and each progress update, every owner should communicate:

- Completed work and a link to its deliverable or pull request.
- Current work and the next handoff/dependency.
- Blockers, risks, or changes to the estimate/date.
- Any acceptance-criteria or scope change requiring team agreement.

## 8. Items to Confirm with the Team

- Sprint start/end dates, team capacity, and final commitment.
- Confirm that the Sprint 2 Project board agrees with the issue-based review: 30 closed Sprint 2 issues and no carryover identified.
- Proposed priorities and Fibonacci estimates in the task register.
- Project board access and synchronized status/role/priority/estimate fields for all 30 Sprint 3 issues.
- Confirm ownership, priorities, and estimates for the six Sprint 3 Tester issues (#166–#171) and ensure each task has the intended Project board fields.
- Resolution of the database/developer dependency ordering noted above.

## 9. Definition of Done

Follow the team's Definition of Done in [`S1-SM-03_Team_Governance.md`](./team/S1-SM-03_Team_Governance.md). A task is complete only after its acceptance criteria and deliverables are satisfied, required tests/review and documentation are complete, changes are committed and pushed on the assigned branch, and the team accepts the result. Keep the issue and Project status aligned with that decision.

---

**Document status:** Draft — pending team review and Project board synchronization.
**Approval:** To be confirmed by the Techvengers team.
