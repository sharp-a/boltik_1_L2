/*
# Lock down trigger-only functions

## Summary
The trigger functions `handle_new_user`, `handle_new_project`, and
`check_task_assignee_membership` are only meant to run automatically as
triggers, not to be callable directly as an API RPC. This revokes public
execute access so they cannot be invoked by anon/authenticated clients.

## Security
- Revokes EXECUTE on the three trigger functions from PUBLIC, anon, and
  authenticated. Triggers still work because the trigger mechanism invokes
  the function as its owner, not through role-based EXECUTE grants.
*/

REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION handle_new_project() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION check_task_assignee_membership() FROM PUBLIC, anon, authenticated;
