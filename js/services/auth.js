// ═══════════════════════════════════════════════════════════════
// js/services/auth.js — Login, Logout e Sessão
// ═══════════════════════════════════════════════════════════════

async function login(usuario, senha) {
  // 1. Tenta como aluno
  const { data: aluno } = await db
    .from('alunos')
    .select('*')
    .eq('usuario', usuario.trim())
    .eq('senha', senha)
    .maybeSingle();

  if (aluno) {
    _salvarSessao('alunoLogado', aluno);
    return { tipo: 'aluno', dados: aluno };
  }

  // 2. Tenta como professor
  const { data: professor } = await db
    .from('professores')
    .select('*')
    .eq('usuario', usuario.trim())
    .eq('senha', senha)
    .maybeSingle();

  if (professor) {
    _salvarSessao('professorLogado', professor);
    return { tipo: 'professor', dados: professor };
  }

  return { erro: 'Usuário ou senha incorretos.' };
}

function _salvarSessao(chave, dados) {
  const { senha, ...seguro } = dados;
  localStorage.setItem(chave, JSON.stringify(seguro));
}

function getAlunoLogado() {
  const d = localStorage.getItem('alunoLogado');
  return d ? JSON.parse(d) : null;
}

function getProfessorLogado() {
  const d = localStorage.getItem('professorLogado');
  return d ? JSON.parse(d) : null;
}

function atualizarSessaoAluno(dados) {
  const { senha, ...seguro } = dados;
  localStorage.setItem('alunoLogado', JSON.stringify(seguro));
}

function logout() {
  localStorage.removeItem('alunoLogado');
  localStorage.removeItem('professorLogado');
  window.location.href = 'login.html';
}

function exigirAlunoLogado() {
  const a = getAlunoLogado();
  if (!a) { window.location.href = 'login.html'; return null; }
  return a;
}

function exigirProfessorLogado() {
  const p = getProfessorLogado();
  if (!p) { window.location.href = '/login.html'; return null; }
  return p;
}
