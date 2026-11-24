# HOPE ERP database indexes and recovery

## HR index review

Employee, department, and job identifiers are already primary keys. Job history
already has a primary key on `(empno, jobcode, effdate)`, a unique
`(empno, effdate)` index for the one-entry-per-day rule and employee timeline,
and indexes on `jobcode` and `deptcode` for foreign-key checks. Those indexes
also support the profile and timeline joins; do not add duplicate B-tree
indexes for the same leading columns.

Migration `0023_hr_search_indexes.sql` adds PostgreSQL trigram GIN indexes for
the `%term%` searches in the employee listing: employee number and names,
combined employee name, and job/department codes and labels. Existing primary
keys remain the indexes for exact ID lookups and joins. Trigram indexes improve
substring matching with terms of at least three characters; very small tables
may correctly continue to use sequential scans.

On an authorized non-production database, capture plans before and after the
index migration:

```powershell
cd server
# Set HOPE_BACKUP_DATABASE_URL through the approved secret manager in this process.
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
. .\db\scripts\_load-postgres-connection.ps1
$databaseName = Set-HopePostgresConnectionFromEnvironment -EnvironmentVariable HOPE_BACKUP_DATABASE_URL
psql --no-psqlrc --set ON_ERROR_STOP=1 --file .\db\verification\0023_hr_index_explain.sql --dbname "$databaseName"
npm run migrate
psql --no-psqlrc --set ON_ERROR_STOP=1 --file .\db\verification\0023_hr_index_explain.sql --dbname "$databaseName"
```

Compare execution time, buffers, and chosen scan/index nodes for the same
queries. The script also lists the HR indexes. Record the results against a
representative data volume; a tiny development fixture is not evidence of
production-scale latency. Migration 0023 runs `ANALYZE` on the affected tables
after index creation.

### Development-database observations

The configured development database had 40 employees, 68 job-history records,
22 jobs, and 12 departments at test time. The employee-only substring search
was a sequential scan before and after the migration: one run measured 0.94 ms
before and 0.23 ms after, but this tiny, cache-sensitive sample does not
demonstrate a reliable index speedup. The full joined listing query measured
0.99 ms after migration and also used sequential scans, which PostgreSQL
correctly prefers for these small tables. An eligibility check confirmed the
employee trigram indexes can serve a bitmap index plan. Re-run the documented
before/after procedure against production-like data before claiming a
performance improvement.

## Backup

Install PostgreSQL client tools (`pg_dump`, `pg_restore`, and `psql`) whose
major version is compatible with the database server. Set
`HOPE_BACKUP_DATABASE_URL` in the current PowerShell process through the team's
approved secret-management method. The connection URL is read from the process
environment and is not placed in the command line or printed by the script.

```powershell
# Set HOPE_BACKUP_DATABASE_URL through the approved secret manager in this process.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\db\scripts\backup.ps1
```

The script writes a timestamped custom-format dump and a SHA-256 sidecar under
`server/db/backups/`. The folder is git-ignored. The archive includes the
`public` schema objects and records used by HOPE ERP, including migrations,
application tables, and session data. PostgreSQL cluster-wide roles and server
configuration are managed separately and are not part of a database dump.
Keep backup files in approved encrypted, access-controlled storage; do not
commit them.

## Restore to a disposable database

Restore is deliberately restricted to a newly created, empty, non-production
database whose name includes `test`, `sandbox`, `restore`, `local`, or `dev`.
Names containing `prod`, `production`, or `live` are rejected. The script
requires explicit disposable-target confirmation, verifies the archive
checksum and format, and checks for existing public objects before restoring.
It never uses `--clean` or drops objects. Restore runs in one transaction and
verifies essential HR tables, row counts, and employee references afterward.

Create a separate disposable database using the team's approved process, then
set the following process environment variables using the approved secret
manager. Do not copy production credentials into a development environment.

```powershell
# Set HOPE_RESTORE_DATABASE_URL through the approved secret manager in this process.
$env:HOPE_RESTORE_TARGET_IS_DISPOSABLE = "YES"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\db\scripts\restore.ps1 -BackupFile .\db\backups\hope-erp-20260101T000000000Z.dump -ConfirmDisposableTarget -Confirm
```

`-Confirm` prompts for one more explicit confirmation. A non-empty or
unrecognized database target is rejected before restore. Use a fresh database
for every recovery test; do not point this script at a production, shared
development, or otherwise active database. Restore with the same or a newer
PostgreSQL major version than the backup source.

The restore script verifies the presence of the employee, department, job,
and job-history tables and checks that every history row references an
employee. It prints restored row counts. Verify additional application-specific
objects and sign-in behavior in the disposable environment before accepting a
recovery test.

### Recovery verification status

The PowerShell scripts passed parser checks, and connection-string handling was
tested with a dummy URL without printing credentials. A real backup and restore
have not yet been run: the development workstation does not have `pg_dump`,
`pg_restore`, or `psql`, and no disposable empty restore database is configured.
Do not treat recovery as end-to-end verified until both scripts complete
successfully against an isolated test database and the printed table counts and
integrity checks have been reviewed.
