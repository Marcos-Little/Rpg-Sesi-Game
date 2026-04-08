-- ═══════════════════════════════════════════════════════════════
-- RPG DA TURMA — Schema Supabase (VERSÃO CORRIGIDA)
-- Cole no SQL Editor do Supabase e clique em Run
-- ═══════════════════════════════════════════════════════════════

-- ─── ALUNOS ─────────────────────────────────────────────────────
-- Dropa e recria para garantir colunas corretas
DROP TABLE IF EXISTS aluno_conquistas CASCADE;
DROP TABLE IF EXISTS conquistas CASCADE;
DROP TABLE IF EXISTS historico_evolucao CASCADE;
DROP TABLE IF EXISTS alunos CASCADE;
DROP TABLE IF EXISTS professores CASCADE;

CREATE TABLE alunos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome              TEXT NOT NULL,
  usuario           TEXT NOT NULL UNIQUE,
  senha             TEXT NOT NULL,
  turma             TEXT NOT NULL,
  personagem_criado BOOLEAN DEFAULT FALSE,   -- snake_case
  classe            TEXT,
  genero            TEXT,
  historia          TEXT,
  avatar            TEXT,
  avatar_full       TEXT,                    -- snake_case
  hp                INTEGER DEFAULT 100 CHECK (hp >= 0 AND hp <= 100),
  xp                INTEGER DEFAULT 0   CHECK (xp >= 0 AND xp <= 99),
  level             INTEGER DEFAULT 1   CHECK (level >= 1),
  virtude           TEXT,
  apelido           TEXT,
  lema              TEXT,
  avatar_customizado TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROFESSORES ────────────────────────────────────────────────
