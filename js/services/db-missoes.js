// ═══════════════════════════════════════════════════════════════
// js/services/db-missoes.js — Missões / Quests
// ═══════════════════════════════════════════════════════════════

async function criarMissao(dados, professorId) {
  const { data, error } = await db.from('missoes').insert({
    titulo:        dados.titulo,
    descricao:     dados.descricao,
    recompensa_xp: dados.recompensaXp,
    turma:         dados.turma,
    prazo:         dados.prazo || null,
    criada_por:    professorId,
    ativa:         true,
  }).select().single();
  if (error) throw error;
  return data;
}

async function buscarMissoesDaTurma(turma) {
  let query = db.from('missoes').select('*').eq('ativa', true);
  if (turma && turma !== 'geral') {
    query = query.or(`turma.eq.${turma},turma.eq.geral`);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function buscarTodasMissoes() {
  const { data, error } = await db.from('missoes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function encerrarMissao(missaoId) {
  const { error } = await db.from('missoes')
    .update({ ativa: false }).eq('id', missaoId);
  if (error) throw error;
}

async function deletarMissao(missaoId) {
  // Remove progresso dos alunos primeiro
  await db.from('aluno_missoes').delete().eq('missao_id', missaoId);
  const { error } = await db.from('missoes').delete().eq('id', missaoId);
  if (error) throw error;
}

// Busca progresso de uma missão: quantos concluíram, quem falta
async function progressoDaMissao(missaoId, turma) {
  // Todos os alunos da turma
  let qAlunos = db.from('alunos').select('id,nome,avatar,avatar_full,avatar_customizado,turma,level');
  if (turma && turma !== 'geral') qAlunos = qAlunos.eq('turma', turma);
  const { data: alunos } = await qAlunos;

  // Quem já concluiu
  const { data: concluidos } = await db.from('aluno_missoes')
    .select('aluno_id,concluida_em')
    .eq('missao_id', missaoId)
    .eq('concluida', true);

  const setIds = new Set((concluidos || []).map(c => c.aluno_id));

  return (alunos || []).map(a => ({
    ...a,
    concluida: setIds.has(a.id),
    concluida_em: (concluidos || []).find(c => c.aluno_id === a.id)?.concluida_em || null,
  }));
}

// Marca aluno como tendo concluído a missão e dá o XP
async function concluirMissaoParaAluno(alunoId, missaoId) {
  // Verifica se já foi concluída
  const { data: exist } = await db.from('aluno_missoes')
    .select('concluida').eq('aluno_id', alunoId).eq('missao_id', missaoId).maybeSingle();
  if (exist?.concluida) return { jaFoi: true };

  // Busca missão para saber o XP
  const { data: missao } = await db.from('missoes').select('recompensa_xp,titulo').eq('id', missaoId).single();
  const { data: aluno }  = await db.from('alunos').select('xp,level,hp').eq('id', alunoId).single();

  const { novoXp, novoLevel } = calcularNovoXp(aluno.xp, aluno.level, missao.recompensa_xp);

  // Atualiza aluno
  await atualizarStats(alunoId, novoXp, aluno.hp, novoLevel);

  // Registra conclusão
  await db.from('aluno_missoes').upsert({
    aluno_id:     alunoId,
    missao_id:    missaoId,
    concluida:    true,
    concluida_em: new Date().toISOString(),
  }, { onConflict: 'aluno_id,missao_id' });

  // Histórico
  try {
    await registrarEvento(alunoId, 'xp_ganho', {
      valor:       missao.recompensa_xp,
      descricao:   `Missão concluída: ${missao.titulo} (+${missao.recompensa_xp} XP)`,
      xpAntes:     aluno.xp,    xpDepois:    novoXp,
      hpAntes:     aluno.hp,    hpDepois:    aluno.hp,
      levelAntes:  aluno.level, levelDepois: novoLevel,
    });
  } catch(e) {}

  return { jaFoi: false, xpGanho: missao.recompensa_xp, novoLevel, levelUp: novoLevel > aluno.level };
}

// Para o aluno ver suas missões com status
async function buscarMissoesDoAluno(alunoId, turma) {
  const missoes = await buscarMissoesDaTurma(turma);
  if (!missoes.length) return [];

  const ids = missoes.map(m => m.id);
  const { data: progresso } = await db.from('aluno_missoes')
    .select('missao_id,concluida')
    .eq('aluno_id', alunoId)
    .in('missao_id', ids);

  const mapa = {};
  (progresso || []).forEach(p => { mapa[p.missao_id] = p.concluida; });

  return missoes.map(m => ({ ...m, concluida: !!mapa[m.id] }));
}

// Concluir em lote (todos os alunos de uma turma)
async function concluirMissaoParaTodos(missaoId, turma) {
  const alunos = await buscarAlunosPorTurma(turma === 'geral' ? undefined : turma);
  const resultados = await Promise.all(alunos.map(a => concluirMissaoParaAluno(a.id, missaoId)));
  return resultados;
}
