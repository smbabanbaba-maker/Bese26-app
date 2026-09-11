# Protecting `main`

GitHub repository administration must be configured by a repository owner. The codebase is ready for the following ruleset:

1. Open **Settings → Rules → Rulesets → New branch ruleset**.
2. Target the default branch, `main`.
3. Require a pull request before merging.
4. Require the `verify` status check from `.github/workflows/quality.yml`.
5. Require branches to be up to date before merging.
6. Block force pushes and branch deletion.
7. Keep bypass access limited to trusted repository administrators.

This preserves the current release process: changes are reviewed on a branch, CI runs the full safety gate, and `main` changes only after the pull request is approved.
