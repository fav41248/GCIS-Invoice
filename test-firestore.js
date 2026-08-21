import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFile } from 'fs/promises';

async function test() {
  const configStr = await readFile('./firebase-applet-config.json', 'utf8');
  const firebaseConfig = JSON.parse(configStr);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  try {
    const querySnapshot = await getDocs(collection(db, 'invoices'));
    console.log(`Success! Found ${querySnapshot.size} invoices.`);
    process.exit(0);
  } catch (err) {
    console.error('Error connecting:', err);
    process.exit(1);
  }
}
test();
