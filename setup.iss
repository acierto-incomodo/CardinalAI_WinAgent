[Setup]
AppName=CardinalAI - WinAgent
AppVersion=1.0.6
DefaultDirName={userappdata}\StormGamesStudios\Programs\CardinalAI - WinAgent
DisableDirPage=yes
DefaultGroupName=StormGamesStudios
OutputDir=C:\Users\melio\Documents\GitHub\CardinalAI_WinAgent\output
OutputBaseFilename=CardinalAI_WinAgent_Installer
Compression=lzma
SolidCompression=yes
AppCopyright=Copyright © 2026 StormGamesStudios. All rights reserved.
VersionInfoCompany=StormGamesStudios
AppPublisher=StormGamesStudios
SetupIconFile=cardinal.ico
VersionInfoVersion=1.0.6.0
CloseApplications=no
DisableProgramGroupPage=no

[Types]
Name: "full"; Description: "Instalación completa"; Flags: iscustom

[Components]
Name: "main"; Description: "CardinalAI - WinAgent (Obligatorio)"; Flags: fixed; Types: full

[Files]
Source: "C:\Users\melio\Documents\GitHub\CardinalAI_WinAgent\dist\cardinal.exe"; DestDir: "{app}"; Flags: ignoreversion; Components: main
Source: "C:\Users\melio\Documents\GitHub\CardinalAI_WinAgent\cardinal.ico"; DestDir: "{app}"; Flags: ignoreversion; Components: main

[Icons]
; Acceso directo en el escritorio
Name: "{userdesktop}\CardinalAI - WinAgent"; Filename: "{app}\cardinal.exe"; IconFilename: "{app}\cardinal.ico"

; Acceso directo en el menú de inicio
Name: "{commonprograms}\StormGamesStudios\CardinalAI - WinAgent"; Filename: "{app}\cardinal.exe"; IconFilename: "{app}\cardinal.ico"

; Acceso directo para desinstalar
Name: "{commonprograms}\StormGamesStudios\Desinstalar CardinalAI - WinAgent"; Filename: "{uninstallexe}"; IconFilename: "{app}\cardinal.ico"

; Acceso directo en autostart (arranque)
Name: "{userstartup}\CardinalAI - WinAgent"; Filename: "{app}\cardinal.exe"; IconFilename: "{app}\cardinal.ico"; Flags: runminimized

[Registry]
Root: HKCU; Subkey: "Software\CardinalAI-WinAgent"; ValueType: string; ValueName: "Install_Dir"; ValueData: "{app}"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Run]
Filename: "{app}\cardinal.exe"; Description: "Ejecutar CardinalAI - WinAgent"; Flags: nowait postinstall skipifsilent

[Code]
procedure CloseCardinal();
var
  ResultCode: Integer;
begin
  Exec('taskkill', '/F /IM cardinal.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  // Durante la instalación, cierra cualquier instancia abierta
  if CurStep = ssInstall then
  begin
    CloseCardinal();
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  // Durante la desinstalación, cierra cualquier instancia abierta
  if CurUninstallStep = usUninstall then
  begin
    CloseCardinal();
  end;
end;
