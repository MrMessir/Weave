'use strict';
const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const rateLimit    = require('express-rate-limit');
const { v4: uuid } = require('uuid');
const bcrypt       = require('bcryptjs');
const http         = require('http');
const WebSocket    = require('ws');

const { DatabaseSync } = require('node:sqlite');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'weave.db');
// Создать директорию если не существует (для Render Disk)
const dbDir = path.dirname(DB_PATH);
if (!require('fs').existsSync(dbDir)) require('fs').mkdirSync(dbDir, { recursive: true });
if (!require('fs').existsSync(path.join(__dirname,'data')))
  require('fs').mkdirSync(path.join(__dirname,'data'),{recursive:true});
const db = new DatabaseSync(DB_PATH);

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });
const PORT   = process.env.PORT || 3001;

// SCHEMA
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,firstName TEXT NOT NULL,lastName TEXT DEFAULT '',username TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,avatarColor INTEGER DEFAULT 0,bio TEXT DEFAULT '',website TEXT DEFAULT '',phone TEXT DEFAULT '',city TEXT DEFAULT '',birthday TEXT DEFAULT '',interests TEXT DEFAULT '',isAdmin INTEGER DEFAULT 0,isVerified INTEGER DEFAULT 0,isModerator INTEGER DEFAULT 0,isBanned INTEGER DEFAULT 0,createdAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,userId TEXT NOT NULL,createdAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY,authorId TEXT NOT NULL,text TEXT DEFAULT '',images TEXT DEFAULT '[]',edited INTEGER DEFAULT 0,reposts INTEGER DEFAULT 0,createdAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS post_likes (postId TEXT NOT NULL,userId TEXT NOT NULL,PRIMARY KEY(postId,userId));
  CREATE TABLE IF NOT EXISTS bookmarks (userId TEXT NOT NULL,postId TEXT NOT NULL,PRIMARY KEY(userId,postId));
  CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY,postId TEXT NOT NULL,authorId TEXT NOT NULL,text TEXT NOT NULL,parentId TEXT,createdAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY,authorId TEXT NOT NULL,slides TEXT DEFAULT '[]',createdAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS story_views (storyId TEXT NOT NULL,userId TEXT NOT NULL,PRIMARY KEY(storyId,userId));
  CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,fromId TEXT NOT NULL,toId TEXT NOT NULL,text TEXT,images TEXT DEFAULT '[]',voiceData TEXT,voiceDur REAL DEFAULT 0,encryptedText TEXT,iv TEXT,senderPublicKey TEXT,read INTEGER DEFAULT 0,createdAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS follows (followerId TEXT NOT NULL,followingId TEXT NOT NULL,PRIMARY KEY(followerId,followingId));
  CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(authorId);
  CREATE INDEX IF NOT EXISTS idx_msg_from ON messages(fromId);
  CREATE INDEX IF NOT EXISTS idx_msg_to ON messages(toId);
`);

// Миграции для уже существующих БД (добавление новых столбцов безопасно игнорируется, если они уже есть)
try{db.exec(`ALTER TABLE users ADD COLUMN isModerator INTEGER DEFAULT 0`)}catch{}
try{db.exec(`ALTER TABLE users ADD COLUMN isBanned INTEGER DEFAULT 0`)}catch{}
try{db.exec(`ALTER TABLE users ADD COLUMN banReason TEXT DEFAULT ''`)}catch{}
try{db.exec(`ALTER TABLE users ADD COLUMN avatarUrl TEXT DEFAULT NULL`)}catch{}
try{db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT NULL`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN pinnedBy TEXT DEFAULT NULL`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS post_reactions(postId TEXT,userId TEXT,emoji TEXT,createdAt TEXT,PRIMARY KEY(postId,userId))`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN isHidden INTEGER DEFAULT 0`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN poll TEXT DEFAULT NULL`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN quoteId TEXT DEFAULT NULL`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN threadId TEXT DEFAULT NULL`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN threadOrder INTEGER DEFAULT 0`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN subscribersOnly INTEGER DEFAULT 0`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN collabInvite TEXT DEFAULT NULL`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN collabAccepted INTEGER DEFAULT 0`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS story_chains(id TEXT PRIMARY KEY,starterId TEXT,slides TEXT DEFAULT '[]',participants TEXT DEFAULT '[]',createdAt TEXT)`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN track TEXT DEFAULT NULL`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN scheduledAt TEXT DEFAULT NULL`)}catch{}
try{db.exec(`ALTER TABLE messages ADD COLUMN ttl INTEGER DEFAULT 0`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS message_reactions(msgId TEXT,userId TEXT,emoji TEXT,createdAt TEXT,PRIMARY KEY(msgId,userId))`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS blocked_users(blockerId TEXT,blockedId TEXT,createdAt TEXT,PRIMARY KEY(blockerId,blockedId))`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS poll_votes(postId TEXT,userId TEXT,optionIndex INTEGER,createdAt TEXT,PRIMARY KEY(postId,userId))`)}catch{}
try{db.exec(`ALTER TABLE posts ADD COLUMN track TEXT DEFAULT NULL`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS admin_logs (id TEXT PRIMARY KEY,adminId TEXT NOT NULL,action TEXT NOT NULL,targetId TEXT,targetType TEXT,detail TEXT DEFAULT '',createdAt TEXT NOT NULL)`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY,name TEXT NOT NULL,avatar INTEGER DEFAULT 0,description TEXT DEFAULT '',ownerId TEXT NOT NULL,createdAt TEXT NOT NULL)`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS group_members (groupId TEXT NOT NULL,userId TEXT NOT NULL,role TEXT DEFAULT 'member',joinedAt TEXT NOT NULL,PRIMARY KEY(groupId,userId))`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS group_messages (id TEXT PRIMARY KEY,groupId TEXT NOT NULL,fromId TEXT NOT NULL,text TEXT,images TEXT DEFAULT '[]',voiceData TEXT,voiceDur REAL DEFAULT 0,createdAt TEXT NOT NULL)`)}catch{}
try{db.exec(`CREATE TABLE IF NOT EXISTS pinned_messages (chatKey TEXT NOT NULL,messageId TEXT NOT NULL,pinnedBy TEXT NOT NULL,pinnedAt TEXT NOT NULL,PRIMARY KEY(chatKey))`)}catch{}
try{db.exec(`ALTER TABLE messages ADD COLUMN deleted INTEGER DEFAULT 0`)}catch{}
try{db.exec(`ALTER TABLE messages ADD COLUMN edited INTEGER DEFAULT 0`)}catch{}
try{db.exec(`ALTER TABLE messages ADD COLUMN replyToId TEXT DEFAULT NULL`)}catch{}

