const fs = require('fs');

const content = fs.readFileSync('F:/AntiPiry/src/components/ContactList.tsx', 'utf8');

let newContent = content;

// 1. Add Message to imports
newContent = newContent.replace(
  "import type { Chat, Contact, Group, IdentityType } from '../types';",
  "import type { Chat, Contact, Group, IdentityType, Message } from '../types';"
);

// 2. Fix getMessagePreview type
newContent = newContent.replace(
  "function getMessagePreview(lastMessage: any, identity: IdentityType): string {",
  "function getMessagePreview(lastMessage: Message | undefined, identity: IdentityType): string {"
);

// 3. Fix getUnreadCount type
newContent = newContent.replace(
  "function getUnreadCount(lastMessage: any, identity: IdentityType): number {",
  "function getUnreadCount(lastMessage: Message | undefined, identity: IdentityType): number {"
);

// 4. Fix ChatItemProps type
newContent = newContent.replace(
  "  lastMessage: any;",
  "  lastMessage: Message | undefined;"
);

// 5. Prefix unused groups
newContent = newContent.replace(
  "  groups,",
  "  groups: _groups,"
);

// 6. Prefix unused copied
newContent = newContent.replace(
  "const [copied, setCopied] = useState(false);",
  "const [_copied, setCopied] = useState(false);"
);

// 7. Fix handleCopyUid - add void and prefix with underscore
newContent = newContent.replace(
  "const handleCopyUid = () => {\n    navigator.clipboard.writeText(identity.uid);",
  "const _handleCopyUid = () => {\n    void navigator.clipboard.writeText(identity.uid);"
);

// 8. Prefix unused handleSearchChange
newContent = newContent.replace(
  "const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {",
  "const _handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {"
);

// 9. Add now variable before return
newContent = newContent.replace(
  "const _handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n    setSearchQuery(e.target.value);\n  };\n\n  return (",
  "const _handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n    setSearchQuery(e.target.value);\n  };\n\n  // Capture current time once per render to avoid Date.now() in JSX (react-hooks/purity)\n  const now = Date.now();\n\n  return ("
);

// 10. Fix Date.now() in map - replace inline Date.now() with now variable
newContent = newContent.replace(
  "contact.mutedUntil > Date.now()",
  "contact.mutedUntil > now"
);

fs.writeFileSync('F:/AntiPiry/src/components/ContactList.tsx', newContent, 'utf8');
console.log('All fixes applied!');