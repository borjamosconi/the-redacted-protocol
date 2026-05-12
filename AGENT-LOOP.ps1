$ErrorActionPreference = "Continue"
$ws = "C:\Users\mosko\Documents\THE REDACTED PROTOCOL\the_redacted_protocol"
Set-Location $ws

# Load .env into process environment
Get-Content "$ws\.env" | ForEach-Object {
    if ($_ -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

$logFile = "$ws\logs\agent-stdout.log"
$errFile = "$ws\logs\agent-stderr.log"
$restartCount = 0

while ($true) {
    $restartCount++
    Add-Content $logFile "`n[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] === Agent start #$restartCount ===`n"

    & "$ws\target\release\rd.exe" --telegram 2>> $errFile >> $logFile

    Add-Content $logFile "`n[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Agent exited (code: $LASTEXITCODE). Restart in 10s...`n"
    Start-Sleep -Seconds 10
}
