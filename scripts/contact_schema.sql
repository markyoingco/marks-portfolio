-- Contact form table for markyoingco_contact on DreamHost MySQL.
-- Run this in phpMyAdmin or the DreamHost MySQL panel after creating the database.

CREATE TABLE IF NOT EXISTS contact_submissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  message TEXT NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_at (created_at),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
