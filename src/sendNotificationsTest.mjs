// sendNotificationsTest.mjs
import fetch from 'node-fetch';

const numberOfNotifications = 1000; // Number of notifications to send
const batchSize = 100; // Number of notifications to send in each batch
const delayBetweenBatches = 100; // Delay in milliseconds between batches to prevent overload

// Function to send a single notification
const sendNotification = async (userId, index) => {
  try {
    const response = await fetch('http://localhost:3000/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId, // Different userId for each notification
        type: 'PUSH', // Change as needed (EMAIL, SMS, PUSH)
        content: `Test notification ${index + 1}`, // Unique content for each notification
      }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Error: ${response.status} - ${errorMessage}`);
    }

    console.log(`Notification ${index + 1} sent successfully.`);
  } catch (error) {
    console.error(`Failed to send notification ${index + 1}:`, error.message);
  }
};

// Function to send notifications in batches to avoid server overload
const sendNotificationsInBatches = async () => {
  let currentBatch = 0;

  while (currentBatch * batchSize < numberOfNotifications) {
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      const notificationIndex = currentBatch * batchSize + i;
      if (notificationIndex >= numberOfNotifications) break;
      const userId = notificationIndex + 1; // Ensure unique userId for each notification
      promises.push(sendNotification(userId, notificationIndex));
    }

    // Wait for all notifications in the current batch to be sent
    await Promise.all(promises);
    console.log(`Batch ${currentBatch + 1} sent successfully.`);

    currentBatch++;
    // Delay to avoid overloading the server
    await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
  }

  console.log(`All ${numberOfNotifications} notifications have been processed.`);
};

sendNotificationsInBatches().catch(console.error);
