// retryFailed.js - Re-enqueues failed notifications
const { Kafka } = require('kafkajs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const kafka = new Kafka({ clientId: 'retry-service', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

const requeueFailedNotifications = async () => {
  await producer.connect();

  // Fetch failed notifications with retry count less than a threshold (e.g., 3)
  const [rows] = await db.query('SELECT * FROM notifications WHERE status = ? AND retry_count < ?', ['FAILED', 3]);

  for (const row of rows) {
    try {
      await producer.send({
        topic: 'notifications',
        messages: [{ value: JSON.stringify({ notificationId: row.id, type: row.type, content: row.content }) }],
      });

      // Update status to RETRYING and increment retry count
      await db.execute('UPDATE notifications SET status = ?, retry_count = retry_count + 1 WHERE id = ?', ['RETRYING', row.id]);
    } catch (error) {
      console.error(`Failed to re-enqueue notification: ${error.message}`);
    }
  }

  await producer.disconnect();
};

requeueFailedNotifications().catch(console.error);

