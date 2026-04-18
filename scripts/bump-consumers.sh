#!/usr/bin/env bash
# After a successful `npm publish` of @m13v/seo-components, bump every local
# consumer repo to the newly-published version and push the result.
#
# Consumers are auto-discovered by scanning ~/ (depth 1-2) for any git repo
# whose package.json declares @m13v/seo-components. Add a new website that
# uses the package and it gets picked up automatically on the next publish.
#
# Run manually with: npm run bump:consumers
# Or let the postpublish hook run it: npm publish
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(jq -r .version "$PACKAGE_DIR/package.json")"

if [ -z "$VERSION" ] || [ "$VERSION" = "null" ]; then
  echo "could not read version from $PACKAGE_DIR/package.json" >&2
  exit 1
fi

echo "bumping consumers of @m13v/seo-components to $VERSION"
echo

consumers=()
shopt -s nullglob
for pkg in "$HOME"/*/package.json "$HOME"/*/*/package.json; do
  dir="$(dirname "$pkg")"
  [ "$dir" = "$PACKAGE_DIR" ] && continue
  case "$dir" in */node_modules/*) continue ;; esac
  if jq -e '((.dependencies // {}) + (.devDependencies // {}))["@m13v/seo-components"]' "$pkg" >/dev/null 2>&1; then
    git -C "$dir" rev-parse --git-dir >/dev/null 2>&1 || continue
    consumers+=("$dir")
  fi
done

if [ "${#consumers[@]}" -eq 0 ]; then
  echo "no consumer repos found under $HOME"
  exit 0
fi

echo "discovered ${#consumers[@]} consumer repo(s):"
printf '  %s\n' "${consumers[@]}"
echo

failed=()
for dir in "${consumers[@]}"; do
  name="$(basename "$dir")"
  echo "=== $name ==="
  branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD)"

  if ! (cd "$dir" && npm i "@m13v/seo-components@$VERSION" --save --silent); then
    failed+=("$name: npm install failed")
    continue
  fi

  # Also bump any local alias that points at @m13v/seo-components (e.g. "@seo/components": "npm:@m13v/seo-components@^0.11.0").
  # These aliases are what consumer code actually imports, so if they drift behind the direct dep the new version is never used.
  aliases=$(jq -r '((.dependencies // {}) + (.devDependencies // {})) | to_entries | map(select(.value | type == "string" and startswith("npm:@m13v/seo-components@"))) | .[].key' "$dir/package.json" 2>/dev/null || true)
  alias_failed=0
  for alias in $aliases; do
    if ! (cd "$dir" && npm i "$alias@npm:@m13v/seo-components@$VERSION" --save --silent); then
      failed+=("$name: alias $alias install failed")
      alias_failed=1
      break
    fi
  done
  if [ "$alias_failed" -eq 1 ]; then
    continue
  fi

  if [ -z "$(git -C "$dir" status --porcelain package.json package-lock.json 2>/dev/null)" ]; then
    echo "already at $VERSION, nothing to commit"
    continue
  fi

  git -C "$dir" add package.json package-lock.json
  if ! git -C "$dir" commit -m "Update @m13v/seo-components to ^$VERSION"; then
    failed+=("$name: commit failed")
    continue
  fi
  if ! git -C "$dir" push origin "$branch"; then
    failed+=("$name: push failed")
    continue
  fi
  echo "bumped and pushed on $branch"
done

echo
if [ "${#failed[@]}" -ne 0 ]; then
  echo "failures:"
  printf '  %s\n' "${failed[@]}"
  exit 1
fi
echo "all consumers up to date at $VERSION"
