-- Fix attendance status enum values from lowercase to uppercase
-- This script converts 'success' to 'SUCCESS', 'late' to 'LATE', etc.

UPDATE tbAttendance 
SET status = UPPER(status) 
WHERE status IS NOT NULL AND status NOT IN ('SUCCESS', 'LATE', 'MANUAL', 'ERROR');

-- Verify the update
SELECT DISTINCT status FROM tbAttendance;
