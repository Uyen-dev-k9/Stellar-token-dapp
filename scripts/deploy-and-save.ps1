$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$WasmPath = Join-Path $ProjectRoot "target\wasm32v1-none\release\token_vault.wasm"
$ContractIdFile = Join-Path $ProjectRoot "CONTRACT_ID.txt"
$DeploymentFile = Join-Path $ProjectRoot "DEPLOYMENT.md"
$FrontendConfig = Join-Path $ProjectRoot "frontend\src\contractConfig.ts"

$IdentityName = "token_vault_deployer"
$Network = "testnet"
$TokenName = "Stellar Token Vault"
$TokenSymbol = "STV"
$TokenDecimals = "7"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Native {
  param(
    [string]$Command,
    [string[]]$Arguments,
    [switch]$AllowFailure,
    [switch]$Silent
  )

  $PreviousErrorActionPreference = $ErrorActionPreference
  $PreviousNativePreference = $null

  if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
    $PreviousNativePreference = $Global:PSNativeCommandUseErrorActionPreference
    $Global:PSNativeCommandUseErrorActionPreference = $false
  }

  $ErrorActionPreference = "Continue"

  try {
    $Output = & $Command @Arguments 2>&1
    $ExitCode = $LASTEXITCODE
    $Lines = @()

    if ($null -ne $Output) {
      foreach ($Line in $Output) {
        $TextLine = [string]$Line

        if (-not [string]::IsNullOrWhiteSpace($TextLine)) {
          $Lines += $TextLine

          if (-not $Silent) {
            Write-Host $TextLine
          }
        }
      }
    }

    if ($ExitCode -ne 0 -and -not $AllowFailure) {
      throw "$Command $($Arguments -join ' ') failed with exit code $ExitCode"
    }

    return @{
      ExitCode = $ExitCode
      Output = $Lines
    }
  }
  finally {
    $ErrorActionPreference = $PreviousErrorActionPreference

    if ($null -ne $PreviousNativePreference) {
      $Global:PSNativeCommandUseErrorActionPreference = $PreviousNativePreference
    }
  }
}

function Invoke-StellarWithRetry {
  param(
    [string]$Title,
    [string[]]$Arguments,
    [int]$MaxAttempts = 4
  )

  for ($Attempt = 1; $Attempt -le $MaxAttempts; $Attempt++) {
    Write-Host ""
    Write-Host "$Title attempt $Attempt/$MaxAttempts..." -ForegroundColor DarkCyan

    $Result = Invoke-Native -Command "stellar" -Arguments $Arguments -AllowFailure

    if ($Result.ExitCode -eq 0) {
      return $Result.Output
    }

    if ($Attempt -lt $MaxAttempts) {
      Write-Host "Retrying shortly because testnet may still be syncing or sequence may be busy..." -ForegroundColor Yellow
      Start-Sleep -Seconds 20
    }
  }

  throw "$Title failed after $MaxAttempts attempts."
}

function Get-ContractIdFromOutput {
  param([string[]]$OutputLines)

  $Text = $OutputLines -join "`n"

  if ($Text -cmatch "C[A-Z0-9]{55}") {
    return $Matches[0]
  }

  throw "Could not parse contract ID from deploy output."
}

function Get-PublicKey {
  param([string]$KeyName)

  $Result = Invoke-Native -Command "stellar" -Arguments @("keys", "address", $KeyName) -AllowFailure -Silent

  if ($Result.ExitCode -eq 0) {
    $Address = ($Result.Output -join "").Trim()

    if ($Address -match "^G[A-Z0-9]{55}$") {
      return $Address
    }
  }

  $Result = Invoke-Native -Command "stellar" -Arguments @("keys", "public-key", $KeyName) -AllowFailure -Silent

  if ($Result.ExitCode -eq 0) {
    $Address = ($Result.Output -join "").Trim()

    if ($Address -match "^G[A-Z0-9]{55}$") {
      return $Address
    }
  }

  throw "Could not get public key for $KeyName."
}

function Ensure-Identity {
  param(
    [string]$KeyName,
    [string]$NetworkName
  )

  $ListResult = Invoke-Native -Command "stellar" -Arguments @("keys", "ls") -AllowFailure -Silent
  $ListText = $ListResult.Output -join "`n"

  if ($ListText -notmatch [Regex]::Escape($KeyName)) {
    Write-Host "Identity not found. Creating $KeyName..." -ForegroundColor Yellow
    $null = Invoke-Native -Command "stellar" -Arguments @("keys", "generate", $KeyName) -AllowFailure
  }
  else {
    Write-Host "Identity found: $KeyName" -ForegroundColor Green
  }

  $null = Invoke-Native -Command "stellar" -Arguments @("keys", "fund", $KeyName, "--network", $NetworkName) -AllowFailure

  return Get-PublicKey -KeyName $KeyName
}

