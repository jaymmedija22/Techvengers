# HOPE ERP — Sprint 2 Planning Notes

**Task ID:** S2-SM-01  
**Document:** Sprint 2 Planning Notes and Board  
**Project:** HOPE ERP  
**Team:** Techvengers  
**Scrum Master:** Jay M. A. Medija  
**Version:** 1.0  
**Status:** Draft — Pending Team Review  
**Sprint Dates:** To be confirmed

---

## 1. Sprint Overview

Sprint 2 continues the development of the HOPE ERP system, focusing on database integrity and customer-management functionality.

### Team Composition

| Team Member | Role | Primary Responsibility |
|---|---|---|
| Jay M. A. Medija | Scrum Master | Facilitate Scrum activities, coordinate progress, and help resolve blockers |
| Sean Andrei Manabat | Developer | Implement and maintain frontend and backend functionality |
| Ace Tafalla | UI/UX Designer | Design and review the user interface and user experience |
| Francis Macline Olinares | Database Administrator | Manage database structure, migrations, constraints, and documentation |
| Kenchie Cabug-os | Tester | Prepare and execute tests, report defects, and verify fixes |

## 2. Sprint Goal

Deliver and improve core HOPE ERP database and customer-management functionality while maintaining data integrity, permission-based access, reliable audit tracking, and application quality.

## 3. Sprint Scope and Progress

The following items reflect work confirmed during project development. The team should review the official backlog before finalizing sprint scope.

### Database Administration

| Task ID | Description | Confirmed Status |
|---|---|---|
| S1-DBA-06 | Audit user permission grants and revocations | Done |
| S2-DBA-01 | Active customer/product views and partial indexes | Done |
| S2-DBA-02 | Current product price as-of-date queries | Done |
| S2-DBA-03 | Payment-term and product-unit validation constraints | Done |
| S2-DBA-04 | Child-record delete checks for customers and products | Done |

### Development

| Task ID | Description | Confirmed Status |
|---|---|---|
| S2-DEV-01 | Customer list with search and filter | Done |
| S2-DEV-02 | Customer create and edit form | Done |

### Scrum Management

| Task ID | Description | Confirmed Status |
|---|---|---|
| S2-SM-01 | Sprint 2 planning notes and board | In Progress |

**Note:** These statuses reflect the work confirmed in the project workflow. The team should verify them against the official task board and acceptance criteria.

## 4. Completed Deliverables

The following deliverables have been confirmed during the work completed so far:

- Permission grant and revocation audit logging.
- Active customer and product database views.
- Partial indexes for active records.
- Product price lookup using an effective date.
- Validation constraints for customer payment terms and product units.
- Documentation of foreign-key protections against deleting referenced customer and product records.
- Customer listing with search and payment-term filtering.
- Customer creation and editing with backend validation.
- Duplicate customer-number rejection.
- Permission checks for customer add and edit operations.
- Superadmin access to customer-management operations.

## 5. Definition of Done

The team will follow the Definition of Done in `docs/team/S1-SM-03_Team_Governance.md`.

A task should only be marked Done when its applicable criteria have been met, including:

- Requirements and acceptance criteria are satisfied.
- Required deliverables are complete.
- The task owner has checked their own work.
- Relevant tests have been performed.
- Identified defects have been fixed or formally accepted and documented.
- Required review and approval have been completed.
- Documentation has been updated.
- Changes have been committed and pushed to the appropriate branch.
- Required Pull Request reviews and merges have been completed.
- The task board reflects the actual status.
- The team collectively agrees that the task is complete.

## 6. Sprint Board Workflow

The Sprint 2 board will use these columns:

| Column | Meaning |
|---|---|
| Todo | Accepted work that has not started |
| In Progress | Work currently being performed |
| Review | Work awaiting review, testing, or verification |
| Done | Work accepted by the team under the Definition of Done |

### Board Management Guidelines

1. Every task must have an assigned owner.
2. Task descriptions should include requirements and expected deliverables.
3. Members should update task status when work progresses.
4. Blockers and delays should be communicated promptly.
5. Tasks should not be moved to Done before the team accepts the deliverable.
6. Completed work should be linked to its relevant Pull Request or documentation when applicable.

## 7. Roles and Responsibilities During Sprint 2

- **Scrum Master:** Facilitate planning, monitor progress, coordinate communication, and help resolve blockers.
- **Developer:** Implement assigned application features, integrate with the database, and fix reported defects.
- **UI/UX Designer:** Prepare and review interface designs and coordinate design feedback with the Developer.
- **Database Administrator:** Maintain database integrity, prepare migrations, verify database changes, and document database work.
- **Tester:** Prepare test cases, execute relevant tests, report defects, and retest fixes.

All team members are expected to communicate progress and collaborate when tasks overlap.

## 8. Risks and Considerations

| Risk or Consideration | Planned Response |
|---|---|
| Database changes may affect existing records | Verify migrations, constraints, and existing data |
| Permission checks may be inconsistent | Verify authorization on the backend and relevant frontend flows |
| Audit records may be incomplete | Verify audit behavior for relevant permission changes |
| Customer forms may accept invalid data | Test required fields, allowed values, and duplicate customer numbers |
| Integration may introduce regressions | Coordinate between Developer, Database Administrator, and Tester |
| Task progress may become unclear | Keep the task board and team updates current |

## 9. Items to Confirm with the Team

- Official Sprint 2 start and end dates.
- Final Sprint 2 backlog and priorities.
- Task owners and any supporting members.
- Estimates and team capacity.
- Remaining work and acceptance criteria.
- Team availability and planned review dates.

## 10. Sprint Review and Retrospective

At the end of the sprint, the team should:

1. Review completed work against the sprint goal.
2. Demonstrate completed application and database functionality.
3. Confirm that deliverables satisfy the Definition of Done.
4. Record unfinished work and carry it into the appropriate backlog.
5. Discuss blockers and issues encountered.
6. Identify improvements to the team's workflow for the next sprint.

---

**Document Status:** Draft — Pending Team Review  
**Approval:** To be confirmed by the Techvengers team.
