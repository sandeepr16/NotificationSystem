-- create_notifications_table.sql

-- Create the database
CREATE DATABASE IF NOT EXISTS notifications;

-- Use the created database
USE notifications;

-- Create the table to store notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type VARCHAR(50),
    content TEXT,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
