/* =========================================================
   CustardBricks — core.js
   Banco de dados local (LocalStorage) + Lógica central
   ========================================================= */

(function (global) {
  'use strict';

  const DB_KEYS = {
    USERS: 'cb_users',
    CURRENT: 'cb_current_user',
    GAMES: 'cb_games',
    AVATAR: 'cb_avatar_', // + nick
    SEEDED: 'cb_seeded_v1'
  };

  /* ---------- Utilidades ---------- */
  const now = () => Date.now();
  const uid = () => 'g_' + Math.random().toString(36).slice(2, 10) + now().toString(36);
  const safeJSON = (str, fallback) => {
    try { return JSON.parse(str); } catch (e) { return fallback; }
  };

  function read(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? safeJSON(raw, fallback) : fallback;
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* ---------- Estado Padrão ---------- */
  const DEFAULT_AVATAR = {
    bodyColor: '#7b2fbe',      // roxo sombrio
    antenna: 'triangle',       // triangle | circle | line
    ownedBodies: ['#7b2fbe'],
    ownedAntennas: ['triangle']
  };

  const SKIN_SHOP = {
    bodies: [
      { id: '#7b2fbe', name: 'Roxo Sombrio', price: 0 },
      { id: '#3fa14b', name: 'Verde Podre', price: 50 },
      { id: '#e8d347', name: 'Amarelo Doentio', price: 50 },
      { id: '#b22626', name: 'Vermelho Sangue', price: 100 },
      { id: '#e6e6e6', name: 'Branco Palidez', price: 150 }
    ],
    antennas: [
      { id: 'triangle', name: 'Triângulo', price: 0 },
      { id: 'circle', name: 'Círculo', price: 75 },
      { id: 'line', name: 'Linha', price: 75 }
    ]
  };

  /* ---------- Seed inicial ---------- */
  function seedIfNeeded() {
    if (localStorage.getItem(DB_KEYS.SEEDED)) return;

    // Mapa padrão (padrão "oficial" do jogo)
    const SIZE = 20;
    const grid = [];
    for (let y = 0; y < SIZE; y++) {
      const row = [];
      for (let x = 0; x < SIZE; x++) {
        // bordas = parede
        if (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) {
          row.push('wall');
        } else {
          row.push('floor');
        }
      }
      grid.push(row);
    }
    // algumas paredes internas
    for (let x = 4; x < 10; x++) grid[5][x] = 'wall';
    for (let y = 8; y < 14; y++) grid[y][12] = 'wall';
    for (let x = 3; x < 8; x++) grid[14][x] = 'wall';

    // spawn do player e monstro
    grid[2][2] = 'spawn_player';
    grid[SIZE - 3][SIZE - 3] = 'spawn_monster';

    // cremes de aveia (coletáveis)
    const custardPositions = [
      [3, 3], [7, 3], [10, 3], [15, 4],
      [4, 9], [8, 9], [14, 10], [16, 12],
      [5, 16], [10, 17], [15, 16], [17, 8]
    ];
    custardPositions.forEach(([x, y]) => {
      if (grid[y] && grid[y][x] === 'floor') grid[y][x] = 'custard';
    });

    const defaultGame = {
      id: 'official_1',
      name: 'Slendytubbies — Mapa Padrão',
      author: 'CustardBricks',
      official: true,
      createdAt: now(),
      size: SIZE,
      grid
    };

    write(DB_KEYS.GAMES, [defaultGame]);
    write(DB_KEYS.USERS, {});
    localStorage.setItem(DB_KEYS.SEEDED, '1');
  }

  /* ---------- Autenticação ---------- */
  function getUsers() { return read(DB_KEYS.USERS, {}); }
  function saveUsers(u) { write(DB_KEYS.USERS, u); }

  function register(nick, password) {
    nick = (nick || '').trim();
    if (nick.length < 3) return { ok: false, error: 'Nick precisa ter 3+ caracteres.' };
    if (!password || password.length < 3) return { ok: false, error: 'Senha precisa ter 3+ caracteres.' };

    const users = getUsers();
    const key = nick.toLowerCase();
    if (users[key]) return { ok: false, error: 'Esse nick já existe.' };

    users[key] = {
      nick,
      password, // (localStorage é simulação; não use isso em produção real)
      custards: 100,
      createdAt: now()
    };
    saveUsers(users);

    // cria avatar padrão
    write(DB_KEYS.AVATAR + key, { ...DEFAULT_AVATAR });

    // já loga
    localStorage.setItem(DB_KEYS.CURRENT, key);
    return { ok: true, user: users[key] };
  }

  function login(nick, password) {
    nick = (nick || '').trim();
    const users = getUsers();
    const key = nick.toLowerCase();
    const u = users[key];
    if (!u) return { ok: false, error: 'Conta não encontrada.' };
    if (u.password !== password) return { ok: false, error: 'Senha incorreta.' };
    localStorage.setItem(DB_KEYS.CURRENT, key);
    return { ok: true, user: u };
  }

  function logout() {
    localStorage.removeItem(DB_KEYS.CURRENT);
  }

  function getCurrentKey() {
    return localStorage.getItem(DB_KEYS.CURRENT);
  }

  function getCurrentUser() {
    const key = getCurrentKey();
    if (!key) return null;
    const users = getUsers();
    return users[key] || null;
  }

  function updateCurrentUser(patch) {
    const key = getCurrentKey();
    if (!key) return null;
    const users = getUsers();
    if (!users[key]) return null;
    users[key] = { ...users[key], ...patch };
    saveUsers(users);
    return users[key];
  }

  /* ---------- Economia ---------- */
  function getCustards() {
    const u = getCurrentUser();
    return u ? (u.custards || 0) : 0;
  }

  function addCustards(amount) {
    const u = getCurrentUser();
    if (!u) return 0;
    const total = Math.max(0, (u.custards || 0) + amount);
    updateCurrentUser({ custards: total });
    return total;
  }

  function spendCustards(amount) {
    const u = getCurrentUser();
    if (!u) return { ok: false, error: 'Não logado.' };
    if ((u.custards || 0) < amount) return { ok: false, error: 'Custards insuficientes.' };
    updateCurrentUser({ custards: u.custards - amount });
    return { ok: true };
  }

  /* ---------- Avatar / Inventário ---------- */
  function getAvatarKey() {
    const key = getCurrentKey();
    return key ? DB_KEYS.AVATAR + key : null;
  }

  function getAvatar() {
    const k = getAvatarKey();
    if (!k) return { ...DEFAULT_AVATAR };
    return read(k, { ...DEFAULT_AVATAR });
  }

  function saveAvatar(avatar) {
    const k = getAvatarKey();
    if (!k) return { ok: false, error: 'Não logado.' };
    write(k, avatar);
    return { ok: true };
  }

  function buyBody(colorId) {
    const item = SKIN_SHOP.bodies.find(b => b.id === colorId);
    if (!item) return { ok: false, error: 'Item inexistente.' };

    const avatar = getAvatar();
    if (avatar.ownedBodies.includes(colorId)) {
      return { ok: true, already: true };
    }
    if (item.price > 0) {
      const r = spendCustards(item.price);
      if (!r.ok) return r;
    }
    avatar.ownedBodies.push(colorId);
    avatar.bodyColor = colorId;
    saveAvatar(avatar);
    return { ok: true };
  }

  function buyAntenna(antennaId) {
    const item = SKIN_SHOP.antennas.find(a => a.id === antennaId);
    if (!item) return { ok: false, error: 'Item inexistente.' };

    const avatar = getAvatar();
    if (avatar.ownedAntennas.includes(antennaId)) {
      return { ok: true, already: true };
    }
    if (item.price > 0) {
      const r = spendCustards(item.price);
      if (!r.ok) return r;
    }
    avatar.ownedAntennas.push(antennaId);
    avatar.antenna = antennaId;
    saveAvatar(avatar);
    return { ok: true };
  }

  /* ---------- Jogos / Mapas ---------- */
  function getGames() {
    return read(DB_KEYS.GAMES, []).sort((a, b) => {
      if (a.official && !b.official) return -1;
      if (!a.official && b.official) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function getGameById(id) {
    return getGames().find(g => g.id === id) || null;
  }

  function saveGame(game) {
    const games = read(DB_KEYS.GAMES, []);
    const idx = games.findIndex(g => g.id === game.id);
    if (idx >= 0) games[idx] = game;
    else games.push(game);
    write(DB_KEYS.GAMES, games);
    return game;
  }

  function publishGame({ name, grid, size }) {
    const u = getCurrentUser();
    if (!u) return { ok: false, error: 'Faça login para publicar.' };
    if (!name || !name.trim()) return { ok: false, error: 'Dê um nome ao seu jogo.' };
    if (!Array.isArray(grid) || !grid.length) return { ok: false, error: 'Grid inválido.' };

    const hasPlayer = grid.flat().includes('spawn_player');
    const hasMonster = grid.flat().includes('spawn_monster');
    if (!hasPlayer) return { ok: false, error: 'Coloque 1 Spawn do Player.' };
    if (!hasMonster) return { ok: false, error: 'Coloque 1 Spawn do Slendytubby.' };

    const hasCustard = grid.flat().includes('custard');
    if (!hasCustard) return { ok: false, error: 'Coloque ao menos 1 Creme de Aveia.' };

    const game = {
      id: uid(),
      name: name.trim().slice(0, 40),
      author: u.nick,
      official: false,
      createdAt: now(),
      size: size || grid.length,
      grid
    };
    saveGame(game);
    return { ok: true, game };
  }

  /* ---------- Seleção temporária p/ engine ---------- */
  function selectGameForPlay(id) {
    sessionStorage.setItem('cb_selected_game', id);
  }
  function getSelectedGameForPlay() {
    const id = sessionStorage.getItem('cb_selected_game');
    if (!id) return null;
    return getGameById(id);
  }

  /* ---------- Bootstrap ---------- */
  seedIfNeeded();

  /* ---------- Export ---------- */
  const API = {
    // auth
    register, login, logout,
    getCurrentUser, getCurrentKey, updateCurrentUser,
    // economy
    getCustards, addCustards, spendCustards,
    // avatar
    getAvatar, saveAvatar, buyBody, buyAntenna,
    SKIN_SHOP, DEFAULT_AVATAR,
    // games
    getGames, getGameById, saveGame, publishGame,
    selectGameForPlay, getSelectedGameForPlay,
    // util
    _dbKeys: DB_KEYS
  };

  global.CustardCore = API;
})(window);
