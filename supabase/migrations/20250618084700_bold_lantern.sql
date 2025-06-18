/*
  # PostGIS Spatial Functions for SafeGuard Eldos

  1. Spatial Functions
    - `get_incidents_near_location` - Find incidents within radius of a point
    - `get_safe_routes_near_location` - Find safe routes near a location
    - `calculate_route_safety_score` - Calculate safety score based on nearby incidents
    - `get_community_groups_for_location` - Find relevant community groups for a location
    - `update_route_safety_metrics` - Update route safety based on recent incidents

  2. Utility Functions
    - Distance calculations using PostGIS
    - Spatial indexing optimization
    - Real-time safety score updates

  3. Performance Optimizations
    - Spatial indexes for fast queries
    - Materialized views for common spatial queries
    - Trigger-based cache updates
*/

-- Function to get incidents near a specific location
CREATE OR REPLACE FUNCTION get_incidents_near_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000,
  result_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  incident_type TEXT,
  severity TEXT,
  title TEXT,
  description TEXT,
  location_address TEXT,
  location_area TEXT,
  is_verified BOOLEAN,
  verification_count INTEGER,
  is_urgent BOOLEAN,
  is_resolved BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.incident_type,
    i.severity,
    i.title,
    i.description,
    i.location_address,
    i.location_area,
    i.is_verified,
    i.verification_count,
    i.is_urgent,
    i.is_resolved,
    i.created_at,
    i.updated_at,
    ST_Distance(
      i.location_point::geometry,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
    ) as distance_meters
  FROM incidents i
  WHERE ST_DWithin(
    i.location_point::geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry,
    radius_meters
  )
  ORDER BY 
    CASE WHEN i.is_urgent THEN 0 ELSE 1 END,
    i.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Function to get safe routes near a location
CREATE OR REPLACE FUNCTION get_safe_routes_near_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 10000,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_address TEXT,
  end_address TEXT,
  distance_meters INTEGER,
  estimated_duration_minutes INTEGER,
  safety_score INTEGER,
  lighting_quality TEXT,
  patrol_coverage BOOLEAN,
  cctv_coverage BOOLEAN,
  recent_incidents_count INTEGER,
  created_at TIMESTAMPTZ,
  distance_to_start DOUBLE PRECISION,
  distance_to_end DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.name,
    sr.description,
    sr.start_address,
    sr.end_address,
    sr.distance_meters,
    sr.estimated_duration_minutes,
    sr.safety_score,
    sr.lighting_quality,
    sr.patrol_coverage,
    sr.cctv_coverage,
    sr.recent_incidents_count,
    sr.created_at,
    ST_Distance(
      sr.start_point::geometry,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
    ) as distance_to_start,
    ST_Distance(
      sr.end_point::geometry,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
    ) as distance_to_end
  FROM safe_routes sr
  WHERE sr.is_active = true
    AND (
      ST_DWithin(
        sr.start_point::geometry,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry,
        radius_meters
      )
      OR ST_DWithin(
        sr.end_point::geometry,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry,
        radius_meters
      )
    )
  ORDER BY sr.safety_score DESC, distance_to_start ASC
  LIMIT result_limit;
END;
$$;

