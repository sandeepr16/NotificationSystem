// notificationService.js
const express = require('express');
const { Kafka } = require('kafkajs');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { WebSocketServer } = require('ws'); // Import WebSocket server

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const kafka = new Kafka({ clientId: 'notification-service', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

const initializeProducer = async () => {
  await producer.connect();
};

// Create a WebSocket server
// Change the WebSocket server port to a different one, e.g., 8082
// Change WebSocket server binding to listen on all network interfaces
const wss = new WebSocketServer({ host: '0.0.0.0', port: 8082 });

 // Run WebSocket server on port 

// Broadcast function to send messages to all connected clients
const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Handle incoming WebSocket messages from workers
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    // Re-broadcast received message to all connected clients
    broadcast(data);
  });
});

app.post('/send-notification', async (req, res) => {
  const { userId, type, content } = req.body;

  // Save notification to MySQL with pending status
  const [result] = await db.execute(
    'INSERT INTO notifications (user_id, type, content, status) VALUES (?, ?, ?, ?)',
    [userId, type, content, 'PENDING']
  );

  const notificationId = result.insertId;

  // Send notification to Kafka
  await producer.send({
    topic: 'notifications',
    messages: [{ value: JSON.stringify({ notificationId, userId, type, content }) }],
  });

  // Broadcast notification status update to the UI
  broadcast({ notificationId, status: 'ENQUEUED', content });

  res.status(200).send('Notification enqueued.');
});

app.listen(process.env.PORT, () => {
  console.log(`Notification service running on port ${process.env.PORT}`);
  initializeProducer().catch(console.error);
});
