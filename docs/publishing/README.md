# Publishing

Published packages from this repository:

| Package | Registry | Path |
|---------|----------|------|
| `@launa/sdk` | npm | `packages/typescript` |
| `@launa/cli` | npm | `tools/cli` |
| `@launa/mcp-server` | npm | `tools/mcp-server` |
| `@launa/react-paywall` | npm | `packages/react-paywall` |
| `launa-sdk` | PyPI | `packages/python` |

Go (`packages/golang`) is consumed via module tags on GitHub — no separate registry publish.

Go module: `github.com/AxLabs/launa-sdks/go`. Tag releases as `go/v0.0.2` (or the matching semver).

## Trusted publishing

Configure trusted publishers so tag releases do not need long-lived tokens. PyPI publishing is manual (`workflow_dispatch`) until trusted publishing is set up.

### npm (`@launa` scope)

For each published package (`@launa/sdk`, `@launa/cli`, `@launa/mcp-server`, `@launa/react-paywall`):

1. Open the package on [npmjs.com](https://www.npmjs.com/) → **Settings** → **Publishing access** → **Add GitHub Actions publisher** (or configure at the `@launa` org level if available).
2. Set:
   - **GitHub repository:** `AxLabs/launa-sdks`
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

The workflow checks out the tagged commit, verifies the tag matches `package.json` version, then publishes `@launa/sdk`, `@launa/cli`, `@launa/mcp-server`, and `@launa/react-paywall`.

To move a tag after a fix:

```bash
git push origin :refs/tags/v0.0.2
git tag -d v0.0.2
git tag v0.0.2
git push origin v0.0.2
```

### PyPI (`launa-sdk`)

1. Open [pypi.org/manage/project/launa-sdk/settings/publishing/](https://pypi.org/manage/project/launa-sdk/settings/publishing/).
2. **Add a new pending publisher** → **GitHub**:
   - **Owner:** `AxLabs`
   - **Repository:** `launa-sdks`
   - **Workflow name:** `publish-pypi.yml`
   - **Environment name:** leave empty
3. Save. The workflow `.github/workflows/publish-pypi.yml` already uses `pypa/gh-action-pypi-publish` with OIDC (`id-token: write`).

Release: push a `v*` tag (same as npm) or trigger **Publish PyPI** manually.

## Local publish (optional)

```bash
pnpm install && pnpm build && pnpm test

pnpm publish -r \
  --filter @launa/sdk \
  --filter @launa/cli \
  --filter @launa/mcp-server \
  --filter @launa/react-paywall \
  --access public
```

```bash
cd packages/python
python -m build
twine upload dist/*
```

## Consumer install

```bash
npm install @launa/sdk
npm install -g @launa/cli
npx @launa/mcp-server

pip install launa-sdk
pip install "launa-sdk[buyer]"
```

```bash
go get github.com/AxLabs/launa-sdks/go@v0.0.2
```