function Write-TextNoBom {
  param(
    [string]$Path,
    [string]$Value
  )

  $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Value, $Utf8NoBom)
}

Set-Location $ProjectRoot

Write-Step "Check required CLIs"
cargo -V
stellar --version

Write-Step "Format and test contract"
cargo fmt --all -- --check
cargo test --workspace

Write-Step "Build Soroban contract"
stellar contract build

if (-not (Test-Path $WasmPath)) {
  throw "WASM file not found: $WasmPath"
}

Write-Step "Check Stellar identity"
$IdentityAddress = Ensure-Identity -KeyName $IdentityName -NetworkName $Network
Write-Host "Identity: $IdentityName"
Write-Host "Public key: $IdentityAddress"

Write-Step "Deploy token_vault contract"

$DeployOutput = Invoke-StellarWithRetry -Title "Deploy token_vault" -Arguments @(
  "contract",
  "deploy",
  "--wasm",
  $WasmPath,
  "--source-account",
  $IdentityName,
  "--network",
  $Network
)

$ContractId = Get-ContractIdFromOutput -OutputLines $DeployOutput
Write-Host "token_vault contract ID: $ContractId" -ForegroundColor Green

Write-Step "Initialize token_vault contract"

$null = Invoke-StellarWithRetry -Title "Initialize token_vault" -Arguments @(
  "contract",
  "invoke",
  "--id",
  $ContractId,
  "--source-account",
  $IdentityName,
  "--network",
  $Network,
  "--",
  "initialize",
  "--admin",
  $IdentityAddress,
  "--name",
  $TokenName,
  "--symbol",
  $TokenSymbol,
  "--decimals",
  $TokenDecimals
)

Write-TextNoBom -Path $ContractIdFile -Value $ContractId

Write-Step "Save deployment output"

$DeployedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$ConfigLines = @(
  "export const CONTRACT_CONFIG = {",
  "  network: 'testnet',",
  "  networkPassphrase: 'Test SDF Network ; September 2015',",
  "  rpcUrl: 'https://soroban-testnet.stellar.org',",
  "  explorerBaseUrl: 'https://stellar.expert/explorer/testnet',",
  "  contractId: '$ContractId',",
  "  deployerPublicKey: '$IdentityAddress',",
  "  tokenName: '$TokenName',",
  "  tokenSymbol: '$TokenSymbol',",
  "  tokenDecimals: $TokenDecimals,",
  "  deployedAt: '$DeployedAt',",
  "  projectName: 'Stellar-token-dapp',",
  "  repository: 'https://github.com/Uyen-dev-k9/Stellar-token-dapp'",
  "} as const;",
  "",
  "export const hasDeployedContract = CONTRACT_CONFIG.contractId.length > 0;",
  "",
  "export const getContractExplorerUrl = () =>",
  "  CONTRACT_CONFIG.explorerBaseUrl + '/contract/' + CONTRACT_CONFIG.contractId;"
)

[System.IO.File]::WriteAllLines($FrontendConfig, $ConfigLines, (New-Object System.Text.UTF8Encoding($false)))

$DeploymentLines = @(
  "# Stellar Token dApp Level 3 Deployment",
  "",
  "Network: $Network",
  "",
  "Deployer public key: $IdentityAddress",
  "",
  "Contract ID: $ContractId",
  "",
  "Token name: $TokenName",
  "",
  "Token symbol: $TokenSymbol",
  "",
  "Token decimals: $TokenDecimals",
  "",
  "Deployed at UTC: $DeployedAt",
  "",
  "Contract explorer:",
  "https://stellar.expert/explorer/testnet/contract/$ContractId"
)

[System.IO.File]::WriteAllLines($DeploymentFile, $DeploymentLines, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Contract ID saved to CONTRACT_ID.txt" -ForegroundColor Green
Write-Host "Frontend config saved to frontend/src/contractConfig.ts" -ForegroundColor Green
Write-Host "Deployment summary saved to DEPLOYMENT.md" -ForegroundColor Green

Write-Host ""
Write-Host "Deploy script completed." -ForegroundColor Green