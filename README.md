# kidstoys

pnpm workspace monorepo.

## Structure

```
.
├── apps/       # runnable applications
├── packages/   # shared libraries and tooling
├── package.json
└── pnpm-workspace.yaml
```

## Requirements

- Node.js >= 20
- pnpm 12.x (`corepack enable` will pick up the `packageManager` field)

## Getting started

```bash
pnpm install
```

## Workspace commands

Run these from the repo root; they fan out to every workspace package that defines the script.

```bash
pnpm dev     # start dev tasks
pnpm build   # build all packages
pnpm test    # run all tests
pnpm lint    # lint all packages
pnpm clean   # clean build artifacts
```

## Adding a package

Create a directory under `apps/` or `packages/` with its own `package.json`, then reference it
from another package with `"@kidstoys/<name>": "workspace:*"`.
