# Redeploy de producción desde GitHub (sin subir la carpeta local).
# Uso: $env:VERCEL_TOKEN = "vcp_..." ; .\scripts\vercel-redeploy-from-git.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not $env:VERCEL_TOKEN) {
  Write-Host "Falta VERCEL_TOKEN. Crea uno en vercel.com/account/tokens" -ForegroundColor Red
  exit 1
}

$projectJson = Join-Path $Root ".vercel\project.json"
if (-not (Test-Path $projectJson)) {
  Write-Host "No hay .vercel\project.json — enlaza el proyecto con: npx vercel link" -ForegroundColor Red
  exit 1
}

$project = Get-Content $projectJson | ConvertFrom-Json
$projectId = $project.projectId
$headers = @{ Authorization = "Bearer $env:VERCEL_TOKEN" }

$deps = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=$projectId&limit=1&target=production" -Headers $headers
$lastId = $deps.deployments[0].uid
Write-Host "Redeploy desde GitHub (ultimo prod: $lastId)..."

$body = @{ name = $project.projectName; deploymentId = $lastId; target = "production" } | ConvertTo-Json
$new = Invoke-RestMethod -Method POST -Uri "https://api.vercel.com/v13/deployments" -Headers ($headers + @{ "Content-Type" = "application/json" }) -Body $body
Write-Host "Nuevo deploy: $($new.id) -> https://$($new.url)" -ForegroundColor Green

for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 5
  $d = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments/$($new.id)" -Headers $headers
  Write-Host "  $($d.readyState)"
  if ($d.readyState -eq "READY") { exit 0 }
  if ($d.readyState -eq "ERROR") { exit 1 }
}

Write-Host "Timeout esperando deploy." -ForegroundColor Yellow
exit 1
