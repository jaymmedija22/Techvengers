
# S2-DBA-06: Search Performance Check and Index Tuning

## 1. Objective

Evaluate the search performance of the Customer and Product modules and add PostgreSQL indexes to support substring searches using ILIKE.

## 2. Existing Search Implementation

### Customer Search
- Searches custno, custname, and address.
- Uses ILIKE with leading and trailing wildcards.
- Supports active and deleted customer records.
- Supports filtering by payterm.

### Product Search
- Searches prodcode and description.
- Uses ILIKE with leading and trailing wildcards.
- Searches active products through vw_active_products.
- Supports filtering by unit.

## 3. Database Changes

Migration: `0013_search_performance_indexes.sql`

Enabled the PostgreSQL pg_trgm extension and created five GIN trigram indexes:

| Index | Table | Indexed expression |
|---|---|---|
| idx_customer_custno_trgm | customer | custno |
| idx_customer_custname_trgm | customer | COALESCE(custname, '') |
| idx_customer_address_trgm | customer | COALESCE(address, '') |
| idx_product_active_prodcode_trgm | product | prodcode |
| idx_product_active_description_trgm | product | COALESCE(description, '') |

Product indexes are partial indexes for active products (`is_deleted = FALSE`).

All five indexes were verified as valid and ready, using the `gin_trgm_ops` operator class.

## 4. Performance Benchmark

The following tests used `EXPLAIN (ANALYZE, BUFFERS)` with the same search term (`test`) before and after indexing.

| Metric | Customer Before | Customer After | Product Before | Product After |
|---|---:|---:|---:|---:|
| Execution Time | 0.506 ms | 0.500 ms | 0.314 ms | 0.316 ms |
| Planning Time | 1.369 ms | 15.162 ms | 0.549 ms | 3.174 ms |
| Scan Method | Sequential Scan | Sequential Scan | Sequential Scan | Sequential Scan |
| Rows Returned | 4 | 4 | 2 | 2 |

## 5. Findings

- Customer search execution time changed from 0.506 ms to 0.500 ms.
- Product search execution time changed from 0.314 ms to 0.316 ms.
- PostgreSQL continued choosing sequential scans for both searches.
- The current database contains only 93 customer records and 71 product records.
- Sequential scans are reasonable for these small tables.
- The GIN indexes were successfully created and verified.
- No significant execution-time improvement was demonstrated with the current dataset.

## 6. Existing Index Observation

The customer table contains two equivalent active customer-name B-tree indexes:

- idx_customer_active_custname
- idx_customer_active_name

They were identified as potential duplicate indexes but were not removed as part of this task.

## 7. Conclusion

S2-DBA-06 successfully implemented and verified PostgreSQL trigram GIN indexes for customer and product substring searches.

The benchmark showed that the current dataset is too small to demonstrate a meaningful performance improvement. PostgreSQL continues to prefer sequential scans, which is reasonable for the current record counts.

The new indexes provide additional indexing support as the database grows. Further benchmarking with a larger, representative dataset is recommended.