const S = {
  insUser:   db.prepare(`INSERT INTO users(id,firstName,lastName,username,email,password,avatarColor,bio,website,isAdmin,createdAt)VALUES(?,?,?,?,?,?,?,?,?,?,?)`),
  getById:   db.prepare(`SELECT * FROM users WHERE id=?`),
  getByIdent:db.prepare(`SELECT * FROM users WHERE email=? OR username=?`),
  updProf:   db.prepare(`UPDATE users SET firstName=?,lastName=?,bio=?,website=?,avatarColor=?,phone=?,city=?,birthday=?,interests=?,avatarUrl=?,status=? WHERE id=?`),
  updUser:   db.prepare(`UPDATE users SET username=? WHERE id=?`),
  chkEmail:  db.prepare(`SELECT id FROM users WHERE email=?`),
  chkUser:   db.prepare(`SELECT id FROM users WHERE username=?`),
  updPwd:    db.prepare(`UPDATE users SET password=? WHERE id=?`),
  insSess:   db.prepare(`INSERT INTO sessions(token,userId,createdAt)VALUES(?,?,?)`),
  getSess:   db.prepare(`SELECT userId FROM sessions WHERE token=?`),
  delSess:   db.prepare(`DELETE FROM sessions WHERE token=?`),
  insPost:   db.prepare(`INSERT INTO posts(id,authorId,text,images,poll,quoteId,track,scheduledAt,threadId,threadOrder,subscribersOnly,createdAt)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`),
  getPost:   db.prepare(`SELECT * FROM posts WHERE id=?`),
  delPost:   db.prepare(`DELETE FROM posts WHERE id=?`),
  updPost:   db.prepare(`UPDATE posts SET text=?,edited=1 WHERE id=?`),
  cntLikes:  db.prepare(`SELECT COUNT(*) as n FROM post_likes WHERE postId=?`),
  hasLike:   db.prepare(`SELECT 1 FROM post_likes WHERE postId=? AND userId=?`),
  addLike:   db.prepare(`INSERT OR IGNORE INTO post_likes(postId,userId)VALUES(?,?)`),
  rmLike:    db.prepare(`DELETE FROM post_likes WHERE postId=? AND userId=?`),
  hasBkm:    db.prepare(`SELECT 1 FROM bookmarks WHERE userId=? AND postId=?`),
  addBkm:    db.prepare(`INSERT OR IGNORE INTO bookmarks(userId,postId)VALUES(?,?)`),
  rmBkm:     db.prepare(`DELETE FROM bookmarks WHERE userId=? AND postId=?`),
  insComment:db.prepare(`INSERT INTO comments(id,postId,authorId,text,parentId,createdAt)VALUES(?,?,?,?,?,?)`),
  getComment:db.prepare(`SELECT * FROM comments WHERE id=?`),
  delComment:db.prepare(`DELETE FROM comments WHERE id=? OR parentId=?`),
  insStory:  db.prepare(`INSERT INTO stories(id,authorId,slides,createdAt)VALUES(?,?,?,?)`),
  addSView:  db.prepare(`INSERT OR IGNORE INTO story_views(storyId,userId)VALUES(?,?)`),
  cntSViews: db.prepare(`SELECT COUNT(*) as n FROM story_views WHERE storyId=?`),
  hasSView:  db.prepare(`SELECT 1 FROM story_views WHERE storyId=? AND userId=?`),
  insMsg:    db.prepare(`INSERT INTO messages(id,fromId,toId,text,images,voiceData,voiceDur,encryptedText,iv,senderPublicKey,ttl,createdAt)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`),
  markRead:  db.prepare(`UPDATE messages SET read=1 WHERE fromId=? AND toId=? AND read=0`),
  addFollow: db.prepare(`INSERT OR IGNORE INTO follows(followerId,followingId)VALUES(?,?)`),
  rmFollow:  db.prepare(`DELETE FROM follows WHERE followerId=? AND followingId=?`),
  hasFollow: db.prepare(`SELECT 1 FROM follows WHERE followerId=? AND followingId=?`),
  cntFolrs:  db.prepare(`SELECT COUNT(*) as n FROM follows WHERE followingId=?`),
  cntFolng:  db.prepare(`SELECT COUNT(*) as n FROM follows WHERE followerId=?`),
  listUsers: db.prepare(`SELECT id,firstName,lastName,username,email,avatarColor,isAdmin,isVerified,isModerator,isBanned,createdAt FROM users ORDER BY createdAt DESC`),
  setModerator: db.prepare(`UPDATE users SET isModerator=? WHERE id=?`),
  setVerified: db.prepare(`UPDATE users SET isVerified=? WHERE id=?`),
  setBanReason:db.prepare(`UPDATE users SET banReason=? WHERE id=?`),
  setHidden:   db.prepare(`UPDATE posts SET isHidden=? WHERE id=?`),
  insLog:      db.prepare(`INSERT INTO admin_logs(id,adminId,action,targetId,targetType,detail,createdAt)VALUES(?,?,?,?,?,?,?)`),
  setBan: db.prepare(`UPDATE users SET isBanned=? WHERE id=?`),
};

const safeJ = (s,d=[])=>{try{return JSON.parse(s||'')}catch{return d}};
function pub(u){
  if(!u)return null;
  const{password,...r}=u;
  return{
    ...r,
    isAdmin:!!u.isAdmin,
    isVerified:!!u.isVerified,
    isModerator:!!u.isModerator,
    isBanned:!!u.isBanned
  }
}
function enrichPost(r,vid){
  const a=S.getById.get(r.authorId);
  return{...r,images:safeJ(r.images),track:r.track?safeJ(r.track):null,
    likes:S.cntLikes.get(r.id).n,
    liked:vid?!!S.hasLike.get(r.id,vid):false,
    bookmarked:vid?!!S.hasBkm.get(vid,r.id):false,
    comments:db.prepare(`SELECT COUNT(*) as n FROM comments WHERE postId=?`).get(r.id).n,
    author:a?{id:a.id,firstName:a.firstName,lastName:a.lastName,username:a.username,avatarColor:a.avatarColor,avatarUrl:a.avatarUrl||null,isVerified:!!a.isVerified,status:a.status||null}:null,pinned:!!r.pinnedBy
  }
}

async function seed(){
  if(db.prepare(`SELECT COUNT(*) as n FROM users`).get().n>0){console.log('✅ БД инициализирована');return;}
  console.log('⏳ Создаём аккаунт администратора...');
  const apw=await bcrypt.hash('admin2024',10);
  const now=new Date().toISOString();
  S.insUser.run('user-admin','Гаджи','','daneda','gadji4913@gmail.com',apw,0,'Администратор Weave 👑','',1,now);
  db.prepare(`UPDATE users SET isVerified=1,isAdmin=1 WHERE id='user-admin'`).run();
  console.log('✅ Готово');
  console.log('   👑 Admin: gadji4913@gmail.com / admin2024 (@daneda)');
}

// MIDDLEWARE
app.use(cors({
  origin: (origin, cb) => {
    // В продакшене — разрешаем свой домен и всё что в ALLOWED_ORIGINS
    if (!origin) return cb(null, true); // curl/postman/mobile
    if (process.env.NODE_ENV !== 'production') return cb(null, true); // локально всё
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
    if (!allowed.length || allowed.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error('CORS: не разрешён ' + origin));
  },
  credentials: true
}));
// Health check для Railway/Render
app.get('/api/health',(req,res)=>res.json({
  status:'ok',
  uptime:process.uptime(),
  time:new Date().toISOString(),
  dbPath:DB_PATH,
  persistent:DB_PATH.startsWith('/data')
}));

