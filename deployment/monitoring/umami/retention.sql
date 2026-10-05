-- Umami keeps data forever when self-hosted. Deletes analytics older than 13 months, and event data
-- (which carries the optional feedback comments) older than 12 months, as the privacy policy promises.
-- Tables that do not exist in the running Umami version are skipped.
DO $$
DECLARE
    cutoff timestamptz := now() - interval '13 months';
    event_data_cutoff timestamptz := now() - interval '12 months';
    t text;
BEGIN
    IF to_regclass('public.event_data') IS NOT NULL THEN
        DELETE FROM event_data WHERE created_at < event_data_cutoff;
    END IF;
    FOREACH t IN ARRAY ARRAY['session_data', 'revenue', 'heatmap_event', 'session_replay'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('DELETE FROM %I WHERE created_at < $1', t) USING cutoff;
        END IF;
    END LOOP;
    DELETE FROM website_event WHERE created_at < cutoff;
    DELETE FROM session s
        WHERE s.created_at < cutoff
        AND NOT EXISTS (SELECT 1 FROM website_event e WHERE e.session_id = s.session_id);
END $$;
