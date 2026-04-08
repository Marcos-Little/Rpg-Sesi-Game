// ═══════════════════════════════════════════════════════════════
// js/config/supabase.js — Instância única do Supabase
// ⚠️ CONFIGURE SUAS CREDENCIAIS AQUI
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://jwmxhpsmmntgesuzhhtg.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_wpqVKvkUN7n-7CeIp7VXrg_-cGHhToh';

const { createClient } = supabase; // da CDN
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
