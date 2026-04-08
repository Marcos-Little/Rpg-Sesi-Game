# ⚔️ RPG da Turma

Sistema de gamificação educacional com personagens, XP, HP, conquistas e histórico.

---

## 🚀 Configuração em 3 passos

### 1. Configure o Supabase

Abra `js/config/supabase.js` e preencha:

```js
const SUPABASE_URL  = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_KEY  = 'sua-anon-key-aqui';
```

> Encontre no painel do Supabase: **Settings > API**

---

### 2. Execute o SQL

No painel do Supabase: **SQL Editor > New Query**

Cole o conteúdo de `sql/schema.sql` e clique em **Run**.

Isso cria todas as tabelas, índices e dados de exemplo.

---

### 3. Ative o Realtime

No painel do Supabase: **Database > Replication**

Ative o toggle da tabela `alunos`.

---

## 📁 Estrutura

```
rpg-turma/
├── index.html                ← redireciona para login
├── login.html
├── criar-personagem.html
├── personagem.html
├── painel-professor.html
├── ranking.html
│
├── css/
│   └── base.css              ← estilos globais
│
├── js/
│   ├── config/supabase.js    ← credenciais (CONFIGURE AQUI)
│   ├── services/
│   │   ├── auth.js           ← login/logout/sessão
│   │   └── db-alunos.js      ← operações no banco
│   └── logic/
│       └── game-logic.js     ← XP, HP, level, avatares, conquistas, histórico, realtime
│
└── sql/
    └── schema.sql            ← banco de dados completo
```

---

## 👤 Acessos de exemplo (criados pelo SQL seed)

| Tipo      | Usuário    | Senha |
|-----------|------------|-------|
| Professor | professor  | 1234  |
| Aluno     | ana        | 1234  |
| Aluno     | bruno      | 1234  |
| Aluno     | carla      | 1234  |

---

## ✨ Funcionalidades

- Login de alunos e professores
- Criação de personagem com classe, gênero e história
- Avatares automáticos via DiceBear
- Sistema de XP, HP e Level com progressão
- Atualização em tempo real (Supabase Realtime)
- Sistema de conquistas (achievements)
- Histórico de evolução por aluno
- Painel do professor com ações individuais e em massa
- Ranking por turma e geral com pódio

---

## ⚠️ Importante

- Senhas estão em texto puro (suficiente para uso escolar interno)
- Para produção pública, migre para bcrypt ou Supabase Auth
- A `anon key` é segura para o front-end (não é a service key)
