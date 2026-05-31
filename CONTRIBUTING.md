# Contributing to webhookd

Thanks for helping out. This package verifies webhook signatures, so correctness
and security come first — small, well-tested changes are very welcome.

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun test            # run the suite (includes the conformance vectors)
bunx tsc --noEmit   # typecheck
bun run build       # tsup → dist/
```

## How changes become releases

We use **[Conventional Commits](https://www.conventionalcommits.org/)**. Because
the repo uses squash-merge, **your pull request title** becomes the commit, and
its type decides the next version automatically (via
[release-please](https://github.com/googleapis/release-please)):

| PR title prefix          | Example                              | Version bump        |
| ------------------------ | ------------------------------------ | ------------------- |
| `fix:`                   | `fix: reject empty v1 segment`       | patch (0.1.0→0.1.1) |
| `feat:`                  | `feat: add SvelteKit adapter`        | minor (0.1.0→0.2.0) |
| `feat!:` / `BREAKING CHANGE:` footer | `feat!: drop Node 16 support` | minor while 0.x, major after 1.0 |
| `docs:` `chore:` `refactor:` `test:` `ci:` `build:` | `docs: fix typo` | no release          |

A CI check enforces a valid PR title — if it isn't Conventional, the PR can't
merge. You don't touch `CHANGELOG.md` or the version number by hand; release-please
does both.

## Pull request flow

1. Fork and branch from `main`.
2. Make the change. Add or update tests — anything touching verification logic
   **must** keep passing the conformance vectors in `test/vectors.v1.json`
   (sourced from [webhookd-spec](https://github.com/webhookd-lab/webhookd-spec)).
   Do not hand-edit that file.
3. Ensure `bun test`, `bunx tsc --noEmit`, and `bun run build` pass.
4. Open a PR with a Conventional Commits title. Keep it focused — one logical
   change per PR.

## Changing the signature scheme

The verification algorithm is a cross-language contract defined in
[webhookd-spec](https://github.com/webhookd-lab/webhookd-spec). A change to *how*
signatures are verified is a spec change first — open an issue there before a PR
here, so every language SDK stays in sync.

## Reporting bugs / security

Regular bugs: open a GitHub issue. **Security vulnerabilities: do not open a
public issue** — see [SECURITY.md](./SECURITY.md).
