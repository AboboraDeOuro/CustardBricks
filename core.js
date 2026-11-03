const CORE = (function () {
  'use strict';
  const DB_KEY = 'custardbricks_db_v4';
  const SESSION_KEY = 'custardbricks_session';
  const CHUNK_SIZE = 16;

  // === MIGRAÇÃO DE BANCO DE DADOS ===
  function migrateDB() {
    if (localStorage.getItem(DB_KEY)) return;
    const oldKeys = ['custardbricks_db_v3', 'custardbricks_db_v2', 'custardbricks_db'];
    for (const oldKey of oldKeys) {
      const data = localStorage.getItem(oldKey);
      if (data) {
        localStorage.setItem(DB_KEY, data);
        console.log('Banco de dados migrado de', oldKey);
        break;
      }
    }
  }
  migrateDB();

  const MARKET_ITEMS = [
    { id:'body_purple', category:'body', slot:'body', name:'Roxo Sombrio', price:0, color:'#7b2fbe', icon:'swatch', rarity:'common' },
    { id:'body_green',  category:'body', slot:'body', name:'Verde Podre', price:100, color:'#3fa14b', icon:'swatch', rarity:'common' },
    { id:'body_yellow', category:'body', slot:'body', name:'Amarelo Doente', price:150, color:'#e8d347', icon:'swatch', rarity:'common' },
    { id:'body_red',    category:'body', slot:'body', name:'Vermelho Sangue', price:250, color:'#ff2222', icon:'swatch', rarity:'rare' },
    { id:'body_white',  category:'body', slot:'body', name:'Branco Cadáver', price:300, color:'#e6e6e6', icon:'swatch', rarity:'rare' },
    { id:'body_black',  category:'body', slot:'body', name:'Preto Abissal', price:500, color:'#1a1a1a', icon:'swatch', rarity:'epic' },
    { id:'body_gold',   category:'body', slot:'body', name:'Dourado Lendário', price:1000, color:'#e8b347', icon:'swatch', rarity:'legendary' },
    { id:'face_normal', category:'face', slot:'face', name:'Rosto Normal', price:0, icon:'😊', rarity:'common' },
    { id:'face_creepy', category:'face', slot:'face', name:'Sorriso Sombrio', price:150, icon:'😈', rarity:'rare' },
    { id:'face_glitch', category:'face', slot:'face', name:'Glitch CRT', price:400, icon:'👾', rarity:'epic' },
    { id:'face_bloody', category:'face', slot:'face', name:'Olhos Vermelhos', price:300, icon:'👁️', rarity:'rare' },
    { id:'acc_none',    category:'accessory', slot:'accessory', name:'Nenhum', price:0, icon:'🚫', rarity:'common' },
    { id:'acc_antenna', category:'accessory', slot:'accessory', name:'Antena Teletubby', price:0, icon:'📡', rarity:'common' },
    { id:'acc_hat',     category:'accessory', slot:'accessory', name:'Cartola Sombria', price:200, icon:'🎩', rarity:'rare' },
    { id:'acc_horns',   category:'accessory', slot:'accessory', name:'Chifres', price:350, icon:'😈', rarity:'epic' },
    { id:'acc_crown',   category:'accessory', slot:'accessory', name:'Coroa Dourada', price:800, icon:'👑', rarity:'legendary' },
    { id:'acc_halo',    category:'accessory', slot:'accessory', name:'Auréola', price:600, icon:'😇', rarity:'epic' },
    { id:'fx_none',     category:'effect', slot:'effect', name:'Nenhum', price:0, icon:'➖', rarity:'common' },
    { id:'fx_glow',     category:'effect', slot:'effect', name:'Aura Sombria', price:250, icon:'✨', rarity:'rare' },
    { id:'fx_fire',     category:'effect', slot:'effect', name:'Chamas', price:500, icon:'🔥', rarity:'epic' },
    { id:'fx_static',   category:'effect', slot:'effect', name:'Estática CRT', price:700, icon:'📺', rarity:'epic' }
  ];
  const CUSTARD_PACKAGES = [
    { id:'pkg_small', custards:100, bonus:0, label:'R$ 4,90' },
    { id:'pkg_medium', custards:500, bonus:50, label:'R$ 19,90' },
    { id:'pkg_large', custards:1500, bonus:300, label:'R$ 49,90' },
    { id:'pkg_huge', custards:5000, bonus:1500, label:'R$ 149,90' }
  ];
  const PRESET_CODES = {
    'WELCOME100':{custards:100}, 'V01LAUNCH':{custards:500},
    'CUSTARDLOVE':{custards:250}, 'SLENDY':{custards:150},
    'FREEMONEY':{custards:50}, 'CREEPYPASTA':{custards:300}, 'STUDIO3D':{custards:200}
  };

  const loadDB = () => { try { const r = localStorage.getItem(DB_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; } };
  const saveDB = (db) => { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) {} };
  const initDB = () => {
    let db = loadDB();
    if (!db) db = { users:{}, games:[], transactions:[], createdAt:Date.now() };
    if (!db.users) db.users = {};
    if (!db.games) db.games = [];
    if (!db.transactions) db.transactions = [];
    return db;
  };
  const getSession = () => localStorage.getItem(SESSION_KEY);
  const setSession = (u) => u ? localStorage.setItem(SESSION_KEY, u) : localStorage.removeItem(SESSION_KEY);

  function register(username, email, password) {
    username = (username||'').trim(); email = (email||'').trim();
    if (username.length < 3) return { ok:false, error:'Nick 3+ caracteres' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { ok:false, error:'Apenas letras, números e _' };
    if (!email.includes('@')) return { ok:false, error:'Email inválido' };
    if (!password || password.length < 4) return { ok:false, error:'Senha 4+ caracteres' };
    const db = initDB();
    const key = username.toLowerCase();
    if (db.users[key]) return { ok:false, error:'Nick já existe' };
    db.users[key] = {
      username, email, password, custards:500,
      inventory:['body_purple','face_normal','acc_antenna','fx_none'],
      avatar:{ body:'body_purple', face:'face_normal', accessory:'acc_antenna', effect:'fx_none' },
      games:[], redeemedCodes:[], createdAt:Date.now(), totalEarned:500, totalSpent:0
    };
    saveDB(db); setSession(key);
    return { ok:true };
  }
  function login(username, password) {
    const key = (username||'').trim().toLowerCase();
    const db = initDB(); const u = db.users[key];
    if (!u) return { ok:false, error:'Usuário não encontrado' };
    if (u.password !== password) return { ok:false, error:'Senha incorreta' };
    setSession(key); return { ok:true };
  }
  const logout = () => setSession(null);
  const getCurrentUser = () => { const k = getSession(); return k ? (initDB().users[k] || null) : null; };
  function updateUser(patch) {
    const k = getSession(); if (!k) return null;
    const db = initDB(); if (!db.users[k]) return null;
    Object.assign(db.users[k], patch); saveDB(db); return db.users[k];
  }

  const getCustards = () => { const u = getCurrentUser(); return u ? u.custards : 0; };
  function addCustards(amount, reason) {
    const k = getSession(); if (!k) return 0;
    const db = initDB(); const u = db.users[k]; if (!u) return 0;
    u.custards = Math.max(0, (u.custards||0) + amount);
    u.totalEarned = (u.totalEarned||0) + Math.max(0, amount);
    db.transactions.push({ username:k, type:'earn', amount, reason:reason||'unknown', ts:Date.now(), balance:u.custards });
    saveDB(db); return u.custards;
  }
  function spendCustards(amount, reason) {
    const k = getSession(); if (!k) return { ok:false, error:'Não logado' };
    const db = initDB(); const u = db.users[k]; if (!u) return { ok:false, error:'Usuário não encontrado' };
    if (u.custards < amount) return { ok:false, error:'Custards insuficientes' };
    u.custards -= amount;
    u.totalSpent = (u.totalSpent||0) + amount;
    db.transactions.push({ username:k, type:'spend', amount, reason:reason||'purchase', ts:Date.now(), balance:u.custards });
    saveDB(db); return { ok:true, balance:u.custards };
  }
  const getInventory = () => { const u = getCurrentUser(); return u ? (u.inventory||[]) : []; };
  const ownsItem = (id) => getInventory().includes(id);
  function addToInventory(id) {
    const k = getSession(); if (!k) return false;
    const db = initDB(); const u = db.users[k]; if (!u) return false;
    if (!u.inventory) u.inventory = [];
    if (!u.inventory.includes(id)) { u.inventory.push(id); saveDB(db); }
    return true;
  }
  const getAvatar = () => { const u = getCurrentUser(); return u ? u.avatar : null; };
  const setAvatar = (a) => updateUser({ avatar: a });
  function equipItem(id) {
    const item = MARKET_ITEMS.find(i => i.id === id);
    if (!item) return { ok:false, error:'Item inválido' };
    if (!ownsItem(id)) return { ok:false, error:'Você não possui este item' };
    const av = getAvatar(); av[item.slot] = id; setAvatar(av); return { ok:true };
  }
  const getMarketItems = () => MARKET_ITEMS.map(i => ({ ...i, owned: ownsItem(i.id) }));
  const getMarketItem = (id) => MARKET_ITEMS.find(i => i.id === id);
  function buyItem(id) {
    const item = getMarketItem(id);
    if (!item) return { ok:false, error:'Item não existe' };
    if (ownsItem(id)) return { ok:false, error:'Você já possui este item' };
    if (item.price > 0) { const r = spendCustards(item.price, 'buy:'+id); if (!r.ok) return r; }
    addToInventory(id); return { ok:true, balance:getCustards() };
  }
  function redeemCode(code) {
    const k = getSession(); if (!k) return { ok:false, error:'Precisa estar logado' };
    code = (code||'').trim().toUpperCase();
    if (!code) return { ok:false, error:'Digite um código' };
    const preset = PRESET_CODES[code];
    if (!preset) return { ok:false, error:'Código inválido' };
    const db = initDB(); const u = db.users[k];
    if (!u) return { ok:false, error:'Usuário não encontrado' };
    if (!u.redeemedCodes) u.redeemedCodes = [];
    if (u.redeemedCodes.includes(code)) return { ok:false, error:'Já resgatou' };
    u.redeemedCodes.push(code);
    u.custards += preset.custards;
    u.totalEarned = (u.totalEarned||0) + preset.custards;
    db.transactions.push({ username:k, type:'earn', amount:preset.custards, reason:'code:'+code, ts:Date.now(), balance:u.custards });
    saveDB(db); return { ok:true, custards:preset.custards, balance:u.custards };
  }
  const getRedeemedCodes = () => { const u = getCurrentUser(); return u ? (u.redeemedCodes||[]) : []; };
  function purchaseCustards(pkgId) {
    const pkg = CUSTARD_PACKAGES.find(p => p.id === pkgId);
    if (!pkg) return { ok:false, error:'Pacote inválido' };
    const total = pkg.custards + pkg.bonus;
    addCustards(total, 'purchase:'+pkgId);
    return { ok:true, custards:total, balance:getCustards() };
  }
  const getCustardPackages = () => CUSTARD_PACKAGES.slice();

  const getGames = () => initDB().games.slice().sort((a,b) => {
    if (a.official && !b.official) return -1;
    if (!a.official && b.official) return 1;
    return (b.createdAt||0) - (a.createdAt||0);
  });
  const getGame = (id) => initDB().games.find(g => g.id === id) || null;
  const getMyGames = () => { const k = getSession(); return k ? initDB().games.filter(g => g.authorId === k) : []; };

  function publishGame(data) {
    const k = getSession(); if (!k) return { ok:false, error:'Precisa estar logado' };
    if (!data.name || !data.name.trim()) return { ok:false, error:'Nome obrigatório' };
    const db = initDB(); const u = db.users[k];
    if (!u) return { ok:false, error:'Usuário não encontrado' };

    if (data.id) {
      const e = db.games.find(g => g.id === data.id && g.authorId === k);
      if (e) {
        e.name = data.name.trim(); e.description = (data.description||'').trim();
        e.category = data.category || e.category || 'Adventure';
        e.objects = data.objects || []; e.script = data.script || '';
        e.models = data.models || e.models || []; e.updatedAt = Date.now();
        saveDB(db); return { ok:true, game:e, updated:true };
      }
    }
    const game = {
      id:'game_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
      name:data.name.trim(), description:(data.description||'').trim(),
      category:data.category || 'Adventure',
      author:u.username, authorId:k,
      objects:data.objects||[], script:data.script||'', models:data.models||[],
      official:false, plays:0, likes:0, createdAt:Date.now()
    };
    db.games.push(game);
    if (!u.games) u.games = [];
    u.games.push(game.id);
    saveDB(db);
    return { ok:true, game };
  }

  function deleteGame(id) {
    const k = getSession(); if (!k) return { ok:false, error:'Precisa estar logado' };
    const db = initDB();
    const idx = db.games.findIndex(g => g.id === id && g.authorId === k);
    if (idx < 0) return { ok:false, error:'Sem permissão' };
    db.games.splice(idx, 1);
    const u = db.users[k]; if (u && u.games) u.games = u.games.filter(x => x !== id);
    saveDB(db); return { ok:true };
  }
  function incrementPlays(id) {
    const db = initDB(); const g = db.games.find(x => x.id === id);
    if (g) { g.plays = (g.plays||0) + 1; saveDB(db); }
  }
  function likeGame(id) {
    const db = initDB(); const g = db.games.find(x => x.id === id);
    if (g) { g.likes = (g.likes||0) + 1; saveDB(db); }
  }
  const setSelectedGame = (id) => sessionStorage.setItem('cb_selected_game', id);
  const getSelectedGame = () => { const id = sessionStorage.getItem('cb_selected_game'); return id ? getGame(id) : null; };

  const chunkKey = (x,y,z) => `${Math.floor(x/CHUNK_SIZE)},${Math.floor(y/CHUNK_SIZE)},${Math.floor(z/CHUNK_SIZE)}`;
  function groupByChunk(objects) {
    const out = {};
    for (const o of objects) {
      const k = chunkKey(o.position.x, o.position.y, o.position.z);
      (out[k] = out[k] || []).push(o);
    }
    return out;
  }

  const Net = (function () {
    let channel=null, ws=null, handlers=[], mode='broadcast';
    function connect(id) {
      if (mode === 'broadcast') {
        if (channel) channel.close();
        channel = new BroadcastChannel('cb_room_' + id);
        channel.onmessage = (e) => { for (const h of handlers) h(e.data); };
      } else if (mode === 'websocket') {
        if (ws) ws.close();
        ws = new WebSocket('wss://SEU-SERVIDOR/room/' + id);
        ws.onmessage = (e) => { try { for (const h of handlers) h(JSON.parse(e.data)); } catch(err){} };
      }
    }
    function send(msg) {
      if (mode === 'broadcast' && channel) channel.postMessage(msg);
      else if (mode === 'websocket' && ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
    }
    function onMessage(fn) { handlers.push(fn); }
    function close() { if (channel) { channel.close(); channel=null; } if (ws) { ws.close(); ws=null; } handlers=[]; }
    function setMode(m) { mode = m; }
    return { connect, send, onMessage, close, setMode };
  })();

  const ModelStore = (function () {
    const DB_NAME = 'custardbricks_models'; const STORE = 'models'; let _db = null;
    function openDB() {
      return new Promise((resolve, reject) => {
        if (_db) return resolve(_db);
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => { _db = req.result; resolve(_db); };
        req.onerror = () => reject(req.error);
      });
    }
    async function save(id, blob, name, mimeType) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite'); const store = tx.objectStore(STORE);
        const req = store.put({ id, blob, name, mimeType, size: blob.size, createdAt: Date.now() });
        req.onsuccess = () => resolve({ id }); req.onerror = () => reject(req.error);
      });
    }
    async function get(id) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly'); const store = tx.objectStore(STORE);
        const req = store.get(id); req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error);
      });
    }
    async function list() {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly'); const store = tx.objectStore(STORE);
        const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
      });
    }
    async function remove(id) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite'); const store = tx.objectStore(STORE);
        const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
      });
    }
    async function getBlobURL(id) {
      const entry = await get(id);
      if (!entry) return null;
      return URL.createObjectURL(entry.blob);
    }
    return { save, get, list, remove, getBlobURL };
  })();

  function getOfficialGame3D() {
    return {
      id:'official_01', name:'Slendytubby: O Início (3D)',
      description:'Explore uma instalação abandonada em 3D. Colete todos os custards. Fuja do monstro.',
      category:'Horror',
      author:'CustardBricks', authorId:'system', official:true, plays:1234, likes:567,
      createdAt:Date.now()-86400000*30, script:'', models:[],
      objects:[
        { id:'floor', type:'Part', position:{x:0,y:-0.25,z:0}, size:{x:40,y:0.5,z:40}, color:'#2a2a3a', canCollide:true },
        { id:'wall_n', type:'Part', position:{x:0,y:2,z:-20}, size:{x:40,y:4,z:1}, color:'#3a3a4a', canCollide:true },
        { id:'wall_s', type:'Part', position:{x:0,y:2,z:20}, size:{x:40,y:4,z:1}, color:'#3a3a4a', canCollide:true },
        { id:'wall_e', type:'Part', position:{x:20,y:2,z:0}, size:{x:1,y:4,z:40}, color:'#3a3a4a', canCollide:true },
        { id:'wall_w', type:'Part', position:{x:-20,y:2,z:0}, size:{x:1,y:4,z:40}, color:'#3a3a4a', canCollide:true },
        { id:'wall_i1', type:'Part', position:{x:0,y:2,z:-8}, size:{x:16,y:4,z:1}, color:'#3a3a4a', canCollide:true },
        { id:'wall_i2', type:'Part', position:{x:-10,y:2,z:4}, size:{x:1,y:4,z:12}, color:'#3a3a4a', canCollide:true },
        { id:'wall_i3', type:'Part', position:{x:10,y:2,z:8}, size:{x:1,y:4,z:12}, color:'#3a3a4a', canCollide:true },
        { id:'spawn', type:'SpawnPoint', position:{x:0,y:0.1,z:15}, size:{x:2,y:0.2,z:2}, color:'#3fa14b' },
        { id:'coin1', type:'Coin', position:{x:5,y:1,z:5}, size:{x:1.2,y:1.2,z:1.2}, color:'#ff9ed0' },
        { id:'coin2', type:'Coin', position:{x:-5,y:1,z:-5}, size:{x:1.2,y:1.2,z:1.2}, color:'#ff9ed0' },
        { id:'coin3', type:'Coin', position:{x:12,y:1,z:-10}, size:{x:1.2,y:1.2,z:1.2}, color:'#ff9ed0' },
        { id:'coin4', type:'Coin', position:{x:-12,y:1,z:10}, size:{x:1.2,y:1.2,z:1.2}, color:'#ff9ed0' },
        { id:'coin5', type:'Coin', position:{x:0,y:1,z:0}, size:{x:1.2,y:1.2,z:1.2}, color:'#ff9ed0' },
        { id:'coin6', type:'Coin', position:{x:15,y:1,z:15}, size:{x:1.2,y:1.2,z:1.2}, color:'#ff9ed0' },
        { id:'coin7', type:'Coin', position:{x:-15,y:1,z:-15}, size:{x:1.2,y:1.2,z:1.2}, color:'#ff9ed0' },
        { id:'monster', type:'Monster', position:{x:-15,y:2,z:-15}, size:{x:2,y:4,z:2}, color:'#444444', speed:2.5 }
      ]
    };
  }
  function seedIfNeeded() {
    const db = initDB();
    if (db.games.length === 0) { db.games.push(getOfficialGame3D()); saveDB(db); }
    else {
      let changed = false;
      for (const g of db.games) {
        if (!g.objects) { g.objects = []; changed = true; }
        if (!g.models) { g.models = []; changed = true; }
        if (!g.category) { g.category = g.official ? 'Horror' : 'Adventure'; changed = true; }
      }
      const off = db.games.find(g => g.official);
      if (off && (!off.objects || off.objects.length === 0)) { Object.assign(off, getOfficialGame3D()); changed = true; }
      if (changed) saveDB(db);
    }
  }
  seedIfNeeded();

  return {
    register, login, logout, getCurrentUser, getSession, updateUser,
    getCustards, addCustards, spendCustards,
    getInventory, ownsItem, addToInventory,
    getAvatar, setAvatar, equipItem,
    getMarketItems, getMarketItem, buyItem,
    MARKET_ITEMS, CUSTARD_PACKAGES, getCustardPackages,
    redeemCode, getRedeemedCodes, PRESET_CODES, purchaseCustards,
    getGames, getGame, getMyGames, publishGame, deleteGame, incrementPlays, likeGame,
    setSelectedGame, getSelectedGame,
    CHUNK_SIZE, chunkKey, groupByChunk, Net, ModelStore
  };
})();
