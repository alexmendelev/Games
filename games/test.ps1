$ErrorActionPreference = "Continue"

$logDir = "C:\tmp"
$logFile = Join-Path $logDir ("playwright-plugin-diagnostic-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log {
  param([string]$Text)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Text
  $line | Tee-Object -FilePath $logFile -Append
}

function Run-Step {
  param(
    [string]$Title,
    [scriptblock]$Script
  )

  Write-Log ""
  Write-Log ("=== " + $Title + " ===")

  try {
    & $Script 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        Write-Log ($_.ToString())
      } else {
        Write-Log ([string]$_)
      }
    }
  } catch {
    Write-Log ("EXCEPTION: " + $_.Exception.Message)
    Write-Log ($_.ScriptStackTrace)
  }
}

Set-Location "C:\Users\alexm\games\games"

Write-Log ("Log file: " + $logFile)
Write-Log ("Current directory: " + (Get-Location).Path)
Write-Log ("User: " + $env:USERNAME)
Write-Log ("Computer: " + $env:COMPUTERNAME)
Write-Log ("PowerShell: " + $PSVersionTable.PSVersion)
Write-Log ("PID: " + $PID)

Run-Step "node -v" {
  node -v
}

Run-Step "npm -v" {
  npm -v
}

Run-Step "playwright version" {
  cmd /c npx playwright --version
}

Run-Step "relevant env vars" {
  Get-ChildItem Env: |
    Where-Object { $_.Name -match 'PLAYWRIGHT|CHROME|BROWSER|NODE|ELECTRON|VSCODE' } |
    Sort-Object Name |
    Format-Table -AutoSize | Out-String -Width 4096
}

Run-Step "locate chrome-headless-shell.exe" {
  Get-ChildItem "$env:USERPROFILE\AppData\Local\ms-playwright" -Recurse -Filter chrome-headless-shell.exe -ErrorAction SilentlyContinue |
    Select-Object FullName, Length, LastWriteTime |
    Format-List | Out-String -Width 4096
}

Run-Step "direct playwright launch probe" {
  node -e "const { chromium } = require('playwright'); chromium.launch({ headless: true }).then(async b => { console.log('LAUNCHED'); await b.close(); }).catch(err => { console.error(err && err.stack || err); process.exit(1); });"
}

Run-Step "npm run test:e2e" {
  cmd /c npm run test:e2e
}

Run-Step "recent Defender status" {
  Get-MpComputerStatus |
    Select-Object AMRunningMode,AntispywareEnabled,AntivirusEnabled,BehaviorMonitorEnabled,IoavProtectionEnabled,RealTimeProtectionEnabled |
    Format-List | Out-String -Width 4096
}

Run-Step "recent Defender events" {
  Get-WinEvent -LogName "Microsoft-Windows-Windows Defender/Operational" -MaxEvents 30 |
    Select-Object TimeCreated,Id,LevelDisplayName,Message |
    Format-List | Out-String -Width 4096
}

Write-Log ""
Write-Log ("Done. Log saved to: " + $logFile)
$logFile
