BEGIN;

CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    division_points INTEGER DEFAULT 0,
    division_level INTEGER DEFAULT 5,
    division_matches_played INTEGER DEFAULT 0,
    division_wins INTEGER DEFAULT 0,
    division_draws INTEGER DEFAULT 0,
    division_losses INTEGER DEFAULT 0,
    division_goals_for INTEGER DEFAULT 0,
    division_goals_against INTEGER DEFAULT 0,
    division_form TEXT DEFAULT '[]',
    division_last_outcome TEXT DEFAULT '',
    division_last_level INTEGER DEFAULT 5,
    division_last_points INTEGER DEFAULT 0,
    active_lineup_id INTEGER,
    coins INTEGER DEFAULT 0,
    role VARCHAR(20) DEFAULT 'player',
    status VARCHAR(20) DEFAULT 'active',
    timeout_until TIMESTAMP,
    google_id VARCHAR(50),
    facebook_id VARCHAR(50),
    apple_id VARCHAR(50),
    auth_provider VARCHAR(20),
    profile_picture_url TEXT,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    onboarding_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_level INTEGER DEFAULT 5;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_matches_played INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_wins INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_draws INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_losses INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_goals_for INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_goals_against INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_form TEXT DEFAULT '[]';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_last_outcome TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_last_level INTEGER DEFAULT 5;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_last_points INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'player';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timeout_until TIMESTAMP;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS apple_id VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS public.players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nation VARCHAR(60) NOT NULL,
    league VARCHAR(80) NOT NULL,
    club VARCHAR(80) NOT NULL,
    "position" VARCHAR(10) NOT NULL,
    alt_positions TEXT DEFAULT '',
    overall INTEGER NOT NULL,
    pace INTEGER DEFAULT 70,
    shooting INTEGER DEFAULT 70,
    passing INTEGER DEFAULT 70,
    dribbling INTEGER DEFAULT 70,
    defending INTEGER DEFAULT 70,
    physical INTEGER DEFAULT 70,
    rarity VARCHAR(20) DEFAULT 'common',
    card_type VARCHAR(20) DEFAULT 'gold',
    image_url VARCHAR(255) DEFAULT '',
    ea_player_id INTEGER,
    card_url TEXT,
    full_name VARCHAR(150) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS ea_player_id INTEGER;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS card_url TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS full_name VARCHAR(150) DEFAULT '';

CREATE TABLE IF NOT EXISTS public.lineups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'My Lineup',
    formation VARCHAR(20) NOT NULL DEFAULT '4-3-3',
    is_public BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    chemistry INTEGER DEFAULT 0,
    rating NUMERIC(4,1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lineup_slots (
    id SERIAL PRIMARY KEY,
    lineup_id INTEGER NOT NULL REFERENCES public.lineups(id) ON DELETE CASCADE,
    slot_code VARCHAR(10) NOT NULL,
    position_required VARCHAR(10) NOT NULL,
    player_id INTEGER REFERENCES public.players(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 minutes')
);

CREATE TABLE IF NOT EXISTS public.user_players (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES public.players(id),
    acquired_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(30) DEFAULT 'chest',
    is_tradeable BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.matches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    opponent_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    lineup_id INTEGER REFERENCES public.lineups(id) ON DELETE SET NULL,
    opponent_lineup_id INTEGER REFERENCES public.lineups(id) ON DELETE SET NULL,
    result VARCHAR(1) CHECK (result IN ('W', 'D', 'L')),
    score_for INTEGER DEFAULT 0,
    score_against INTEGER DEFAULT 0,
    stats_json TEXT DEFAULT '{}',
    events_json TEXT DEFAULT '[]',
    match_type TEXT NOT NULL DEFAULT 'quickmatch',
    match_stage TEXT,
    is_forfeit BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'quickmatch';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_stage TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_forfeit BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'easy',
    condition_type TEXT DEFAULT '',
    condition_value TEXT DEFAULT '{}',
    condition_json TEXT DEFAULT '{}',
    reward_type TEXT DEFAULT '',
    reward_value TEXT DEFAULT '',
    reward_json TEXT DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    start_at TIMESTAMP DEFAULT NOW(),
    end_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    expiration_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    progress_json TEXT DEFAULT '{}',
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    reward_claimed BOOLEAN DEFAULT FALSE,
    UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public.chest_cooldowns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chest_type VARCHAR(10) NOT NULL CHECK (chest_type IN ('bronze', 'silver', 'gold')),
    next_available_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, chest_type)
);

CREATE TABLE IF NOT EXISTS public.chest_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chest_type VARCHAR(10) NOT NULL,
    opened_at TIMESTAMP DEFAULT NOW(),
    rewards_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255),
    source VARCHAR(50) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'system';