-- Function to calculate route safety score based on nearby incidents
CREATE OR REPLACE FUNCTION calculate_route_safety_score(
  route_start_lat DOUBLE PRECISION,
  route_start_lng DOUBLE PRECISION,
  route_end_lat DOUBLE PRECISION,
  route_end_lng DOUBLE PRECISION,
  buffer_meters INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  incident_count INTEGER;
  recent_incident_count INTEGER;
  critical_incident_count INTEGER;
  base_score INTEGER := 100;
  safety_score INTEGER;
BEGIN
  -- Create a buffer around the route line
  WITH route_line AS (
    SELECT ST_MakeLine(
      ST_SetSRID(ST_MakePoint(route_start_lng, route_start_lat), 4326)::geometry,
      ST_SetSRID(ST_MakePoint(route_end_lng, route_end_lat), 4326)::geometry
    ) as line
  ),
  route_buffer AS (
    SELECT ST_Buffer(line, buffer_meters) as buffer_geom
    FROM route_line
  )
  
  -- Count incidents within the route buffer
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
    COUNT(*) FILTER (WHERE severity IN ('critical', 'high'))
  INTO incident_count, recent_incident_count, critical_incident_count
  FROM incidents i, route_buffer rb
  WHERE ST_Intersects(i.location_point::geometry, rb.buffer_geom)
    AND NOT i.is_resolved;
  
  -- Calculate safety score
  safety_score := base_score 
    - (incident_count * 5)
    - (recent_incident_count * 10)
    - (critical_incident_count * 15);
  
  -- Ensure score is between 0 and 100
  safety_score := GREATEST(0, LEAST(100, safety_score));
  
  RETURN safety_score;
END;
$$;

-- Function to get community groups for a location
CREATE OR REPLACE FUNCTION get_community_groups_for_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  area_name TEXT,
  member_count INTEGER,
  group_type TEXT,
  meeting_schedule TEXT,
  patrol_schedule TEXT,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cg.id,
    cg.name,
    cg.description,
    cg.area_name,
    cg.member_count,
    cg.group_type,
    cg.meeting_schedule,
    cg.patrol_schedule,
    COALESCE(
      ST_Distance(
        cg.area_polygon::geometry,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
      ),
      999999
    ) as distance_meters
  FROM community_groups cg
  WHERE cg.is_active = true
    AND (
      cg.area_polygon IS NULL
      OR ST_DWithin(
        cg.area_polygon::geometry,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry,
        radius_meters
      )
      OR ST_Contains(
        cg.area_polygon::geometry,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
      )
    )
  ORDER BY distance_meters ASC;
END;
$$;

-- Function to update route safety metrics based on recent incidents
CREATE OR REPLACE FUNCTION update_route_safety_metrics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  route_record RECORD;
  new_safety_score INTEGER;
  new_incident_count INTEGER;
BEGIN
  -- Update safety scores for all active routes
  FOR route_record IN 
    SELECT id, start_point, end_point 
    FROM safe_routes 
    WHERE is_active = true
  LOOP
    -- Extract coordinates from geography points
    WITH coords AS (
      SELECT 
        ST_Y(route_record.start_point::geometry) as start_lat,
        ST_X(route_record.start_point::geometry) as start_lng,
        ST_Y(route_record.end_point::geometry) as end_lat,
        ST_X(route_record.end_point::geometry) as end_lng
    )
    SELECT calculate_route_safety_score(start_lat, start_lng, end_lat, end_lng)
    INTO new_safety_score
    FROM coords;
    
    -- Count recent incidents near the route
    WITH route_buffer AS (
      SELECT ST_Buffer(
        ST_MakeLine(
          route_record.start_point::geometry,
          route_record.end_point::geometry
        ), 
        500
      ) as buffer_geom
    )
    SELECT COUNT(*)
    INTO new_incident_count
    FROM incidents i, route_buffer rb
    WHERE ST_Intersects(i.location_point::geometry, rb.buffer_geom)
      AND i.created_at > NOW() - INTERVAL '30 days'
      AND NOT i.is_resolved;
    
    -- Update the route
    UPDATE safe_routes 
    SET 
      safety_score = new_safety_score,
      recent_incidents_count = new_incident_count,
      updated_at = NOW()
    WHERE id = route_record.id;
  END LOOP;
END;
$$;

-- Function to find optimal safe route between two points
CREATE OR REPLACE FUNCTION find_optimal_safe_route(
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  end_lat DOUBLE PRECISION,
  end_lng DOUBLE PRECISION,
  max_detour_meters INTEGER DEFAULT 2000
)
RETURNS TABLE (
  route_id UUID,
  route_name TEXT,
  total_distance DOUBLE PRECISION,
  safety_score INTEGER,
  estimated_duration INTEGER,
  waypoints JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  direct_distance DOUBLE PRECISION;
  max_route_distance DOUBLE PRECISION;
BEGIN
  -- Calculate direct distance
  SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(start_lng, start_lat), 4326)::geometry,
    ST_SetSRID(ST_MakePoint(end_lng, end_lat), 4326)::geometry
  ) INTO direct_distance;
  
  max_route_distance := direct_distance + max_detour_meters;
  
  RETURN QUERY
  WITH route_analysis AS (
    SELECT 
      sr.id,
      sr.name,
      sr.safety_score,
      sr.estimated_duration_minutes,
      -- Distance from start point to route start
      ST_Distance(
        ST_SetSRID(ST_MakePoint(start_lng, start_lat), 4326)::geometry,
        sr.start_point::geometry
      ) as dist_to_route_start,
      -- Distance from route end to end point
      ST_Distance(
        sr.end_point::geometry,
        ST_SetSRID(ST_MakePoint(end_lng, end_lat), 4326)::geometry
      ) as dist_from_route_end,
      -- Route distance
      COALESCE(sr.distance_meters, 0) as route_distance
    FROM safe_routes sr
    WHERE sr.is_active = true
  )
  SELECT 
    ra.id,
    ra.name,
    (ra.dist_to_route_start + ra.route_distance + ra.dist_from_route_end) as total_dist,
    ra.safety_score,
    ra.estimated_duration_minutes,
    jsonb_build_object(
      'start_connection', ra.dist_to_route_start,
      'route_distance', ra.route_distance,
      'end_connection', ra.dist_from_route_end
    ) as waypoints
  FROM route_analysis ra
  WHERE (ra.dist_to_route_start + ra.route_distance + ra.dist_from_route_end) <= max_route_distance
  ORDER BY 
    ra.safety_score DESC,
    total_dist ASC
  LIMIT 5;
