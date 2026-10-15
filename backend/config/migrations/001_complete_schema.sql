-- Apply once to an existing pre-audit Curatus schema after backup.
-- Existing users must have unique case-insensitive email values before this migration.
ALTER TABLE users ADD COLUMN phone varchar(20) NOT NULL DEFAULT '', ADD COLUMN bio text NULL, ADD UNIQUE KEY uq_users_email (Email);
ALTER TABLE appointments ADD COLUMN createdAt timestamp NOT NULL DEFAULT current_timestamp();
CREATE TABLE chatbotchats (
 ID int NOT NULL AUTO_INCREMENT PRIMARY KEY,
 userID int NOT NULL,
 createdAt timestamp NOT NULL DEFAULT current_timestamp(),
 KEY idx_chat_user (userID),
 CONSTRAINT fk_chat_user FOREIGN KEY (userID) REFERENCES users(ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
ALTER TABLE chatbotmessages ADD COLUMN chatID int NULL;
-- Preserve old messages by grouping them into one legacy chat per user.
INSERT INTO chatbotchats (userID) SELECT DISTINCT userID FROM chatbotmessages;
UPDATE chatbotmessages cm JOIN chatbotchats cc ON cc.userID=cm.userID SET cm.chatID=cc.ID WHERE cm.chatID IS NULL;
ALTER TABLE chatbotmessages MODIFY chatID int NOT NULL, ADD KEY idx_message_chat (chatID), ADD CONSTRAINT fk_message_chat FOREIGN KEY (chatID) REFERENCES chatbotchats(ID);
ALTER TABLE reactions MODIFY ipAddress varchar(100) DEFAULT NULL;
UPDATE personalchats SET status='delivered' WHERE status='';
ALTER TABLE personalchats MODIFY status enum('read','delivered') NOT NULL DEFAULT 'delivered';
UPDATE appointments SET status='completed' WHERE status='';
ALTER TABLE appointments MODIFY status enum('upcoming','completed','cancelled') NOT NULL DEFAULT 'upcoming';
CREATE INDEX idx_appointment_slot ON appointments (date,time,status);
CREATE INDEX idx_personal_unread ON personalchats (aptID,status,sentBy);

