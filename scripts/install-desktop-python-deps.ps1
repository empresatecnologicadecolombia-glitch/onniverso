# Instala dependencias Python para la oficina docente del .exe
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$req = Join-Path $root "electron\python\requirements.txt"

$candidates = @("python", "py", "python3")
$python = $null
foreach ($c in $candidates) {
  try {
    $v = & $c --version 2>&1
    if ($LASTEXITCODE -eq 0 -or $v -match "Python") {
      $python = $c
      break
    }
  } catch {}
}

if (-not $python) {
  Write-Host "No se encontró Python. Instala Python 3.11+ desde https://www.python.org/downloads/"
  Write-Host "O define ONNI_PYTHON_PATH con la ruta al ejecutable."
  exit 1
}

Write-Host "Usando: $python"
& $python -m pip install --upgrade pip
& $python -m pip install -r $req
Write-Host "Listo. Opcional: instala ffmpeg en PATH para optimizar videos."