// Service Worker — нужен заголовок scope
app.get('/sw.js', (req,res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname,'..','frontend','sw.js'));
});
app.use(express.static(path.join(__dirname,'..','frontend')));
app.use(express.json({limit:'20mb'}));
app.use(express.urlencoded({extended:true}));
app.use((req,_,next)=>{console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.url}`);next()});
app.use('/api/',rateLimit({windowMs:15*60*1000,max:500,standardHeaders:true,legacyHeaders:false}));

function auth(req,res,next){
  const tok=req.headers.authorization?.split(' ')[1];
  if(!tok)return res.status(401).json({error:'Требуется авторизация'});
  const row=S.getSess.get(tok);
  if(!row)return res.status(401).json({error:'Недействительный токен'});
  const u=S.getById.get(row.userId);
  if(!u)return res.status(401).json({error:'Пользователь не найден'});
  if(u.isBanned)return res.status(403).json({error:'Аккаунт заблокирован'});
  req.userId=row.userId;
  req.user=u;
  next();
}

function requireAdmin(req,res,next){
  if(!req.user?.isAdmin)return res.status(403).json({error:'Доступ только для администратора'});
  next();
}

function requireAdminOrModerator(req,res,next){
  if(!(req.user?.isAdmin||req.user?.isModerator))return res.status(403).json({error:'Недостаточно прав'});
  next();
}

// AUTH
app.post('/api/auth/register',async(req,res)=>{
  try{
    const{firstName,lastName,username,email,password}=req.body;
    if(!firstName||!username||!email||!password)return res.status(400).json({error:'Заполните все поля'});
    if(S.chkEmail.get(email))return res.status(400).json({error:'Email уже занят'});
    if(S.chkUser.get(username))return res.status(400).json({error:'Ник уже занят'});
    const id=uuid();
    S.insUser.run(id,firstName,lastName||'',username,email,await bcrypt.hash(password,10),Math.floor(Math.random()*6),'','',0,new Date().toISOString());
    const tok=uuid();S.insSess.run(tok,id,new Date().toISOString());
    res.status(201).json({user:pub(S.getById.get(id)),token:tok});
  }catch(e){console.error(e);res.status(500).json({error:'Ошибка регистрации'})}
});
app.post('/api/auth/login',async(req,res)=>{
  const{identifier,password}=req.body;
  const u=S.getByIdent.get(identifier,identifier);
  if(!u)return res.status(401).json({error:'Пользователь не найден'});
  if(u.isBanned)return res.status(403).json({error:'Аккаунт заблокирован'});
  if(!await bcrypt.compare(password,u.password))return res.status(401).json({error:'Неверный пароль'});
  const tok=uuid();S.insSess.run(tok,u.id,new Date().toISOString());
  res.json({user:pub(u),token:tok});
});
// PASSWORD RESET (без email: токен генерируется, выдаётся через admin)
const resetTokens=new Map(); // token -> {userId, expires}
app.post('/api/auth/forgot-password',(req,res)=>{
  const{identifier}=req.body;
  if(!identifier)return res.status(400).json({error:'Введите email или никнейм'});
  const u=S.getByIdent.get(identifier,identifier);
  if(!u)return res.status(404).json({error:'Пользователь не найден'});
  const token=Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
  resetTokens.set(token,{userId:u.id,expires:Date.now()+3600000});
  console.log(`🔑 Сброс пароля для @${u.username}: токен=${token}`);
  // В продакшене здесь отправляется email
  res.json({success:true,message:'Инструкция отправлена администратору'});
});
app.post('/api/auth/reset-password',(req,res)=>{
  const{token,newPassword}=req.body;
  const entry=resetTokens.get(token);
  if(!entry||Date.now()>entry.expires){resetTokens.delete(token);return res.status(400).json({error:'Токен недействителен или истёк'});}
  if(!newPassword||newPassword.length<8)return res.status(400).json({error:'Пароль минимум 8 символов'});
  bcrypt.hash(newPassword,10).then(hash=>{
    S.updPwd.run(hash,entry.userId);
    db.prepare(`DELETE FROM sessions WHERE userId=?`).run(entry.userId);
    resetTokens.delete(token);
    res.json({success:true});
  });
});
// Admin: список токенов сброса
app.get('/api/admin/reset-tokens',auth,requireAdmin,(req,res)=>{
  const list=[...resetTokens.entries()].map(([tok,v])=>{
    const u=S.getById.get(v.userId);
    return{token:tok,username:u?.username,expires:new Date(v.expires).toISOString()};
  });
  res.json(list);
});

app.post('/api/auth/logout',auth,(req,res)=>{S.delSess.run(req.headers.authorization?.split(' ')[1]);res.json({success:true})});
app.post('/api/auth/change-password',auth,async(req,res)=>{
  const{currentPassword,newPassword}=req.body;
  const u=S.getById.get(req.userId);
  if(!await bcrypt.compare(currentPassword,u.password))return res.status(400).json({error:'Неверный пароль'});
  S.updPwd.run(await bcrypt.hash(newPassword,10),req.userId);
  res.json({success:true});
});

// POSTS
app.get('/api/posts',(req,res)=>{
  const{tab='all',userId,limit=20,offset=0}=req.query;
  const lim=Math.min(Number(limit)||20,50),off=Number(offset)||0;
  let rows,total=0;
  if(tab==='following'&&userId){
    // Показываем subscribersOnly только подписчикам
rows=db.prepare(`SELECT * FROM posts WHERE isHidden=0 AND authorId IN(SELECT followingId FROM follows WHERE followerId=?) AND (subscribersOnly=0 OR authorId IN(SELECT followingId FROM follows WHERE followerId=?)) ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(userId,userId,lim,off);
    total=db.prepare(`SELECT COUNT(*) as n FROM posts WHERE isHidden=0 AND authorId IN(SELECT followingId FROM follows WHERE followerId=?)`).get(userId).n;
  } else if(tab==='profile'&&userId){
    rows=db.prepare(`SELECT * FROM posts WHERE authorId=? ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(userId,lim,off);
    total=db.prepare(`SELECT COUNT(*) as n FROM posts WHERE authorId=?`).get(userId).n;
  } else if(tab==='bookmarks'&&userId){
    rows=db.prepare(`SELECT p.* FROM posts p JOIN bookmarks b ON b.postId=p.id WHERE b.userId=? ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`).all(userId,lim,off);
    total=db.prepare(`SELECT COUNT(*) as n FROM bookmarks WHERE userId=?`).get(userId).n;
  } else if(tab==='trending'){
    rows=db.prepare(`SELECT p.* FROM posts p LEFT JOIN post_likes l ON l.postId=p.id WHERE p.isHidden=0 GROUP BY p.id ORDER BY COUNT(l.userId) DESC,p.createdAt DESC LIMIT ? OFFSET ?`).all(lim,off);
    total=db.prepare(`SELECT COUNT(*) as n FROM posts WHERE isHidden=0`).get().n;
  } else if(tab==='for_you'&&userId){
    // ── Алгоритмическая лента ──
    const u=db.prepare('SELECT * FROM users WHERE id=?').get(userId);
    const userInterests=(u?.interests||'').toLowerCase().split(/[,\s]+/).filter(Boolean);
    const following=new Set(db.prepare('SELECT followingId FROM follows WHERE followerId=?').all(userId).map(r=>r.followingId));
    const likedPosts=new Set(db.prepare('SELECT postId FROM post_likes WHERE userId=?').all(userId).map(r=>r.postId));
    // Берём 200 последних постов (не своих, не скрытых)
    const candidates=db.prepare('SELECT p.*,u.isVerified,u.interests as authorInterests FROM posts p JOIN users u ON u.id=p.authorId WHERE p.isHidden=0 AND p.authorId!=? ORDER BY p.createdAt DESC LIMIT 200').all(userId);
    const now=Date.now();
    const scored=candidates.map(p=>{
      let score=0;
      // Свежесть — убывает со временем
      const ageH=(now-new Date(p.createdAt).getTime())/3600000;
      score-=Math.min(ageH*0.5,48); // макс -48 за 4 дня
      // Подписка на автора
      if(following.has(p.authorId)) score+=15;
      // Лайки
      const likes=db.prepare('SELECT COUNT(*) as n FROM post_likes WHERE postId=?').get(p.id).n;
      score+=Math.min(likes*3,45);
      // Комментарии
      const cmts=db.prepare('SELECT COUNT(*) as n FROM comments WHERE postId=?').get(p.id).n;
      score+=Math.min(cmts*2,30);
      // Верифицированный автор
      if(p.isVerified) score+=10;
      // Закреплённый
      if(p.pinnedBy) score+=5;
      // Совпадение интересов по хэштегам
      if(userInterests.length&&p.text){
        const tags=(p.text.match(/#(\w+)/g)||[]).map(t=>t.slice(1).toLowerCase());
        const matches=tags.filter(t=>userInterests.some(i=>t.includes(i)||i.includes(t)));
        score+=matches.length*12;
      }
      // Уже лайкнул — понизить (уже видел)
      if(likedPosts.has(p.id)) score-=20;
      return{...p,_score:score};
    });
    scored.sort((a,b)=>b._score-a._score);
    total=scored.length;
    rows=scored.slice(off,off+lim);
  } else {
    rows=db.prepare(`SELECT * FROM posts WHERE isHidden=0 ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(lim,off);
    total=db.prepare(`SELECT COUNT(*) as n FROM posts WHERE isHidden=0`).get().n;
  }
  res.json({posts:rows.map(r=>enrichPost(r,userId)),total,hasMore:off+lim<total});
});
app.post('/api/posts',auth,(req,res)=>{
  const id=uuid();S.insPost.run(id,req.userId,req.body.text||'',JSON.stringify(req.body.images||[]),new Date().toISOString());
  res.status(201).json(enrichPost(S.getPost.get(id),req.userId));
});
app.put('/api/posts/:id',auth,(req,res)=>{
  const p=S.getPost.get(req.params.id);
  if(!p)return res.status(404).json({error:'Не найден'});
  if(p.authorId!==req.userId)return res.status(403).json({error:'Нет прав'});
  S.updPost.run(req.body.text,req.params.id);res.json(enrichPost(S.getPost.get(req.params.id),req.userId));
});
app.delete('/api/posts/:id',auth,(req,res)=>{
  const p=S.getPost.get(req.params.id);
  if(!p)return res.status(404).json({error:'Не найден'});
  if(p.authorId!==req.userId && !(req.user?.isAdmin||req.user?.isModerator))return res.status(403).json({error:'Нет прав'});
  S.delPost.run(req.params.id);res.json({success:true});
});
app.post('/api/posts/:id/like',auth,(req,res)=>{
  const{id}=req.params;
  if(S.hasLike.get(id,req.userId)){S.rmLike.run(id,req.userId);res.json({liked:false,likes:S.cntLikes.get(id).n})}
  else{S.addLike.run(id,req.userId);res.json({liked:true,likes:S.cntLikes.get(id).n})}
});
// Реакции на посты
app.get('/api/posts/:id/reactions',(req,res)=>{
  const rows=db.prepare(`SELECT emoji,COUNT(*) as n FROM post_reactions WHERE postId=? GROUP BY emoji`).all(req.params.id);
  const myEmoji=req.userId?db.prepare(`SELECT emoji FROM post_reactions WHERE postId=? AND userId=?`).get(req.params.id,req.userId)?.emoji:null;
  res.json({reactions:rows,myEmoji});
});
app.post('/api/posts/:id/react',auth,(req,res)=>{
  const{emoji}=req.body;
  const valid=['❤️','😂','🔥','👏','😮','😢'];
  if(!valid.includes(emoji))return res.status(400).json({error:'Недопустимая реакция'});
  const existing=db.prepare(`SELECT emoji FROM post_reactions WHERE postId=? AND userId=?`).get(req.params.id,req.userId);
  if(existing?.emoji===emoji){
    db.prepare(`DELETE FROM post_reactions WHERE postId=? AND userId=?`).run(req.params.id,req.userId);
  } else {
    db.prepare(`INSERT OR REPLACE INTO post_reactions(postId,userId,emoji,createdAt)VALUES(?,?,?,?)`).run(req.params.id,req.userId,emoji,new Date().toISOString());
  }
  const rows=db.prepare(`SELECT emoji,COUNT(*) as n FROM post_reactions WHERE postId=? GROUP BY emoji`).all(req.params.id);
  res.json({reactions:rows,myEmoji:existing?.emoji===emoji?null:emoji});
});

