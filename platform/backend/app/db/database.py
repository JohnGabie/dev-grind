from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "sqlite:///./devgrind.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def run_migrations(engine):
    """Idempotent migrations — safe to run on every startup."""
    with engine.connect() as conn:
        # exercises.concepts
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(exercises)"))}
        if "concepts" not in cols:
            conn.execute(text("ALTER TABLE exercises ADD COLUMN concepts TEXT DEFAULT '[]'"))
            conn.commit()

        # submissions.user_id
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(submissions)"))}
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN user_id TEXT REFERENCES users(id)"))
            conn.execute(text(
                "UPDATE submissions SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL"
            ))
            conn.commit()

        # daily_progress.user_id — recreate table to drop unique(date) and add unique(user_id, date)
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(daily_progress)"))}
        if "user_id" not in cols:
            conn.execute(text("""
                CREATE TABLE daily_progress_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    date DATE NOT NULL,
                    exercises_completed INTEGER NOT NULL DEFAULT 0,
                    exercises_attempted INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(user_id, date)
                )
            """))
            conn.execute(text("""
                INSERT INTO daily_progress_new (id, user_id, date, exercises_completed, exercises_attempted)
                SELECT id, (SELECT id FROM users LIMIT 1), date, exercises_completed, exercises_attempted
                FROM daily_progress
            """))
            conn.execute(text("DROP TABLE daily_progress"))
            conn.execute(text("ALTER TABLE daily_progress_new RENAME TO daily_progress"))
            conn.commit()

        # books.user_id
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(books)"))}
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE books ADD COLUMN user_id TEXT REFERENCES users(id)"))
            conn.execute(text(
                "UPDATE books SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL"
            ))
            conn.commit()

        # book_prefs: recriar com (user_id, slug) como chave composta
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(book_prefs)"))}
        if "user_id" not in cols:
            conn.execute(text("""
                CREATE TABLE book_prefs_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    slug TEXT NOT NULL,
                    dark_mode BOOLEAN NOT NULL DEFAULT 0,
                    view_mode TEXT NOT NULL DEFAULT 'single',
                    last_page INTEGER NOT NULL DEFAULT 1,
                    UNIQUE(user_id, slug)
                )
            """))
            conn.execute(text("DROP TABLE book_prefs"))
            conn.execute(text("ALTER TABLE book_prefs_new RENAME TO book_prefs"))
            conn.commit()

        # book_prefs.last_page (for existing tables already migrated)
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(book_prefs)"))}
        if "last_page" not in cols:
            conn.execute(text("ALTER TABLE book_prefs ADD COLUMN last_page INTEGER NOT NULL DEFAULT 1"))
            conn.commit()

        # books.text_path
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(books)"))}
        if "text_path" not in cols:
            conn.execute(text("ALTER TABLE books ADD COLUMN text_path TEXT"))
            conn.commit()

        # exercises.user_id
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(exercises)"))}
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE exercises ADD COLUMN user_id TEXT REFERENCES users(id)"))
            conn.commit()

        # personal_tokens
        tables = {row[0] for row in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))}
        if "personal_tokens" not in tables:
            conn.execute(text("""
                CREATE TABLE personal_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token_hash TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL DEFAULT 'Claude Code',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    last_used_at DATETIME
                )
            """))
            conn.commit()

        # courses
        if "courses" not in tables:
            conn.execute(text("""
                CREATE TABLE courses (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id),
                    title TEXT NOT NULL,
                    book_slug TEXT,
                    description TEXT,
                    modules TEXT NOT NULL DEFAULT '[]',
                    is_complete BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()

        # courses.is_complete (for tables created before this column existed)
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(courses)"))}
        if "is_complete" not in cols:
            conn.execute(text("ALTER TABLE courses ADD COLUMN is_complete BOOLEAN NOT NULL DEFAULT 0"))
            conn.commit()

        # users.cover_url
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
        if "cover_url" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN cover_url TEXT"))
            conn.commit()

        # user_profiles
        if "user_profiles" not in tables:
            conn.execute(text("""
                CREATE TABLE user_profiles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
                    baseline_done BOOLEAN NOT NULL DEFAULT 0,
                    strengths TEXT NOT NULL DEFAULT '[]',
                    gaps TEXT NOT NULL DEFAULT '[]',
                    level TEXT NOT NULL DEFAULT '{}',
                    style TEXT NOT NULL DEFAULT '{}',
                    notes TEXT NOT NULL DEFAULT '[]',
                    recommendations TEXT NOT NULL DEFAULT '[]',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()

        # users.coins
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
        if "coins" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0"))
            conn.commit()

        # users.bio
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
        if "bio" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
            conn.commit()

        # users.social_links
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
        if "social_links" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN social_links TEXT DEFAULT '{}'"))
            conn.commit()

        # store_items
        tables = {row[0] for row in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))}
        if "store_items" not in tables:
            conn.execute(text("""
                CREATE TABLE store_items (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    type TEXT NOT NULL,
                    category TEXT NOT NULL,
                    price_coins INTEGER NOT NULL DEFAULT 0,
                    rarity TEXT NOT NULL DEFAULT 'common',
                    item_data TEXT NOT NULL DEFAULT '{}',
                    is_active BOOLEAN NOT NULL DEFAULT 1
                )
            """))
            conn.commit()
            _seed_store_items(conn)
        else:
            # tabela existe — garante novos items (INSERT OR IGNORE é idempotente)
            _seed_store_items(conn)

        # user_inventory
        if "user_inventory" not in tables:
            conn.execute(text("""
                CREATE TABLE user_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    item_id TEXT NOT NULL REFERENCES store_items(id),
                    purchased_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    equipped_slot TEXT
                )
            """))
            conn.commit()


