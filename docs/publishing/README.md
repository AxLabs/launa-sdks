# Publishing

Published packages from this repository:

| Package | Registry | Path |
|---------|----------|------|
| `@launa/sdk` | npm | `packages/typescript` |
| `@launa/cli` | npm | `tools/cli` |
| `@launa/mcp-server` | npm | `tools/mcp-server` |
| `@launa/react-paywall` | npm | `packages/react-paywall` |
| `launa-sdk` | PyPI (not live yet) | `packages/python` |
| `github.com/AxLabs/launa-sdks/go` | Go module proxy | `packages/golang` |

Go is consumed via subdirectory module tags on GitHub — no separate registry. Tag `go/v0.0.6` (matching semver). There are no `go/v*` tags yet; `v0.0.6` is the first Go release.

Python version is already `0.0.6` in `pyproject.toml`. Do **not** enable tag-triggered PyPI until trusted publishing is configured. First upload is `workflow_dispatch` only.

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

1. Bump `version` in all publishable `package.json` files and `packages/python/pyproject.toml`. Keep them in sync (currently `0.0.6`).
2. Commit and push to `main`.
3. Create and push the npm tag manually — **the tag triggers npm publish**, not the other way around:

```bash
git tag v0.0.6
git push origin v0.0.6
```

The workflow checks out the tagged commit, verifies the tag matches `package.json` version, then publishes `@launa/sdk`, `@launa/cli`, `@launa/mcp-server`, and `@launa/react-paywall`.

For a TypeScript SDK preview, bump only `packages/typescript/package.json`, then push a matching
`v<version>-preview.<number>` tag. The workflow publishes only `@launa/sdk` with the `preview`
dist-tag; `latest` and the other packages remain unchanged.

To move a tag after a fix:

```bash
git push origin :refs/tags/v0.0.6
git tag -d v0.0.6
git tag v0.0.6
git push origin v0.0.6
```

`v*` does **not** publish Go or PyPI.

### Release (Go)

Subdirectory module tags (`go/v*`). Push after `main` includes the release commit:

```bash
git tag go/v0.0.6
git push origin go/v0.0.6
```

Consumers: `go get github.com/AxLabs/launa-sdks/go@v0.0.6`. The proxy may take a few minutes to index.

### PyPI (`launa-sdk`) — prepared, not published

The package name is not on PyPI yet. Version is synced to `0.0.6`. `.github/workflows/publish-pypi.yml` is `workflow_dispatch` only (tag trigger stays commented out).

Before the first upload:

1. Sign in at [pypi.org](https://pypi.org) as the AxLabs publisher.
2. **Publishing** → **Add a new pending publisher** → **GitHub** (no project exists yet; pending publisher creates it on first upload):
   - **Owner:** `AxLabs`
   - **Repository:** `launa-sdks`
   - **Workflow name:** `publish-pypi.yml`
   - **Environment name:** leave empty
3. Save. The workflow already uses `pypa/gh-action-pypi-publish` with OIDC (`id-token: write`). Artifacts are `packages/python/dist` (repo-root path).

Then: Actions → **Publish PyPI** → **Run workflow**. Do not uncomment the `v*` trigger until that first upload succeeds.

Until then, install from git:

```bash
pip install "launa-sdk @ git+https://github.com/AxLabs/launa-sdks.git#subdirectory=packages/python"
```

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

# after first PyPI upload
pip install launa-sdk
pip install "launa-sdk[buyer]"

# until then
pip install "launa-sdk @ git+https://github.com/AxLabs/launa-sdks.git#subdirectory=packages/python"
```

```bash
go get github.com/AxLabs/launa-sdks/go@v0.0.6
```
