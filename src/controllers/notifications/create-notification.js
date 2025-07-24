const admin = require("../caller/firebaseDbConnect")

const createNotificationRoute = async (req, res)=>{
    const {userId, title, message} = req.body

    if (!userId || !title || !message){
        return res.status(400).json({error:"cant find the required fields"})
    }

    createNotification(userId, title, message)
}


const createNotification = async (userId, title, message)=>{
    const db = admin.firestore();

    
    const notification = {
        userId,
        title,
        message,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
        const docRef = await db.collection('notifications').add(notification);
        console.log('✅ Notification added with ID:', docRef.id);
    } catch (error) {
        console.error('❌ Error adding notification:', error);
    }
}