# TECHVENGERS
# HOPE ERP — Team Governance

**Task ID:** S1-SM-03  
**Document:** Team Working Agreement, Definition of Done, and Role Guide  
**Prepared by:** Scrum Master  
**Version:** 1.0  
**Status:** Draft — Pending Team Approval  
**Date:** November 4, 2026

---

## Document Purpose

This document establishes the team's shared expectations, quality standards, and role responsibilities for developing the HOPE ERP system.

It contains three main components:

1. **Team Working Agreement** — defines how team members communicate, collaborate, manage tasks, and handle project work.
2. **Definition of Done** — establishes the conditions that must be satisfied before a task can be considered complete.
3. **Role Guide** — clarifies the responsibilities and expectations of each team role.

The purpose is to promote accountability, consistency, transparency, collaboration, and quality throughout the project.

This document is a team proposal and will become the official working agreement after discussion and approval by the team.

# 1. Team Working Agreement

## 1.1 Team Composition

The Techvengers team consists of five members working together to develop the HOPE ERP system.

| Team Member | Assigned Role | Primary Responsibility |
|---|---|---|
| Jay M | Scrum Master | Facilitate the Scrum process, coordinate activities, monitor progress, and help resolve blockers. |
| Sean | Developer | Implement and maintain the application's frontend and backend functionality. |
| Ace | UI/UX Designer | Design the user interface, user experience, layouts, and visual consistency of the system. |
| Macline | Database Administrator | Design, maintain, and manage the database structure, migrations, and seed data. |
| Kenchie | Tester | Prepare test cases, execute tests, identify defects, and verify fixes. |

## 1.2 Communication and Collaboration

1. All members must communicate respectfully and professionally.
2. Team members should provide regular updates about their assigned tasks.
3. Members must inform the Scrum Master and affected teammates when they encounter blockers or delays.
4. Questions and concerns should be raised as early as possible.
5. Important decisions and changes must be communicated to the relevant team members.
6. Team members should cooperate and provide assistance when another member needs support.

## 1.3 Task Assignment and Accountability

1. Each task must have an assigned owner responsible for its completion.
2. Members should understand the requirements and expected deliverables before starting a task.
3. Task progress must be reflected accurately on the team's task board.
4. Members should notify the Scrum Master if a task is at risk of missing its deadline.
5. Work should not be marked Done until it satisfies the agreed Definition of Done.
6. If responsibilities overlap, affected members should coordinate before making changes.

## 1.4 Git and Version Control Practices

1. Team members should work using their assigned feature branches.
2. Direct commits to the `main` branch should be avoided.
3. Commit messages should clearly describe the changes made.
4. Members must push their changes to the remote repository.
5. Pull Requests should be used when proposing changes to `main`.
6. Changes should be reviewed before merging according to the team's agreed review process.
7. Conflicts must be resolved carefully, with affected members informed when necessary.
8. Passwords, API keys, database credentials, and other secrets must never be committed to the repository.

## 1.5 Role Coordination

1. Developers must coordinate with the DB Admin when application changes require database modifications.
2. Developers must coordinate with the UI/UX Designer to ensure implementation follows approved interface designs.
3. The Tester should be involved in reviewing requirements and preparing test cases before implementation is completed.
4. Developers should address defects reported by the Tester.
5. The DB Admin should coordinate database changes with Developers to avoid integration problems.
6. The Scrum Master facilitates coordination and helps resolve blockers across all roles.

## 1.6 Meetings and Progress Updates

1. The team's primary communication channel is its designated online group chat.
2. Members should regularly check the group chat for project announcements, task updates, questions, and concerns.
3. Team members should provide progress updates through the group chat, including:
   - Completed tasks.
   - Tasks currently in progress.
   - Upcoming activities.
   - Blockers or difficulties encountered.
4. Members should notify the Scrum Master and relevant teammates as soon as possible when they encounter blockers or delays.
5. Important decisions, task changes, and agreements must be documented in the group chat or the team's shared project documentation.
6. Online meetings may be scheduled when discussions require more detailed coordination.
7. Members who cannot participate in a scheduled online meeting should inform the team in advance and provide their updates through the group chat.
8. The Scrum Master facilitates communication and ensures that important concerns and action items are followed up.

## 1.7 Conflict Resolution

1. Team members should discuss disagreements respectfully and focus on project requirements.
2. Technical disagreements should be resolved through discussion, evidence, and testing where possible.
3. If a disagreement cannot be resolved by the involved members, the Scrum Master facilitates a discussion.
4. Decisions affecting project scope, deadlines, or major technical direction should be communicated to the team.

## 1.8 Agreement and Commitment

