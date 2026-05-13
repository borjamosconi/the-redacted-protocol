$ErrorActionPreference = "Stop"

$TaskName = "RedactedProtocolAgent"
$WorkDir = "C:\Users\mosko\Documents\THE REDACTED PROTOCOL\the_redacted_protocol"
$LoopPS1 = "$WorkDir\AGENT-LOOP.ps1"

if (-not (Test-Path $LoopPS1)) { Write-Host "ERR: AGENT-LOOP.ps1 not found"; exit 1 }
if (-not (Test-Path "$WorkDir\target\release\rd.exe")) { Write-Host "ERR: rd.exe not found"; exit 1 }
if (-not (Test-Path "$WorkDir\.env")) { Write-Host "ERR: .env not found"; exit 1 }

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$LoopPS1`"" -WorkingDirectory $WorkDir
$trigger1 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(30) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 365) -MultipleInstances IgnoreNew -Hidden
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($trigger1, $trigger2) -Settings $settings -Principal $principal -Description "The Redacted Protocol agent auto-start" -ErrorAction Stop | Out-Null
Write-Host "OK: task '$TaskName' registered"

Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 4
Get-ScheduledTask -TaskName $TaskName | Format-Table TaskName, State -AutoSize
