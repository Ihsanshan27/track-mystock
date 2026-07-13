const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirPath = path.join(dir, file);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  }
}

const rootDir = path.join(__dirname, '../src/modules');

walkDir(rootDir, (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if file has <select
  // Use regex to match exactly <select followed by space, newline or >
  const selectTagRegex = /<select([\s>])/g;
  const endSelectTagRegex = /<\/select>/g;

  if (selectTagRegex.test(content) || endSelectTagRegex.test(content)) {
    let modified = content;
    
    // Replace tags
    modified = modified.replace(selectTagRegex, '<CustomSelect$1');
    modified = modified.replace(endSelectTagRegex, '</CustomSelect>');

    // Add import if not present
    if (!modified.includes('import CustomSelect')) {
      // Find the last import statement
      const importRegex = /import .* from ['"].*['"];?\n/g;
      let lastImportIndex = 0;
      let match;
      while ((match = importRegex.exec(modified)) !== null) {
        lastImportIndex = match.index + match[0].length;
      }

      const importStatement = "import CustomSelect from '@/modules/shared/components/CustomSelect';\n";
      if (lastImportIndex > 0) {
        modified = modified.slice(0, lastImportIndex) + importStatement + modified.slice(lastImportIndex);
      } else {
        // If no imports (rare in TSX), put at top
        modified = importStatement + modified;
      }
    }

    if (content !== modified) {
      fs.writeFileSync(filePath, modified, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});

console.log('Done!');
