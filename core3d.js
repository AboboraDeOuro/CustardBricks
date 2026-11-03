/* ============================================================
   CustardBricks 3D — core3d.js
   Engine Core: DataModel, Script Runtime, Auth, Toolbox, Seed
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- DB ---------- */
  const DB = {
    USERS: 'cb3d_users',
    CURRENT: 'cb3d_current',
    GAMES: 'cb3d_games',
    SEEDED: 'cb3d_seeded_v1'
  };
  function readJSON(key, fb) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; }
    catch (e) { return fb; }
  }
  function writeJSON(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
  }

  /* ============================================================
     MATH — mirror da API Roblox
  ============================================================ */
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.X = x; this.Y = y; this.Z = z; }
    static new(x, y, z) { return new Vector3(x, y, z); }
    static zero() { return new Vector3(0, 0, 0); }
    add(v) { return new Vector3(this.X + v.X, this.Y + v.Y, this.Z + v.Z); }
    sub(v) { return new Vector3(this.X - v.X, this.Y - v.Y, this.Z - v.Z); }
    mul(s) { return new Vector3(this.X * s, this.Y * s, this.Z * s); }
    clone() { return new Vector3(this.X, this.Y, this.Z); }
    toArray() { return [this.X, this.Y, this.Z]; }
    toString() { return `Vector3(${this.X}, ${this.Y}, ${this.Z})`; }
  }
  class Color3 {
    constructor(r = 0, g = 0, b = 0) { this.R = r; this.G = g; this.B = b; }
    static new(r, g, b) { return new Color3(r, g, b); }
    static fromRGB(r, g, b) { return new Color3(r / 255, g / 255, b / 255); }
    static fromHex(hex) {
      const h = String(hex).replace('#', '');
      return new Color3(
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255
      );
    }
    toHex() {
      const c = (n) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0');
      return '#' + c(this.R) + c(this.G) + c(this.B);
    }
    clone() { return new Color3(this.R, this.G, this.B); }
  }
  class CFrame {
    constructor(pos, rot) { this.Position = pos || new Vector3(0, 0, 0); this.Rotation = rot || new Vector3(0, 0, 0); }
    static new(x, y, z) { return new CFrame(new Vector3(x, y, z)); }
  }

  /* ============================================================
     INSTANCE — base Roblox-like
  ============================================================ */
  let _idc = 0;
  class Instance3D {
    constructor(className, name) {
      this.ClassName = className;
      this.Name = name || className;
      this.id = 'inst_' + (++_idc) + '_' + Math.random().toString(36).slice(2, 8);
      this.Parent = null;
      this.Children = [];
      this.Properties = {};
      this.Scripts = []; // { type:'visual'|'luau', trigger, actions?|source? }
      this._threeObject = null;
      this._listeners = {};
    }
    AddChild(child) {
      if (child.Parent) child.Parent.RemoveChild(child);
      child.Parent = this;
      this.Children.push(child);
      this._emit('childAdded', child);
      return child;
    }
    RemoveChild(child) {
      const i = this.Children.indexOf(child);
      if (i >= 0) { this.Children.splice(i, 1); child.Parent = null; this._emit('childRemoved', child); }
    }
    FindFirstChild(name) { return this.Children.find(c => c.Name === name) || null; }
    FindFirstChildOfClass(cls) { return this.Children.find(c => c.ClassName === cls) || null; }
    GetChildren() { return this.Children.slice(); }
    Destroy() { if (this.Parent) this.Parent.RemoveChild(this); this._emit('destroyed', this); }
    GetProperty(n) { return this.Properties[n]; }
    SetProperty(n, v) {
      this.Properties[n] = v;
      this._emit('propertyChanged', { name: n, value: v });
      const cbs = this._listeners[n];
      if (cbs) cbs.forEach(cb => { try { cb(v); } catch (e) {} });
    }
    onPropertyChanged(prop, cb) {
      if (!this._listeners[prop]) this._listeners[prop] = [];
      this._listeners[prop].push(cb);
    }
    on(evt, cb) {
      const k = '__evt_' + evt;
      if (!this._listeners[k]) this._listeners[k] = [];
      this._listeners[k].push(cb);
    }
    _emit(evt, data) {
      const cbs = this._listeners['__evt_' + evt];
      if (cbs) cbs.forEach(cb => { try { cb(data); } catch (e) {} });
    }
    attachThree(mesh) { this._threeObject = mesh; }
  }

  class Part extends Instance3D {
    constructor(name, shape) {
      super('Part', name || 'Part');
      this.Properties.Shape = shape || 'Block';
      this.Properties.Position = new Vector3(0, 0.5, 0);
      this.Properties.Size = new Vector3(4, 1, 2);
      this.Properties.Rotation = new Vector3(0, 0, 0);
      this.Properties.Color = new Color3(0.6, 0.6, 0.6);
      this.Properties.Anchored = true;
      this.Properties.Transparency = 0;
      this.Properties.CanCollide = true;
    }
  }
  class SpawnPoint extends Instance3D {
    constructor(name) {
      super('SpawnPoint', name || 'SpawnPoint');
      this.Properties.Position = new Vector3(0, 0.1, 0);
      this.Properties.Size = new Vector3(2, 0.2, 2);
      this.Properties.Color = new Color3(0.2, 0.9, 0.3);
      this.Properties.Anchored = true;
    }
  }
  function createInstance(className, name) {
    switch (className) {
      case 'Part': return new Part(name);
      case 'SpawnPoint': return new SpawnPoint(name);
      default: return new Instance3D(className, name);
    }
  }

  /* ============================================================
     DATAMODEL
  ============================================================ */
  class DataModel {
    constructor() {
      this.Workspace = new Instance3D('Workspace', 'Workspace');
      this.Lighting = new Instance3D('Lighting', 'Lighting');
      this.Players = new Instance3D('Players', 'Players');
      this.ReplicatedStorage = new Instance3D('ReplicatedStorage', 'ReplicatedStorage');
      this.ServerStorage = new Instance3D('ServerStorage', 'ServerStorage');
      this.Lighting.SetProperty('Ambient', new Color3(0.3, 0.3, 0.35));
      this.Lighting.SetProperty('Brightness', 1.5);
      this.Lighting.SetProperty('FogColor', new Color3(0.05, 0.05, 0.08));
      this.Lighting.SetProperty('FogEnd', 120);
    }
    getServices() {
      return [this.Workspace, this.Lighting, this.Players, this.ReplicatedStorage, this.ServerStorage];
    }
    findAll() {
      const out = [];
      const walk = (n) => { out.push(n); n.Children.forEach(walk); };
      this.getServices().forEach(walk);
      return out;
    }
    findById(id) { return this.findAll().find(n => n.id === id) || null; }
  }

  /* ============================================================
     SERIALIZATION
  ============================================================ */
  function serializeValue(v) {
    if (v === null || v === undefined) return null;
    if (v instanceof Vector3) return { __t: 'V3', X: v.X, Y: v.Y, Z: v.Z };
    if (v instanceof Color3) return { __t: 'C3', R: v.R, G: v.G, B: v.B };
    if (v instanceof CFrame) return { __t: 'CF', P: serializeValue(v.Position), R: serializeValue(v.Rotation) };
    if (typeof v === 'object') { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; } }
    return v;
  }
  function deserializeValue(v) {
    if (v === null || v === undefined) return v;
    if (typeof v === 'object') {
      if (v.__t === 'V3') return new Vector3(v.X, v.Y, v.Z);
      if (v.__t === 'C3') return new Color3(v.R, v.G, v.B);
      if (v.__t === 'CF') return new CFrame(deserializeValue(v.P), deserializeValue(v.R));
    }
    return v;
  }
  function serializeInstance(inst) {
    const props = {};
    for (const k in inst.Properties) props[k] = serializeValue(inst.Properties[k]);
    return {
      id: inst.id,
      className: inst.ClassName,
      name: inst.Name,
      properties: props,
      scripts: JSON.parse(JSON.stringify(inst.Scripts || [])),
      children: inst.Children.map(serializeInstance)
    };
  }
  function deserializeInstance(data, parent) {
    const inst = createInstance(data.className, data.name);
    inst.id = data.id || inst.id;
    for (const k in (data.properties || {})) inst.Properties[k] = deserializeValue(data.properties[k]);
    inst.Scripts = data.scripts || [];
    if (parent) parent.AddChild(inst);
    (data.children || []).forEach(c => deserializeInstance(c, inst));
    return inst;
  }
  function serializeDataModel(dm) {
    return {
      Workspace: serializeInstance(dm.Workspace),
      Lighting: serializeInstance(dm.Lighting),
      Players: serializeInstance(dm.Players),
      ReplicatedStorage: serializeInstance(dm.ReplicatedStorage),
      ServerStorage: serializeInstance(dm.ServerStorage)
    };
  }
  function deserializeDataModel(json) {
    const dm = new DataModel();
    const map = { Workspace: dm.Workspace, Lighting: dm.Lighting, Players: dm.Players, ReplicatedStorage: dm.ReplicatedStorage, ServerStorage: dm.ServerStorage };
    for (const svc in map) {
      const data = json[svc]; if (!data) continue;
      const target = map[svc];
      for (const k in (data.properties || {})) target.Properties[k] = deserializeValue(data.properties[k]);
      target.Children = [];
      (data.children || []).forEach(c => {
        const child = deserializeInstance(c, null);
        child.Parent = target;
        target.Children.push(child);
      });
      target.Scripts = data.scripts || [];
    }
    return dm;
  }

  /* ============================================================
     PROXY — bridge Luau → JS
  ============================================================ */
  function makeInstanceProxy(inst, model) {
    return new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') return undefined;
        if (prop === '__inst') return inst;
        if (prop === 'Parent') return inst.Parent ? makeInstanceProxy(inst.Parent, model) : null;
        if (prop === 'Name') return inst.Name;
        if (prop === 'ClassName') return inst.ClassName;
        if (prop === 'Children') return inst.Children.map(c => makeInstanceProxy(c, model));
        if (prop === 'Destroy') return () => { inst.Destroy(); model._emitDestroy && model._emitDestroy(inst); };
        if (prop === 'GetChildren') return () => inst.Children.map(c => makeInstanceProxy(c, model));
        if (prop === 'FindFirstChild') return (n) => {
          const r = inst.FindFirstChild(n);
          return r ? makeInstanceProxy(r, model) : null;
        };
        if (prop === 'Clone') return () => makeInstanceProxy(deserializeInstance(serializeInstance(inst)), model);
        if (prop in inst.Properties) return inst.Properties[prop];
        const child = inst.FindFirstChild(prop);
        if (child) return makeInstanceProxy(child, model);
        return undefined;
      },
      set(_t, prop, value) {
        if (prop === 'Name') { inst.Name = String(value); return true; }
        inst.SetProperty(prop, value);
        model._emitPropertyChange && model._emitPropertyChange(inst, prop, value);
        return true;
      }
    });
  }

  /* ============================================================
     LUAU MINI-RUNTIME (subset seguro)
     - Objetivo: ser trocado por Luau-WASM sem mudar a API pública
  ============================================================ */
  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '-' && src[i + 1] === '-') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (/[a-zA-Z_]/.test(c)) {
        let j = i; while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
        tokens.push({ type: 'id', value: src.slice(i, j) }); i = j; continue;
      }
      if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(src[i + 1] || ''))) {
        let j = i + (c === '-' ? 1 : 0);
        while (j < src.length && /[0-9.]/.test(src[j])) j++;
        tokens.push({ type: 'num', value: parseFloat(src.slice(i, j)) }); i = j; continue;
      }
      if (c === '"' || c === "'") {
        const q = c; let j = i + 1;
        while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++; }
        tokens.push({ type: 'str', value: src.slice(i + 1, j) }); i = j + 1; continue;
      }
      const two = src.slice(i, i + 2);
      if (['==', '~=', '<=', '>='].includes(two)) { tokens.push({ type: 'op', value: two }); i += 2; continue; }
      if ('=+-*/()[],.:<>'.includes(c)) { tokens.push({ type: 'op', value: c }); i++; continue; }
      i++;
    }
    return tokens;
  }
  function parseExpr(tokens, pos) {
    let left = parsePrimary(tokens, pos);
    if (!left) return null;
    while (pos.idx < tokens.length) {
      const t = tokens[pos.idx];
      if (t.type === 'op' && ['+', '-', '*', '/', '==', '~=', '<=', '>=', '<', '>'].includes(t.value)) {
        pos.idx++; const right = parsePrimary(tokens, pos);
        left = { kind: 'bin', op: t.value, left, right };
      } else break;
    }
    return left;
  }
  function parseArgs(tokens, pos) {
    const args = [];
    while (pos.idx < tokens.length && tokens[pos.idx].value !== ')') {
      const e = parseExpr(tokens, pos); if (e) args.push(e);
      if (tokens[pos.idx] && tokens[pos.idx].value === ',') pos.idx++; else break;
    }
    if (tokens[pos.idx] && tokens[pos.idx].value === ')') pos.idx++;
    return args;
  }
  function parsePrimary(tokens, pos) {
    if (pos.idx >= tokens.length) return null;
    const t = tokens[pos.idx];
    if (t.type === 'num') { pos.idx++; return { kind: 'num', value: t.value }; }
    if (t.type === 'str') { pos.idx++; return { kind: 'str', value: t.value }; }
    if (t.type === 'id') {
      pos.idx++;
      if (t.value === 'true') return { kind: 'bool', value: true };
      if (t.value === 'false') return { kind: 'bool', value: false };
      if (t.value === 'nil') return { kind: 'nil' };
      if (['Vector3', 'Color3', 'CFrame'].includes(t.value)) {
        const ctor = t.value;
        let method = 'new';
        if (tokens[pos.idx] && tokens[pos.idx].value === '.') {
          pos.idx++; method = tokens[pos.idx].value; pos.idx++;
        }
        if (tokens[pos.idx] && tokens[pos.idx].value === '(') { pos.idx++; const args = parseArgs(tokens, pos); return { kind: 'ctor', ctor, method, args }; }
        return { kind: 'id', name: ctor };
      }
      const path = [{ kind: 'id', name: t.value }];
      while (pos.idx < tokens.length) {
        const nx = tokens[pos.idx];
        if (nx.type === 'op' && (nx.value === '.' || nx.value === ':')) {
          pos.idx++; const nextId = tokens[pos.idx];
          if (!nextId || nextId.type !== 'id') break;
          pos.idx++;
          const isMethod = nx.value === ':';
          path.push({ kind: isMethod ? 'method' : 'member', name: nextId.value });
          if (isMethod && tokens[pos.idx] && tokens[pos.idx].value === '(') {
            pos.idx++; const args = parseArgs(tokens, pos);
            return { kind: 'methodcall', path, args };
          }
        } else if (nx.type === 'op' && nx.value === '(') {
          pos.idx++; const args = parseArgs(tokens, pos);
          return { kind: 'call', path, args };
        } else break;
      }
      return { kind: 'path', path };
    }
    if (t.value === '(') {
      pos.idx++; const e = parseExpr(tokens, pos);
      if (tokens[pos.idx] && tokens[pos.idx].value === ')') pos.idx++;
      return e;
    }
    return null;
  }
  function evalNode(node, ctx) {
    if (!node) return undefined;
    switch (node.kind) {
      case 'num': case 'str': case 'bool': return node.value;
      case 'nil': return null;
      case 'id': return ctx.resolve(node.name);
      case 'path': {
        let cur = ctx.resolve(node.path[0].name);
        for (let i = 1; i < node.path.length; i++) {
          const step = node.path[i];
          if (step.kind === 'member') cur = (cur == null ? null : cur[step.name]);
        }
        return cur;
      }
      case 'methodcall': {
        let cur = ctx.resolve(node.path[0].name);
        for (let i = 1; i < node.path.length - 1; i++) {
          const step = node.path[i];
          if (step.kind === 'member') cur = (cur == null ? null : cur[step.name]);
        }
        const last = node.path[node.path.length - 1];
        if (cur && typeof cur[last.name] === 'function') {
          return cur[last.name](...node.args.map(a => evalNode(a, ctx)));
        }
        return undefined;
      }
      case 'call': {
        const args = node.args.map(a => evalNode(a, ctx));
        let fn = ctx.resolve(node.path[0].name);
        for (let i = 1; i < node.path.length; i++) fn = (fn == null ? null : fn[node.path[i].name]);
        if (typeof fn === 'function') return fn(...args);
        return undefined;
      }
      case 'ctor': {
        const args = node.args.map(a => evalNode(a, ctx));
        if (node.ctor === 'Vector3') return new Vector3(args[0] || 0, args[1] || 0, args[2] || 0);
        if (node.ctor === 'Color3') {
          if (node.method === 'fromRGB') return Color3.fromRGB(args[0] || 0, args[1] || 0, args[2] || 0);
          if (node.method === 'fromHex') return Color3.fromHex(args[0] || '#000');
          return new Color3(args[0] || 0, args[1] || 0, args[2] || 0);
        }
        if (node.ctor === 'CFrame') return CFrame.new(args[0] || 0, args[1] || 0, args[2] || 0);
        return null;
      }
      case 'bin': {
        const l = evalNode(node.left, ctx), r = evalNode(node.right, ctx);
        switch (node.op) {
          case '+': return (l && l.add) ? l.add(r) : l + r;
          case '-': return (l && l.sub) ? l.sub(r) : l - r;
          case '*': return (l && l.mul) ? l.mul(r) : l * r;
          case '/': return l / r;
          case '==': return l === r;
          case '~=': return l !== r;
          case '<': return l < r; case '>': return l > r;
          case '<=': return l <= r; case '>=': return l >= r;
        }
        return undefined;
      }
    }
    return undefined;
  }
  function runLuauScript(source, model) {
    const tokens = tokenize(source);
    const ctx = makeRuntimeContext(model);
    const pos = { idx: 0 };
    const errors = [];
    while (pos.idx < tokens.length) {
      try {
        const stmt = parseStatement(tokens, pos);
        if (!stmt) { pos.idx++; continue; }
        execStatement(stmt, ctx);
      } catch (e) { errors.push(e.message); pos.idx++; }
    }
    if (errors.length) console.warn('[Luau runtime]', errors);
    return { ok: errors.length === 0, errors };
  }
  function parseStatement(tokens, pos) {
    const start = pos.idx;
    const t0 = tokens[pos.idx];
    if (!t0) return null;
    if (t0.type === 'id' && t0.value === 'if') {
      // Ignoramos o condicional por enquanto (subset)
      pos.idx++;
      while (pos.idx < tokens.length && tokens[pos.idx].value !== 'then') pos.idx++;
      if (tokens[pos.idx]) pos.idx++;
      return { kind: 'noop' };
    }
    if (t0.type === 'id' && t0.value === 'local') {
      pos.idx++;
      const nameTok = tokens[pos.idx]; pos.idx++;
      if (tokens[pos.idx] && tokens[pos.idx].value === '=') pos.idx++;
      const v = parseExpr(tokens, pos);
      return { kind: 'local', name: nameTok ? nameTok.value : '', value: v };
    }
    const expr = parseExpr(tokens, pos);
    if (!expr) { pos.idx = start + 1; return null; }
    if (tokens[pos.idx] && tokens[pos.idx].value === '=') {
      pos.idx++; const v = parseExpr(tokens, pos);
      return { kind: 'assign', target: expr, value: v };
    }
    return { kind: 'exprStmt', expr };
  }
  function execStatement(stmt, ctx) {
    if (!stmt) return;
    if (stmt.kind === 'noop') return;
    if (stmt.kind === 'exprStmt') { evalNode(stmt.expr, ctx); return; }
    if (stmt.kind === 'local') { ctx.locals[stmt.name] = evalNode(stmt.value, ctx); return; }
    if (stmt.kind === 'assign') {
      const value = evalNode(stmt.value, ctx);
      const tgt = stmt.target;
      if (tgt.kind === 'path' && tgt.path.length >= 2) {
        let cur = ctx.resolve(tgt.path[0].name);
        for (let i = 1; i < tgt.path.length - 1; i++) {
          const step = tgt.path[i];
          if (step.kind === 'member') cur = cur == null ? null : cur[step.name];
        }
        const last = tgt.path[tgt.path.length - 1];
        if (last.kind === 'member' && cur != null) { try { cur[last.name] = value; } catch (e) {} }
      }
    }
  }
  function makeRuntimeContext(model) {
    const ctx = {
      locals: {},
      resolve(name) {
        if (name in ctx.locals) return ctx.locals[name];
        if (name === 'workspace' || name === 'Workspace') return makeInstanceProxy(model.Workspace, model);
        if (name === 'game') return {
          Workspace: makeInstanceProxy(model.Workspace, model),
          Lighting: makeInstanceProxy(model.Lighting, model),
          Players: makeInstanceProxy(model.Players, model),
          ReplicatedStorage: makeInstanceProxy(model.ReplicatedStorage, model)
        };
        if (name === 'script') return { Parent: makeInstanceProxy(model.Workspace, model) };
        if (name === 'Vector3') return { new: (x, y, z) => new Vector3(x, y, z) };
        if (name === 'Color3') return { new: (r, g, b) => new Color3(r, g, b), fromRGB: (r, g, b) => Color3.fromRGB(r, g, b), fromHex: (h) => Color3.fromHex(h) };
        if (name === 'CFrame') return { new: (x, y, z) => CFrame.new(x, y, z) };
        if (name === 'print') return (...a) => console.log('[Luau]', ...a);
        if (name === 'wait') return (s) => { /* sync no-op */ };
        return undefined;
      }
    };
    return ctx;
  }

  /* ============================================================
     VISUAL BLOCKS RUNTIME
  ============================================================ */
  function executeVisualActions(actions, instance, model, context) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'ChangeColor':
            instance.SetProperty('Color', Color3.fromHex(action.color || '#ff2222'));
            break;
          case 'Move': {
            const p = instance.Properties.Position || new Vector3(0, 0, 0);
            instance.SetProperty('Position', new Vector3(p.X + (action.x || 0), p.Y + (action.y || 0), p.Z + (action.z || 0)));
            break;
          }
          case 'Destroy':
            instance.Destroy(); break;
          case 'Print':
            console.log('[Visual]', action.message || ''); break;
          case 'AddCoin':
            if (context && context.onAddCoin) context.onAddCoin(action.amount || 1);
            break;
          case 'Teleport':
            instance.SetProperty('Position', new Vector3(action.x || 0, action.y || 0, action.z || 0));
            break;
        }
      } catch (e) { console.warn('[Visual]', e); }
    }
  }
  function triggerScripts(instance, trigger, model, context) {
    if (!instance.Scripts || !instance.Scripts.length) return;
    for (const script of instance.Scripts) {
      if (script.type === 'visual' && script.trigger === trigger) {
        executeVisualActions(script.actions || [], instance, model, context);
      } else if (script.type === 'luau' && script.trigger === trigger) {
        runLuauScript(script.source || '', model);
      }
    }
  }

  /* ============================================================
     AUTH
  ============================================================ */
  function getUsers() { return readJSON(DB.USERS, {}); }
  function saveUsers(u) { writeJSON(DB.USERS, u); }
  function register(nick, password) {
    nick = (nick || '').trim();
    if (nick.length < 3) return { ok: false, error: 'Nick 3+ chars' };
    if (!password || password.length < 3) return { ok: false, error: 'Senha 3+ chars' };
    const users = getUsers(), key = nick.toLowerCase();
    if (users[key]) return { ok: false, error: 'Nick já existe' };
    users[key] = { nick, password, custards: 500, createdAt: Date.now() };
    saveUsers(users);
    localStorage.setItem(DB.CURRENT, key);
    return { ok: true, user: users[key] };
  }
  function login(nick, password) {
    const users = getUsers(), key = (nick || '').toLowerCase();
    const u = users[key];
    if (!u) return { ok: false, error: 'Conta não encontrada' };
    if (u.password !== password) return { ok: false, error: 'Senha incorreta' };
    localStorage.setItem(DB.CURRENT, key);
    return { ok: true, user: u };
  }
  function logout() { localStorage.removeItem(DB.CURRENT); }
  function getCurrentKey() { return localStorage.getItem(DB.CURRENT); }
  function getCurrentUser() {
    const k = getCurrentKey(); if (!k) return null;
    return getUsers()[k] || null;
  }
  function addCustards(n) {
    const k = getCurrentKey(); if (!k) return 0;
    const users = getUsers(); if (!users[k]) return 0;
    users[k].custards = Math.max(0, (users[k].custards || 0) + n);
    saveUsers(users);
    return users[k].custards;
  }

  /* ============================================================
     TOOLBOX + SEED
  ============================================================ */
  const TOOLBOX = [
    { id: 'block_basic',    name: 'Bloco',               category: 'Parts',    shape: 'Block',      defaultProps: { Size: [4, 1, 2],     Color: '#8a8a9a' } },
    { id: 'block_wall',     name: 'Parede',              category: 'Parts',    shape: 'Block',      defaultProps: { Size: [8, 6, 1],     Color: '#5a5a6a' } },
    { id: 'block_floor',    name: 'Chão',                category: 'Parts',    shape: 'Block',      defaultProps: { Size: [20, 0.5, 20], Color: '#3a3a4a' } },
    { id: 'sphere_basic',   name: 'Esfera',              category: 'Parts',    shape: 'Sphere',     defaultProps: { Size: [2, 2, 2],     Color: '#c07bd8' } },
    { id: 'cylinder_basic', name: 'Cilindro',            category: 'Parts',    shape: 'Cylinder',   defaultProps: { Size: [2, 3, 2],     Color: '#7b9ad8' } },
    { id: 'spawn_point',    name: 'Spawn Point',         category: 'Gameplay', shape: 'SpawnPoint', defaultProps: { Size: [2, 0.2, 2],   Color: '#3fa14b' } },
    { id: 'custard_item',   name: 'Custard Item',        category: 'Gameplay', shape: 'Custard',    defaultProps: { Size: [1.5, 1.5, 1.5], Color: '#ff9ed0' } },
    { id: 'slendytubby',    name: 'Slendytubby Nemesis', category: 'Gameplay', shape: 'Slendytubby', defaultProps: { Size: [3, 4, 3],    Color: '#444444' } }
  ];

  function seedIfNeeded() {
    if (localStorage.getItem(DB.SEEDED)) return;
    const dm = new DataModel();

    const floor = new Part('Floor', 'Block');
    floor.Properties.Size = new Vector3(20, 0.5, 20);
    floor.Properties.Position = new Vector3(0, -0.25, 0);
    floor.Properties.Color = new Color3(0.2, 0.2, 0.25);
    dm.Workspace.AddChild(floor);

    const wall = new Part('Wall', 'Block');
    wall.Properties.Size = new Vector3(10, 5, 0.5);
    wall.Properties.Position = new Vector3(0, 2.5, -5);
    wall.Properties.Color = new Color3(0.4, 0.3, 0.5);
    dm.Workspace.AddChild(wall);

    const spawn = new SpawnPoint('PlayerSpawn');
    spawn.Properties.Position = new Vector3(0, 0.1, 5);
    dm.Workspace.AddChild(spawn);

    const custard = new Part('Custard1', 'Custard');
    custard.Properties.Position = new Vector3(3, 1, 0);
    custard.Properties.Size = new Vector3(1.5, 1.5, 1.5);
    custard.Properties.Color = new Color3(1, 0.62, 0.82);
    dm.Workspace.AddChild(custard);

    writeJSON(DB.GAMES, [{
      id: 'example_game_1',
      name: 'Exemplo: Slendytubbies Base',
      author: 'CustardBricks 3D',
      official: true,
      createdAt: Date.now(),
      dataModel: serializeDataModel(dm)
    }]);
    writeJSON(DB.USERS, {});
    localStorage.setItem(DB.SEEDED, '1');
  }

  /* ============================================================
     GAME CRUD
  ============================================================ */
  function getGames() {
    return readJSON(DB.GAMES, []).sort((a, b) => {
      if (a.official && !b.official) return -1;
      if (!a.official && b.official) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }
  function getGameById(id) { return getGames().find(g => g.id === id) || null; }
  function saveGame(game) {
    const games = readJSON(DB.GAMES, []);
    const i = games.findIndex(g => g.id === game.id);
    if (i >= 0) games[i] = game; else games.push(game);
    writeJSON(DB.GAMES, games);
    return game;
  }
  function publishGame({ name, dataModel }) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: 'Faça login' };
    if (!name || !name.trim()) return { ok: false, error: 'Dê um nome' };
    const game = {
      id: 'game_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: name.trim(), author: user.nick, official: false,
      createdAt: Date.now(), dataModel: serializeDataModel(dataModel)
    };
    saveGame(game);
    return { ok: true, game };
  }
  function deleteGame(id) {
    writeJSON(DB.GAMES, readJSON(DB.GAMES, []).filter(g => g.id !== id));
  }

  /* ============================================================
     PUBLIC API
  ============================================================ */
  seedIfNeeded();

  global.Custard3D = {
    Vector3, Color3, CFrame,
    Instance3D, Part, SpawnPoint, DataModel, createInstance,
    serializeDataModel, deserializeDataModel,
    serializeInstance, deserializeInstance,
    serializeValue, deserializeValue,
    runLuauScript, triggerScripts,
    register, login, logout, getCurrentUser, addCustards,
    getGames, getGameById, saveGame, publishGame, deleteGame,
    TOOLBOX,
    _db: DB, _read: readJSON, _write: writeJSON
  };
})(typeof window !== 'undefined' ? window : globalThis);
