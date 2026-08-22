/*
# Task Management App - Initial Schema

## Summary
Creates the full relational schema for a multi-user, multi-project task
management application: user profiles, projects, project memberships
(with Owner/Member roles), and tasks. Row Level Security (RLS) is enabled
on every table so that a user can only see or change data for projects
they belong to.

## New Tables

1. `profiles`
   - `id` (uuid, primary key, references auth.users) - the user's account id
   - `email` (text) - the user's email, copied from auth at sign up
   - `display_name` (text) - friendly name shown in the UI
   - `created_at` (timestamptz) - when the profile was created

2. `projects`
   - `id` (uuid, primary key)
   - `name` (text, required) - project name
   - `description` (text, optional)
   - `owner_id` (uuid, references auth.users) - the user who created the project
   - `created_at` (timestamptz)

3. `project_members`
   - `id` (uuid, primary key)
   - `project_id` (uuid, references projects) - which project
   - `user_id` (uuid, references auth.users) - which user
   - `role` (text, 'owner' or 'member')
   - `created_at` (timestamptz)
   - unique on (project_id, user_id) so a user can only have one role per project

4. `tasks`
   - `id` (uuid, primary key)
   - `project_id` (uuid, references projects) - which project the task belongs to
   - `title` (text, required, cannot be empty)
   - `description` (text, optional)
   - `status` (text: 'To Do' | 'In Progress' | 'Done', default 'To Do')
   - `priority` (text: 'Low' | 'Medium' | 'High', default 'Medium')
   - `assignee_id` (uuid, references auth.users, optional) - must be a member of the task's project
   - `created_by` (uuid, references auth.users)
   - `created_at`, `updated_at` (timestamptz)

## Security

- RLS is enabled on all four tables.
- Two `SECURITY DEFINER` helper functions (`is_project_member`, `is_project_owner`)
  are used inside policies to check membership/ownership without causing
  recursive policy evaluation on `project_members`.
- `profiles` is readable by any signed-in user (needed so an Owner can find a
  user by email to invite them to a project) but not writable directly by users.
- `projects` are only visible/editable by their members; only the Owner can
  update or delete a project.
- `project_members` rows are only visible to fellow members; only the Owner
  can add or remove members.
- `tasks` are only visible to project members; members and the Owner can
  create/update tasks, but only the Owner can delete a task.
- A trigger keeps `profiles` in sync with new `auth.users` signups.
- A trigger automatically adds the creator of a project as its Owner member.
- A trigger validates that a task's `assignee_id`, when set, belongs to the
  task's project.

## Important Notes

1. Email confirmation is left off, so registering immediately signs the user in.
2. Deleting a project cascades to its memberships and tasks.
3. Deleting a user cascades to their profile, owned projects, memberships and
   authored tasks (task assignee is set to NULL instead, so tasks are not lost).
*/

-- 1. PROFILES ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated" ON profiles FOR SELECT
  TO authenticated USING (true);

-- 2. PROJECTS -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text NOT NULL DEFAULT '',
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 3. PROJECT MEMBERS -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- 4. TASKS ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Done')),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- 5. HELPER FUNCTIONS (SECURITY DEFINER, avoid recursive RLS) -----------------

CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_project_owner(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION is_project_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_project_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_project_owner(uuid, uuid) TO authenticated;

-- 6. PROJECTS POLICIES ---------------------------------------------------------

DROP POLICY IF EXISTS "projects_select_members" ON projects;
CREATE POLICY "projects_select_members" ON projects FOR SELECT
  TO authenticated USING (is_project_member(id, auth.uid()));

DROP POLICY IF EXISTS "projects_insert_own" ON projects;
CREATE POLICY "projects_insert_own" ON projects FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "projects_update_owner" ON projects;
CREATE POLICY "projects_update_owner" ON projects FOR UPDATE
  TO authenticated USING (is_project_owner(id, auth.uid()))
  WITH CHECK (is_project_owner(id, auth.uid()));

DROP POLICY IF EXISTS "projects_delete_owner" ON projects;
CREATE POLICY "projects_delete_owner" ON projects FOR DELETE
  TO authenticated USING (is_project_owner(id, auth.uid()));

-- 7. PROJECT MEMBERS POLICIES --------------------------------------------------

DROP POLICY IF EXISTS "project_members_select_members" ON project_members;
CREATE POLICY "project_members_select_members" ON project_members FOR SELECT
  TO authenticated USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "project_members_insert_owner" ON project_members;
CREATE POLICY "project_members_insert_owner" ON project_members FOR INSERT
  TO authenticated WITH CHECK (is_project_owner(project_id, auth.uid()));

DROP POLICY IF EXISTS "project_members_delete_owner" ON project_members;
CREATE POLICY "project_members_delete_owner" ON project_members FOR DELETE
  TO authenticated USING (is_project_owner(project_id, auth.uid()) AND role <> 'owner');

-- 8. TASKS POLICIES -------------------------------------------------------------

DROP POLICY IF EXISTS "tasks_select_members" ON tasks;
CREATE POLICY "tasks_select_members" ON tasks FOR SELECT
  TO authenticated USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "tasks_insert_members" ON tasks;
CREATE POLICY "tasks_insert_members" ON tasks FOR INSERT
  TO authenticated WITH CHECK (is_project_member(project_id, auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "tasks_update_members" ON tasks;
CREATE POLICY "tasks_update_members" ON tasks FOR UPDATE
  TO authenticated USING (is_project_member(project_id, auth.uid()))
  WITH CHECK (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "tasks_delete_owner" ON tasks;
CREATE POLICY "tasks_delete_owner" ON tasks FOR DELETE
  TO authenticated USING (is_project_owner(project_id, auth.uid()));

-- 9. TRIGGERS -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created ON projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_new_project();

CREATE OR REPLACE FUNCTION check_task_assignee_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = NEW.project_id AND user_id = NEW.assignee_id
    ) THEN
      RAISE EXCEPTION 'Assignee must be a member of the task project';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_write_validate_assignee ON tasks;
CREATE TRIGGER on_task_write_validate_assignee
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION check_task_assignee_membership();
