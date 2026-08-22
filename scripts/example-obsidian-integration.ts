// Obsidian Integration Example Code

// This code should be added to ChatWindow.tsx

// IMPORTS (add after existing imports):
// import { obsidianApi } from '../services/obsidianApi';

// STATE (add in component body):
// const [linkedNotes, setLinkedNotes] = useState<string[]>([]);

// EFFECT (add after existing useEffects):
// useEffect(() => {
//   if (partner?.name) {
//     obsidianApi.searchNotesByTag('#cipherlink/chat/' + partner.name)
//       .then(notes => setLinkedNotes(notes))
//       .catch(() => setLinkedNotes([]));
//   }
// }, [partner?.name]);

// UI PANEL (add in JSX before MessageInput):
// {linkedNotes.length > 0 && (
//   <div style={{ 
//     padding: '10px', 
//     background: '#f3f4f6', 
//     borderRadius: '8px', 
//     marginTop: '10px' 
//   }}>
//     <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>
//       🧠 Linked Notes in Obsidian:
//     </h4>
//     <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
//       {linkedNotes.map((note, idx) => (
//         <li 
//           key={idx} 
//           style={{ cursor: 'pointer', color: '#7c3aed', fontWeight: 'bold' }}
//           onClick={() => {
//             const vaultName = 'AntiPiry/CipherLink';
//             window.open(
//               'obsidian://open?vault=' + encodeURIComponent(vaultName) + '&file=' + encodeURIComponent(note),
//               '_blank'
//             );
//           }}
//         >
//           {note}
//         </li>
//       ))}
//     </ul>
//   </div>
// )}

// EXPORT BUTTON (add in toolbar):
// <button
//   onClick={async () => {
//     try {
//       const path = await obsidianApi.exportChatToMarkdown({
//         chatId: chatId,
//         participant: partnerName
//       });
//       alert('Exported to: ' + path);
//     } catch (err) {
//       console.error('Export failed:', err);
//       alert('Export error');
//     }
//   }}
//   style={{
//     padding: '6px 12px',
//     background: '#7c3aed',
//     color: 'white',
//     border: 'none',
//     borderRadius: '6px',
//     cursor: 'pointer'
//   }}
//   title="Export to Obsidian"
// >
//   🧠 Export to Obsidian
// </button>
