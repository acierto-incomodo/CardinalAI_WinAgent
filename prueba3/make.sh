#!/usr/bin/env bash
set -euo pipefail

if [[ -d "dist" ]]; then
  echo "Limpiando dist (manteniendo latest.yaml/.yml, .exe y .blockmap)..."
  # Borra todo dentro de dist salvo:
  # - latest.yaml / latest.yml
  # - *.exe
  # - *.blockmap
  find "dist" -type f ! \( \
    -name 'latest.yaml' -o -name 'latest.yml' -o \
    -name '*.exe' -o -name '*.blockmap' \
  \) -print0 | xargs -0r rm -f

  # Eliminar directorios vacíos
  find "dist" -type d -empty -print0 | xargs -0r rmdir
fi

npm i

npm run build

# Reemplazar espacios por guiones en los nombres de archivo .exe y .blockmap generados
find . -type f \( -name '*.exe' -o -name '*.blockmap' \) -print0 | while IFS= read -r -d '' file; do
  dir="$(dirname "$file")"
  base="$(basename "$file")"
  newbase="${base// /-}"
  if [[ "$base" != "$newbase" ]]; then
    mv -f -- "$file" "$dir/$newbase"
  fi
done

