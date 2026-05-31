<!--
PR title MUST be Conventional Commits — it becomes the squash commit and drives
the release. e.g. "fix: …", "feat: …", "feat!: …", "docs: …". A CI check enforces this.
-->

## What & why

<!-- What does this change and why? Link any related issue. -->

## Checklist

- [ ] PR title follows Conventional Commits
- [ ] `bun test` passes
- [ ] `bunx tsc --noEmit` passes
- [ ] Added/updated tests for the change
- [ ] If verification logic changed, the conformance vectors still pass (and the
      spec change, if any, was raised in webhookd-spec first)
