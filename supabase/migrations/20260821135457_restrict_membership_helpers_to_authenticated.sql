/*
# Restrict membership-check helpers to signed-in users

## Summary
`is_project_member` and `is_project_owner` are used inside RLS policies that
only apply `TO authenticated`, so the anonymous (signed-out) role never
needs to call them. This revokes their execute grant from `anon` and
`PUBLIC`, keeping it only for `authenticated`.
*/

REVOKE ALL ON FUNCTION is_project_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION is_project_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_project_owner(uuid, uuid) TO authenticated;