// Закреп поста
app.post('/api/posts/:id/pin',auth,(req,res)=>{
  const post=S.getPost.get(req.params.id);
  if(!post)return res.status(404).json({error:'Пост не найден'});
  if(post.authorId!==req.userId&&!req.user?.isAdmin)return res.status(403).json({error:'Нет прав'});
  const isPinned=!!post.pinnedBy;
  db.prepare(`UPDATE posts SET pinnedBy=? WHERE id=?`).run(isPinned?null:req.userId,req.params.id);
  res.json({pinned:!isPinned});
});

app.post('/api/posts/:id/bookmark',auth,(req,res)=>{
  const{id}=req.params;
  if(S.hasBkm.get(req.userId,id)){S.rmBkm.run(req.userId,id);res.json({bookmarked:false})}
  else{S.addBkm.run(req.userId,id);res.json({bookmarked:true})}
});

// COMMENTS
app.get('/api/posts/:postId/comments',(req,res)=>{
  const rows=db.prepare(`SELECT c.*,u.firstName,u.lastName,u.username,u.avatarColor FROM comments c JOIN users u ON u.id=c.authorId WHERE c.postId=? ORDER BY c.createdAt DESC`).all(req.params.postId);
  res.json(rows.map(r=>({id:r.id,postId:r.postId,text:r.text,parentId:r.parentId,createdAt:r.createdAt,author:{id:r.authorId,firstName:r.firstName,lastName:r.lastName,username:r.username,avatarColor:r.avatarColor}})));
});
app.post('/api/comments',auth,(req,res)=>{
  const{postId,text,parentId}=req.body;const id=uuid();
  S.insComment.run(id,postId,req.userId,text,parentId||null,new Date().toISOString());
  const a=S.getById.get(req.userId);
  res.status(201).json({id,postId,text,parentId,createdAt:new Date().toISOString(),author:{id:a.id,firstName:a.firstName,lastName:a.lastName,username:a.username,avatarColor:a.avatarColor}});
});
app.delete('/api/comments/:id',auth,(req,res)=>{
  const c=S.getComment.get(req.params.id);
  if(!c)return res.status(404).json({error:'Не найден'});
  if(c.authorId!==req.userId && !(req.user?.isAdmin||req.user?.isModerator))return res.status(403).json({error:'Нет прав'});
  S.delComment.run(req.params.id,req.params.id);res.json({success:true});
});

// STORIES
app.get('/api/stories',(req,res)=>{
  const since=new Date(Date.now()-24*3600*1000).toISOString();
  const rows=db.prepare(`SELECT * FROM stories WHERE createdAt>? ORDER BY createdAt DESC`).all(since);
  const uid=req.query.userId;
  res.json(rows.map(r=>{const a=S.getById.get(r.authorId);return{...r,slides:safeJ(r.slides),views:S.cntSViews.get(r.id).n,viewed:uid?!!S.hasSView.get(r.id,uid):false,author:a?{id:a.id,firstName:a.firstName,lastName:a.lastName,username:a.username,avatarColor:a.avatarColor}:null}}));
});
app.post('/api/stories',auth,(req,res)=>{
  const id=uuid();const slides=(req.body.slides||[]).map(s=>({...s,id:uuid()}));
  S.insStory.run(id,req.userId,JSON.stringify(slides),new Date().toISOString());
  res.status(201).json({id,authorId:req.userId,slides,createdAt:new Date().toISOString()});
});
app.post('/api/stories/:id/view',auth,(req,res)=>{S.addSView.run(req.params.id,req.userId);res.json({success:true})});

// MESSAGES
app.get('/api/chats',auth,(req,res)=>{
  const uid=req.userId;
  const partners=db.prepare(`SELECT DISTINCT CASE WHEN fromId=? THEN toId ELSE fromId END as pid FROM messages WHERE fromId=? OR toId=?`).all(uid,uid,uid).map(r=>r.pid);
  const chats=partners.map(pid=>{
    const u=S.getById.get(pid);
    const last=db.prepare(`SELECT * FROM messages WHERE((fromId=? AND toId=?)OR(fromId=? AND toId=?))ORDER BY createdAt DESC LIMIT 1`).get(uid,pid,pid,uid);
    const unread=db.prepare(`SELECT COUNT(*) as n FROM messages WHERE fromId=? AND toId=? AND read=0`).get(pid,uid).n;
    return{id:pid,firstName:u?.firstName,lastName:u?.lastName,username:u?.username,avatarColor:u?.avatarColor,isVerified:!!u?.isVerified,lastMessage:last?{...last,images:safeJ(last.images)}:null,unreadCount:unread};
  }).sort((a,b)=>new Date(b.lastMessage?.createdAt||0)-new Date(a.lastMessage?.createdAt||0));
  res.json(chats);
});
app.get('/api/messages/:userId',auth,(req,res)=>{
  const uid=req.userId,oid=req.params.userId;
  const rows=db.prepare(`SELECT * FROM messages WHERE(fromId=? AND toId=?)OR(fromId=? AND toId=?)ORDER BY createdAt ASC`).all(uid,oid,oid,uid);
  S.markRead.run(oid,uid);
  res.json(rows.map(r=>({...r,images:safeJ(r.images),track:r.track?safeJ(r.track):null,read:!!r.read})));
});
app.post('/api/messages',auth,(req,res)=>{
  const{toId,text,images=[],encryptedText,iv,senderPublicKey,voiceData,voiceDur}=req.body;
  const id=uuid();
  S.insMsg.run(id,req.userId,toId,text||null,JSON.stringify(images),voiceData||null,voiceDur||0,encryptedText||null,iv||null,senderPublicKey||null,new Date().toISOString());
  const msg=db.prepare(`SELECT * FROM messages WHERE id=?`).get(id);
  res.status(201).json({...msg,images:safeJ(msg.images),read:!!msg.read});
});

