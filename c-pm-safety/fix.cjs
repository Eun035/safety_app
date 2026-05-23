const fs = require('fs');
const files = [
    'src/components/common/FavoriteStations.jsx',
    'src/components/common/ShadowImpactSheet.jsx',
    'src/components/common/UserProfileSheet.jsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace {isOpen && ( <> <motion.div ... /> <div ...> <motion.div ... /> </div> </> )}
    // With separated {isOpen && ...} {isOpen && ...}
    
    content = content.replace(
        /\{isOpen && \(\s*<>\s*\{\/\* Backdrop \*\/\}\s*<motion\.div([^>]+)\/>/g,
        '{isOpen && (\n                    <motion.div key="backdrop"$1/>\n                )}\n\n                {isOpen && ('
    );
    
    // change <div className="fixed inset-0 z-[2500] to <motion.div key="sheet-wrapper" className="fixed inset-0 z-[2500]
    content = content.replace(
        /<div className="fixed inset-0 z-\[2500\]([^>]+)>/g,
        '<motion.div key="sheet-wrapper" className="fixed inset-0 z-[2500]$1>'
    );
    
    // change the closing </div> of that wrapper
    content = content.replace(
        /<\/div>\s*<\/>\s*\)\}\s*<\/AnimatePresence>/g,
        '</motion.div>\n                )}\n        </AnimatePresence>'
    );

    fs.writeFileSync(file, content);
    console.log('Fixed ' + file);
});
