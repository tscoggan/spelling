-- Production Database Diagnostic Queries
-- Run these in the Production database pane to troubleshoot issues

-- ============================================
-- USER GROUP MEMBERSHIP DIAGNOSTICS
-- ============================================

-- Check which groups have members (replace owner_user_id as needed)
SELECT 
  ug.id as group_id,
  ug.name as group_name,
  ug.owner_user_id,
  COUNT(ugm.user_id) as member_count
FROM user_groups ug
LEFT JOIN user_group_membership ugm ON ug.id = ugm.group_id
WHERE ug.owner_user_id = 7
GROUP BY ug.id, ug.name, ug.owner_user_id
ORDER BY ug.id;

-- View all members for a specific group (replace group_id as needed)
SELECT 
  ug.id as group_id,
  ug.name as group_name,
  ugm.user_id as member_user_id,
  u.username as member_username,
  u.first_name,
  u.last_name
FROM user_groups ug
LEFT JOIN user_group_membership ugm ON ug.id = ugm.group_id
LEFT JOIN users u ON ugm.user_id = u.id
WHERE ug.id = 1
ORDER BY u.username;

-- ============================================
-- GENERAL USER DIAGNOSTICS
-- ============================================

-- List all users with their account types
SELECT id, username, first_name, last_name, role, account_type, stars, created_at
FROM users
ORDER BY id;

-- List all user groups with owner info
SELECT 
  ug.id,
  ug.name,
  ug.owner_user_id,
  u.username as owner_username,
  ug.is_public,
  ug.created_at
FROM user_groups ug
JOIN users u ON ug.owner_user_id = u.id
ORDER BY ug.id;
