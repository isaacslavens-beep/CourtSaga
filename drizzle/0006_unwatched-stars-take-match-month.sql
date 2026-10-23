-- A match starred without watching sits in the diary and the saga by when it was played, not when it was starred
UPDATE "diary_entries" AS d SET "watched_date" = to_char(m."played_on", 'YYYY-MM')
FROM "matches" AS m
WHERE m."id" = d."match_id" AND d."watched_on" IS NULL;
