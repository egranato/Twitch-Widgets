param(
  [string]$VideoDir = "AlbedoClient/src/assets/video",
  [int]$Cost = 5000,
  [string]$PromptTemplate = "Play {title}",
  [string]$Channel,
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

if (-not $PSBoundParameters.ContainsKey('WhatIf')) {
  if ($env:npm_config_whatif -eq 'true' -or $env:npm_config_dryrun -eq 'true') {
    $WhatIf = $true
  }
}

if (-not (Test-Path -LiteralPath $VideoDir)) {
  throw "Video directory not found: $VideoDir"
}

$videoFiles = Get-ChildItem -LiteralPath $VideoDir -File |
  Where-Object { $_.Extension -match '^\.(mp4|webm|mov|m4v)$' } |
  Sort-Object Name

if (-not $videoFiles -or $videoFiles.Count -eq 0) {
  throw "No video files found in $VideoDir"
}

Write-Host "Found $($videoFiles.Count) video files in $VideoDir" -ForegroundColor Cyan

foreach ($file in $videoFiles) {
  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  if ([string]::IsNullOrWhiteSpace($baseName)) {
    continue
  }

  $title = (Get-Culture).TextInfo.ToTitleCase($baseName)
  $prompt = $PromptTemplate.Replace('{title}', $title)

  $args = @(
    'run',
    'reward:create',
    '--',
    '--title', $title,
    '--cost', [string]$Cost,
    '--prompt', $prompt
  )

  if (-not [string]::IsNullOrWhiteSpace($Channel)) {
    $args += @('--channel', $Channel)
  }

  $preview = "npm " + ($args -join ' ')

  if ($WhatIf) {
    Write-Host "[dry-run] $preview" -ForegroundColor Yellow
    continue
  }

  Write-Host "[create] $title" -ForegroundColor Green

  # Prevent npm parent-run config flags from leaking into nested npm calls.
  $savedWhatIf = $env:npm_config_whatif
  $savedDryRun = $env:npm_config_dryrun
  Remove-Item Env:npm_config_whatif -ErrorAction SilentlyContinue
  Remove-Item Env:npm_config_dryrun -ErrorAction SilentlyContinue

  & npm @args

  if ($null -ne $savedWhatIf) {
    $env:npm_config_whatif = $savedWhatIf
  }

  if ($null -ne $savedDryRun) {
    $env:npm_config_dryrun = $savedDryRun
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Failed while creating reward for '$title'"
  }
}

if ($WhatIf) {
  Write-Host "Dry-run complete." -ForegroundColor Cyan
} else {
  Write-Host "Finished creating rewards from video list." -ForegroundColor Cyan
}
