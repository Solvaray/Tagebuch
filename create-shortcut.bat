@echo off
setlocal enabledelayedexpansion

set "script_path=%~dp0deploy.py"
set "desktop=%userprofile%\Desktop"

powershell -NoProfile -Command ^
  $ws = New-Object -COM WScript.Shell; ^
  $sc = $ws.CreateShortcut('%desktop%\Tagebuch Deploy.lnk'); ^
  $sc.TargetPath = 'python'; ^
  $sc.Arguments = '\"%script_path%\"'; ^
  $sc.WorkingDirectory = '%~dp0'; ^
  $sc.IconLocation = '%~dp0deploy.ico'; ^
  $sc.Save()

echo ✅ Desktop-Verknüpfung erstellt: Tagebuch Deploy.lnk
pause
