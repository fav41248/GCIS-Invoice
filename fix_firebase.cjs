const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');
code = code.replace("import { initializeApp } from 'firebase/app';", "import { initializeApp, getApps, getApp } from 'firebase/app';");
code = code.replace("const app = initializeApp(firebaseConfig);", "const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();");
fs.writeFileSync('src/firebase.ts', code);
console.log("Updated firebase.ts");