CREATE TABLE IF NOT EXISTS public.community_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    category VARCHAR(50) DEFAULT 'general',
    likes_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    lineup_id INTEGER REFERENCES public.lineups(id) ON DELETE SET NULL,
    lineup_name VARCHAR(120) NOT NULL DEFAULT '',
    lineup_formation VARCHAR(20) NOT NULL DEFAULT '',
    lineup_snapshot TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS lineup_id INTEGER REFERENCES public.lineups(id) ON DELETE SET NULL;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS lineup_name VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS lineup_formation VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS lineup_snapshot TEXT;

CREATE TABLE IF NOT EXISTS public.community_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    parent_id INTEGER REFERENCES public.community_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES public.community_comments(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.community_likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES public.community_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL,
    target_id INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';
ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS public.community_moderation_strikes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL DEFAULT 'post',
    content_id INTEGER,
    reason TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'yellow',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_change_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requested_role VARCHAR(20) NOT NULL,
    requested_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reason TEXT,
    review_note TEXT,
    reviewed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject VARCHAR(180) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    sender_role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.news_articles (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(120) NOT NULL DEFAULT '',
    source_csv VARCHAR(120) NOT NULL DEFAULT '',
    source_domain VARCHAR(255) NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    link TEXT NOT NULL UNIQUE,
    author VARCHAR(255) NOT NULL DEFAULT '',
    published_at TIMESTAMP,
    published_raw VARCHAR(120) NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    fallback_image_url TEXT NOT NULL DEFAULT '/frontend/assets/images/ui/news.png',
    image_status VARCHAR(20) NOT NULL DEFAULT 'fallback',
    document_length INTEGER NOT NULL DEFAULT 0,
    title_length INTEGER NOT NULL DEFAULT 0,
    search_term_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.news_terms (
    id SERIAL PRIMARY KEY,
    term VARCHAR(255) NOT NULL UNIQUE,
    doc_freq INTEGER NOT NULL DEFAULT 0,
    collection_freq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.news_article_terms (
    article_id INTEGER NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES public.news_terms(id) ON DELETE CASCADE,
    term_freq INTEGER NOT NULL DEFAULT 0,
    title_freq INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (article_id, term_id)
);

ALTER TABLE public.news_terms ALTER COLUMN term TYPE VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON public.users(facebook_id) WHERE facebook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_apple_id ON public.users(apple_id) WHERE apple_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);
CREATE INDEX IF NOT EXISTS idx_players_position ON public.players("position");
CREATE INDEX IF NOT EXISTS idx_players_nation ON public.players(nation);
CREATE INDEX IF NOT EXISTS idx_players_league ON public.players(league);
CREATE INDEX IF NOT EXISTS idx_players_club ON public.players(club);
CREATE INDEX IF NOT EXISTS idx_players_overall ON public.players(overall);

CREATE INDEX IF NOT EXISTS idx_lineups_user ON public.lineups(user_id);
CREATE INDEX IF NOT EXISTS idx_lineups_public ON public.lineups(is_public);
CREATE INDEX IF NOT EXISTS idx_slots_lineup ON public.lineup_slots(lineup_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_players_user ON public.user_players(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user ON public.matches(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_community_posts_user ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent_id ON public.community_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_target_status ON public.community_reports(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON public.community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_id ON public.community_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_community_moderation_strikes_user ON public.community_moderation_strikes(user_id);

CREATE INDEX IF NOT EXISTS idx_role_change_requests_status ON public.role_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_change_requests_user_id ON public.role_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_requests_requested_by ON public.role_change_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_message_at ON public.support_tickets(last_message_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);

CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON public.news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_source_name ON public.news_articles(source_name);
CREATE INDEX IF NOT EXISTS idx_news_terms_term ON public.news_terms(term);
CREATE INDEX IF NOT EXISTS idx_news_article_terms_term_id ON public.news_article_terms(term_id);
CREATE INDEX IF NOT EXISTS idx_news_article_terms_article_id ON public.news_article_terms(article_id);

COMMIT;
