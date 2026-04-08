// ═══════════════════════════════════════════════════════════════
// js/services/db-alunos.js — CRUD da tabela alunos
// CORRIGIDO: colunas em snake_case (padrão PostgreSQL)
// ═══════════════════════════════════════════════════════════════

async function buscarAlunoPorId(id) {
  const { data, error } = await db.from('alunos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function buscarAlunosPorTurma(turma) {
  let query = db.from('alunos').select('*');
  if (turma && turma !== 'geral') query = query.eq('turma', turma);
  const { data, error } = await query
    .order('level', { ascending: false })
    .order('xp',    { ascending: false })
    .order('nome',  { ascending: true  });
  if (error) throw error;
  return data || [];
}

async function buscarTodosAlunos() {
  const { data, error } = await db.from('alunos').select('*').order('turma').order('nome');
  if (error) throw error;
  return data || [];
}

async function salvarPersonagem(id, dados) {
  const { data, error } = await db
    .from('alunos')
    .update({
      classe:            dados.classe,
      genero:            dados.genero,
      historia:          dados.historia,
      avatar:            dados.avatar,
      avatar_full:       dados.avatarFull,
      personagem_criado: true,
      virtude:           dados.virtude || null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function atualizarStats(id, novoXp, novoHp, novoLevel) {
  const { data, error } = await db
    .from('alunos')
    .update({ xp: novoXp, hp: novoHp, level: novoLevel })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function darXpParaTodos(turma, quantidade) {
  const alunos = await buscarAlunosPorTurma(turma);
  const promises = alunos.map(aluno => {
    const { novoXp, novoLevel } = calcularNovoXp(aluno.xp, aluno.level, quantidade);
    return atualizarStats(aluno.id, novoXp, aluno.hp, novoLevel);
  });
  return Promise.all(promises);
}

async function tirarHpDeTodos(turma, dano) {
  const alunos = await buscarAlunosPorTurma(turma);
  const promises = alunos.map(aluno => {
    const novoHp = calcularNovoHp(aluno.hp, dano);
    return atualizarStats(aluno.id, aluno.xp, novoHp, aluno.level);
  });
  return Promise.all(promises);
}

async function curarTodos(turma, cura) {
  const alunos = await buscarAlunosPorTurma(turma);
  const promises = alunos.map(aluno => {
    const novoHp = calcularCura(aluno.hp, cura);
    return atualizarStats(aluno.id, aluno.xp, novoHp, aluno.level);
  });
  return Promise.all(promises);
}

async function editarPersonagem(id, dados) {
  // Monta apenas os campos que foram enviados (evita sobrescrever com undefined)
  const payload = {};
  if (dados.classe    !== undefined) payload.classe    = dados.classe;
  if (dados.genero    !== undefined) payload.genero    = dados.genero;
  if (dados.historia  !== undefined) payload.historia  = dados.historia;
  if (dados.avatar    !== undefined) payload.avatar    = dados.avatar;
  if (dados.avatarFull !== undefined) payload.avatar_full = dados.avatarFull;
  if (dados.apelido   !== undefined) payload.apelido   = dados.apelido;
  if (dados.lema      !== undefined) payload.lema      = dados.lema;
  if (dados.avatar_customizado !== undefined) payload.avatar_customizado = dados.avatar_customizado;

  const { data, error } = await db
    .from('alunos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function buscarRankingVirtudes() {
  // Busca todos os alunos com virtude definida e agrupa por virtude
  const { data, error } = await db
    .from('alunos')
    .select('virtude, level')
    .not('virtude', 'is', null);
  if (error) throw error;

  // Agrupa: soma de levels por virtude
  const grupos = {};
  (data || []).forEach(a => {
    if (!a.virtude) return;
    if (!grupos[a.virtude]) grupos[a.virtude] = { totalLevel: 0, membros: 0 };
    grupos[a.virtude].totalLevel += (a.level || 1);
    grupos[a.virtude].membros++;
  });

  // Converte para array ordenado
  return Object.entries(grupos)
    .map(([id, g]) => ({ id, totalLevel: g.totalLevel, membros: g.membros }))
    .sort((a, b) => b.totalLevel - a.totalLevel);
}

async function buscarMembrosDaVirtude(virtudeId) {
  const { data, error } = await db
    .from('alunos')
    .select('*')
    .eq('virtude', virtudeId)
    .order('level', { ascending: false })
    .order('xp', { ascending: false });
  if (error) throw error;
  return data || [];
}
