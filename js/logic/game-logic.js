// ═══════════════════════════════════════════════════════════════
// js/logic/game-logic.js — Regras do Jogo
// ═══════════════════════════════════════════════════════════════

const XP_POR_LEVEL = 100;
const HP_MAX = 100;

function calcularNovoXp(xpAtual, levelAtual, ganho) {
  let xp = xpAtual + ganho;
  let level = levelAtual;
  while (xp >= XP_POR_LEVEL) { xp -= XP_POR_LEVEL; level++; }
  return { novoXp: Math.max(0, xp), novoLevel: level };
}

function calcularNovoHp(hpAtual, dano) {
  return Math.max(0, Math.min(HP_MAX, hpAtual - dano));
}

function calcularCura(hpAtual, cura) {
  return Math.min(HP_MAX, hpAtual + cura);
}

function porcentagemXp(xp) { return Math.round((xp / XP_POR_LEVEL) * 100); }
function porcentagemHp(hp) { return Math.round((hp / HP_MAX) * 100); }

function tituloDoLevel(level) {
  if (level <= 1)  return { titulo: 'Recruta',      emoji: '🌱' };
  if (level <= 3)  return { titulo: 'Aventureiro',  emoji: '⚔️' };
  if (level <= 5)  return { titulo: 'Herói',        emoji: '🛡️' };
  if (level <= 8)  return { titulo: 'Campeão',      emoji: '🏆' };
  if (level <= 12) return { titulo: 'Lendário',     emoji: '👑' };
  return                   { titulo: 'Imortal',     emoji: '✨' };
}

function classeEmoji(classe) {
  const mapa = { 'Guerreiro':'⚔️','Mago':'🔮','Arqueiro':'🏹','Curandeiro':'💚','Ladino':'🗡️','Bardo':'🎵' };
  return mapa[classe] || '⚔️';
}

// ═══════════════════════════════════════════════════════════════
// js/utils/avatar.js — DiceBear
// ═══════════════════════════════════════════════════════════════

function gerarSeed(nome, classe, genero) {
  return `${nome}-${classe}-${genero}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,'-').toLowerCase();
}

function gerarAvatares(nome, classe, genero) {
  const seed = gerarSeed(nome, classe, genero);
  const base = 'https://api.dicebear.com/7.x';
  return {
    avatar:     `${base}/adventurer/svg?seed=${seed}&backgroundColor=1a1a2e`,
    avatarFull: `${base}/adventurer-neutral/svg?seed=${seed}&backgroundColor=1a1a2e`,
  };
}

// ═══════════════════════════════════════════════════════════════
// js/utils/utils.js — Utilitários
// ═══════════════════════════════════════════════════════════════

let _toastContainer = null;

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.className = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

function mostrarToast(msg, tipo = 'info', icone = '') {
  const container = _getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `${icone || (tipo==='sucesso'?'✅':tipo==='erro'?'❌':'💬')} ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-saindo');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function mostrarSucesso(msg)  { mostrarToast(msg, 'sucesso'); }
function mostrarErro(msg)     { mostrarToast(msg, 'erro'); }
function mostrarInfo(msg)     { mostrarToast(msg, 'info'); }

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ═══════════════════════════════════════════════════════════════
// js/utils/realtime.js — Supabase Realtime
// ═══════════════════════════════════════════════════════════════

function escutarAluno(alunoId, callback) {
  const channel = db
    .channel(`aluno-${alunoId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public',
      table: 'alunos', filter: `id=eq.${alunoId}`
    }, payload => callback(payload.new))
    .subscribe();
  return () => db.removeChannel(channel);
}

// ═══════════════════════════════════════════════════════════════
// js/logic/achievements.js — Conquistas
// ═══════════════════════════════════════════════════════════════

const CONQUISTAS_DEF = [
  { codigo: 'primeiro_login',     nome: 'Bem-vindo, Herói!',    emoji: '🌟', descricao: 'Fez login pela primeira vez' },
  { codigo: 'personagem_criado',  nome: 'Identidade Forjada',   emoji: '⚔️', descricao: 'Criou seu personagem' },
  { codigo: 'level_2',            nome: 'Primeiros Passos',     emoji: '📈', descricao: 'Chegou ao Nível 2' },
  { codigo: 'level_5',            nome: 'Herói Experiente',     emoji: '🛡️', descricao: 'Chegou ao Nível 5' },
  { codigo: 'level_10',           nome: 'Lendário',             emoji: '👑', descricao: 'Chegou ao Nível 10' },
  { codigo: 'sobrevivente',       nome: 'Sobrevivente',         emoji: '❤️', descricao: 'Sobreviveu com menos de 10 HP' },
  { codigo: 'xp_100',             nome: 'Primeiro Nível Cheio', emoji: '✨', descricao: 'Acumulou 100 XP pela primeira vez' },
];

async function verificarEDesbloquearConquistas(aluno, statsAntigos) {
  const novas = [];

  if (statsAntigos && statsAntigos.level < 2 && aluno.level >= 2)
    novas.push('level_2');
  if (statsAntigos && statsAntigos.level < 5 && aluno.level >= 5)
    novas.push('level_5');
  if (statsAntigos && statsAntigos.level < 10 && aluno.level >= 10)
    novas.push('level_10');
  if (aluno.hp > 0 && aluno.hp < 10)
    novas.push('sobrevivente');
  if (statsAntigos && statsAntigos.xp < aluno.xp && aluno.level > statsAntigos.level)
    novas.push('xp_100');

  for (const codigo of novas) {
    await _desbloquear(aluno.id, codigo);
  }
  return novas;
}

async function _desbloquear(alunoId, codigo) {
  const { data: c } = await db.from('conquistas').select('id').eq('codigo', codigo).maybeSingle();
  if (!c) return;
  await db.from('aluno_conquistas').upsert(
    { aluno_id: alunoId, conquista_id: c.id },
    { onConflict: 'aluno_id,conquista_id', ignoreDuplicates: true }
  );
}

async function buscarConquistasDoAluno(alunoId) {
  const { data } = await db
    .from('aluno_conquistas')
    .select('conquistas(codigo,nome,emoji,descricao), desbloqueada_em')
    .eq('aluno_id', alunoId)
    .order('desbloqueada_em', { ascending: false });
  return (data || []).map(d => ({ ...d.conquistas, desbloqueada_em: d.desbloqueada_em }));
}

// ═══════════════════════════════════════════════════════════════
// js/logic/historico.js — Histórico de Evolução
// ═══════════════════════════════════════════════════════════════

async function registrarEvento(alunoId, tipo, dados) {
  await db.from('historico_evolucao').insert({
    aluno_id:     alunoId,
    tipo,
    valor:        dados.valor,
    descricao:    dados.descricao,
    xp_antes:     dados.xpAntes,
    xp_depois:    dados.xpDepois,
    hp_antes:     dados.hpAntes,
    hp_depois:    dados.hpDepois,
    level_antes:  dados.levelAntes,
    level_depois: dados.levelDepois,
  });
}

async function buscarHistorico(alunoId, limite = 30) {
  const { data } = await db
    .from('historico_evolucao')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('created_at', { ascending: false })
    .limit(limite);
  return data || [];
}
