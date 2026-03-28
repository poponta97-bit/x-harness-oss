-- Add OAuth 1.0a credential columns to x_accounts
ALTER TABLE x_accounts ADD COLUMN consumer_key TEXT;
ALTER TABLE x_accounts ADD COLUMN consumer_secret TEXT;
ALTER TABLE x_accounts ADD COLUMN access_token_secret TEXT;