CREATE TABLE professores (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       TEXT NOT NULL,
  usuario    TEXT NOT NULL UNIQUE,
  senha      TEXT NOT NULL,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HISTÓRICO DE EVOLUÇÃO ──────────────────────────────────────
CREATE TABLE historico_evolucao (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id     UUID REFERENCES alunos(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL,
  valor        INTEGER,
  descricao    TEXT,
  xp_antes     INTEGER,
  xp_depois    INTEGER,
  hp_antes     INTEGER,
  hp_depois    INTEGER,
  level_antes  INTEGER,
  level_depois INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONQUISTAS ─────────────────────────────────────────────────
CREATE TABLE conquistas (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo     TEXT NOT NULL UNIQUE,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  emoji      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE aluno_conquistas (
  aluno_id        UUID REFERENCES alunos(id) ON DELETE CASCADE,
  conquista_id    UUID REFERENCES conquistas(id),
  desbloqueada_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (aluno_id, conquista_id)
);

-- ─── ÍNDICES ────────────────────────────────────────────────────
CREATE INDEX idx_alunos_turma   ON alunos(turma);
CREATE INDEX idx_alunos_ranking ON alunos(level DESC, xp DESC);
CREATE INDEX idx_historico_aluno ON historico_evolucao(aluno_id, created_at DESC);

-- ─── AUTO updated_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_alunos_updated_at
  BEFORE UPDATE ON alunos
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS — Row Level Security
-- OBRIGATÓRIO para que o front-end consiga fazer UPDATE/SELECT
-- ════════════════════════════════════════════════════════════════

ALTER TABLE alunos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE professores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_evolucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE conquistas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_conquistas  ENABLE ROW LEVEL SECURITY;

-- Libera acesso total via anon key (seguro para uso escolar interno)
CREATE POLICY "acesso_publico_alunos"
  ON alunos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acesso_publico_professores"
  ON professores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acesso_publico_historico"
  ON historico_evolucao FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acesso_publico_conquistas"
  ON conquistas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acesso_publico_aluno_conquistas"
  ON aluno_conquistas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─── SEED: Conquistas ───────────────────────────────────────────
INSERT INTO conquistas (codigo, nome, descricao, emoji) VALUES
  ('primeiro_login',    'Bem-vindo, Herói!',    'Fez login pela primeira vez',      '🌟'),
  ('personagem_criado', 'Identidade Forjada',   'Criou seu personagem',              '⚔️'),
  ('level_2',           'Primeiros Passos',     'Chegou ao Nível 2',                 '📈'),
  ('level_5',           'Herói Experiente',     'Chegou ao Nível 5',                 '🛡️'),
  ('level_10',          'Lendário',             'Chegou ao Nível 10',                '👑'),
  ('sobrevivente',      'Sobrevivente',         'Sobreviveu com menos de 10 HP',     '❤️'),
  ('xp_100',            'Primeiro Nível Cheio', 'Acumulou 100 XP pela primeira vez', '✨');

-- ─── SEED: Professor de exemplo ─────────────────────────────────
INSERT INTO professores (nome, usuario, senha) VALUES
  ('Professor(a)', 'professor', '1234');

-- ─── SEED: Alunos de exemplo ────────────────────────────────────
INSERT INTO alunos (nome, usuario, senha, turma) VALUES
  ('Ana Silva',     'ana',    '1234', '6A'),
  ('Bruno Costa',   'bruno',  '1234', '6A'),
  ('Carla Souza',   'carla',  '1234', '6B'),
  ('Diego Pereira', 'diego',  '1234', '7A'),
  ('Elena Rocha',   'elena',  '1234', '7B');

-- ─── REALTIME ───────────────────────────────────────────────────
-- Ative manualmente: Dashboard > Database > Replication > alunos ON
-- Ou execute:
ALTER PUBLICATION supabase_realtime ADD TABLE alunos;

-- ═══════════════════════════════════════════════════════════════
-- PRONTO! Sistema configurado com colunas snake_case e RLS aberta.
-- ═══════════════════════════════════════════════════════════════

-- ─── COLUNAS ADICIONADAS PELA EDIÇÃO DE PERSONAGEM ──────────────
-- Execute estas linhas se já tiver rodado o schema anterior:
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS apelido TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS lema TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS avatar_customizado TEXT;

-- ─── COLUNA VIRTUDE (adicionada para os Virtoons do SESI) ────────
-- Se o banco já existe, rode apenas esta linha:
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS virtude TEXT;

-- ════════════════════════════════════════════════════════════════
-- MISSÕES / QUESTS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS missoes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo         TEXT NOT NULL,
  descricao      TEXT,
  recompensa_xp  INTEGER DEFAULT 20 CHECK (recompensa_xp >= 0),
  turma          TEXT NOT NULL,          -- '6A','7B','geral'
  prazo          TIMESTAMPTZ,
  ativa          BOOLEAN DEFAULT TRUE,
  criada_por     UUID REFERENCES professores(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aluno_missoes (
  aluno_id     UUID REFERENCES alunos(id) ON DELETE CASCADE,
  missao_id    UUID REFERENCES missoes(id) ON DELETE CASCADE,
  concluida    BOOLEAN DEFAULT FALSE,
  concluida_em TIMESTAMPTZ,
  PRIMARY KEY  (aluno_id, missao_id)
);

-- ════════════════════════════════════════════════════════════════
-- ITENS / INVENTÁRIO
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS itens (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo    TEXT NOT NULL UNIQUE,
  nome      TEXT NOT NULL,
  descricao TEXT,
  emoji     TEXT,
  tipo      TEXT NOT NULL, -- 'cura','cura_total','escudo','xp','xp_grande','ressurreicao','xp_duplo'
  valor     INTEGER DEFAULT 0,
  raridade  TEXT DEFAULT 'comum'  -- 'comum','raro','epico','lendario'
);

CREATE TABLE IF NOT EXISTS aluno_itens (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id   UUID REFERENCES alunos(id) ON DELETE CASCADE,
  item_id    UUID REFERENCES itens(id),
  quantidade INTEGER DEFAULT 1 CHECK (quantidade >= 0),
  dado_por   UUID REFERENCES professores(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coluna de efeitos ativos no aluno (escudo, xp_duplo, etc.)
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS efeito_ativo TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS efeito_expira TIMESTAMPTZ;

-- ════════════════════════════════════════════════════════════════
-- EVENTOS DE TURMA
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS eventos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  tipo        TEXT NOT NULL, -- 'xp_dobro','hp_bonus','escudo_turma','boss','xp_todos'
  valor       INTEGER DEFAULT 0,
  turma       TEXT NOT NULL,
  ativo       BOOLEAN DEFAULT FALSE,
  cor         TEXT DEFAULT '#d4a017',
  emoji       TEXT DEFAULT '⚡',
  inicio      TIMESTAMPTZ,
  fim         TIMESTAMPTZ,
  criado_por  UUID REFERENCES professores(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies para novas tabelas
ALTER TABLE missoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_missoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_itens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_missoes"       ON missoes       FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
CREATE POLICY "acesso_aluno_missoes" ON aluno_missoes FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
CREATE POLICY "acesso_itens"         ON itens         FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
CREATE POLICY "acesso_aluno_itens"   ON aluno_itens   FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
CREATE POLICY "acesso_eventos"       ON eventos       FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);

-- Realtime para eventos (banner ao vivo nos alunos)
ALTER PUBLICATION supabase_realtime ADD TABLE eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE missoes;

-- ─── SEED: Catálogo de Itens ──────────────────────────────────
INSERT INTO itens (codigo, nome, descricao, emoji, tipo, valor, raridade) VALUES
  ('pocao_cura',     'Poção de Cura',         'Restaura 30 HP imediatamente.',                     '🧪', 'cura',        30,  'comum'),
  ('grande_pocao',   'Grande Poção',           'Restaura HP ao máximo (100).',                      '⚗️',  'cura_total',  100, 'raro'),
  ('escudo_magico',  'Escudo Mágico',          'Bloqueia o próximo dano recebido.',                 '🛡️', 'escudo',       1,  'raro'),
  ('pergaminho_xp',  'Pergaminho de XP',       'Concede 50 XP de bônus instantaneamente.',          '📜', 'xp',          50,  'comum'),
  ('elixir_level',   'Elixir de Ascensão',     'Concede 100 XP — garantia de level up!',            '✨', 'xp_grande',   100, 'epico'),
  ('fenix',          'Pena de Fênix',          'Ressuscita com HP e XP completos se cair a 0 HP.',  '🔥', 'ressurreicao',  1, 'lendario'),
  ('amuleto_sorte',  'Amuleto da Sorte',       'Próximo XP recebido do professor vale em dobro.',   '🍀', 'xp_duplo',    2,  'epico'),
  ('bomba_cura',     'Bomba de Cura',          'Cura todos os colegas da sua turma em 15 HP.',      '💊', 'cura_turma',  15,  'lendario')
ON CONFLICT (codigo) DO NOTHING;
