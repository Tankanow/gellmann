# Thin wrappers over commands that already exist in package.json and README.md.
# No logic lives here that isn't already a script or a documented release step.
.PHONY: init lint test verify bump-version release

# Only gellmann-mcp declares dependencies; root and pi-extension have none.
# Mirrors the "Install MCP deps" step in both CI workflows.
init:
	npm install --prefix gellmann-mcp

# No linter is configured in this repo (no eslint/ruff, no lint script). The
# target exists so `verify` has a stable shape; point it at a real linter if
# one is ever added.
lint:
	@echo "lint: no linter configured"

test:
	npm test

verify: lint test

# Bare `make bump-version` writes a dev stamp. Pass args through, e.g.
# `make bump-version ARGS="--release"` or `make bump-version ARGS="0.3.0"`.
bump-version:
	npm run bump -- $(ARGS)

# The release sequence from README.md: drop the dev stamp, confirm the release
# form, commit the bumped manifests, then tag and push. The tag push triggers
# .github/workflows/release.yml, which re-runs the guard against the tag.
# ponytail: `git commit -am` assumes a clean tree; it also sweeps in any other
# modified tracked file. Run from a clean checkout.
release:
	npm run bump -- --release
	npm run check
	V=$$(node scripts/bump-version.js --print) && \
	  git commit -am "chore: release v$$V" && \
	  git tag "v$$V" && \
	  git push origin "v$$V"