// USERS
app.get('/api/users/me',auth,(req,res)=>{
  const u=S.getById.get(req.userId);if(!u)return res.status(404).json({error:'Не найден'});
  res.json({...pub(u),stats:{posts:db.prepare(`SELECT COUNT(*) as n FROM posts WHERE authorId=?`).get(u.id).n,followers:S.cntFolrs.get(u.id).n,following:S.cntFolng.get(u.id).n}});
});
app.put('/api/users/profile',auth,(req,res)=>{
  const u=S.getById.get(req.userId);if(!u)return res.status(404).json({error:'Не найден'});
  const{firstName=u.firstName,lastName=u.lastName,bio=u.bio,website=u.website,avatarColor=u.avatarColor,phone=u.phone||'',city=u.city||'',birthday=u.birthday||'',interests=u.interests||'',avatarUrl:rawAvatarUrl=u.avatarUrl||null,status=u.status||null}=req.body;
  // Валидация: только data: URL или null
  const avatarUrl=rawAvatarUrl===null?null:(typeof rawAvatarUrl==='string'&&rawAvatarUrl.startsWith('data:image/'))?rawAvatarUrl:u.avatarUrl||null;
  if(req.body.username&&req.body.username!==u.username){
    if(S.chkUser.get(req.body.username))return res.status(400).json({error:'Ник занят'});
    S.updUser.run(req.body.username,req.userId);
  }
  S.updProf.run(firstName,lastName,bio,website,avatarColor,phone,city,birthday,interests,avatarUrl,status,req.userId);
  res.json(pub(S.getById.get(req.userId)));
});
app.delete('/api/users/me',auth,(req,res)=>{
  // Delete all user data
  db.prepare(`DELETE FROM posts WHERE authorId=?`).run(req.userId);
  db.prepare(`DELETE FROM messages WHERE fromId=? OR toId=?`).run(req.userId,req.userId);
  db.prepare(`DELETE FROM comments WHERE authorId=?`).run(req.userId);
  db.prepare(`DELETE FROM follows WHERE followerId=? OR followingId=?`).run(req.userId,req.userId);
  db.prepare(`DELETE FROM bookmarks WHERE userId=?`).run(req.userId);
  db.prepare(`DELETE FROM sessions WHERE userId=?`).run(req.userId);
  db.prepare(`DELETE FROM users WHERE id=?`).run(req.userId);
  res.json({success:true});
});
app.get('/api/users/:identifier',(req,res)=>{
  const{identifier}=req.params;
  const u=db.prepare(`SELECT * FROM users WHERE id=? OR username=?`).get(identifier,identifier);
  if(!u)return res.status(404).json({error:'Не найден'});
  // Получаем viewerId из токена или query параметра
  const tok=req.headers.authorization?.split(' ')[1];
  const sess=tok?S.getSess.get(tok):null;
  const viewerId=sess?.userId||req.query.viewerId||null;
  const isFollowing=viewerId?!!S.hasFollow.get(viewerId,u.id):false;
  res.json({...pub(u),isFollowing,stats:{posts:db.prepare(`SELECT COUNT(*) as n FROM posts WHERE authorId=?`).get(u.id).n,followers:S.cntFolrs.get(u.id).n,following:S.cntFolng.get(u.id).n}});
});
// Авто-верификация: при 100+ подписчиках
function checkAutoVerify(userId){
  try{
    const followers=db.prepare('SELECT COUNT(*) as n FROM follows WHERE followingId=?').get(userId);
    if(followers.n>=100){
      db.prepare('UPDATE users SET isVerified=1 WHERE id=? AND isVerified=0').run(userId);
    }
  }catch(e){}
}

app.post('/api/users/:userId/follow',auth,(req,res)=>{
  const tgt=req.params.userId;
  if(S.hasFollow.get(req.userId,tgt)){S.rmFollow.run(req.userId,tgt);res.json({following:false})}
  else{S.addFollow.run(req.userId,tgt);res.json({following:true})}
});
app.get('/api/users/:userId/followers',(req,res)=>{
  res.json(db.prepare(`SELECT u.id,u.firstName,u.lastName,u.username,u.avatarColor,u.isVerified FROM users u JOIN follows f ON f.followerId=u.id WHERE f.followingId=?`).all(req.params.userId).map(r=>({...r,isVerified:!!r.isVerified})));
});
app.get('/api/users/:userId/following',(req,res)=>{
  res.json(db.prepare(`SELECT u.id,u.firstName,u.lastName,u.username,u.avatarColor,u.isVerified FROM users u JOIN follows f ON f.followingId=u.id WHERE f.followerId=?`).all(req.params.userId).map(r=>({...r,isVerified:!!r.isVerified})));
});

// USERS LIST (для explore - все пользователи)
app.get('/api/users',auth,(req,res)=>{
  const{q='',limit=20,offset=0}=req.query;
  const lk=`%${q}%`;
  const rows=db.prepare(`SELECT id,firstName,lastName,username,avatarColor,bio,isVerified FROM users WHERE id!=? AND (firstName LIKE? OR lastName LIKE? OR username LIKE?) ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(req.userId,lk,lk,lk,Number(limit)||20,Number(offset)||0);
  res.json(rows.map(r=>({...r,isVerified:!!r.isVerified})));
});

// ADMIN
app.get('/api/admin/users',auth,requireAdminOrModerator,(req,res)=>{
  const{q='',role='all',limit=50,offset=0}=req.query;
  let sql=`SELECT id,firstName,lastName,username,email,avatarColor,isAdmin,isVerified,isModerator,isBanned,createdAt FROM users WHERE 1=1`;
  const params=[];
  if(q){
    const lk=`%${q}%`;
    sql+=` AND (username LIKE ? OR email LIKE ? OR firstName LIKE ? OR lastName LIKE ?)`;
    params.push(lk,lk,lk,lk);
  }
  if(role==='admins')sql+=` AND isAdmin=1`;
  else if(role==='mods')sql+=` AND isModerator=1`;
  else if(role==='banned')sql+=` AND isBanned=1`;
  else if(role==='verified')sql+=` AND isVerified=1`;
  sql+=` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit)||50,Number(offset)||0);
  const rows=db.prepare(sql).all(...params);
  res.json(rows.map(u=>({...pub(u),banReason:u.banReason||'',posts:db.prepare(`SELECT COUNT(*) as n FROM posts WHERE authorId=?`).get(u.id).n})));
});

app.post('/api/admin/users/:userId/moderator',auth,requireAdmin,(req,res)=>{
  const targetId=req.params.userId;
  const{isModerator}=req.body||{};
  if(targetId===req.user.id)return res.status(400).json({error:'Нельзя менять свои права'});
  const target=S.getById.get(targetId);
  if(!target)return res.status(404).json({error:'Пользователь не найден'});
  S.setModerator.run(isModerator?1:0,targetId);
  res.json(pub(S.getById.get(targetId)));
});

app.post('/api/admin/users/:userId/ban',auth,requireAdminOrModerator,(req,res)=>{
  const targetId=req.params.userId;
  const{isBanned}=req.body||{};
  if(targetId===req.user.id)return res.status(400).json({error:'Нельзя банить себя'});
  const target=S.getById.get(targetId);
  if(!target)return res.status(404).json({error:'Пользователь не найден'});
  if(target.isAdmin&&!req.user.isAdmin)return res.status(403).json({error:'Нельзя управлять другим админом'});
  S.setBan.run(isBanned?1:0,targetId);
  if(isBanned)db.prepare(`DELETE FROM sessions WHERE userId=?`).run(targetId);
  res.json(pub(S.getById.get(targetId)));
});

