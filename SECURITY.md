# Security Policy

This package verifies webhook signatures — a security boundary. We take reports
seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Instead, either:

- Use GitHub's **[private vulnerability reporting](https://github.com/webhookd-lab/webhookd-js/security/advisories/new)**
  (Security tab → Report a vulnerability), or
- Email **michkov.evgeny@gmail.com** with details and, if possible, a reproduction.

Please include the package version, the scenario, and the impact. We aim to
acknowledge within 72 hours and to ship a fix (and a published advisory) as
quickly as the severity warrants.

## Supported versions

While pre-1.0, only the latest published `0.x` release receives security fixes.

## Scope

In scope: signature verification correctness (e.g. a forged signature accepted,
a valid one rejected in a way that pushes users toward unsafe workarounds),
timing-safety regressions, anything that weakens the security guarantee.

Out of scope: misuse where the documented contract is ignored (e.g. verifying a
re-serialized body instead of the raw bytes — see the README).