All team members are expected to review, understand, and follow this working agreement.

The agreement may be revised when the team identifies improvements or changes in its workflow.

**Approval status:** Pending team discussion and agreement.

**Communication method:** Online group chat, supplemented by scheduled online meetings when necessary.

# 2. Definition of Done (DoD)

## 2.1 Purpose

The Definition of Done establishes the minimum quality standards that must be satisfied before a task, feature, or deliverable can be considered complete.

All Techvengers members are responsible for maintaining quality within their assigned work. The Tester coordinates testing activities, but every team member is also expected to check and verify their own work.

## 2.2 General Completion Criteria

A task may be marked Done when all applicable criteria are satisfied:

- [ ] The task requirements and acceptance criteria have been understood.
- [ ] All required deliverables have been completed.
- [ ] The output meets the agreed requirements.
- [ ] The assigned member has checked and verified their own work.
- [ ] Relevant testing has been performed.
- [ ] Identified defects have been fixed or properly documented and accepted by the team.
- [ ] The work has been reviewed by the appropriate team member when required.
- [ ] Relevant documentation has been updated.
- [ ] Changes have been committed and pushed to the appropriate Git branch.
- [ ] Required Pull Request reviews and approvals have been completed.
- [ ] Changes have been merged into the target branch when required.
- [ ] The task board has been updated to reflect the actual status.

## 2.3 Database Task Completion Criteria

For database-related tasks:

- [ ] Required tables, columns, relationships, and constraints have been created.
- [ ] SQL migrations or seed scripts are included in the repository.
- [ ] Database changes have been successfully applied.
- [ ] Database structure and records have been verified.
- [ ] Seed data has been checked for correctness and duplication.
- [ ] Sensitive credentials and passwords are not included in the repository.
- [ ] Database changes have been communicated to the Developer.
- [ ] Relevant database documentation has been updated.

## 2.4 Development Task Completion Criteria

For application development tasks:

- [ ] The implemented functionality meets the agreed requirements.
- [ ] Frontend and backend integration works as expected, where applicable.
- [ ] Input validation and error handling are implemented.
- [ ] Authentication, authorization, and security requirements are enforced.
- [ ] The Developer has tested the implemented functionality.
- [ ] The Tester has performed relevant functional testing.
- [ ] Identified defects have been addressed and fixes have been retested.
- [ ] Changes have been submitted for review through a Pull Request.

## 2.5 UI/UX Design Completion Criteria

For UI/UX-related tasks:

- [ ] Required screens and interface components have been designed.
- [ ] Designs follow the agreed project requirements.
- [ ] Layouts, colors, typography, and components are consistent.
- [ ] Navigation and user interaction flows have been considered.
- [ ] Designs have been reviewed with the Developer.
- [ ] Necessary design revisions have been completed.
- [ ] Approved design files are accessible to the team.

## 2.6 Testing Completion Criteria

For testing-related tasks:

- [ ] Test cases are based on the agreed requirements.
- [ ] Relevant test scenarios have been executed.
- [ ] Actual results have been compared with expected results.
- [ ] Defects have been documented and communicated to the Developer.
- [ ] Fixed defects have been retested.
- [ ] Testing results and unresolved issues have been recorded.
- [ ] The test status has been communicated to the team.

## 2.7 Task Acceptance and Completion

1. The assigned task owner is responsible for completing the deliverable and ensuring that it meets the agreed requirements.
2. The assigned member must perform an initial check of their own work before presenting it for team review.
3. The Tester coordinates testing activities, documents results, and communicates identified defects to the team.
4. Other team members may participate in testing and verification to help ensure the quality of the deliverable.
5. Identified defects must be addressed and retested before the task is considered complete, unless the team explicitly accepts a documented exception.
6. The entire Techvengers team collectively reviews and agrees whether the deliverable satisfies the agreed Definition of Done.
7. The Scrum Master facilitates the review and ensures that the team's decision and task status are properly documented.
8. A task may only be marked Done after the team agrees that its applicable completion criteria have been satisfied.

## 2.8 Continuous Improvement

The Definition of Done may be reviewed and improved as the team gains experience, encounters new quality requirements, or identifies improvements to its development process.

**Acceptance authority:** The entire Techvengers team collectively agrees on task completion.

# 3. Role Guide

## 3.1 Purpose

This section defines the responsibilities, expectations, and collaboration guidelines for each member of the Techvengers team. Every member must understand their assigned role while remaining responsible for communicating and cooperating with the entire team.

## 3.2 Scrum Master — Jay M. A. Medija

**Primary Responsibility:** Facilitate the team's workflow and help ensure that project activities follow the agreed working practices.