app.get('/api/admin/posts',auth,requireAdminOrModerator,(req,res)=>{
  const{q='',authorId,limit=50,offset=0}=req.query;
  let sql=`SELECT * FROM posts WHERE 1=1`;
  const params=[];
  if(authorId){sql+=` AND authorId=?`;params.push(authorId);}
  if(q){
    const lk=`%${q}%`;
    sql+=` AND text LIKE ?`;
    params.push(lk);
  }
  sql+=` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit)||50,Number(offset)||0);
  const rows=db.prepare(sql).all(...params);
  res.json(rows.map(r=>enrichPost(r,null)));
});


// ADMIN HELPERS
function logAdmin(adminId, action, targetId, targetType, detail=''){
  try{S.insLog.run(require('crypto').randomUUID?require('crypto').randomUUID():uuid(),adminId,action,targetId||null,targetType||null,detail,new Date().toISOString());}catch(e){}
}

// ADMIN: STATS
app.get('/api/admin/stats',auth,requireAdminOrModerator,(req,res)=>{
  res.json({
    users:        db.prepare(`SELECT COUNT(*) as n FROM users`).get().n,
    posts:        db.prepare(`SELECT COUNT(*) as n FROM posts`).get().n,
    messages:     db.prepare(`SELECT COUNT(*) as n FROM messages`).get().n,
    comments:     db.prepare(`SELECT COUNT(*) as n FROM comments`).get().n,
    stories:      db.prepare(`SELECT COUNT(*) as n FROM stories`).get().n,
    bannedUsers:  db.prepare(`SELECT COUNT(*) as n FROM users WHERE isBanned=1`).get().n,
    hiddenPosts:  db.prepare(`SELECT COUNT(*) as n FROM posts WHERE isHidden=1`).get().n,
    mods:         db.prepare(`SELECT COUNT(*) as n FROM users WHERE isModerator=1`).get().n,
    newToday:     db.prepare(`SELECT COUNT(*) as n FROM users WHERE createdAt>?`).get(new Date(Date.now()-86400000).toISOString()).n,
    postsToday:   db.prepare(`SELECT COUNT(*) as n FROM posts WHERE createdAt>?`).get(new Date(Date.now()-86400000).toISOString()).n,
  });
});

// ADMIN: GET SINGLE USER
app.get('/api/admin/users/:userId',auth,requireAdminOrModerator,(req,res)=>{
  const u=S.getById.get(req.params.userId);
  if(!u)return res.status(404).json({error:'Не найден'});
  const posts=db.prepare(`SELECT * FROM posts WHERE authorId=? ORDER BY createdAt DESC LIMIT 6`).all(u.id);
  res.json({...pub(u),banReason:u.banReason||'',
    stats:{posts:db.prepare(`SELECT COUNT(*) as n FROM posts WHERE authorId=?`).get(u.id).n,followers:S.cntFolrs.get(u.id).n,following:S.cntFolng.get(u.id).n,messages:db.prepare(`SELECT COUNT(*) as n FROM messages WHERE fromId=?`).get(u.id).n},
    recentPosts:posts.map(p=>enrichPost(p,null))
  });
});

// ADMIN: VERIFY TOGGLE
app.post('/api/admin/users/:userId/verify',auth,requireAdmin,(req,res)=>{
  const u=S.getById.get(req.params.userId);if(!u)return res.status(404).json({error:'Не найден'});
  const val=u.isVerified?0:1;
  S.setVerified.run(val,req.params.userId);
  logAdmin(req.userId,val?'verify_user':'unverify_user',req.params.userId,'user');
  res.json({isVerified:!!val});
});

// ADMIN: BAN with reason (override existing route)
app.post('/api/admin/users/:userId/ban2',auth,requireAdminOrModerator,(req,res)=>{
  const targetId=req.params.userId;
  const{isBanned,banReason=''}=req.body||{};
  if(targetId===req.user.id)return res.status(400).json({error:'Нельзя банить себя'});
  const target=S.getById.get(targetId);
  if(!target)return res.status(404).json({error:'Пользователь не найден'});
  if(target.isAdmin&&!req.user.isAdmin)return res.status(403).json({error:'Нельзя управлять другим админом'});
  S.setBan.run(isBanned?1:0,targetId);
  if(banReason!==undefined)S.setBanReason.run(banReason,targetId);
  if(isBanned){db.prepare(`DELETE FROM sessions WHERE userId=?`).run(targetId);}
  logAdmin(req.userId,isBanned?'ban_user':'unban_user',targetId,'user',banReason);
  res.json(pub(S.getById.get(targetId)));
});

// ADMIN: DELETE USER
app.delete('/api/admin/users/:userId',auth,requireAdmin,(req,res)=>{
  const u=S.getById.get(req.params.userId);
  if(!u)return res.status(404).json({error:'Не найден'});
  if(u.isAdmin)return res.status(403).json({error:'Нельзя удалить администратора'});
  db.prepare(`DELETE FROM posts WHERE authorId=?`).run(req.params.userId);
  db.prepare(`DELETE FROM messages WHERE fromId=? OR toId=?`).run(req.params.userId,req.params.userId);
  db.prepare(`DELETE FROM comments WHERE authorId=?`).run(req.params.userId);
  db.prepare(`DELETE FROM follows WHERE followerId=? OR followingId=?`).run(req.params.userId,req.params.userId);
  db.prepare(`DELETE FROM sessions WHERE userId=?`).run(req.params.userId);
  db.prepare(`DELETE FROM users WHERE id=?`).run(req.params.userId);
  logAdmin(req.userId,'delete_user',req.params.userId,'user');
  res.json({success:true});
});

// ADMIN: HIDE/SHOW POST
app.post('/api/admin/posts/:id/hide',auth,requireAdminOrModerator,(req,res)=>{
  const p=S.getPost.get(req.params.id);if(!p)return res.status(404).json({error:'Не найден'});
  const val=p.isHidden?0:1;
  S.setHidden.run(val,req.params.id);
  logAdmin(req.userId,val?'hide_post':'unhide_post',req.params.id,'post');
  res.json({isHidden:!!val});
});

// ADMIN: DELETE POST (by admin)
app.delete('/api/admin/posts/:id',auth,requireAdminOrModerator,(req,res)=>{
  const p=S.getPost.get(req.params.id);if(!p)return res.status(404).json({error:'Не найден'});
  S.delPost.run(req.params.id);
  logAdmin(req.userId,'delete_post',req.params.id,'post');
  res.json({success:true});
});

// ADMIN: LOGS
app.get('/api/admin/logs',auth,requireAdminOrModerator,(req,res)=>{
  const{limit=30,offset=0}=req.query;
  const logs=db.prepare(`SELECT l.*,u.firstName,u.lastName,u.username FROM admin_logs l LEFT JOIN users u ON u.id=l.adminId ORDER BY l.createdAt DESC LIMIT ? OFFSET ?`).all(Number(limit),Number(offset));
  const total=db.prepare(`SELECT COUNT(*) as n FROM admin_logs`).get().n;
  res.json({logs,total});
});

// ADMIN: MODERATOR (log it)
// NOTIFICATIONS (упрощённые - на основе активности)
app.get('/api/notifications',auth,(req,res)=>{
  const uid=req.userId;
  const notifs=[];
  // Лайки на посты пользователя
  const myPosts=db.prepare(`SELECT id,text FROM posts WHERE authorId=? ORDER BY createdAt DESC LIMIT 20`).all(uid);
  for(const post of myPosts){
    const likes=db.prepare(`SELECT u.id,u.firstName,u.lastName,u.username,u.avatarColor,u.isVerified,pl.postId FROM post_likes pl JOIN users u ON u.id=pl.userId WHERE pl.postId=? AND pl.userId!=?`).all(post.id,uid);
    for(const l of likes) notifs.push({type:'like',actor:{id:l.id,firstName:l.firstName,lastName:l.lastName,username:l.username,avatarColor:l.avatarColor,isVerified:!!l.isVerified},postId:post.id,postText:post.text?.slice(0,60),createdAt:new Date().toISOString(),read:false,id:'l'+l.id+post.id});
    const comments=db.prepare(`SELECT c.*,u.id as uid,u.firstName,u.lastName,u.username,u.avatarColor,u.isVerified FROM comments c JOIN users u ON u.id=c.authorId WHERE c.postId=? AND c.authorId!=?`).all(post.id,uid);
    for(const cm of comments) notifs.push({type:'comment',actor:{id:cm.uid,firstName:cm.firstName,lastName:cm.lastName,username:cm.username,avatarColor:cm.avatarColor,isVerified:!!cm.isVerified},postId:post.id,postText:post.text?.slice(0,60),commentText:cm.text?.slice(0,80),createdAt:cm.createdAt,read:false,id:'c'+cm.id});
  }
  // Новые подписчики
  const followers=db.prepare(`SELECT u.id,u.firstName,u.lastName,u.username,u.avatarColor,u.isVerified FROM users u JOIN follows f ON f.followerId=u.id WHERE f.followingId=? AND u.id!=?`).all(uid,uid);
  for(const f of followers) notifs.push({type:'follow',actor:{id:f.id,firstName:f.firstName,lastName:f.lastName,username:f.username,avatarColor:f.avatarColor,isVerified:!!f.isVerified},createdAt:new Date().toISOString(),read:false,id:'f'+f.id});
  // Сортируем по времени
  notifs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  res.json(notifs.slice(0,50));
});

// ONLINE STATUS
app.get('/api/online',auth,(req,res)=>{
  const online=[...wsClients.keys()];
  res.json({online});
});
app.get('/api/online/:userId',auth,(req,res)=>{
  res.json({online:wsClients.has(req.params.userId)});
});

// TRENDS — реальные хэштеги из постов
app.get('/api/trends',(req,res)=>{
  const posts=db.prepare(`SELECT text FROM posts WHERE isHidden=0 ORDER BY createdAt DESC LIMIT 500`).all();
  const counts={};
  posts.forEach(p=>{
    const tags=p.text?.match(/#(\w+)/g)||[];
    tags.forEach(t=>{const k=t.toLowerCase();counts[k]=(counts[k]||0)+1;});
  });
  const trends=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([tag,count])=>({tag,count}));
  res.json(trends);
});

// NOTIFICATIONS mark all read
app.post('/api/notifications/read-all',auth,(req,res)=>{
  // Помечаем все лайки/комменты/подписки как «показанные»
  // Храним в отдельной таблице seen_notifications
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS seen_notifications(userId TEXT PRIMARY KEY, seenAt TEXT)`);
    db.prepare(`INSERT OR REPLACE INTO seen_notifications(userId,seenAt)VALUES(?,?)`).run(req.userId,new Date().toISOString());
    res.json({success:true});
  } catch(e){ res.json({success:true}); }
});

