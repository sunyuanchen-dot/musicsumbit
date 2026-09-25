-- 1. music 表加字段
ALTER TABLE music ADD COLUMN IF NOT EXISTS uploader_token TEXT;
ALTER TABLE music ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0;

-- 2. votes 表（一人一歌一票）
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  music_id BIGINT REFERENCES music(id) ON DELETE CASCADE,
  voter_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(music_id, voter_token)
);
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_read" ON votes;
CREATE POLICY "votes_read" ON votes FOR SELECT USING (true);

-- 3. 移除 music 的 update 策略（防止绕过 RPC 直接改数据）
DROP POLICY IF EXISTS "allow_update" ON music;

-- 4. RPC：投票/取消投票，返回最新票数
CREATE OR REPLACE FUNCTION toggle_vote(p_music_id BIGINT, p_voter_token TEXT)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE cnt BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM votes WHERE music_id = p_music_id AND voter_token = p_voter_token) THEN
    DELETE FROM votes WHERE music_id = p_music_id AND voter_token = p_voter_token;
  ELSE
    INSERT INTO votes (music_id, voter_token) VALUES (p_music_id, p_voter_token);
  END IF;
  SELECT COUNT(*) INTO cnt FROM votes WHERE music_id = p_music_id;
  UPDATE music SET vote_count = cnt WHERE id = p_music_id;
  RETURN cnt;
END;
$$;

-- 5. RPC：删除自己的歌（验证 uploader_token）
CREATE OR REPLACE FUNCTION delete_own_music(p_music_id BIGINT, p_uploader_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM music WHERE id = p_music_id AND uploader_token = p_uploader_token;
  RETURN FOUND;
END;
$$;

-- 6. RPC：管理员删除
CREATE OR REPLACE FUNCTION admin_delete_music(p_music_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM music WHERE id = p_music_id;
  RETURN FOUND;
END;
$$;

-- 7. RPC：管理员修改
CREATE OR REPLACE FUNCTION admin_update_music(p_music_id BIGINT, p_title TEXT, p_artist TEXT, p_image TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE music SET title = p_title, artist = p_artist, image = p_image WHERE id = p_music_id;
  RETURN FOUND;
END;
$$;

-- 8. 设置表（投稿开关）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO settings (key, value) VALUES ('submission_open', 'true')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_read" ON settings;
CREATE POLICY "settings_read" ON settings FOR SELECT USING (true);

-- 9. RPC：管理投稿开关
CREATE OR REPLACE FUNCTION admin_set_submission(p_open BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE settings SET value = p_open::text WHERE key = 'submission_open';
  RETURN FOUND;
END;
$$;
