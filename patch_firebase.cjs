const fs = require('fs');
let content = fs.readFileSync('src/firebase.ts', 'utf8');

content = content.replace(
  /import \{ initializeFirestore \} from 'firebase\/firestore';/,
  `import { getFirestore } from 'firebase/firestore';`
);

content = content.replace(
  /export const db = initializeFirestore\(app, \{\s*experimentalForceLongPolling: true\s*\}, firebaseConfig\.firestoreDatabaseId\);/,
  `export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);`
);

fs.writeFileSync('src/firebase.ts', content);
