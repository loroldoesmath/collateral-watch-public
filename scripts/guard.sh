#!/bin/sh
# fails if the public repository contains files that look like engine code, models or data.
# run before every push. the private repository has a stricter scanner that checks for
# engine identifiers and canary strings.
fail=0
for f in $(find . -path ./.git -prune -o -type f -print); do
  case "$f" in
    ./tools/*.py) ;;
    *.py|*.ipynb|*.pkl|*.joblib|*.onnx|*.pt|*.npz|*.parquet)
      echo "blocked file: $f"; fail=1 ;;
  esac
  size=$(wc -c < "$f")
  if [ "$size" -gt 2000000 ]; then echo "file over 2 MB: $f"; fail=1; fi
done
if [ "$fail" -eq 0 ]; then echo "guard: clean"; fi
exit $fail
