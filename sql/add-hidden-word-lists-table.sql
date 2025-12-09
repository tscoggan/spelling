-- Migration: Add user_hidden_word_lists table for hiding word lists feature
-- Run this in Production database to enable the hide word lists feature

CREATE TABLE IF NOT EXISTS user_hidden_word_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_list_id INTEGER NOT NULL REFERENCES custom_word_lists(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, word_list_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_hidden_word_lists_user_id ON user_hidden_word_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hidden_word_lists_word_list_id ON user_hidden_word_lists(word_list_id);
