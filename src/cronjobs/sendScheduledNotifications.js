const admin = require("../controllers/caller/firebaseDbConnect")
const cron = require("node-cron");


const db = admin.firestore();

// Cron runs every minute
cron.schedule("* * * * *", async () => {
  console.log("Cron job started...");

  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 10 * 60000);

  try {
    // Firestore Timestamp conversion
    const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
    const fiveMinutesFromNowTimestamp = admin.firestore.Timestamp.fromDate(fiveMinutesFromNow);

    const snapshot = await db.collection("campaigns")
    .where("scheduledTime", ">=", nowTimestamp)
    .where("scheduledTime", "<=", fiveMinutesFromNowTimestamp)
    .where("status", "==", "scheduled")
    .get();

    if (snapshot.empty) {
        console.log("No campaigns scheduled at this time.");
        return;
    }

    snapshot.forEach(async doc => {
        console.log(`Campaign ${doc}: sending notifications...`);
        doc.tokens.map(eachToken=>{
            admin.messaging().send({
                token: eachToken,
                notification: {
                    title: doc.title,
                    body: doc.message,
                    // call_details:JSON.stringify(callRequest),
                    // call_id : callHistoryDoc.id
                }
            })
        })
        try {
            await db.collection("campaigns").doc(doc.id).update({
              status: "sent"
            });
            console.log(`Campaign ${doc.id} marked as sent.`);
        } catch (updateErr) {
            console.error(`Failed to update campaign ${doc.id}:`, updateErr);
        }
    });
  } catch (err) {
    console.error("Error querying campaigns:", err);
  }
});