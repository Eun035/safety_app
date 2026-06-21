const fs = require('fs');
const file = 'src/components/common/RewardWalletSheet.jsx';

let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\{isOpen && \(\s*<>\s*\{\/\* Backdrop \*\/\}\s*<motion\.div([^>]+)\/>/g,
    '{isOpen && (\n                    <motion.div key="backdrop"$1/>\n                )}\n                {isOpen && ('
);

content = content.replace(
    /<div className="fixed inset-0 z-\[2500\]([^>]+)>/g,
    '<motion.div key="sheet-wrapper" className="fixed inset-0 z-[2500]$1>'
);

content = content.replace(
    /<\/div>\s*<\/>\s*\)\}\s*<\/AnimatePresence>/g,
    '</motion.div>\n                )}\n        </AnimatePresence>'
);

fs.writeFileSync(file, content);
console.log('Fixed ' + file);
