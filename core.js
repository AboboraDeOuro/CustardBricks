/* ============================================================
   CustardBricks — core.js
   Banco de dados local + Auth + Economia + Mercado + Códigos + Jogos
   ============================================================ */
const CORE = (function () {
  'use strict';

  const DB_KEY = 'custardbricks_db_v2';
  const SESSION_KEY = 'custardbricks_session';

  /* ==================== CATÁLOGO DO MERCADO ==================== */
  const MARKET_ITEMS = [
    // BODY (cores do corpo)
    { id: 'body_purple', category: 'body', slot: 'body', name: 'Roxo Sombrio',   price: 0,    color: '#7b2fbe', icon: 'swatch', rarity: 'common' },
    { id: 'body_green',  category: 'body', slot: 'body', name: 'Verde Podre',    price: 100,  color: '#3fa14b', icon: 'swatch', rarity: 'common' },
    { id: 'body_yellow', category: 'body', slot: 'body', name: 'Amarelo Doente', price: 150,  color: '#e8d347', icon: 'swatch', rarity: 'common' },
    { id: 'body_red',    category: 'body', slot: 'body', name: 'Vermelho Sangue',price: 250,  color: '#ff2222', icon: 'swatch', rarity: 'rare' },
    { id: 'body_white',  category: 'body', slot: 'body', name: 'Branco Cadáver', price: 300,  color: '#e6e6e6', icon: 'swatch', rarity: 'rare' },
    { id: 'body_black',  category: 'body', slot: 'body', name: 'Preto Abissal',   price: 500,  color: '#1a1a1a', icon: 'swatch', rarity: 'epic' },
    { id: 'body_gold',   category: 'body', slot: 'body', name: 'Dourado Lendário',price: 1000, color: '#e8b347', icon: 'swatch', rarity: 'legendary' },

    // FACE (rostos)
    { id: 'face_normal', category: 'face', slot: 'face', name: 'Rosto Normal',     price: 0,   icon: '😊', rarity: 'common' },
    { id: 'face_creepy', category: 'face', slot: 'face', name: 'Sorriso Sombrio',  price: 150, icon: '😈', rarity: 'rare' },
    { id: 'face_glitch', category: 'face', slot: 'face', name: 'Glitch CRT',       price: 400, icon: '👾', rarity: 'epic' },
    { id: 'face_bloody', category: 'face', slot: 'face', name: 'Olhos Vermelhos',  price: 300, icon: '👁️', rarity: 'rare' },

    // ACCESSORY (acessórios na cabeça)
    { id: 'acc_none',    category: 'accessory', slot: 'accessory', name: 'Nenhum',           price: 0,   icon: '🚫', rarity: 'common' },
    { id: 'acc_antenna', category: 'accessory', slot: 'accessory', name: 'Antena Teletubby', price: 0,   icon: '📡', rarity: 'common' },
    { id: 'acc_hat',     category: 'accessory', slot: 'accessory', name: 'Cartola Sombria',  price: 200, icon: '🎩', rarity: 'rare' },
    { id: 'acc_horns',   category: 'accessory', slot: 'accessory', name: 'Chifres',          price: 350, icon: '😈', rarity: 'epic' },
    { id: 'acc_crown',   category: 'accessory', slot: 'accessory', name: 'Coroa Dourada',    price: 800, icon: '👑', rarity: 'legendary' },
    { id: 'acc_halo',    category: 'accessory', slot: 'accessory', name: 'Auréola',          price: 600, icon: '😇', rarity: 'epic' },

    // EFFECT (efeitos)
    { id: 'fx_none',   category: 'effect', slot: 'effect', name: 'Nenhum',          price: 0,   icon: '➖', rarity: 'common' },
    { id: 'fx_glow',   category: 'effect', slot: 'effect', name: 'Aura Sombria',    price: 250, icon: '✨', rarity: 'rare' },
    { id: 'fx_fire',   category: 'effect', slot: 'effect', name: 'Chamas',          price: 500, icon: '🔥', rarity: 'epic' },
    { id: 'fx_static', category: 'effect', slot: 'effect', name: 'Estática CRT',    price: 700, icon: '📺', rarity: 'epic' }
  ];

  /* ==================== PACOTES DE CUSTARDS ==================== */
  const CUSTARD_PACKAGES = [
    { id: 'pkg_small',  custards: 100,  bonus: 0,    label: 'R$ 4,90' },
    { id: 'pkg_medium', custards: 500,  bonus: 50,   label: 'R$ 19,90' },
    { id: 'pkg_large',  custards: 1500, bonus: 300,  label: 'R$ 49,90' },
    { id: 'pkg_huge',   custards: 5000, bonus: 1500, label: 'R$ 149,90' }
  ];

  /* ==================== CÓDIGOS PROMOCIONAIS ==================== */
  const PRESET_CODES = {
    'WELCOME100':  { custards: 100 },
    'V01LAUNCH':   { custards: 500 },
    'CUSTARDLOVE': { custards: 250 },
    'SLENDY':      { custards: 150 },
    'FREEMONEY':   { custards: 50  },
    'CREEPYPASTA': { custards: 300 },
    'STUDIO3D':    { custards: 200 }
  };

  /* ==================== DB HELPERS ==================== */
  function loadDB() {
    try { const r = localStorage.getItem(DB_KEY); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function saveDB(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { console.error('Falha ao salvar DB', e); }
  }
  function initDB() {
    let db = loadDB();
    if (!db) db = { users: {}, games: [], transactions: [], createdAt: Date.now() };
    if (!db.users) db.users = {};
    if (!db.games) db.games = [];
    if (!db.transactions) db.transactions = [];
    return db;
  }

  /* ==================== SESSION ==================== */
  function getSession() { return localStorage.getItem(SESSION_KEY); }
  function setSession(u) {
    if (u) localStorage.setItem(SESSION_KEY, u);
    else localStorage.removeItem(SESSION_KEY);
  }

  /* ==================== AUTH ==================== */
  function register(username, email, password) {
    username = (username || '').trim();
    email = (email || '').trim();
    if (username.length < 3) return { ok: false, error: 'Nick precisa ter 3+ caracteres' };
    if (username.length > 20) return { ok: false, error: 'Nick precisa ter menos de 20 caracteres' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { ok: false, error: 'Nick: apenas letras, números e _' };
    if (!email.includes('@') || email.length < 5) return { ok: false, error: 'Email inválido' };
    if (!password || password.length < 4) return { ok: false, error: 'Senha precisa ter 4+ caracteres' };

    const db = initDB();
    const key = username.toLowerCase();
    if (db.users[key]) return { ok: false, error: 'Nick já existe' };

    db.users[key] = {
      username,
      email,
      password,
      custards: 500,
      inventory: ['body_purple', 'face_normal', 'acc_antenna', 'fx_none'],
      avatar: { body: 'body_purple', face: 'face_normal', accessory: 'acc_antenna', effect: 'fx_none' },
      games: [],
      redeemedCodes: [],
      createdAt: Date.now(),
      totalEarned: 500,
      totalSpent: 0
    };
    saveDB(db);
    setSession(key);
    return { ok: true };
  }

  function login(username, password) {
    const key = (username || '').trim().toLowerCase();
    const db = initDB();
    const user = db.users[key];
    if (!user) return { ok: false, error: 'Usuário não encontrado' };
    if (user.password !== password) return { ok: false, error: 'Senha incorreta' };
    setSession(key);
    return { ok: true };
  }

  function logout() { setSession(null); }

  function getCurrentUser() {
    const key = getSession();
    if (!key) return null;
    return initDB().users[key] || null;
  }

  function updateUser(patch) {
    const key = getSession();
    if (!key) return null;
    const db = initDB();
    if (!db.users[key]) return null;
    Object.assign(db.users[key], patch);
    saveDB(db);
    return db.users[key];
  }

  /* ==================== ECONOMIA ==================== */
  function getCustards() {
    const u = getCurrentUser();
    return u ? u.custards : 0;
  }

  function addCustards(amount, reason) {
    const key = getSession();
    if (!key) return 0;
    const db = initDB();
    const u = db.users[key];
    if (!u) return 0;
    u.custards = Math.max(0, (u.custards || 0) + amount);
    u.totalEarned = (u.totalEarned || 0) + Math.max(0, amount);
    db.transactions.push({ username: key, type: 'earn', amount, reason: reason || 'unknown', ts: Date.now(), balance: u.custards });
    saveDB(db);
    return u.custards;
  }

  function spendCustards(amount, reason) {
    const key = getSession();
    if (!key) return { ok: false, error: 'Não logado' };
    const db = initDB();
    const u = db.users[key];
    if (!u) return { ok: false, error: 'Usuário não encontrado' };
    if (u.custards < amount) return { ok: false, error: 'Custards insuficientes' };
    u.custards -= amount;
    u.totalSpent = (u.totalSpent || 0) + amount;
    db.transactions.push({ username: key, type: 'spend', amount, reason: reason || 'purchase', ts: Date.now(), balance: u.custards });
    saveDB(db);
    return { ok: true, balance: u.custards };
  }

  /* ==================== INVENTÁRIO ==================== */
  function getInventory() {
    const u = getCurrentUser();
    return u ? (u.inventory || []) : [];
  }
  function ownsItem(itemId) { return getInventory().includes(itemId); }
  function addToInventory(itemId) {
    const key = getSession();
    if (!key) return false;
    const db = initDB();
    const u = db.users[key];
    if (!u) return false;
    if (!u.inventory) u.inventory = [];
    if (!u.inventory.includes(itemId)) { u.inventory.push(itemId); saveDB(db); }
    return true;
  }

  /* ==================== AVATAR ==================== */
  function getAvatar() {
    const u = getCurrentUser();
    return u ? u.avatar : null;
  }
  function setAvatar(avatar) { return updateUser({ avatar }); }
  function equipItem(itemId) {
    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (!item) return { ok: false, error: 'Item inválido' };
    if (!ownsItem(itemId)) return { ok: false, error: 'Você não possui este item' };
    const avatar = getAvatar();
    avatar[item.slot] = itemId;
    setAvatar(avatar);
    return { ok: true };
  }

  /* ==================== MERCADO ==================== */
  function getMarketItems() {
    return MARKET_ITEMS.map(item => ({ ...item, owned: ownsItem(item.id) }));
  }
  function getMarketItem(id) { return MARKET_ITEMS.find(i => i.id === id); }
  function buyItem(itemId) {
    const item = getMarketItem(itemId);
    if (!item) return { ok: false, error: 'Item não existe' };
    if (ownsItem(itemId)) return { ok: false, error: 'Você já possui este item' };
    if (item.price > 0) {
      const r = spendCustards(item.price, 'buy:' + itemId);
      if (!r.ok) return r;
    }
    addToInventory(itemId);
    return { ok: true, balance: getCustards() };
  }

  /* ==================== CÓDIGOS ==================== */
  function redeemCode(code) {
    const key = getSession();
    if (!key) return { ok: false, error: 'Precisa estar logado' };
    code = (code || '').trim().toUpperCase();
    if (!code) return { ok: false, error: 'Digite um código' };
    const preset = PRESET_CODES[code];
    if (!preset) return { ok: false, error: 'Código inválido' };

    const db = initDB();
    const u = db.users[key];
    if (!u) return { ok: false, error: 'Usuário não encontrado' };
    if (!u.redeemedCodes) u.redeemedCodes = [];
    if (u.redeemedCodes.includes(code)) return { ok: false, error: 'Você já resgatou esse código' };

    u.redeemedCodes.push(code);
    u.custards += preset.custards;
    u.totalEarned = (u.totalEarned || 0) + preset.custards;
    db.transactions.push({ username: key, type: 'earn', amount: preset.custards, reason: 'code:' + code, ts: Date.now(), balance: u.custards });
    saveDB(db);
    return { ok: true, custards: preset.custards, balance: u.custards };
  }

  function getRedeemedCodes() {
    const u = getCurrentUser();
    return u ? (u.redeemedCodes || []) : [];
  }

  /* ==================== COMPRA DE CUSTARDS (simulada) ==================== */
  function purchaseCustards(pkgId) {
    const pkg = CUSTARD_PACKAGES.find(p => p.id === pkgId);
    if (!pkg) return { ok: false, error: 'Pacote inválido' };
    const total = pkg.custards + pkg.bonus;
    addCustards(total, 'purchase:' + pkgId);
    return { ok: true, custards: total, balance: getCustards() };
  }
  function getCustardPackages() { return CUSTARD_PACKAGES.slice(); }

  /* ==================== JOGOS ==================== */
  function getGames() {
    return initDB().games.slice().sort((a, b) => {
      if (a.official && !b.official) return -1;
      if (!a.official && b.official) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }
  function getGame(id) { return initDB().games.find(g => g.id === id) || null; }
  function getMyGames() {
    const key = getSession();
    if (!key) return [];
    return initDB().games.filter(g => g.authorId === key);
  }

  function publishGame(data) {
    const key = getSession();
    if (!key) return { ok: false, error: 'Precisa estar logado' };
    if (!data.name || !data.name.trim()) return { ok: false, error: 'Nome obrigatório' };
    if (!data.script || !data.script.trim()) return { ok: false, error: 'Script obrigatório' };

    const db = initDB();
    const u = db.users[key];
    if (!u) return { ok: false, error: 'Usuário não encontrado' };

    // Se for update de um jogo existente do mesmo autor
    if (data.id) {
      const existing = db.games.find(g => g.id === data.id && g.authorId === key);
      if (existing) {
        existing.name = data.name.trim();
        existing.description = (data.description || '').trim();
        existing.script = data.script;
        existing.updatedAt = Date.now();
        saveDB(db);
        return { ok: true, game: existing, updated: true };
      }
    }

    const game = {
      id: 'game_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: data.name.trim(),
      description: (data.description || '').trim(),
      author: u.username,
      authorId: key,
      script: data.script,
      official: false,
      plays: 0,
      likes: 0,
      createdAt: Date.now()
    };
    db.games.push(game);
    if (!u.games) u.games = [];
    u.games.push(game.id);
    saveDB(db);
    return { ok: true, game };
  }

  function deleteGame(gameId) {
    const key = getSession();
    if (!key) return { ok: false, error: 'Precisa estar logado' };
    const db = initDB();
    const idx = db.games.findIndex(g => g.id === gameId && g.authorId === key);
    if (idx < 0) return { ok: false, error: 'Sem permissão' };
    db.games.splice(idx, 1);
    const u = db.users[key];
    if (u && u.games) u.games = u.games.filter(id => id !== gameId);
    saveDB(db);
    return { ok: true };
  }

  function incrementPlays(gameId) {
    const db = initDB();
    const g = db.games.find(x => x.id === gameId);
    if (g) { g.plays = (g.plays || 0) + 1; saveDB(db); }
  }
  function likeGame(gameId) {
    const db = initDB();
    const g = db.games.find(x => x.id === gameId);
    if (g) { g.likes = (g.likes || 0) + 1; saveDB(db); }
  }

  /* ==================== SELEÇÃO PARA ENGINE ==================== */
  function setSelectedGame(gameId) { sessionStorage.setItem('cb_selected_game', gameId); }
  function getSelectedGame() {
    const id = sessionStorage.getItem('cb_selected_game');
    return id ? getGame(id) : null;
  }

  /* ==================== SEED INICIAL ==================== */
  function seedIfNeeded() {
    const db = initDB();
    if (db.games.length > 0) return;

    const official = {
      id: 'official_01',
      name: 'Slendytubby: O Início',
      description: 'Explore uma instalação abandonada. Colete todos os custards. Fuja do monstro. Boa sorte.',
      author: 'CustardBricks',
      authorId: 'system',
      official: true,
      plays: 1234,
      likes: 567,
      createdAt: Date.now() - 86400000 * 30,
      script: `
// ============================================
// SLENDYTUBBY: O INÍCIO (Jogo Oficial)
// ============================================

// Bordas do mundo
[[0,0,800,20],[0,780,800,20],[0,0,20,800],[780,0,20,800]].forEach(function(w) {
  var wall = Instance.new("Part");
  wall.Position = Vector2.new(w[0] + w[2]/2, w[1] + w[3]/2);
  wall.Size = Vector2.new(w[2], w[3]);
  wall.Color = "#2a2a3a";
  wall.Parent = game.Workspace;
});

// Paredes internas
[[200,100,20,250],[200,350,250,20],[450,350,20,300],
 [600,100,20,250],[100,550,300,20],[500,550,20,200],
 [500,730,200,20],[300,450,20,100]].forEach(function(w) {
  var wall = Instance.new("Part");
  wall.Position = Vector2.new(w[0] + w[2]/2, w[1] + w[3]/2);
  wall.Size = Vector2.new(w[2], w[3]);
  wall.Color = "#3a3a4a";
  wall.Parent = game.Workspace;
});

// Spawn do jogador
var spawn = Instance.new("SpawnPoint");
spawn.Position = Vector2.new(100, 100);
spawn.Parent = game.Workspace;

// Custards (moedas coletáveis)
[[300,200],[700,200],[700,700],[100,700],[400,400],
 [350,650],[680,400],[250,320],[500,150]].forEach(function(p) {
  var coin = Instance.new("Coin");
  coin.Position = Vector2.new(p[0], p[1]);
  coin.Parent = game.Workspace;
});

// Slendytubby
var monster = Instance.new("Monster");
monster.Position = Vector2.new(700, 100);
monster.Speed = 1.8;
monster.Parent = game.Workspace;

print("Boa sorte... ele está te observando.");
      `
    };
    db.games.push(official);
    saveDB(db);
  }

  seedIfNeeded();

  /* ==================== EXPORT ==================== */
  return {
    register, login, logout, getCurrentUser, getSession, updateUser,
    getCustards, addCustards, spendCustards,
    getInventory, ownsItem, addToInventory,
    getAvatar, setAvatar, equipItem,
    getMarketItems, getMarketItem, buyItem,
    MARKET_ITEMS, CUSTARD_PACKAGES, getCustardPackages,
    redeemCode, getRedeemedCodes, PRESET_CODES,
    purchaseCustards,
    getGames, getGame, getMyGames, publishGame, deleteGame, incrementPlays, likeGame,
    setSelectedGame, getSelectedGame
  };
})();