END;
$$;

-- Function to get safety heatmap data for an area
CREATE OR REPLACE FUNCTION get_safety_heatmap(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000,
  grid_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  incident_count INTEGER,
  severity_score DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
  grid_step DOUBLE PRECISION;
  lat_step DOUBLE PRECISION;
  lng_step DOUBLE PRECISION;
BEGIN
  -- Calculate grid step size (approximate)
  grid_step := radius_meters / grid_size;
  lat_step := grid_step / 111000.0; -- Approximate meters per degree latitude
  lng_step := grid_step / (111000.0 * cos(radians(center_lat))); -- Adjust for longitude
  
  RETURN QUERY
  WITH grid_points AS (
    SELECT 
      center_lat + (i * lat_step) - (radius_meters / 111000.0) as grid_lat,
      center_lng + (j * lng_step) - (radius_meters / (111000.0 * cos(radians(center_lat)))) as grid_lng
    FROM generate_series(0, grid_size) i
    CROSS JOIN generate_series(0, grid_size) j
  ),
  incident_analysis AS (
    SELECT 
      gp.grid_lat,
      gp.grid_lng,
      COUNT(inc.id) as incident_count,
      AVG(
        CASE inc.severity
          WHEN 'critical' THEN 4
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END
      ) as avg_severity
    FROM grid_points gp
    LEFT JOIN incidents inc ON ST_DWithin(
      ST_SetSRID(ST_MakePoint(gp.grid_lng, gp.grid_lat), 4326)::geometry,
      inc.location_point::geometry,
      grid_step
    )
    AND inc.created_at > NOW() - INTERVAL '90 days'
    AND NOT inc.is_resolved
    GROUP BY gp.grid_lat, gp.grid_lng
  )
  SELECT 
    ia.grid_lat,
    ia.grid_lng,
    ia.incident_count::INTEGER,
    COALESCE(ia.avg_severity, 0.0) as severity_score
  FROM incident_analysis ia
  WHERE ST_DWithin(
    ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geometry,
    ST_SetSRID(ST_MakePoint(ia.grid_lng, ia.grid_lat), 4326)::geometry,
    radius_meters
  );
END;
$$;

-- Create a trigger to automatically update route safety scores when incidents are added/updated
CREATE OR REPLACE FUNCTION trigger_update_route_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Schedule a route safety update (in a real system, you might use a job queue)
  PERFORM update_route_safety_metrics();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for automatic safety score updates
DROP TRIGGER IF EXISTS incident_safety_update ON incidents;
CREATE TRIGGER incident_safety_update
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_update_route_safety();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_location_gist ON incidents USING GIST (location_point);
CREATE INDEX IF NOT EXISTS idx_safe_routes_points_gist ON safe_routes USING GIST (start_point, end_point);
CREATE INDEX IF NOT EXISTS idx_community_groups_area_gist ON community_groups USING GIST (area_polygon);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at_desc ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved ON incidents (is_resolved);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_incidents_near_location TO authenticated;
GRANT EXECUTE ON FUNCTION get_safe_routes_near_location TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_route_safety_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_groups_for_location TO authenticated;
GRANT EXECUTE ON FUNCTION find_optimal_safe_route TO authenticated;
GRANT EXECUTE ON FUNCTION get_safety_heatmap TO authenticated;