_STORE_SEED = [
    {
        "id": "bg-void",
        "name": "Void",
        "description": "O cosmos padrão. As estrelas do começo.",
        "type": "background", "category": "starfield",
        "price_coins": 0, "rarity": "free",
        "item_data": '{"type":"starfield","color1":"rgba(255,255,255,0.35)","color2":"rgba(255,255,255,0.55)","color3":"rgba(255,255,255,0.85)","density":1.0,"speed":1.0}',
    },
    {
        "id": "bg-neon-cyan",
        "name": "Neon Cyan",
        "description": "Cyan elétrico. Para quem faz do grind um estilo de vida.",
        "type": "background", "category": "starfield",
        "price_coins": 800, "rarity": "common",
        "item_data": '{"type":"starfield","color1":"rgba(34,211,238,0.28)","color2":"rgba(34,211,238,0.52)","color3":"rgba(34,211,238,0.90)","density":1.0,"speed":1.0}',
    },
    {
        "id": "bg-crimson",
        "name": "Crimson",
        "description": "Vermelho intenso. Para os que não têm medo de falhar.",
        "type": "background", "category": "starfield",
        "price_coins": 1500, "rarity": "common",
        "item_data": '{"type":"starfield","color1":"rgba(239,68,68,0.28)","color2":"rgba(239,68,68,0.50)","color3":"rgba(239,68,68,0.88)","density":1.0,"speed":1.0}',
    },
    {
        "id": "bg-amber",
        "name": "Amber Glow",
        "description": "Ouro queimado. Conquista visível.",
        "type": "background", "category": "starfield",
        "price_coins": 1500, "rarity": "common",
        "item_data": '{"type":"starfield","color1":"rgba(234,179,8,0.28)","color2":"rgba(234,179,8,0.52)","color3":"rgba(234,179,8,0.88)","density":1.0,"speed":1.2}',
    },
    {
        "id": "bg-deep-purple",
        "name": "Deep Purple",
        "description": "Roxo profundo. Raridade visível.",
        "type": "background", "category": "starfield",
        "price_coins": 2000, "rarity": "rare",
        "item_data": '{"type":"starfield","color1":"rgba(168,85,247,0.28)","color2":"rgba(168,85,247,0.52)","color3":"rgba(168,85,247,0.90)","density":1.2,"speed":0.9}',
    },
    {
        "id": "bg-void-dense",
        "name": "Void Dense",
        "description": "O void, mais denso. Mais estrelas para os persistentes.",
        "type": "background", "category": "starfield",
        "price_coins": 2500, "rarity": "rare",
        "item_data": '{"type":"starfield","color1":"rgba(255,255,255,0.28)","color2":"rgba(255,255,255,0.50)","color3":"rgba(255,255,255,0.85)","density":2.5,"speed":0.8}',
    },
    {
        "id": "bg-matrix",
        "name": "Matrix",
        "description": "Verde. Rápido. Só para quem chegou aqui de propósito.",
        "type": "background", "category": "starfield",
        "price_coins": 3000, "rarity": "rare",
        "item_data": '{"type":"starfield","color1":"rgba(34,197,94,0.28)","color2":"rgba(34,197,94,0.52)","color3":"rgba(34,197,94,0.90)","density":1.5,"speed":2.2}',
    },
    {
        "id": "bg-gold-rush",
        "name": "Gold Rush",
        "description": "Lendário. Não se compra fácil — nem com dinheiro.",
        "type": "background", "category": "starfield",
        "price_coins": 5000, "rarity": "legendary",
        "item_data": '{"type":"starfield","color1":"rgba(251,191,36,0.32)","color2":"rgba(251,191,36,0.58)","color3":"rgba(251,191,36,0.95)","density":2.0,"speed":1.3}',
    },
    # ── Matrix ────────────────────────────────────────────────────────────────
    {"id":"mat-green","name":"Matrix Green","description":"Chars caindo em verde terminal. Clássico.","type":"background","category":"matrix","price_coins":0,"rarity":"free","item_data":'{"type":"matrix","color1":"#00ff41","color2":"#007722","color3":"#002211"}'},
    {"id":"mat-cyan","name":"Matrix Cyan","description":"O terminal, mas em azul elétrico.","type":"background","category":"matrix","price_coins":0,"rarity":"free","item_data":'{"type":"matrix","color1":"#22d3ee","color2":"#0891b2","color3":"#0e4a5e"}'},
    {"id":"mat-red","name":"Matrix Red","description":"Código caindo em vermelho. Urgência permanente.","type":"background","category":"matrix","price_coins":0,"rarity":"free","item_data":'{"type":"matrix","color1":"#ef4444","color2":"#991b1b","color3":"#450a0a"}'},
    {"id":"mat-rainbow","name":"Matrix Rainbow","description":"Chars em gradiente arco-íris. Caótico e bonito.","type":"background","category":"matrix","price_coins":0,"rarity":"free","item_data":'{"type":"matrix","color1":"#ff0050","color2":"#00ff88","color3":"#0080ff"}'},
    {"id":"mat-fire","name":"Matrix Fire","description":"Código em chamas. Do branco ao vermelho.","type":"background","category":"matrix","price_coins":0,"rarity":"free","item_data":'{"type":"matrix","color1":"#ffffff","color2":"#ff6600","color3":"#cc2200"}'},
    {"id":"mat-ice","name":"Matrix Ice","description":"Chars congelados. Do branco ao roxo profundo.","type":"background","category":"matrix","price_coins":0,"rarity":"free","item_data":'{"type":"matrix","color1":"#ffffff","color2":"#0088ff","color3":"#6600cc"}'},
    # ── Rain ──────────────────────────────────────────────────────────────────
    {"id":"rain-cyan","name":"Rain Cyan","description":"Chuva em cyan. Atmosférico e sereno.","type":"background","category":"rain","price_coins":0,"rarity":"free","item_data":'{"type":"rain","color1":"#09f"}'},
    {"id":"rain-green","name":"Rain Green","description":"Chuva verde. Natureza binária.","type":"background","category":"rain","price_coins":0,"rarity":"free","item_data":'{"type":"rain","color1":"#0f0"}'},
    {"id":"rain-purple","name":"Rain Purple","description":"Chuva roxa. Misteriosa.","type":"background","category":"rain","price_coins":0,"rarity":"free","item_data":'{"type":"rain","color1":"#a855f7"}'},
    {"id":"rain-neon","name":"Rain Neon","description":"Chuva em rosa neon com hue-rotate. Sintética.","type":"background","category":"rain","price_coins":0,"rarity":"free","item_data":'{"type":"rain","color1":"#ff00cc"}'},
    {"id":"rain-fire","name":"Rain Fire","description":"Chuva alaranjada. Quente.","type":"background","category":"rain","price_coins":0,"rarity":"free","item_data":'{"type":"rain","color1":"#ff6600"}'},
    {"id":"rain-teal","name":"Rain Teal","description":"Chuva em verde-azulado. Fresca.","type":"background","category":"rain","price_coins":0,"rarity":"free","item_data":'{"type":"rain","color1":"#00d4aa"}'},
    # ── Aurora ────────────────────────────────────────────────────────────────
    {"id":"aurora-default","name":"Aurora","description":"Borealis em roxo, cyan e verde. O clássico.","type":"background","category":"aurora","price_coins":0,"rarity":"free","item_data":'{"type":"aurora","color1":"rgba(138,43,226,0.8)","color2":"rgba(0,191,255,0.7)","color3":"rgba(50,205,50,0.6)"}'},
    {"id":"aurora-fire","name":"Aurora Fire","description":"Borealis em tons de fogo. Vermelho ao amarelo.","type":"background","category":"aurora","price_coins":0,"rarity":"free","item_data":'{"type":"aurora","color1":"rgba(239,68,68,0.8)","color2":"rgba(249,115,22,0.7)","color3":"rgba(234,179,8,0.6)"}'},
    {"id":"aurora-ocean","name":"Aurora Ocean","description":"Borealis em azul profundo e verde oceano.","type":"background","category":"aurora","price_coins":0,"rarity":"free","item_data":'{"type":"aurora","color1":"rgba(59,130,246,0.8)","color2":"rgba(20,184,166,0.7)","color3":"rgba(34,197,94,0.6)"}'},
    {"id":"aurora-synthwave","name":"Aurora Synthwave","description":"Borealis em roxo, rosa e azul. Anos 80.","type":"background","category":"aurora","price_coins":0,"rarity":"free","item_data":'{"type":"aurora","color1":"rgba(168,85,247,0.8)","color2":"rgba(236,72,153,0.7)","color3":"rgba(59,130,246,0.6)"}'},
    {"id":"aurora-nature","name":"Aurora Nature","description":"Borealis em tons de verde e esmeralda.","type":"background","category":"aurora","price_coins":0,"rarity":"free","item_data":'{"type":"aurora","color1":"rgba(34,197,94,0.8)","color2":"rgba(20,184,166,0.7)","color3":"rgba(163,230,53,0.6)"}'},
    {"id":"aurora-dusk","name":"Aurora Dusk","description":"Borealis em coral, laranja e magenta. Pôr do sol.","type":"background","category":"aurora","price_coins":0,"rarity":"free","item_data":'{"type":"aurora","color1":"rgba(251,113,133,0.8)","color2":"rgba(249,115,22,0.7)","color3":"rgba(236,72,153,0.6)"}'},
    # ── Midnight Sky ──────────────────────────────────────────────────────────
    {"id":"sky-white","name":"Midnight White","description":"Estrelas brancas e lua crescente. O clássico.","type":"background","category":"midnight-sky","price_coins":0,"rarity":"free","item_data":'{"type":"midnight-sky","color1":"#ffffff"}'},
    {"id":"sky-blue","name":"Midnight Blue","description":"Estrelas em azul frio. Noite ártica.","type":"background","category":"midnight-sky","price_coins":0,"rarity":"free","item_data":'{"type":"midnight-sky","color1":"#60a5fa"}'},
    {"id":"sky-amber","name":"Midnight Amber","description":"Estrelas douradas. Noite quente do deserto.","type":"background","category":"midnight-sky","price_coins":0,"rarity":"free","item_data":'{"type":"midnight-sky","color1":"#fbbf24"}'},
    {"id":"sky-neon","name":"Midnight Neon","description":"Estrelas em cyan elétrico. Cidade à noite.","type":"background","category":"midnight-sky","price_coins":0,"rarity":"free","item_data":'{"type":"midnight-sky","color1":"#22d3ee"}'},
    {"id":"sky-purple","name":"Midnight Purple","description":"Estrelas roxas. Noite mágica.","type":"background","category":"midnight-sky","price_coins":0,"rarity":"free","item_data":'{"type":"midnight-sky","color1":"#a78bfa"}'},
    {"id":"sky-crimson","name":"Midnight Crimson","description":"Estrelas vermelhas. Noite de batalha.","type":"background","category":"midnight-sky","price_coins":0,"rarity":"free","item_data":'{"type":"midnight-sky","color1":"#f87171"}'},
    # ── Radial Burst ──────────────────────────────────────────────────────────
    {"id":"radial-default","name":"Radial Burst","description":"Explosão radial com hue-rotate. RGB completo.","type":"background","category":"radial-burst","price_coins":0,"rarity":"free","item_data":'{"type":"radial-burst","color1":"#f00","color2":"#ff0","color3":"#0f0"}'},
    {"id":"radial-cool","name":"Radial Cool","description":"Explosão em azul, cyan e violeta.","type":"background","category":"radial-burst","price_coins":0,"rarity":"free","item_data":'{"type":"radial-burst","color1":"#00f","color2":"#0ff","color3":"#a0f"}'},
    {"id":"radial-warm","name":"Radial Warm","description":"Explosão em vermelho, laranja e amarelo.","type":"background","category":"radial-burst","price_coins":0,"rarity":"free","item_data":'{"type":"radial-burst","color1":"#f00","color2":"#f80","color3":"#ff0"}'},
    {"id":"radial-acid","name":"Radial Acid","description":"Explosão em verde ácido e limão.","type":"background","category":"radial-burst","price_coins":0,"rarity":"free","item_data":'{"type":"radial-burst","color1":"#0f0","color2":"#cf0","color3":"#ff0"}'},
    {"id":"radial-neon","name":"Radial Neon","description":"Explosão em magenta, cyan e lima. Puro neon.","type":"background","category":"radial-burst","price_coins":0,"rarity":"free","item_data":'{"type":"radial-burst","color1":"#f0f","color2":"#0ff","color3":"#cf0"}'},
    {"id":"radial-deep","name":"Radial Deep","description":"Explosão em roxo profundo e índigo.","type":"background","category":"radial-burst","price_coins":0,"rarity":"free","item_data":'{"type":"radial-burst","color1":"#320085","color2":"#6600cc","color3":"#4400aa"}'},
    # ── Neon Grid ─────────────────────────────────────────────────────────────
    {"id":"neon-grid-default","name":"Neon Grid","description":"Grid de pontos neon em rosa, cyan e azul.","type":"background","category":"neon-grid","price_coins":0,"rarity":"free","item_data":'{"type":"neon-grid","color1":"#ff00cc","color2":"#00ffcc","color3":"#3300ff"}'},
    {"id":"neon-grid-fire","name":"Neon Grid Fire","description":"Grid em vermelho, laranja e amarelo.","type":"background","category":"neon-grid","price_coins":0,"rarity":"free","item_data":'{"type":"neon-grid","color1":"#ff2200","color2":"#ff8800","color3":"#ffee00"}'},
    {"id":"neon-grid-ocean","name":"Neon Grid Ocean","description":"Grid em azul, teal e violeta.","type":"background","category":"neon-grid","price_coins":0,"rarity":"free","item_data":'{"type":"neon-grid","color1":"#0066ff","color2":"#00ccaa","color3":"#6600ff"}'},
    {"id":"neon-grid-matrix","name":"Neon Grid Matrix","description":"Grid em verde puro. Terminal em grade.","type":"background","category":"neon-grid","price_coins":0,"rarity":"free","item_data":'{"type":"neon-grid","color1":"#00ff44","color2":"#44ff00","color3":"#00cc22"}'},
    {"id":"neon-grid-sunset","name":"Neon Grid Sunset","description":"Grid em laranja, rosa e violeta. Pôr do sol sintético.","type":"background","category":"neon-grid","price_coins":0,"rarity":"free","item_data":'{"type":"neon-grid","color1":"#ff6600","color2":"#ff0080","color3":"#8800ff"}'},
    {"id":"neon-grid-ice","name":"Neon Grid Ice","description":"Grid em cyan, branco e azul. Frio total.","type":"background","category":"neon-grid","price_coins":0,"rarity":"free","item_data":'{"type":"neon-grid","color1":"#00ffff","color2":"#aaddff","color3":"#0088ff"}'},
]


def _seed_store_items(conn):
    for item in _STORE_SEED:
        conn.execute(text("""
            INSERT OR IGNORE INTO store_items (id, name, description, type, category, price_coins, rarity, item_data)
            VALUES (:id, :name, :description, :type, :category, :price_coins, :rarity, :item_data)
        """), item)
    conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
