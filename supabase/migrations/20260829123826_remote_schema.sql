-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_graphql;

ALTER TABLE public.rides
  DROP COLUMN avg_speed;

ALTER TABLE public.rides
  DROP COLUMN max_speed;

ALTER TABLE public.rides
  DROP COLUMN stability_score;

COMMENT ON COLUMN public.rides.is_safe_ride IS NULL;

DROP POLICY "Allow anonymous inserts to feedbacks" ON public.feedbacks;

DROP POLICY "Allow anonymous read to feedbacks" ON public.feedbacks;

DROP TABLE public.feedbacks;

DROP POLICY "Anyone can report hazards" ON public.hazards;

DROP POLICY "Anyone can view hazards" ON public.hazards;

DROP POLICY "Authenticated users can create hazards." ON public.hazards;

DROP POLICY "Hazards are viewable by everyone." ON public.hazards;

DROP POLICY "Public profiles are viewable by everyone." ON public.profiles;

DROP POLICY "Users can update own profile." ON public.profiles;

DROP POLICY "Users can view their own score logs" ON public.safety_score_logs;

CREATE ROLE supabase_privileged_role;

GRANT supabase_privileged_role TO postgres;

ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_paths;

GRANT SELECT, USAGE ON SEQUENCE public.referrals_id_seq TO anon;

GRANT SELECT, USAGE ON SEQUENCE public.referrals_id_seq TO authenticated;

GRANT SELECT, USAGE ON SEQUENCE public.referrals_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.get_hazard_policy_effect (
  radius_meters integer DEFAULT 200,
  window_days   integer DEFAULT 30,
  max_hazards   integer DEFAULT 10
)
  RETURNS TABLE (
    hazard_id         uuid,
    hazard_title      text,
    hazard_type       text,
    hazard_lat        double precision,
    hazard_lng        double precision,
    hazard_created_at timestamp with time zone,
    before_count      bigint,
    after_count       bigint,
    reduction_pct     numeric
  )
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
WITH recent_hazards AS (
    SELECT id, title, type, lat, lng, created_at
    FROM public.hazards
    WHERE created_at > now() - ((window_days * 2) || ' days')::interval
    ORDER BY created_at DESC
    LIMIT max_hazards
),
deg AS (
    SELECT (radius_meters::numeric / 111000.0)::numeric AS d
)
SELECT
    h.id AS hazard_id,
    h.title AS hazard_title,
    h.type AS hazard_type,
    h.lat AS hazard_lat,
    h.lng AS hazard_lng,
    h.created_at AS hazard_created_at,
    COUNT(*) FILTER (
        WHERE nme.occurred_at BETWEEN h.created_at - (window_days || ' days')::interval
                                  AND h.created_at
    ) AS before_count,
    COUNT(*) FILTER (
        WHERE nme.occurred_at >  h.created_at
          AND nme.occurred_at <= h.created_at + (window_days || ' days')::interval
    ) AS after_count,
    CASE
        WHEN COUNT(*) FILTER (
            WHERE nme.occurred_at BETWEEN h.created_at - (window_days || ' days')::interval
                                      AND h.created_at
        ) > 0
        THEN ROUND(
            (1 - COUNT(*) FILTER (
                WHERE nme.occurred_at >  h.created_at
                  AND nme.occurred_at <= h.created_at + (window_days || ' days')::interval
            )::numeric
            / COUNT(*) FILTER (
                WHERE nme.occurred_at BETWEEN h.created_at - (window_days || ' days')::interval
                                          AND h.created_at
            )) * 100, 1
        )
        ELSE NULL
    END AS reduction_pct
FROM recent_hazards h
CROSS JOIN deg
LEFT JOIN public.near_miss_events nme
       ON ABS(nme.lat - h.lat) <= deg.d
      AND ABS(nme.lng - h.lng) <= deg.d
      AND nme.occurred_at BETWEEN h.created_at - (window_days || ' days')::interval
                              AND h.created_at + (window_days || ' days')::interval
