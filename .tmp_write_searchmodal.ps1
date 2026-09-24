 = [System.IO.File]::ReadAllText('F:\AntiPiry\src\components\SearchModal.tsx', [System.Text.Encoding]::UTF8);  =  -replace 'interface SearchModalProps \{[^}]*\}', 'interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: { uid: string; name: string }[];
  onSelect?: (uid: string) => void;
  currentContactUid?: string;
  onMessageSelect?: (messageId: string, contactUid: string) => void;
}'; [System.IO.File]::WriteAllText('F:\AntiPiry\src\components\SearchModal.tsx', , [System.Text.Encoding]::UTF8); Write-Host 'Done'
