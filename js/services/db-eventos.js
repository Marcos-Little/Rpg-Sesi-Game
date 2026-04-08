// ═══════════════════════════════════════════════════════════════
// js/services/db-eventos.js — Eventos de Turma
// ═══════════════════════════════════════════════════════════════

const TIPOS_EVENTO = {
  xp_dobro:     { label:'XP em Dobro',       descAuto:'Todo XP dado pelo professor vale o dobro!',     emoji:'✨', cor:'#d4a017' },
  xp_todos:     { label:'XP para Todos',      descAuto:'Todos da turma recebem XP bônus ao iniciar!',  emoji:'⭐', cor:'#f0c040' },
  hp_bonus:     { label:'Bônus de HP',         descAuto:'Todos da turma ganham HP extra ao iniciar!',   emoji:'💚', cor:'#27ae60' },
  escudo_turma: { label:'Escudo da Turma',     descAuto:'Ninguém da turma perde HP durante o evento!', emoji:'🛡️', cor:'#3498db' },
  boss:         { label:'Batalha de Chefe',    descAuto:'Evento de desafio: todos perdem HP inicial!', emoji:'💀', cor:'#c0392b' },
  custom:       { label:'Evento Personalizado',descAuto:'',                                             emoji:'🎉', cor:'#9b59b6' },
};

async function criarEvento(dados, professorId) {
  // Se for xp_todos, hp_bonus ou boss: aplica efeito imediato nos alunos
  const { data, error } = await db.from('eventos').insert({
    nome:       dados.nome,
    descricao:  dados.descricao,
    tipo:       dados.tipo,
    valor:      dados.valor || 0,
    turma:      dados.turma,
    cor:        dados.cor || TIPOS_EVENTO[dados.tipo]?.cor || '#d4a017',
    emoji:      dados.emoji || TIPOS_EVENTO[dados.tipo]?.emoji || '⚡',
    ativo:      true,
    inicio:     new Date().toISOString(),
    fim:        dados.fim || null,
    criado_por: professorId,
  }).select().single();
  if (error) throw error;

  // Efeitos imediatos
  if (dados.tipo === 'xp_todos' && dados.valor > 0) {
    await darXpParaTodos(dados.turma, dados.valor);
  } else if (dados.tipo === 'hp_bonus' && dados.valor > 0) {
    await curarTodos(dados.turma, dados.valor);
  } else if (dados.tipo === 'boss' && dados.valor > 0) {
    await tirarHpDeTodos(dados.turma, dados.valor);
  }

  return data;
}

async function buscarEventosAtivos(turma) {
  let q = db.from('eventos').select('*').eq('ativo', true);
  if (turma && turma !== 'geral') {
    q = q.or(`turma.eq.${turma},turma.eq.geral`);
  }
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;

  // Filtra os que não expiraram
  const agora = new Date();
  return (data || []).filter(ev => !ev.fim || new Date(ev.fim) > agora);
}

async function buscarTodosEventos() {
  const { data, error } = await db.from('eventos')
    .select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

async function encerrarEvento(eventoId) {
  const { error } = await db.from('eventos')
    .update({ ativo: false, fim: new Date().toISOString() }).eq('id', eventoId);
  if (error) throw error;
}

async function deletarEvento(eventoId) {
  const { error } = await db.from('eventos').delete().eq('id', eventoId);
  if (error) throw error;
}

// Retorna se há evento de xp_dobro ativo para uma turma
async function eventoXpDobroAtivo(turma) {
  const ativos = await buscarEventosAtivos(turma);
  return ativos.some(e => e.tipo === 'xp_dobro');
}

// Retorna se há evento de escudo ativo para uma turma
async function eventoEscudoAtivo(turma) {
  const ativos = await buscarEventosAtivos(turma);
  return ativos.some(e => e.tipo === 'escudo_turma');
}

// Escuta eventos em tempo real
function escutarEventos(turma, callback) {
  const channel = db.channel(`eventos-${turma}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' },
      async () => {
        const ativos = await buscarEventosAtivos(turma);
        callback(ativos);
      })
    .subscribe();
  return () => db.removeChannel(channel);
}
