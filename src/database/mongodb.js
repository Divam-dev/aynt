const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // Your MongoDB URI
const client = new MongoClient(uri);

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

async function insertUserData(userData) {
    const db = client.db('your_database_name');
    const usersCollection = db.collection('users');

    try {
        await usersCollection.insertOne(userData);
        console.log('User data inserted into the database');
    } catch (error) {
        console.error('Error inserting user data:', error);
    }
}

async function updateLinkCount(userId) {
    const db = client.db('your_database_name');
    const usersCollection = db.collection('users');

    try {
        await usersCollection.updateOne({ userId }, { $inc: { linksSent: 1 } });
        console.log('Links count updated for user:', userId);
    } catch (error) {
        console.error('Error updating link count:', error);
    }
}

module.exports = {
    connectToDatabase,
    insertUserData,
    updateLinkCount
};