GROUP BY h.id, h.title, h.type, h.lat, h.lng, h.created_at
ORDER BY h.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_near_miss_clusters (
  sw_lat        double precision DEFAULT NULL::double precision,
  sw_lng        double precision DEFAULT NULL::double precision,
  ne_lat        double precision DEFAULT NULL::double precision,
  ne_lng        double precision DEFAULT NULL::double precision,
  since_days    integer          DEFAULT 30,
  grid_decimals integer          DEFAULT 3,
  min_count     integer          DEFAULT 2
)
  RETURNS TABLE (
    cluster_lat double precision,
    cluster_lng double precision,
    event_count bigint,
    avg_speed   numeric,
    weather_pct numeric,
    last_seen   timestamp with time zone
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
    WITH params AS (
        SELECT
            CASE
                WHEN sw_lat IS NOT NULL AND sw_lng IS NOT NULL
                 AND ne_lat IS NOT NULL AND ne_lng IS NOT NULL
                THEN ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)::geography
            END AS env,
            GREATEST(LEAST(grid_decimals, 5), 1)  AS gd,
            GREATEST(min_count, 1)                AS mc,
            GREATEST(since_days, 1)               AS sd
    )
    SELECT
        ROUND(lat::numeric, p.gd)::double precision  AS cluster_lat,
        ROUND(lng::numeric, p.gd)::double precision  AS cluster_lng,
        COUNT(*)                                     AS event_count,
        ROUND(AVG(nm.speed_kmh)::numeric, 1)         AS avg_speed,
        ROUND((SUM(nm.weather_risk::int)::numeric
               / NULLIF(COUNT(*), 0)) * 100, 1)      AS weather_pct,
        MAX(nm.occurred_at)                          AS last_seen
    FROM public.near_miss_events nm, params p
    WHERE nm.occurred_at > now() - make_interval(days => p.sd)
      AND nm.geog IS NOT NULL
      AND (p.env IS NULL OR ST_Intersects(nm.geog, p.env))
    GROUP BY 1, 2, p.mc
    HAVING COUNT(*) >= p.mc
    ORDER BY event_count DESC
    LIMIT 500;
$function$;

CREATE OR REPLACE FUNCTION public.get_near_miss_heatmap_geojson (
  sw_lat        double precision DEFAULT NULL::double precision,
  sw_lng        double precision DEFAULT NULL::double precision,
  ne_lat        double precision DEFAULT NULL::double precision,
  ne_lng        double precision DEFAULT NULL::double precision,
  since_days    integer          DEFAULT 30,
  grid_decimals integer          DEFAULT 3,
  min_count     integer          DEFAULT 2
)
  RETURNS jsonb
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
    SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry', jsonb_build_object(
                        'type',        'Point',
                        'coordinates', jsonb_build_array(c.cluster_lng, c.cluster_lat)
                    ),
                    'properties', jsonb_build_object(
                        'count',       c.event_count,
                        'avg_speed',   c.avg_speed,
                        'weather_pct', c.weather_pct,
                        'last_seen',   c.last_seen
                    )
                )
            ),
            '[]'::jsonb
        )
    )
    FROM public.get_near_miss_clusters(
        sw_lat, sw_lng, ne_lat, ne_lng,
        since_days, grid_decimals, min_count
    ) AS c;
$function$;

CREATE FUNCTION public.get_nearby_hazards (
  user_lat      double precision,
  user_lng      double precision,
  radius_meters double precision DEFAULT 50
)
  RETURNS SETOF public.hazards
  LANGUAGE sql
  AS $function$
  SELECT *
  FROM hazards
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_meters
  );
$function$;

GRANT ALL ON FUNCTION public.get_nearby_hazards(double precision, double precision, double precision) TO anon;

GRANT ALL ON FUNCTION public.get_nearby_hazards(double precision, double precision, double precision) TO authenticated;

GRANT ALL ON FUNCTION public.get_nearby_hazards(double precision, double precision, double precision) TO service_role;

