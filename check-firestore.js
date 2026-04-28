const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkUsers() {
  try {
    const usersSnapshot = await db.collection("users").get();
    console.log(`Found ${usersSnapshot.size} users.`);
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`User ${doc.id}: email=${data.email}, role=${data.role}, management=${data.management}`);
    });
  } catch (error) {
    console.error("Error reading Firestore:", error);
  }
}

checkUsers().then(() => process.exit(0));
