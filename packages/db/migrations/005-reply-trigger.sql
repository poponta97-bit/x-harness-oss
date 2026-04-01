ALTER TABLE engagement_gates ADD COLUMN require_like INTEGER DEFAULT 0;
ALTER TABLE engagement_gates ADD COLUMN require_repost INTEGER DEFAULT 0;
ALTER TABLE engagement_gates ADD COLUMN require_follow INTEGER DEFAULT 0;
ALTER TABLE engagement_gates ADD COLUMN last_reply_since_id TEXT;