CREATE OR REPLACE FUNCTION public.get_rsr_by_zone (
  days_back integer DEFAULT 30
)
  RETURNS TABLE (
    zone_id      text,
    event_count  bigint,
    avg_rsr      numeric,
    avg_v_entry  numeric,
    avg_v_actual numeric
  )
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
    SELECT
        zone_id,
        COUNT(*) AS event_count,
        ROUND(AVG(rsr_value)::numeric, 1) AS avg_rsr,
        ROUND(AVG(v_entry)::numeric, 1) AS avg_v_entry,
        ROUND(AVG(v_actual_avg)::numeric, 1) AS avg_v_actual
    FROM public.zone_events
    WHERE started_at > now() - (days_back || ' days')::interval
    GROUP BY zone_id
    ORDER BY event_count DESC;
$function$;

CREATE OR REPLACE FUNCTION public.grant_referral_reward (
  p_invitee_user_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_inviter_code TEXT;
    v_inviter_id   UUID;
    v_referral_id  BIGINT;
    v_already      BOOLEAN;
    v_reward       INT := 500;
BEGIN
    SELECT referred_by_code INTO v_inviter_code
        FROM profiles WHERE id = p_invitee_user_id;

    IF v_inviter_code IS NULL OR v_inviter_code = '' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'no_referrer');
    END IF;

    SELECT id INTO v_inviter_id
        FROM profiles WHERE referral_code = v_inviter_code LIMIT 1;

    IF v_inviter_id = p_invitee_user_id THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'self_referral_blocked');
    END IF;

    SELECT id INTO v_referral_id
        FROM referrals WHERE invitee_user_id = p_invitee_user_id LIMIT 1;

    IF v_referral_id IS NULL THEN
        UPDATE referrals
            SET invitee_user_id = p_invitee_user_id,
                signed_up_at    = COALESCE(signed_up_at, now())
            WHERE id = (
                SELECT id FROM referrals
                    WHERE inviter_code = v_inviter_code AND invitee_user_id IS NULL
                    ORDER BY landed_at DESC LIMIT 1
            )
            RETURNING id INTO v_referral_id;
    END IF;

    IF v_referral_id IS NULL THEN
        INSERT INTO referrals (inviter_code, invitee_user_id, signed_up_at)
            VALUES (v_inviter_code, p_invitee_user_id, now())
            RETURNING id INTO v_referral_id;
    END IF;

    SELECT reward_granted INTO v_already FROM referrals WHERE id = v_referral_id;
    IF v_already THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'already_rewarded');
    END IF;

    IF v_inviter_id IS NULL THEN
        UPDATE profiles SET points = COALESCE(points, 0) + v_reward
            WHERE id = p_invitee_user_id;
        UPDATE referrals SET reward_granted = TRUE, first_ride_at = COALESCE(first_ride_at, now())
            WHERE id = v_referral_id;
        RETURN jsonb_build_object('ok', true, 'invitee_reward', v_reward, 'inviter_reward', 0, 'inviter_missing', true);
    END IF;

    UPDATE profiles SET points = COALESCE(points, 0) + v_reward
        WHERE id IN (v_inviter_id, p_invitee_user_id);
    UPDATE referrals SET reward_granted = TRUE, first_ride_at = COALESCE(first_ride_at, now())
        WHERE id = v_referral_id;

    RETURN jsonb_build_object('ok', true, 'invitee_reward', v_reward, 'inviter_reward', v_reward, 'inviter_id', v_inviter_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_near_miss_batch (
  events jsonb
)
  RETURNS TABLE (
    inserted_count integer,
    first_id       uuid,
    last_id        uuid
  )
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_count   integer := 0;
    v_first   uuid;
    v_last    uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required for near-miss batch insert'
            USING ERRCODE = '42501';
    END IF;

    IF events IS NULL OR jsonb_typeof(events) <> 'array' THEN
        RAISE EXCEPTION 'events must be a non-null JSON array, got %', jsonb_typeof(events)
            USING ERRCODE = '22023';
    END IF;

    WITH inserted AS (
        INSERT INTO public.near_miss_events (
            user_id, lat, lng, speed_kmh, deceleration_intensity,
            weather_risk, in_stress_zone, helmet_on,
            nearby_hazard_id, nearby_hazard_type, occurred_at
        )
        SELECT
            v_user_id,
            (e->>'lat')::double precision,
            (e->>'lng')::double precision,
            COALESCE((e->>'speed_kmh')::integer, 0),
            COALESCE((e->>'deceleration_intensity')::integer, 1),
            COALESCE((e->>'weather_risk')::boolean, false),
            COALESCE((e->>'in_stress_zone')::boolean, false),
            COALESCE((e->>'helmet_on')::boolean, false),
            NULLIF(e->>'nearby_hazard_id', ''),
            NULLIF(e->>'nearby_hazard_type', ''),
            COALESCE((e->>'occurred_at')::timestamptz, now())
        FROM jsonb_array_elements(events) AS e
        WHERE (e->>'lat')  IS NOT NULL
          AND (e->>'lng')  IS NOT NULL
          AND (e->>'lat')::double precision BETWEEN -90  AND 90
          AND (e->>'lng')::double precision BETWEEN -180 AND 180
        RETURNING id
    )
    SELECT COUNT(*)::integer, MIN(id), MAX(id)
      INTO v_count, v_first, v_last
      FROM inserted;

    RETURN QUERY SELECT v_count, v_first, v_last;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_rides_daily()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.rides_daily;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_safety_scores (
  grids jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  grid_item RECORD;
BEGIN
  FOR grid_item IN
    SELECT * FROM jsonb_to_recordset(grids) AS x(id TEXT, lat FLOAT, lng FLOAT, is_safe BOOLEAN)
  LOOP
    INSERT INTO safety_grid_scores (grid_id, lat_center, lng_center, safe_pass_count, risk_event_count, last_updated)
    VALUES (grid_item.id, grid_item.lat, grid_item.lng,
            CASE WHEN grid_item.is_safe THEN 1 ELSE 0 END,
            CASE WHEN NOT grid_item.is_safe THEN 1 ELSE 0 END,
            now())
    ON CONFLICT (grid_id) DO UPDATE SET
      safe_pass_count = safety_grid_scores.safe_pass_count + (CASE WHEN grid_item.is_safe THEN 1 ELSE 0 END),
      risk_event_count = safety_grid_scores.risk_event_count + (CASE WHEN NOT grid_item.is_safe THEN 1 ELSE 0 END),
      last_updated = now();
  END LOOP;
END;
$function$;

ALTER TABLE public.hazards
  ADD COLUMN location public.geography(Point,4326);

GRANT DELETE, INSERT, SELECT, UPDATE ON public.hazards TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.hazards TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.hazards TO service_role;

CREATE INDEX idx_hazards_location ON public.hazards USING gist (location);

GRANT DELETE, INSERT, SELECT, UPDATE ON public.near_miss_events TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.near_miss_events TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.near_miss_events TO service_role;

ALTER TABLE public.profiles
  ADD COLUMN age integer;

ALTER TABLE public.profiles
  ADD COLUMN profile_image text DEFAULT ''::text;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO service_role;

CREATE POLICY "Enable insert for all" ON public.profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable read access for all" ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Enable update for all" ON public.profiles
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));

GRANT DELETE, INSERT, SELECT, UPDATE ON public.referrals TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.referrals TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.referrals TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.ride_paths TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.ride_paths TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.ride_paths TO service_role;

CREATE POLICY "Users can insert their own ride paths" ON public.ride_paths
  FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.rides
  WHERE ((rides.id = ride_paths.ride_id) AND (rides.user_id = auth.uid())))));

GRANT DELETE, INSERT, SELECT, UPDATE ON public.rides TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.rides TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.rides TO service_role;

CREATE POLICY "Users can insert their own rides" ON public.rides
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));

GRANT DELETE, INSERT, SELECT, UPDATE ON public.safety_grid_scores TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.safety_grid_scores TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.safety_grid_scores TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.safety_score_logs TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.safety_score_logs TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.safety_score_logs TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.zone_events TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.zone_events TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.zone_events TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.rides_daily TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.rides_daily TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.rides_daily TO service_role;