// ══ GROUPS ══
// Создать группу
app.post('/api/groups',auth,(req,res)=>{
  const{name,memberIds=[],description='',avatar=0}=req.body;
  if(!name)return res.status(400).json({error:'Нужно название'});
  const id=uuid(),now=new Date().toISOString();
  db.prepare(`INSERT INTO groups(id,name,avatar,description,ownerId,createdAt)VALUES(?,?,?,?,?,?)`).run(id,name,avatar,description,req.userId,now);
  db.prepare(`INSERT INTO group_members(groupId,userId,role,joinedAt)VALUES(?,?,?,?)`).run(id,req.userId,'owner',now);
  const all=[...new Set(memberIds)].filter(uid=>uid!==req.userId);
  all.forEach(uid=>db.prepare(`INSERT OR IGNORE INTO group_members(groupId,userId,role,joinedAt)VALUES(?,?,?,?)`).run(id,uid,'member',now));
  res.status(201).json({id,name,avatar,description,ownerId:req.userId,createdAt:now,memberCount:all.length+1});
});

// Список групп пользователя
app.get('/api/groups',auth,(req,res)=>{
  const rows=db.prepare(`SELECT g.*,COUNT(gm2.userId) as memberCount FROM groups g JOIN group_members gm ON gm.groupId=g.id AND gm.userId=? LEFT JOIN group_members gm2 ON gm2.groupId=g.id GROUP BY g.id ORDER BY g.createdAt DESC`).all(req.userId);
  res.json(rows);
});

// Участники группы
app.get('/api/groups/:id/members',auth,(req,res)=>{
  const rows=db.prepare(`SELECT u.id,u.firstName,u.lastName,u.username,u.avatarColor,u.avatarUrl,u.isVerified,gm.role FROM group_members gm JOIN users u ON u.id=gm.userId WHERE gm.groupId=?`).all(req.params.id);
  res.json(rows);
});

// Добавить участника
app.post('/api/groups/:id/members',auth,(req,res)=>{
  const{userId}=req.body;
  const owner=db.prepare(`SELECT ownerId FROM groups WHERE id=?`).get(req.params.id);
  if(!owner)return res.status(404).json({error:'Группа не найдена'});
  if(owner.ownerId!==req.userId)return res.status(403).json({error:'Нет прав'});
  db.prepare(`INSERT OR IGNORE INTO group_members(groupId,userId,role,joinedAt)VALUES(?,?,?,?)`).run(req.params.id,userId,'member',new Date().toISOString());
  res.json({success:true});
});

// Удалить участника / выйти
app.delete('/api/groups/:id/members/:userId',auth,(req,res)=>{
  const g=db.prepare(`SELECT ownerId FROM groups WHERE id=?`).get(req.params.id);
  if(!g)return res.status(404).json({error:'Не найдена'});
  if(req.params.userId!==req.userId && g.ownerId!==req.userId)return res.status(403).json({error:'Нет прав'});
  db.prepare(`DELETE FROM group_members WHERE groupId=? AND userId=?`).run(req.params.id,req.params.userId);
  res.json({success:true});
});

// Сообщения группы
app.get('/api/groups/:id/messages',auth,(req,res)=>{
  const member=db.prepare(`SELECT 1 FROM group_members WHERE groupId=? AND userId=?`).get(req.params.id,req.userId);
  if(!member)return res.status(403).json({error:'Не участник'});
  const rows=db.prepare(`SELECT gm.*,u.firstName,u.lastName,u.username,u.avatarColor,u.avatarUrl FROM group_messages gm JOIN users u ON u.id=gm.fromId WHERE gm.groupId=? ORDER BY gm.createdAt ASC`).all(req.params.id);
  res.json(rows.map(r=>({...r,images:JSON.parse(r.images||'[]'),author:{id:r.fromId,firstName:r.firstName,lastName:r.lastName,username:r.username,avatarColor:r.avatarColor,avatarUrl:r.avatarUrl||null}})));
});

// Отправить сообщение в группу
app.post('/api/groups/:id/messages',auth,(req,res)=>{
  const member=db.prepare(`SELECT 1 FROM group_members WHERE groupId=? AND userId=?`).get(req.params.id,req.userId);
  if(!member)return res.status(403).json({error:'Не участник'});
  const{text,images=[]}=req.body;
  const id=uuid(),now=new Date().toISOString();
  db.prepare(`INSERT INTO group_messages(id,groupId,fromId,text,images,createdAt)VALUES(?,?,?,?,?,?)`).run(id,req.params.id,req.userId,text||null,JSON.stringify(images),now);
  const saved=db.prepare(`SELECT gm.*,u.firstName,u.lastName,u.username,u.avatarColor FROM group_messages gm JOIN users u ON u.id=gm.fromId WHERE gm.id=?`).get(id);
  // Уведомить участников через WS
  const members=db.prepare(`SELECT userId FROM group_members WHERE groupId=? AND userId!=?`).all(req.params.id,req.userId);
  const payload=JSON.stringify({type:'group_message',groupId:req.params.id,message:{...saved,images:JSON.parse(saved.images||'[]')}});
  members.forEach(m=>{const ws=wsClients.get(m.userId);if(ws?.readyState===1)ws.send(payload);});
  res.status(201).json({...saved,images:JSON.parse(saved.images||'[]')});
});

// ══ ЗАКРЕПЛЁННЫЕ СООБЩЕНИЯ ══
app.post('/api/messages/:id/pin',auth,(req,res)=>{
  const m=db.prepare(`SELECT * FROM messages WHERE id=?`).get(req.params.id);
  if(!m)return res.status(404).json({error:'Не найдено'});
  const chatKey=[m.fromId,m.toId].sort().join('_');
  db.prepare(`INSERT OR REPLACE INTO pinned_messages(chatKey,messageId,pinnedBy,pinnedAt)VALUES(?,?,?,?)`).run(chatKey,req.params.id,req.userId,new Date().toISOString());
  res.json({success:true});
});

app.delete('/api/messages/:id/pin',auth,(req,res)=>{
  const m=db.prepare(`SELECT * FROM messages WHERE id=?`).get(req.params.id);
  if(!m)return res.status(404).json({error:'Не найдено'});
  const chatKey=[m.fromId,m.toId].sort().join('_');
  db.prepare(`DELETE FROM pinned_messages WHERE chatKey=?`).run(chatKey);
  res.json({success:true});
});

app.get('/api/chats/:userId/pinned',auth,(req,res)=>{
  const chatKey=[req.userId,req.params.userId].sort().join('_');
  const pin=db.prepare(`SELECT pm.*,m.text,m.images,m.createdAt as msgDate,u.firstName,u.lastName FROM pinned_messages pm JOIN messages m ON m.id=pm.messageId JOIN users u ON u.id=pm.pinnedBy WHERE pm.chatKey=?`).get(chatKey);
  res.json(pin||null);
});

// ══ РЕДАКТИРОВАТЬ / УДАЛИТЬ СООБЩЕНИЕ ══
app.put('/api/messages/:id',auth,(req,res)=>{
  const m=db.prepare(`SELECT * FROM messages WHERE id=?`).get(req.params.id);
  if(!m)return res.status(404).json({error:'Не найдено'});
  if(m.fromId!==req.userId)return res.status(403).json({error:'Нет прав'});
  const{text}=req.body;
  db.prepare(`UPDATE messages SET text=?,edited=1 WHERE id=?`).run(text,req.params.id);
  // Уведомить собеседника
  const ws=wsClients.get(m.toId);
  if(ws?.readyState===1)ws.send(JSON.stringify({type:'message_edited',messageId:req.params.id,text}));
  res.json({success:true});
});

app.delete('/api/messages/:id',auth,(req,res)=>{
  const m=db.prepare(`SELECT * FROM messages WHERE id=?`).get(req.params.id);
  if(!m)return res.status(404).json({error:'Не найдено'});
  if(m.fromId!==req.userId)return res.status(403).json({error:'Нет прав'});
  db.prepare(`UPDATE messages SET deleted=1,text=NULL WHERE id=?`).run(req.params.id);
  const ws=wsClients.get(m.toId);
  if(ws?.readyState===1)ws.send(JSON.stringify({type:'message_deleted',messageId:req.params.id}));
  res.json({success:true});
});

