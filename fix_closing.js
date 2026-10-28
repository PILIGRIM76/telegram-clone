const fs = require('fs');

const content = fs.readFileSync('F:/AntiPiry/src/components/ContactList.tsx', 'utf8');

let newContent = content;

// Fix the IIFE closing - change })})} to })())}
// Find the pattern: );\n              })}\n            </ul>\n          )}
// Replace with: );\n              )})\n            </ul>\n          )}

const oldPattern = `);
              })}
            </ul>
          )}`;

const newPattern = `);
              )})
            </ul>
          )}`;

if (newContent.includes(oldPattern)) {
  newContent = newContent.replace(oldPattern, newPattern);
  console.log('Fixed IIFE closing');
} else {
  console.log('Pattern not found');
}

fs.writeFileSync('F:/AntiPiry/src/components/ContactList.tsx', newContent, 'utf8');
console.log('Done');