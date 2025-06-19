/*
  # Server-Side Incident Verification Logic

  1. New Functions
    - `update_incident_verification_count()` - Automatically calculates verification counts and determines verification status
    - `get_incident_verification_stats()` - Provides detailed verification statistics for any incident
    - `check_duplicate_verification()` - Prevents users from verifying the same incident multiple times
    - `update_verifier_reputation()` - Awards reputation points to users who verify incidents

  2. New Triggers
    - Automatically update incident verification counts when verifications are added/removed
    - Prevent duplicate verifications from the same user
    - Update user reputation based on verification activity

  3. Performance Improvements
    - Added database indexes for faster verification queries
    - Optimized verification count calculations
*/

-- Function to update incident verification count and status
CREATE OR REPLACE FUNCTION update_incident_verification_count()
RETURNS TRIGGER AS $$
DECLARE
  target_incident_id UUID;
  confirm_count INTEGER := 0;
  dispute_count INTEGER := 0;
  total_verifications INTEGER := 0;
  verification_score NUMERIC := 0;
  should_be_verified BOOLEAN := FALSE;
BEGIN
  -- Get the incident ID from the trigger
  IF TG_OP = 'DELETE' THEN
    target_incident_id := OLD.incident_id;
  ELSE
    target_incident_id := NEW.incident_id;
  END IF;

  -- Count different types of verifications for this incident
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE verification_type = 'confirm'), 0),
    COALESCE(COUNT(*) FILTER (WHERE verification_type = 'dispute'), 0),
    COALESCE(COUNT(*), 0)
  INTO confirm_count, dispute_count, total_verifications
  FROM incident_verifications 
  WHERE incident_id = target_incident_id;

  -- Calculate verification score (confirms add points, disputes subtract)
  -- Each confirmation = +1 point, each dispute = -0.5 points
  verification_score := (confirm_count * 1.0) + (dispute_count * -0.5);

  -- Determine if incident should be verified
  -- Require at least 3 confirmations and positive score >= 2.5
  should_be_verified := (confirm_count >= 3 AND verification_score >= 2.5);

  -- Update the incident record
  UPDATE incidents 
  SET 
    verification_count = total_verifications,
    is_verified = should_be_verified,
    updated_at = NOW()
  WHERE id = target_incident_id;

  -- Log the verification update for debugging
  RAISE NOTICE 'Updated incident % - Confirmations: %, Disputes: %, Total: %, Score: %, Verified: %', 
    target_incident_id, confirm_count, dispute_count, total_verifications, verification_score, should_be_verified;

  RETURN COALESCE(NEW, OLD);

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error updating incident verification count for incident %: %', target_incident_id, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get incident verification statistics
CREATE OR REPLACE FUNCTION get_incident_verification_stats(incident_uuid UUID)
RETURNS TABLE(
  incident_id UUID,
  total_verifications INTEGER,
  confirm_count INTEGER,
  dispute_count INTEGER,
  additional_info_count INTEGER,
  verification_score NUMERIC,
  is_verified BOOLEAN,
  verification_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as incident_id,
    COALESCE(v.total_verifications, 0)::INTEGER as total_verifications,
    COALESCE(v.confirm_count, 0)::INTEGER as confirm_count,
    COALESCE(v.dispute_count, 0)::INTEGER as dispute_count,
    COALESCE(v.additional_info_count, 0)::INTEGER as additional_info_count,
    COALESCE(v.verification_score, 0)::NUMERIC as verification_score,
    i.is_verified,
    CASE 
      WHEN COALESCE(v.total_verifications, 0) = 0 THEN 0::NUMERIC
      ELSE ROUND((COALESCE(v.confirm_count, 0)::NUMERIC / COALESCE(v.total_verifications, 1)::NUMERIC) * 100, 1)
    END as verification_percentage
  FROM incidents i
  LEFT JOIN (
    SELECT 
      incident_id,
      COUNT(*) as total_verifications,
      COUNT(*) FILTER (WHERE verification_type = 'confirm') as confirm_count,
      COUNT(*) FILTER (WHERE verification_type = 'dispute') as dispute_count,
      COUNT(*) FILTER (WHERE verification_type = 'additional_info') as additional_info_count,
      (COUNT(*) FILTER (WHERE verification_type = 'confirm') * 1.0) + 
      (COUNT(*) FILTER (WHERE verification_type = 'dispute') * -0.5) as verification_score
    FROM incident_verifications
    WHERE incident_id = incident_uuid
    GROUP BY incident_id
  ) v ON i.id = v.incident_id
  WHERE i.id = incident_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to prevent duplicate verifications from same user
CREATE OR REPLACE FUNCTION check_duplicate_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has already verified this incident
  IF EXISTS (
    SELECT 1 FROM incident_verifications 
    WHERE incident_id = NEW.incident_id 
    AND verifier_id = NEW.verifier_id
  ) THEN
    RAISE EXCEPTION 'User has already verified this incident. Each user can only verify an incident once.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user reputation based on verification activity
CREATE OR REPLACE FUNCTION update_verifier_reputation()
RETURNS TRIGGER AS $$
DECLARE
  reputation_change INTEGER := 0;
BEGIN
  -- Calculate reputation change based on verification type
  CASE NEW.verification_type
    WHEN 'confirm' THEN reputation_change := 5;
    WHEN 'dispute' THEN reputation_change := 3;
    WHEN 'additional_info' THEN reputation_change := 2;
    ELSE reputation_change := 1;
  END CASE;

  -- Update verifier's reputation
  UPDATE profiles 
  SET 
    reputation_score = reputation_score + reputation_change,
    updated_at = NOW()
  WHERE id = NEW.verifier_id;

  RAISE NOTICE 'Updated reputation for user % by % points for % verification', 
    NEW.verifier_id, reputation_change, NEW.verification_type;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the verification
    RAISE WARNING 'Error updating verifier reputation for user %: %', NEW.verifier_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually recalculate verification counts for all incidents
CREATE OR REPLACE FUNCTION recalculate_all_incident_verifications()
RETURNS INTEGER AS $$
DECLARE
  incident_record RECORD;
  updated_count INTEGER := 0;
  confirm_count INTEGER;
  dispute_count INTEGER;
  total_verifications INTEGER;
  verification_score NUMERIC;
  should_be_verified BOOLEAN;
BEGIN
  -- Loop through all incidents that have verifications
  FOR incident_record IN 
    SELECT DISTINCT i.id as incident_id
    FROM incidents i
    WHERE EXISTS (
      SELECT 1 FROM incident_verifications iv 
      WHERE iv.incident_id = i.id
    )
  LOOP
    -- Calculate verification stats for this incident
    SELECT 
      COALESCE(COUNT(*) FILTER (WHERE verification_type = 'confirm'), 0),
      COALESCE(COUNT(*) FILTER (WHERE verification_type = 'dispute'), 0),
      COALESCE(COUNT(*), 0)
    INTO confirm_count, dispute_count, total_verifications
    FROM incident_verifications 
    WHERE incident_id = incident_record.incident_id;

    -- Calculate verification score
    verification_score := (confirm_count * 1.0) + (dispute_count * -0.5);
    
    -- Determine verification status
    should_be_verified := (confirm_count >= 3 AND verification_score >= 2.5);

    -- Update the incident
    UPDATE incidents 
    SET 
      verification_count = total_verifications,
      is_verified = should_be_verified,
      updated_at = NOW()
    WHERE id = incident_record.incident_id;

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated verification counts for % incidents', updated_count;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_incident_verification ON incident_verifications;
DROP TRIGGER IF EXISTS trigger_check_duplicate_verification ON incident_verifications;
DROP TRIGGER IF EXISTS trigger_update_verifier_reputation ON incident_verifications;

-- Create trigger for updating incident verification count
CREATE TRIGGER trigger_update_incident_verification
  AFTER INSERT OR UPDATE OR DELETE ON incident_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_verification_count();

-- Create trigger to prevent duplicate verifications
CREATE TRIGGER trigger_check_duplicate_verification
  BEFORE INSERT ON incident_verifications
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_verification();

-- Create trigger to update verifier reputation
CREATE TRIGGER trigger_update_verifier_reputation
  AFTER INSERT ON incident_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_verifier_reputation();

-- Create indexes for better performance on verification queries
CREATE INDEX IF NOT EXISTS idx_incident_verifications_incident_verifier 
ON incident_verifications(incident_id, verifier_id);

CREATE INDEX IF NOT EXISTS idx_incident_verifications_type 
ON incident_verifications(verification_type);

CREATE INDEX IF NOT EXISTS idx_incident_verifications_created_at 
ON incident_verifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_verification_count 
ON incidents(verification_count);

CREATE INDEX IF NOT EXISTS idx_incidents_is_verified 
ON incidents(is_verified);

-- Update existing incidents to have correct verification counts
-- This uses the new recalculation function
SELECT recalculate_all_incident_verifications();

-- Add helpful comments
COMMENT ON FUNCTION update_incident_verification_count() IS 'Automatically updates incident verification count and verified status when verifications are added/removed';
COMMENT ON FUNCTION get_incident_verification_stats(UUID) IS 'Returns detailed verification statistics for a specific incident';
COMMENT ON FUNCTION check_duplicate_verification() IS 'Prevents users from verifying the same incident multiple times';
COMMENT ON FUNCTION update_verifier_reputation() IS 'Updates user reputation based on verification activity';
COMMENT ON FUNCTION recalculate_all_incident_verifications() IS 'Manually recalculates verification counts for all incidents (maintenance function)';

COMMENT ON TRIGGER trigger_update_incident_verification ON incident_verifications IS 'Automatically updates incident verification metrics';
COMMENT ON TRIGGER trigger_check_duplicate_verification ON incident_verifications IS 'Prevents duplicate verifications from same user';
COMMENT ON TRIGGER trigger_update_verifier_reputation ON incident_verifications IS 'Updates verifier reputation scores';