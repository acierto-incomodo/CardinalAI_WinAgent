if (Test-Path -Path "dist") {
    Write-Host "Limpiando dist (manteniendo latest-linux.yaml/.yml, .AppImage y .deb)..."

    # Borrar archivos NO permitidos dentro de dist
    Get-ChildItem -Path "dist" -Recurse -File -Force | Where-Object {
        $name = $_.Name
        -not (
            $name -ieq "latest-linux.yaml" -or
            $name -ieq "latest-linux.yml" -or
            $name -ilike "*.AppImage" -or
            $name -ilike "*.deb"
        )
    } | ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    }

    # Borrar directorios vacíos (de abajo hacia arriba)
    Get-ChildItem -Path "dist" -Recurse -Directory -Force |
        Sort-Object FullName -Descending |
        ForEach-Object {
            try {
                if (-not (Get-ChildItem -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue)) {
                    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
                }
            } catch {}
        }
}

npm i

npm run build:win

# Reemplazar espacios por guiones en los nombres de archivo .exe y .blockmap generados
Get-ChildItem -Path . -Recurse -Include '*.exe', '*.blockmap' | ForEach-Object {
    $newName = $_.Name -replace ' ', '-'
    Rename-Item -Path $_.FullName -NewName $newName
}