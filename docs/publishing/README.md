# Publishing

Published packages from this repository:

| Package | Registry | Path |
|---------|----------|------|
| `@ax402/sdk` | npm | `packages/typescript` |
| `@ax402/cli` | npm | `tools/cli` |
| `@ax402/mcp-server` | npm | `tools/mcp-server` |
| `@ax402/react-paywall` | npm | `packages/react-paywall` |
| `ax402-sdk` | PyPI | `packages/python` |

Go (`packages/golang`) is consumed via module tags on GitHub — no separate registry publish.

Go module: `github.com/AxLabs/ax402-sdks/go`. Tag releases as `go/v0.0.2` (or the matching semver).

## Trusted publishing

Configure trusted publishers so tag releases do not need long-lived tokens. PyPI publishing is manual (`workflow_dispatch`) until trusted publishing is set up.

### npm (`@ax402` scope)

For each published package (`@ax402/sdk`, `@ax402/cli`, `@ax402/mcp-server`, `@ax402/react-paywall`):

1. Open the package on [npmjs.com](https://www.npmjs.com/) → **Settings** → **Publishing access** → **Add GitHub Actions publisher** (or configure at the `@ax402` org level if available).
2. Set:
   - **GitHub repository:** `AxLabs/ax402-sdks`
   - **Workflow file:** `publish-npm.yml`
   - **Environment:** leave empty (workflow runs on `v*` tags)
3. Ensure `.github/workflows/publish-npm.yml` has `permissions: id-token: write` (already set). The workflow uses Node 24, npm 11+, and OIDC — no `NPM_TOKEN` secret.

### Release (npm)

1. Bump `version` in all publishable `package.json` files (and `packages/python/pyproject.toml` when PyPI is enabled). Keep them in sync.
2. Commit and push to `main`.
3. Create and push the tag manually — **the tag triggers publish**, not the other way around:

```bash
git tag v0.0.2
git push origin v0.0.2
```

The workflow checks out the tagged commit, verifies the tag matches `package.json` version, then publishes `@ax402/sdk`, `@ax402/cli`, `@ax402/mcp-server`, and `@ax402/react-paywall`.

For a TypeScript SDK preview, bump only `packages/typescript/package.json`, then push a matching
`v<version>-preview.<number>` tag. The workflow publishes only `@ax402/sdk` with the `preview`
dist-tag; `latest` and the other packages remain unchanged.

To move a tag after a fix:

```bash
git push origin :refs/tags/v0.0.2
git tag -d v0.0.2
git tag v0.0.2
git push origin v0.0.2
```

### PyPI (`ax402-sdk`)

1. Open [pypi.org/manage/project/ax402-sdk/settings/publishing/](https://pypi.org/manage/project/ax402-sdk/settings/publishing/).
2. **Add a new pending publisher** → **GitHub**:
   - **Owner:** `AxLabs`
   - **Repository:** `ax402-sdks`
   - **Workflow name:** `publish-pypi.yml`
   - **Environment name:** leave empty
3. Save. The workflow `.github/workflows/publish-pypi.yml` already uses `pypa/gh-action-pypi-publish` with OIDC (`id-token: write`).

Release: push a `v*` tag (same as npm) or trigger **Publish PyPI** manually.

## Local publish (optional)

```bash
pnpm install && pnpm build && pnpm test

pnpm publish -r \
  --filter @ax402/sdk \
  --filter @ax402/cli \
  --filter @ax402/mcp-server \
  --filter @ax402/react-paywall \
  --access public
```

```bash
cd packages/python
python -m build
twine upload dist/*
```

## Consumer install

```bash
npm install @ax402/sdk
npm install -g @ax402/cli
npx @ax402/mcp-server

pip install ax402-sdk
pip install "ax402-sdk[buyer]"
```

```bash
go get github.com/AxLabs/ax402-sdks/go@v0.0.2
```
