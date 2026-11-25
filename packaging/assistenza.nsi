Target amd64-unicode
!include "MUI2.nsh"

Name "Assistenza Remota MannaTec"
OutFile "public/downloads/assistenza.exe"
RequestExecutionLevel admin
SetCompressor /SOLID lzma
AutoCloseWindow true

!define MUI_ICON "${NSISDIR}/Contrib/Graphics/Icons/orange-install.ico"
!define MUI_PAGE_HEADER_TEXT "MannaTec Supporto Remoto"
!define MUI_PAGE_HEADER_SUBTEXT "Configurazione automatica del servizio di assistenza remota"

!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Italian"

Section "Install"
    DetailPrint "Preparazione ambiente di installazione..."
    CreateDirectory "$TEMP\MannaTecSetup"
    SetOutPath "$TEMP\MannaTecSetup"
    
    DetailPrint "Estrazione moduli di supporto..."
    File /oname=rustdesk.exe "public/downloads/rustdesk-host=remote.mannatec.it,relay=remote.mannatec.it:21117,key=xprpBdDVPKwXQd0HBInvLO38hvcT9mkVpBWVFckYkHM=,.exe"
    File "packaging/run_setup.cmd"
    
    DetailPrint "Installazione e applicazione configurazione MannaTec..."
    nsExec::Exec '"$TEMP\MannaTecSetup\run_setup.cmd"'
    
    DetailPrint "Pulizia file temporanei..."
    Delete "$TEMP\MannaTecSetup\rustdesk.exe"
    Delete "$TEMP\MannaTecSetup\run_setup.cmd"
    RMDir "$TEMP\MannaTecSetup"
    
    DetailPrint "Operazione completata con successo!"
    MessageBox MB_OK|MB_ICONINFORMATION "Assistenza Remota MannaTec configurata con successo!$\r$\n$\r$\nI tecnici possono ora supportarti da remoto tramite il server aziendale MannaTec."
SectionEnd