Responsibilities:
- Facilitate team discussions, coordination, and progress updates.
- Monitor task progress and maintain transparency regarding project status.
- Help identify and address blockers that prevent team members from completing their tasks.
- Ensure that team members understand their responsibilities and agreed priorities.
- Facilitate reviews of completed work and document the team's decisions.
- Encourage communication, collaboration, and continuous improvement.
- Help ensure that the Definition of Done is consistently followed.

**Expected Deliverables:**
- Team Working Agreement
- Definition of Done
- Role Guide
- Progress and coordination records
- Task status and review updates

## 3.3 Developer — Sean Andrei Manabat

**Primary Responsibility:** Develop and maintain the functional features of the HOPE ERP system.

Responsibilities:
- Implement application features based on approved requirements and designs.
- Develop and maintain frontend and backend functionality as assigned.
- Integrate application components with the database.
- Apply appropriate validation, error handling, and security practices.
- Test implemented functionality and fix identified defects.
- Coordinate with the UI/UX Designer and Database Administrator.
- Submit code changes through the agreed Git workflow.
- Provide updates about development progress and blockers.

**Expected Deliverables:**
- Working application features
- Frontend and backend code
- Integration updates
- Developer testing results
- Code documentation where necessary

## 3.4 UI/UX Designer — Ace Tafalla

**Primary Responsibility:** Design an understandable, consistent, and user-friendly interface for the HOPE ERP system.

Responsibilities:
- Gather and organize interface requirements with the team.
- Create wireframes, layouts, prototypes, and interface designs.
- Maintain consistency in colors, typography, spacing, and components.
- Consider usability, accessibility, and user navigation.
- Communicate design specifications to the Developer.
- Review implemented interfaces and identify differences from approved designs.
- Revise designs based on feedback and agreed requirements.

**Expected Deliverables:**
- Wireframes and prototypes
- Approved interface designs
- Design specifications and assets
- Design revisions and feedback

## 3.5 Database Administrator — Francis Macline Olinares

**Primary Responsibility:** Design, organize, maintain, and protect the database structure and data of the HOPE ERP system.

Responsibilities:
- Design and maintain database tables, relationships, and constraints.
- Prepare and manage database migrations and seed files.
- Maintain data integrity and consistency.
- Coordinate database requirements with the Developer.
- Verify database changes before considering them complete.
- Apply appropriate database access and security practices.
- Document database structures and important changes.
- Avoid committing passwords, credentials, or other sensitive information to the repository.

**Expected Deliverables:**
- Database schema and relationship definitions
- Migration and seed files
- Database documentation
- Database verification results
- Database change records

## 3.6 Tester — Kenchie Cabug-os

**Primary Responsibility:** Coordinate testing activities and help verify that the HOPE ERP system meets its functional and quality requirements.

Responsibilities:
- Prepare test cases based on agreed requirements.
- Coordinate functional and integration testing.
- Verify expected and actual results.
- Record, classify, and report identified defects.
- Coordinate defect resolution with the responsible team member.
- Retest corrected features and verify fixes.
- Maintain testing records and communicate testing status.
- Participate in team reviews of completed deliverables.

**Expected Deliverables:**
- Test plans and test cases
- Test execution results
- Defect reports
- Retest results
- Testing summaries

## 3.7 Shared Responsibilities of All Team Members

Regardless of assigned role, every team member is expected to:

- Communicate progress, blockers, and important updates through the team's online group chat.
- Follow the agreed Git and version control practices.
- Review and test their own work before presenting it to the team.
- Participate in relevant reviews and provide constructive feedback.
- Coordinate with members whose tasks depend on their work.
- Protect project files, credentials, and sensitive information.
- Follow the team's Definition of Done.
- Take responsibility for the quality and timely completion of assigned tasks.
- Participate in collective decisions about whether deliverables are complete.

## 3.8 Role Coordination and Collaboration

Team members must coordinate whenever their responsibilities overlap or depend on one another.

- **Scrum Master and all members:** Coordinate progress, priorities, blockers, and team decisions.
- **Developer and UI/UX Designer:** Coordinate approved designs, interface implementation, and design feedback.
- **Developer and Database Administrator:** Coordinate database requirements, data structures, queries, and integration.
- **Tester and Developer:** Coordinate test scenarios, defect reports, corrections, and retesting.
- **Entire team:** Participate in reviews and collectively agree whether completed deliverables satisfy the Definition of Done.

## 3.9 Accountability

Each team member is accountable for completing assigned responsibilities and communicating any issues that may affect delivery.

Assigned roles establish primary responsibilities, but they do not prevent members from helping one another. The team shares responsibility for the overall quality and success of the HOPE ERP project.