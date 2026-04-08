// ═══════════════════════════════════════════════════════════════
// js/services/db-itens.js — Inventário e Itens
// ═══════════════════════════════════════════════════════════════

const ITENS_DEF = {
  pocao_cura:    { codigo:'pocao_cura',    nome:'Poção de Cura',       emoji:'🧪', tipo:'cura',        valor:30,  raridade:'comum',    descricao:'Restaura 30 HP imediatamente.' },
  grande_pocao:  { codigo:'grande_pocao',  nome:'Grande Poção',         emoji:'⚗️', tipo:'cura_total',  valor:100, raridade:'raro',     descricao:'Restaura HP ao máximo (100).' },
  escudo_magico: { codigo:'escudo_magico', nome:'Escudo Mágico',        emoji:'🛡️', tipo:'escudo',      valor:1,   raridade:'raro',     descricao:'Bloqueia o próximo dano recebido.' },
  pergaminho_xp: { codigo:'pergaminho_xp', nome:'Pergaminho de XP',     emoji:'📜', tipo:'xp',          valor:50,  raridade:'comum',    descricao:'Concede 50 XP de bônus instantaneamente.' },
  elixir_level:  { codigo:'elixir_level',  nome:'Elixir de Ascensão',   emoji:'✨', tipo:'xp_grande',   valor:100, raridade:'epico',    descricao:'Concede 100 XP — garantia de level up!' },
  fenix:         { codigo:'fenix',          nome:'Pena de Fênix',        emoji:'🔥', tipo:'ressurreicao',valor:1,   raridade:'lendario', descricao:'Ressuscita com HP e XP completos se cair a 0 HP.' },
  amuleto_sorte: { codigo:'amuleto_sorte', nome:'Amuleto da Sorte',      emoji:'🍀', tipo:'xp_duplo',    valor:2,   raridade:'epico',    descricao:'Próximo XP do professor vale em dobro.' },
  bomba_cura:    { codigo:'bomba_cura',    nome:'Bomba de Cura',         emoji:'💊', tipo:'cura_turma',  valor:15,  raridade:'lendario', descricao:'Cura todos os colegas da sua turma em 15 HP.' },
};

const COR_RARIDADE = {
  comum:    '#8899aa',
  raro:     '#3498db',
  epico:    '#9b59b6',
  lendario: '#d4a017',
};

async function buscarCatalogoItens() {
  const { data, error } = await db.from('itens').select('*').order('raridade');
  if (error) throw error;
  return data || [];
}

async function buscarInventarioDoAluno(alunoId) {
  const { data, error } = await db
    .from('aluno_itens')
    .select('id, quantidade, item_id')
    .eq('aluno_id', alunoId)
    .gt('quantidade', 0)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!data || !data.length) return [];

  // Busca definições dos itens separadamente
  const itemIds = [...new Set(data.map(r => r.item_id))];
  const { data: itensData } = await db.from('itens').select('*').in('id', itemIds);
  const itensMap = {};
  (itensData || []).forEach(i => { itensMap[i.id] = i; });

  return data.map(row => ({
    inventarioId: row.id,
    quantidade:   row.quantidade,
    itemId:       row.item_id,
    ...(itensMap[row.item_id] || {}),
  }));
}

async function darItemParaAluno(alunoId, itemCodigo, quantidade, professorId) {
  const { data: item } = await db.from('itens').select('id').eq('codigo', itemCodigo).single();
  if (!item) throw new Error('Item não encontrado: ' + itemCodigo);

  const { data: exist } = await db.from('aluno_itens')
    .select('id, quantidade').eq('aluno_id', alunoId).eq('item_id', item.id).maybeSingle();

  if (exist) {
    const { error } = await db.from('aluno_itens')
      .update({ quantidade: exist.quantidade + quantidade }).eq('id', exist.id);
    if (error) throw error;
  } else {
    const { error } = await db.from('aluno_itens').insert({
      aluno_id: alunoId, item_id: item.id, quantidade, dado_por: professorId,
    });
    if (error) throw error;
  }
  return true;
}

async function darItemParaTurma(turma, itemCodigo, quantidade, professorId) {
  const alunos = await buscarAlunosPorTurma(turma === 'geral' ? undefined : turma);
  await Promise.all(alunos.map(a => darItemParaAluno(a.id, itemCodigo, quantidade, professorId)));
  return alunos.length;
}