// Принять коллаб
app.post('/api/posts/:id/collab/invite',auth,(req,res)=>{
  const{userId}=req.body;
  if(!userId)return res.status(400).json({error:'userId required'});
  db.prepare('UPDATE posts SET collabInvite=? WHERE id=? AND authorId=?').run(userId,req.params.id,req.userId);
  res.json({success:true});
});

app.post('/api/posts/:id/collab/accept',auth,(req,res)=>{
  const post=S.getPost.get(req.params.id);
  if(!post)return res.status(404).json({error:'Пост не найден'});
  if(post.collabInvite!==req.userId)return res.status(403).json({error:'Нет инвайта'});
  db.prepare('UPDATE posts SET collabAccepted=1 WHERE id=?').run(req.params.id);
  res.json({success:true});
});

// Тред — все посты цепочки
app.get('/api/posts/:id/thread',auth,(req,res)=>{
  const post=S.getPost.get(req.params.id);
  if(!post)return res.status(404).json({error:'Пост не найден'});
  const threadId=post.threadId||req.params.id;
  const rows=db.prepare('SELECT * FROM posts WHERE (id=? OR threadId=?) ORDER BY threadOrder ASC,createdAt ASC').all(threadId,threadId);
  res.json(rows.map(r=>enrichPost(r,req.userId)));
});

// Кто лайкнул
app.get('/api/posts/:id/likers',auth,(req,res)=>{
  const likers=db.prepare('SELECT u.id,u.firstName,u.lastName,u.username,u.avatarColor FROM post_likes pl JOIN users u ON u.id=pl.userId WHERE pl.postId=? ORDER BY pl.rowid DESC LIMIT 50').all(req.params.id);
  res.json({likers});
});

// Голосование в опросе
app.post('/api/posts/:id/vote',auth,(req,res)=>{
  const{optionIndex}=req.body;
  const post=S.getPost.get(req.params.id);
  if(!post||!post.poll)return res.status(400).json({error:'Опрос не найден'});
  const poll=JSON.parse(post.poll);
  if(optionIndex<0||optionIndex>=poll.length)return res.status(400).json({error:'Неверный вариант'});
  db.prepare('INSERT OR REPLACE INTO poll_votes(postId,userId,optionIndex,createdAt)VALUES(?,?,?,?)').run(req.params.id,req.userId,optionIndex,new Date().toISOString());
  const votes=db.prepare('SELECT optionIndex,COUNT(*) as n FROM poll_votes WHERE postId=? GROUP BY optionIndex').all(req.params.id);
  poll.forEach((opt,i)=>{const v=votes.find(v=>v.optionIndex===i);opt.votes=v?.n||0;});
  const myVote=optionIndex;
  res.json({poll,myVote});
});

// Поиск музыки через Deezer (прокси для обхода CORS)
app.get('/api/music/search',async(req,res)=>{
  const{q}=req.query;
  if(!q)return res.json({data:[]});
  try{
    const r=await fetch('https://api.deezer.com/search?q='+encodeURIComponent(q)+'&limit=10&output=json');
    const d=await r.json();
    res.json(d);
  }catch(e){res.json({data:[]});}
});

// SEARCH
app.get('/api/search',(req,res)=>{
  const{q,type='all'}=req.query;
  if(q&&q.length<1)return res.json({users:[],posts:[],tags:[]});
  const lk=`%${q}%`;const result={};
  if(type==='all'||type==='users')result.users=db.prepare(`SELECT id,firstName,lastName,username,avatarColor,bio,isVerified FROM users WHERE firstName LIKE? OR lastName LIKE? OR username LIKE? LIMIT 10`).all(lk,lk,lk).map(r=>({...r,isVerified:!!r.isVerified}));
  if(type==='all'||type==='posts')result.posts=db.prepare(`SELECT * FROM posts WHERE text LIKE? ORDER BY createdAt DESC LIMIT 10`).all(lk).map(r=>enrichPost(r,null));
  if(type==='all'||type==='tags'){const tags=new Set();db.prepare(`SELECT text FROM posts`).all().forEach(r=>{r.text.match(/#(\w+)/g)?.forEach(t=>{if(t.toLowerCase().includes(q.toLowerCase()))tags.add(t)})});result.tags=[...tags].slice(0,10)}
  res.json(result);
});


// Deezer API proxy (обход CORS)
app.get('/api/music/search',(req,res)=>{
  const q=req.query.q;
  if(!q||q.length<2)return res.json({data:[]});
  const https=require('https');
  const url='https://api.deezer.com/search?q='+encodeURIComponent(q)+'&limit=8&output=json';
  https.get(url,(r)=>{
    let body='';
    r.on('data',chunk=>body+=chunk);
    r.on('end',()=>{
      try{
        const data=JSON.parse(body);
        const tracks=(data.data||[]).map(t=>({
          id:t.id,
          title:t.title,
          artist:t.artist?.name||'',
          album:t.album?.title||'',
          cover:t.album?.cover_medium||t.album?.cover||'',
          preview:t.preview||''
        }));
        res.json({data:tracks});
      }catch(e){res.json({data:[]});}
    });
  }).on('error',()=>res.json({data:[]}));
});

app.get('*',(req,res)=>{
  if(req.path.startsWith('/api')) return res.status(404).json({error:'Not found'});
  // Для несуществующих страниц — редирект на index
  res.sendFile(path.join(__dirname,'..','frontend','index.html'));
});

// WEBSOCKET
const wsClients=new Map(),userPubKeys=new Map();
wss.on('connection',(ws)=>{
  let uid=null;
  ws.on('message',(raw)=>{
    let msg;try{msg=JSON.parse(raw)}catch{return}
    if(msg.type==='auth'){
      const row=S.getSess.get(msg.token);
      if(!row){ws.send(JSON.stringify({type:'error',error:'Unauthorized'}));return}
      uid=row.userId;wsClients.set(uid,ws);
      if(msg.publicKey)userPubKeys.set(uid,msg.publicKey);
      ws.send(JSON.stringify({type:'auth_ok',userId:uid}));return;
    }
    if(!uid)return;
    if(msg.type==='get_pubkey'){ws.send(JSON.stringify({type:'pubkey_response',userId:msg.userId,publicKey:userPubKeys.get(msg.userId)||null}));return}
    if(msg.type==='message'){
      const{toId,encryptedText,iv,senderPublicKey,plainText,images=[],voiceData,voiceDur}=msg;
      if(!toId)return;
      const id=uuid();const now=new Date().toISOString();
      const ttlVal=msg.ttl||0;
      S.insMsg.run(id,uid,toId,plainText||null,JSON.stringify(images),voiceData||null,voiceDur||0,encryptedText||null,iv||null,senderPublicKey||null,ttlVal,now);
      if(ttlVal>0) setTimeout(()=>{try{db.prepare('DELETE FROM messages WHERE id=?').run(id);}catch{}},ttlVal*1000);
      const saved=db.prepare(`SELECT * FROM messages WHERE id=?`).get(id);
      const payload={...saved,images:safeJ(saved.images),read:false};
      const rws=wsClients.get(toId);if(rws?.readyState===WebSocket.OPEN)rws.send(JSON.stringify({type:'message',message:payload}));
      ws.send(JSON.stringify({type:'message_sent',message:payload}));return;
    }
    if(msg.type==='typing'){const rws=wsClients.get(msg.toId);if(rws?.readyState===WebSocket.OPEN)rws.send(JSON.stringify({type:'typing',fromId:uid,isTyping:msg.isTyping}));return}
    if(msg.type==='read'){S.markRead.run(msg.fromId,uid);const sws=wsClients.get(msg.fromId);if(sws?.readyState===WebSocket.OPEN)sws.send(JSON.stringify({type:'read_receipt',byUserId:uid}))}
  });
  ws.on('close',()=>{if(uid)wsClients.delete(uid)});
  ws.on('error',()=>{if(uid)wsClients.delete(uid)});
});

seed().then(()=>{
  server.listen(PORT,()=>{
    const uc=db.prepare(`SELECT COUNT(*) as n FROM users`).get().n;
    const pc=db.prepare(`SELECT COUNT(*) as n FROM posts`).get().n;
    console.log(`\n🚀 Weave на http://localhost:${PORT}`);
    console.log(`🗄️  SQLite: ${DB_PATH}`);
    console.log(`📊 ${uc} пользователей, ${pc} постов`);
    console.log(`👑 Admin: gadji4913@gmail.com / admin2024 (@daneda)\n`);
  });
}).catch(e=>{console.error('Ошибка:',e);process.exit(1)});
