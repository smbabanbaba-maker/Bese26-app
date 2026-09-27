-- Preserve every policy's roles, command, and predicate while allowing PostgreSQL
-- to evaluate auth.uid() once per statement instead of once per row.
DO $bese26_rls_auth_uid_optimization$
DECLARE
  policy_row record;
  using_expression text;
  check_expression text;
  alter_statement text;
  changed_policies integer := 0;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') LIKE '%auth.uid()%'
        OR COALESCE(with_check, '') LIKE '%auth.uid()%'
      )
  LOOP
    using_expression := CASE
      WHEN policy_row.qual IS NULL THEN NULL
      ELSE replace(policy_row.qual, 'auth.uid()', '(SELECT auth.uid())')
    END;
    check_expression := CASE
      WHEN policy_row.with_check IS NULL THEN NULL
      ELSE replace(policy_row.with_check, 'auth.uid()', '(SELECT auth.uid())')
    END;

    alter_statement := format(
      'ALTER POLICY %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
    IF using_expression IS NOT NULL THEN
      alter_statement := alter_statement || format(' USING (%s)', using_expression);
    END IF;
    IF check_expression IS NOT NULL THEN
      alter_statement := alter_statement || format(' WITH CHECK (%s)', check_expression);
    END IF;

    EXECUTE alter_statement;
    changed_policies := changed_policies + 1;
  END LOOP;

  IF changed_policies <> 81 THEN
    RAISE EXCEPTION 'Expected to optimize 81 auth.uid() policies, but updated %; transaction rolled back.', changed_policies;
  END IF;
END;
$bese26_rls_auth_uid_optimization$;
