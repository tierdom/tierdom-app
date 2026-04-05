---
name: deps
description: Install or update npm dependencies with supply chain security checks. Pins exact versions, audits vulnerabilities, and verifies the build after changes.
allowed-tools: Bash Read Edit
---

Help me install or update dependencies in this project following supply chain security best practices.

## Process

1. **Audit current state**
   - Run `npm audit` and summarise any vulnerabilities (critical/high/medium/low)
   - Run `npm outdated` to list packages with available updates

2. **Review updates**
   - Group outdated packages by: patch, minor, major
   - Flag any package that was published less than 7 days ago — prefer waiting
   - Flag any package with a suspicious version jump (e.g. 1.x → 9.x overnight)
   - Check the changelog or release notes for major/minor bumps before updating

3. **Update selectively**
   - For each package to update, install the specific target version explicitly:
     `npm install <package>@<exact-version> --save-exact`
   - Never use `npm update` or `npm install` without a pinned version
   - Update one package at a time for risky or major updates

4. **Pin exact versions**
   - After installing, confirm `package.json` has no `^` or `~` prefixes
   - If any crept in, strip them before committing

5. **Verify after each update**
   - Run `npm run check` (svelte-check)
   - Run `npm run lint`
   - Run `npm run test:unit -- --run`
   - Only proceed to the next package if all pass

6. **Commit**
   - Use the `/commit` skill with the `📦 deps:` type
   - One commit per logical group of updates (e.g. "bump svelte + kit patch")

## Security rules

- Never install a package published less than 3 days ago (enforced by `.npmrc` `minimum-release-age`)
- Always run `npm audit` after updating — new packages can introduce transitive vulnerabilities
- Prefer packages with npm provenance attestation when available
- Avoid packages with `postinstall` scripts unless the package is well-known and trusted
- If `npm audit` reports a vulnerability with no fix available, open an issue and document it

$ARGUMENTS
