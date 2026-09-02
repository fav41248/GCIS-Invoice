const admin = require('firebase-admin');
const serviceAccount = require('./firebase-applet-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('products').get();
  console.log(`Found ${snapshot.docs.length} products`);
  if (snapshot.docs.length > 0) {
    console.log(snapshot.docs[0].data());
  }
}
run();
