// worker.js
const { Kafka } = require('kafkajs');
const mysql = require('mysql2/promise');
const axios = require('axios');
const WebSocket = require('ws');
require('dotenv').config();

const kafka = new Kafka({ clientId: 'notification-worker', brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'notification-group' });

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

// Connect to WebSocket server for live updates
// Update WebSocket connection to the new port
const ws = new WebSocket('ws://notification-service:8082'); // or the correct service name running the WebSocket server



ws.on('open', () => {
  console.log('Connected to WebSocket server for delivery updates.');
});

// Function to send the delivery update via WebSocket
const sendDeliveryUpdate = (userId, notificationId, status, content) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ userId, notificationId, status, content }));
  }
};

// Mock function to simulate sending notifications
const sendNotification = async (type, content) => {
  if (type === 'EMAIL') {
    console.log(`Sending email: ${content}`);
    await axios.post('https://api.example.com/send-email', { content }); // Example API call
  } else if (type === 'SMS') {
    console.log(`Sending SMS: ${content}`);
    // Simulate sending SMS
  } else if (type === 'PUSH') {
    console.log(`Sending push notification: ${content}`);
    // Simulate sending push notification
  }
};

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'notifications', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { notificationId, userId, type, content } = JSON.parse(message.value.toString());

      try {
        await sendNotification(type, content);

        // Update notification status to delivered in the database
        await db.execute('UPDATE notifications SET status = ? WHERE id = ?', ['DELIVERED', notificationId]);

        // Send a delivery update to the WebSocket server
        sendDeliveryUpdate(userId, notificationId, 'DELIVERED', content);
      } catch (error) {
        console.error(`Failed to send notification: ${error.message}`);

        // Update notification status to failed
        await db.execute('UPDATE notifications SET status = ? WHERE id = ?', ['FAILED', notificationId]);

        // Send a failure update to the WebSocket server
        sendDeliveryUpdate(userId, notificationId, 'FAILED', content);
      }
    },
  });
};

run().catch(console.error);
