
-- S2-DBA-02: Retrieve product prices as of a specified date
--
-- A price is applicable when its effective date is on or before
-- the requested date. The most recent applicable price is returned.


-- 1. Retrieve the price of one product as of a given date.
-- Change the product code and requested date as needed.

WITH params AS (
    SELECT
        'AM0001'::varchar AS requested_prodcode,
        DATE '2010-06-01' AS requested_date
)
SELECT
    ph.prodcode,
    ph.effdate,
    ph.unitprice,
    params.requested_date AS as_of_date
FROM public.pricehist ph
CROSS JOIN params
WHERE ph.prodcode = params.requested_prodcode
  AND ph.effdate <= params.requested_date
ORDER BY ph.effdate DESC
LIMIT 1;


-- 2. Retrieve the applicable price of every product as of a given date.
-- Change the requested date as needed.

WITH params AS (
    SELECT DATE '2010-06-01' AS requested_date
),
ranked_prices AS (
    SELECT
        ph.prodcode,
        ph.effdate,
        ph.unitprice,
        ROW_NUMBER() OVER (
            PARTITION BY ph.prodcode
            ORDER BY ph.effdate DESC
        ) AS rn
    FROM public.pricehist ph
    CROSS JOIN params
    WHERE ph.effdate <= params.requested_date
)
SELECT
    prodcode,
    effdate,
    unitprice
FROM ranked_prices
WHERE rn = 1
ORDER BY prodcode;