async function usarItem(alunoId, inventarioId, itemCodigo) {
  const def = ITENS_DEF[itemCodigo];
  if (!def) throw new Error('Item desconhecido');

  const aluno = await buscarAlunoPorId(alunoId);

  const { data: inv } = await db.from('aluno_itens')
    .select('id,quantidade').eq('id', inventarioId).eq('aluno_id', alunoId).single();
  if (!inv || inv.quantidade <= 0) throw new Error('Sem estoque deste item');

  let novoHp = aluno.hp, novoXp = aluno.xp, novoLevel = aluno.level;
  let efeitoAtivo = null, efeitoExpira = null, msg = '';

  switch(def.tipo) {
    case 'cura':       novoHp = calcularCura(aluno.hp, def.valor); msg = `+${def.valor} HP restaurado`; break;
    case 'cura_total': novoHp = 100; msg = 'HP totalmente restaurado!'; break;
    case 'xp': case 'xp_grande': {
      const c = calcularNovoXp(aluno.xp, aluno.level, def.valor);
      novoXp = c.novoXp; novoLevel = c.novoLevel; msg = `+${def.valor} XP ganho!`; break;
    }
    case 'escudo':
      efeitoAtivo = 'escudo'; efeitoExpira = new Date(Date.now()+24*60*60*1000).toISOString();
      msg = 'Escudo ativado por 24h!'; break;
    case 'ressurreicao':
      efeitoAtivo = 'ressurreicao'; efeitoExpira = new Date(Date.now()+7*24*60*60*1000).toISOString();
      msg = 'Pena de Fênix ativada!'; break;
    case 'xp_duplo':
      efeitoAtivo = 'xp_duplo'; efeitoExpira = new Date(Date.now()+48*60*60*1000).toISOString();
      msg = 'XP duplo ativado por 48h!'; break;
    case 'cura_turma':
      await curarTodos(aluno.turma, def.valor);
      msg = `Todos da turma ${aluno.turma} curados em ${def.valor} HP!`; break;
  }

  const payload = { xp: novoXp, hp: novoHp, level: novoLevel };
  if (efeitoAtivo) { payload.efeito_ativo = efeitoAtivo; payload.efeito_expira = efeitoExpira; }
  await db.from('alunos').update(payload).eq('id', alunoId);
  await db.from('aluno_itens').update({ quantidade: inv.quantidade - 1 }).eq('id', inventarioId);

  try {
    await registrarEvento(alunoId, 'xp_ganho', {
      valor: def.valor, descricao: `Usou item: ${def.nome} — ${msg}`,
      xpAntes: aluno.xp, xpDepois: novoXp, hpAntes: aluno.hp, hpDepois: novoHp,
      levelAntes: aluno.level, levelDepois: novoLevel,
    });
  } catch(e) {}

  return { msg, novoHp, novoXp, novoLevel, efeitoAtivo };
}

// ─── CORRIGIDO: busca em duas queries separadas ───────────────
async function buscarInventariosPorTurma(turma) {
  // 1. Busca todos os itens do inventário (com quantidade > 0)
  const { data: invRows, error } = await db
    .from('aluno_itens')
    .select('id, aluno_id, item_id, quantidade')
    .gt('quantidade', 0);
  if (error) throw error;
  if (!invRows || !invRows.length) return [];

  // 2. Filtra por turma usando todosAlunos já em memória (no painel)
  //    Se não tiver acesso, busca alunos separado
  let alunosMap = {};
  try {
    // Tenta usar array global do painel do professor
    if (typeof todosAlunos !== 'undefined' && todosAlunos.length) {
      todosAlunos.forEach(a => { alunosMap[a.id] = a; });
    } else {
      throw new Error('use query');
    }
  } catch(e) {
    const { data: al } = await db.from('alunos').select('id,nome,turma,avatar,avatar_full,avatar_customizado');
    (al || []).forEach(a => { alunosMap[a.id] = a; });
  }

  // 3. Filtra pela turma desejada
  let rows = invRows;
  if (turma && turma !== 'geral') {
    rows = rows.filter(r => alunosMap[r.aluno_id]?.turma === turma);
  }
  if (!rows.length) return [];

  // 4. Busca definições dos itens
  const itemIds = [...new Set(rows.map(r => r.item_id))];
  const { data: itensData } = await db.from('itens').select('*').in('id', itemIds);
  const itensMap = {};
  (itensData || []).forEach(i => { itensMap[i.id] = i; });

  // 5. Monta resultado enriquecido
  return rows.map(r => ({
    aluno_id:  r.aluno_id,
    quantidade: r.quantidade,
    alunos:    alunosMap[r.aluno_id] || { nome: '?', turma: '?' },
    itens:     itensMap[r.item_id]   || { codigo:'?', nome:'?', emoji:'❓', raridade:'comum' },
  }));
}
