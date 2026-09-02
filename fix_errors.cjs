const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace standard onSnapshot list handlers
  content = content.replace(/handleFirestoreError\(error, OperationType\.LIST, (.*?)\);\s+toast\.error\((.*?)\);/g, 
    "if (!handleFirestoreError(error, OperationType.LIST, $1)) toast.error($2);");

  // Replace other occurrences
  content = content.replace(/handleFirestoreError\(error, OperationType\.([A-Z]+), (.*?)\);\s+toast\.error\((.*?)\);/g, 
    "if (!handleFirestoreError(error, OperationType.$1, $2)) toast.error($3);");

  fs.writeFileSync(filePath, content);
}
console.log("Replaced");
