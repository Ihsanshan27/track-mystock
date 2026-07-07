$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source
$nodeCmd = (Get-Command node.exe -ErrorAction Stop).Source

$compilerProcess = $null

try {
  Write-Host "[api:dev] starting TypeScript compiler watch..."
  $compilerProcess = Start-Process `
    -FilePath $npmCmd `
    -ArgumentList @("run", "build:watch") `
    -WorkingDirectory $projectRoot `
    -PassThru

  $distMain = Join-Path $projectRoot "dist/main.js"
  $deadline = (Get-Date).AddSeconds(60)

  while (-not (Test-Path $distMain)) {
    if ($compilerProcess.HasExited) {
      throw "TypeScript compiler watch berhenti sebelum dist/main.js berhasil dibuat."
    }

    if ((Get-Date) -gt $deadline) {
      throw "Timeout menunggu build awal backend selesai."
    }

    Start-Sleep -Milliseconds 500
  }

  Write-Host "[api:dev] build awal selesai, menjalankan node --watch dist/main.js"
  & $nodeCmd --watch $distMain
}
finally {
  if ($compilerProcess -and -not $compilerProcess.HasExited) {
    Write-Host "[api:dev] stopping TypeScript compiler watch..."
    Stop-Process -Id $compilerProcess.Id -Force
  }
}
