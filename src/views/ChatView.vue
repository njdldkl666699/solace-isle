<script setup lang="ts">
import { computed, nextTick, onMounted, ref, onBeforeUnmount } from "vue";
import AppShell from "../components/layout/AppShell.vue";
import { type ChatList, type ChatMessage, type ChatSession, useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import { ElMessage } from "element-plus";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

/* ================= Markdown 配置 ================= */
marked.setOptions({ breaks: true, mangle: false, headerIds: false });
const renderMarkdown = (text: string) => {
  if (!text) return "";
  const safe = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  return marked.parse(safe);
};
const highlightRenderedCode = () => {
  nextTick(() => {
    const root = messageContainer.value; if (!root) return;
    root.querySelectorAll('pre code').forEach(el => { try { hljs.highlightElement(el as HTMLElement); } catch { /* ignore */ } });
  });
};

/* ================= 全局状态 ================= */
const appStore = useAppStore();
const session = ref<ChatSession>(); // 当前会话（包含消息）
const chatList = ref<ChatList[]>([]); // 历史会话列表（仅元数据）

/* 会话列表分页状态 */
const hasMoreSessions = ref(true);
const isLoadingSessions = ref(false);
const sessionListContainer = ref<HTMLUListElement | null>(null);
const pageLimit = 20;

/* 消息分页（向上加载更早） */
const isLoadingMessages = ref(false);
const hasMoreMessages = ref(true);
const messageLimit = 20;

/* 发送与输入状态 */
const draft = ref("");
const isTyping = ref(false); // 显示打字指示器（AI 生成中）
const messageContainer = ref<HTMLDivElement | null>(null);

/* 快捷提示 */
const quickPrompts = computed(() => appStore.chat.quickPrompts);

/* 流式相关状态 */
const isStreaming = ref(false);
const currentTaskId = ref<string | null>(null);
const currentMessageId = ref<string | null>(null);
let abortController: AbortController | null = null;
let pendingUserContent = ""; // 暂存本次发送的用户输入（等待 messageId 后插入）

/* ================= 通用工具 ================= */
const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainer.value) messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  });
};

/* 将后端返回的复合消息拆分为 user / ai 双消息 */
const splitPairs = (pairs: any[]): ChatMessage[] => {
  const result: ChatMessage[] = [];
  for (const p of pairs) {
    if (!p) continue;
    const id = p.id;
    const time = p.datetime || new Date().toISOString();
    if (p.query) result.push({ id, role: "user", content: p.query, createdAt: time });
    if (p.answer) result.push({ id, role: "ai", content: p.answer, createdAt: time });
  }
  return result.sort((a,b) => a.createdAt.localeCompare(b.createdAt));
};

/* ================= 会话列表加载 ================= */
const loadSessions = async (initial = false) => {
  if (isLoadingSessions.value) return;
  if (!hasMoreSessions.value && !initial) return;
  isLoadingSessions.value = true;
  try {
    const lastItem = !initial && chatList.value.length ? chatList.value[chatList.value.length - 1] : null;
    const params: Record<string, any> = { limit: pageLimit };
    if (lastItem) params.lastId = lastItem.id;
    const resp = await api.get("/chat/sessions/list", { params });
    if (resp.data?.code === 1) {
      const data = resp.data.data || {};
      const sessions: any[] = data.sessions || [];
      const mapped: ChatList[] = sessions.map(s => ({ id: s.id, title: s.title, updatedAt: s.datetime || s.updatedAt || new Date().toISOString() }));
      if (initial) chatList.value = mapped; else {
        const exist = new Set(chatList.value.map(s => s.id));
        mapped.forEach(m => { if (!exist.has(m.id)) chatList.value.push(m); });
      }
      hasMoreSessions.value = !!data.hasMore;
    } else ElMessage.error("获取会话列表失败");
  } catch { ElMessage.error("获取会话列表出错"); }
  finally { isLoadingSessions.value = false; }
};
const handleSessionScroll = () => {
  const el = sessionListContainer.value; if (!el || isLoadingSessions.value || !hasMoreSessions.value) return;
  const d = el.scrollHeight - (el.scrollTop + el.clientHeight);
  if (d < 40) loadSessions();
};

/* ================= 消息加载（首次 / 向上分页） ================= */
const fetchLatestMessages = async (sessionId: string) => {
  if (isLoadingMessages.value) return;
  isLoadingMessages.value = true; hasMoreMessages.value = true;
  try {
    const resp = await api.get(`/chat/sessions/${sessionId}`, { params: { limit: messageLimit } });
    if (resp.data?.code === 1) {
      const pairs: any[] = resp.data.data?.messages || [];
      if (!session.value) return;
      session.value.messages = splitPairs(pairs);
      hasMoreMessages.value = !!resp.data.data?.hasMore;
      scrollToBottom(); highlightRenderedCode();
    } else ElMessage.error("加载消息失败");
  } catch { ElMessage.error("加载消息出错"); }
  finally { isLoadingMessages.value = false; }
};

const loadOlderMessages = async () => {
  if (!session.value || isLoadingMessages.value || !hasMoreMessages.value) return;
  if (!session.value.messages.length) return;
  isLoadingMessages.value = true;
  const firstId = session.value.messages[0]?.id;
  const prevH = messageContainer.value?.scrollHeight || 0;
  try {
    const resp = await api.get(`/chat/sessions/${session.value.id}`, { params: { firstId, limit: messageLimit } });
    if (resp.data?.code === 1) {
      const pairs: any[] = resp.data.data?.messages || [];
      if (pairs.length) {
        const older = splitPairs(pairs);
        session.value.messages = [...older, ...session.value.messages];
        nextTick(() => {
          if (messageContainer.value) {
            const newH = messageContainer.value.scrollHeight;
            messageContainer.value.scrollTop = newH - prevH; // 保持视图位置
          }
        });
        highlightRenderedCode();
      }
      hasMoreMessages.value = !!resp.data.data?.hasMore;
    } else ElMessage.error("加载更早消息失败");
  } catch { ElMessage.error("加载更早消息出错"); }
  finally { isLoadingMessages.value = false; }
};
const handleMessageScroll = () => {
  const el = messageContainer.value; if (!el || isLoadingMessages.value || !hasMoreMessages.value) return;
  if (el.scrollTop < 40) loadOlderMessages();
};

/* ================= 选择会话 ================= */
const selectSession = (chat: ChatList) => {
  if (isStreaming.value) { ElMessage.warning('正在生成，暂不能切换'); return; }
  if (appStore.chat.activeSessionId === chat.id) return;
  appStore.chat.activeSessionId = chat.id;
  session.value = { id: chat.id, title: chat.title, updatedAt: chat.updatedAt, messages: [] };
  fetchLatestMessages(chat.id);
};

/* ================= 流式逻辑实现 ================= */
const pushInitialPair = (messageId: string) => {
  if (!session.value) return;
  if (session.value.messages.some(m => m.id === messageId)) return;
  const now = new Date().toISOString();
  session.value.messages.push(
    { id: messageId, role: 'user', content: pendingUserContent, createdAt: now },
    { id: messageId, role: 'ai', content: '', createdAt: now }
  );
  scrollToBottom();
};
const appendAIChunk = (messageId: string, delta: string) => {
  if (!session.value) return;
  const aiMsg = session.value.messages.find(m => m.id === messageId && m.role === 'ai');
  if (aiMsg) aiMsg.content += delta;
};
const finalizePair = async () => {
  if (!session.value) return;
  isStreaming.value = false; isTyping.value = false; currentTaskId.value = null; currentMessageId.value = null;
  if (session.value.title === '新的对话') {
    try {
      const r = await api.get(`/chat/title/${session.value.id}`);
      if (r.data?.code === 1 && r.data.data) session.value.title = r.data.data; else session.value.title = pendingUserContent.slice(0,20) || '新的对话';
    } catch {
      session.value.title = pendingUserContent.slice(0,20) || '新的对话';
    }
    const idx = chatList.value.findIndex(c => c.id === session.value!.id);
    if (idx >= 0) chatList.value.splice(idx,1);
    chatList.value.unshift({
      id: session.value.id,
      title: session.value.title,
      updatedAt: new Date().toISOString()
    });
  } else {
    const idx = chatList.value.findIndex(c => c.id === session.value!.id);
    if (idx >= 0) {
      const item = chatList.value[idx] as ChatList;
      item.updatedAt = new Date().toISOString();
      chatList.value.splice(idx,1);
      chatList.value.unshift(item);
    }
  }
  nextTick(() => { scrollToBottom(); highlightRenderedCode(); });
};

const stopStreamingLocally = () => {
  if (abortController) abortController.abort();
  abortController = null; isStreaming.value = false; isTyping.value = false;
};
const streamChat = async (query: string) => {
  if (!session.value) return;
  isStreaming.value = true; isTyping.value = true; currentTaskId.value = null; currentMessageId.value = null;
  abortController = new AbortController();
  try {
    const url = `${api.defaults.baseURL || ''}/chat/${session.value.id}`.replace(/([^:])\/\//g,'$1/');
    const resp = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', 'Accept':'text/event-stream' }, body: JSON.stringify({ query }), signal: abortController.signal });
    if (!resp.ok || !resp.body) throw new Error('请求失败');
    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sep).trim(); buffer = buffer.slice(sep + 2);
        if (!raw.startsWith('data:')) continue;
        let evt: any; try { evt = JSON.parse(raw.replace(/^data:\s*/, '')); } catch { continue; }
        const ev = evt.event;
        if (ev === 'ping') continue;
        if (ev === 'error') { ElMessage.error(evt.message || '生成出错'); stopStreamingLocally(); return; }
        if (evt.taskId) currentTaskId.value = evt.taskId;
        if (evt.messageId && !currentMessageId.value) { currentMessageId.value = evt.messageId; pushInitialPair(evt.messageId); }
        if (ev === 'message' && evt.answer) { appendAIChunk(currentMessageId.value!, evt.answer); scrollToBottom(); }
        else if (ev === 'messageEnd') { await finalizePair(); }
      }
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') ElMessage.info('已停止生成'); else ElMessage.error(e?.message || '流式请求失败');
  } finally {
    abortController = null; isTyping.value = false; isStreaming.value = false;
  }
};
const stopGeneration = async () => {
  if (!isStreaming.value || !currentTaskId.value) return;
  try { await api.post(`/chat/${currentTaskId.value}/stop`); } catch { /* ignore */ }
  stopStreamingLocally();
};

/* ================= 发送消息（触发流式） ================= */
const sendMessage = async () => {
  if (isStreaming.value) { ElMessage.warning('正在生成，请稍候'); return; }
  if (!session.value) { ElMessage.error('会话未初始化'); return; }
  const content = draft.value.trim(); if (!content) { ElMessage.warning('请输入消息内容'); return; }
  pendingUserContent = content; draft.value = ''; await streamChat(content);
};

/* ================= 快捷提示词 & 新建会话 ================= */
const usePrompt = (p: string) => { if (!isStreaming.value) draft.value = p; };
const getQuickPrompts = async () => {
  try {
    const r = await api.get('/chat');
    if (r.data?.code === 1) appStore.setQuickPrompts(r.data.data || []);
    else ElMessage.error('获取快捷提示词失败');
  } catch { ElMessage.error('获取快捷提示词失败'); }
};
// 新会话：首次消息发送前不加入 chatList，等首次 AI 回复结束后再 finalize 加入
const createNewSession = async () => {
  if (isStreaming.value) { ElMessage.warning('请先停止当前生成'); return; }
  try {
    const r = await api.get('/chat/sessions');
    if (r.data?.code === 1) {
      appStore.chat.activeSessionId = r.data.data;
      session.value = {
        id: r.data.data,
        title:'新的对话',
        updatedAt: new Date().toISOString(),
        messages: []
      };
    } else ElMessage.error('创建新对话失败');
  } catch { ElMessage.error('创建新对话失败'); }
};

/* ================= 生命周期 ================= */
onMounted(() => {
  getQuickPrompts();
  createNewSession();
  loadSessions(true);
  nextTick(() => {
    if (sessionListContainer.value) sessionListContainer.value.addEventListener('scroll', handleSessionScroll);
    if (messageContainer.value) messageContainer.value.addEventListener('scroll', handleMessageScroll);
  });
});
onBeforeUnmount(() => {
  if (sessionListContainer.value) sessionListContainer.value.removeEventListener('scroll', handleSessionScroll);
  if (messageContainer.value) messageContainer.value.removeEventListener('scroll', handleMessageScroll);
});
</script>

<template>
  <AppShell page-title="AI 心理伙伴" subtitle="在这里，总有人愿意倾听你的故事。">
    <div class="chat">
      <!-- 会话列表 -->
      <aside class="session-panel">
        <p class="panel-title">我的对话</p>
        <ul ref="sessionListContainer" class="session-list-scroll">
          <li v-if="!chatList.length && !isLoadingSessions">暂无会话</li>
          <li v-for="chat in chatList" :key="chat.id" :class="['session-item', { active: chat.id === appStore.chat.activeSessionId }]" @click="selectSession(chat)">
            <div class="session-title">{{ chat.title }}</div>
            <p class="time">最近更新：{{ new Date(chat.updatedAt).toLocaleString('zh-CN', { hour12: false }) }}</p>
          </li>
          <li v-if="isLoadingSessions" class="loading">加载中...</li>
          <li v-else-if="!hasMoreSessions && chatList.length" class="no-more">没有更多了</li>
        </ul>
        <div class="prompt-box">
          <p>不知道从哪里开始？可以试试：</p>
          <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="usePrompt(prompt)" :disabled="isStreaming">{{ prompt }}</button>
          <button class="refresh-btn" @click="getQuickPrompts" :disabled="isStreaming">换一批🔎</button>
        </div>
      </aside>
      <!-- 对话区 -->
      <section class="conversation" aria-live="polite">
        <div class="header">
          <div class="avatar">🤖</div>
          <div>
            <h3>{{ session?.title || '心屿伙伴' }}</h3>
            <p>温柔倾听 · 24h 同步陪伴</p>
          </div>
        </div>
        <div ref="messageContainer" class="message-list" @scroll="handleMessageScroll">
          <template v-if="session && session.messages.length">
            <article v-for="m in session.messages" :key="m.id + '-' + m.role" class="message" :class="m.role">
              <div class="bubble">
                <div class="markdown-body" v-html="renderMarkdown(m.content)"></div>
                <time>{{ new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }}</time>
              </div>
            </article>
            <div v-if="isTyping" class="typing"><span /><span /><span /></div>
            <div v-if="isLoadingMessages" class="loading-older">加载更早...</div>
          </template>
          <p v-else class="placeholder">{{ session ? '暂无消息，开始你的第一句吧。' : '开始第一段对话，让我认识你。' }}</p>
        </div>
        <form class="composer" @submit.prevent="sendMessage">
          <button type="button" class="guide-btn" @click="createNewSession" :disabled="isStreaming">新的对话</button>
          <textarea v-model="draft" rows="2" :disabled="isStreaming" placeholder="分享此刻的想法与感受… (Enter发送 / Shift+Enter换行)" @keydown.enter.exact.prevent="sendMessage" @keydown.shift.enter.stop />
          <div class="action-group">
            <button v-if="!isStreaming" type="submit">发送</button>
            <button v-else type="button" class="stop-btn" @click="stopGeneration">停止</button>
          </div>
        </form>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.chat { display: grid; grid-template-columns: minmax(220px, 0.8fr) minmax(0, 2fr); gap: 2rem; }
.session-panel { background: rgba(255,255,255,0.86); border-radius: 24px; padding: 1.75rem; border: 1px solid rgba(93,130,255,0.12); box-shadow: 0 18px 32px rgba(91,118,190,0.12); display: grid; gap: 1.2rem; align-content: start; }
.panel-title { margin: 0; font-weight: 600; color: #2f3a60; }
.session-list-scroll { list-style: none; margin:0; padding:0; display:grid; gap:0.8rem; max-height:300px; overflow-y:auto; padding-right:4px; }
.session-list-scroll::-webkit-scrollbar { width:6px; }
.session-list-scroll::-webkit-scrollbar-thumb { background: rgba(93,130,255,0.35); border-radius:3px; }
.session-item { padding:0.9rem 1rem; border-radius:18px; background:rgba(246,249,255,0.85); border:1px solid rgba(93,130,255,0.08); cursor:pointer; }
.session-item.active { border-color: rgba(93,130,255,0.32); box-shadow:0 8px 18px rgba(93,130,255,0.18); }
.session-panel .loading,.session-panel .no-more { text-align:center; font-size:0.8rem; color:#67759d; }
.session-title { font-weight:600; color:#24345b; }
.time { margin:0.35rem 0 0; font-size:0.82rem; color:#67759d; }
.prompt-box { display:grid; gap:0.6rem; color:#56628a; font-size:0.93rem; }
.prompt-box button { padding:0.45rem 0.9rem; border-radius:14px; border:1px solid rgba(93,130,255,0.18); background:rgba(255,255,255,0.9); cursor:pointer; text-align:left; transition:.2s; }
.prompt-box button:not(.refresh-btn):hover { background:linear-gradient(135deg,#f6f9ff,#eef3ff); border-color:rgba(93,130,255,0.45); box-shadow:0 6px 14px rgba(93,130,255,0.18); transform:translateY(-2px); }
.prompt-box .refresh-btn { height:40px; width:120px; background:linear-gradient(135deg,#4d75ff,#6f8dff); color:#fff; border:none; font-weight:600; letter-spacing:.5px; box-shadow:0 8px 18px rgba(93,130,255,0.28); position:relative; overflow:hidden; }
.prompt-box .refresh-btn::after { content:""; position:absolute; top:0; left:-60%; width:50%; height:100%; background:rgba(255,255,255,0.35); transform:skewX(-25deg); transition:left .5s; }
.prompt-box .refresh-btn:hover::after { left:120%; }
.prompt-box .refresh-btn:hover { transform:translateY(-2px) scale(1.04); box-shadow:0 12px 24px rgba(93,130,255,0.38); }
.conversation { background:rgba(255,255,255,0.9); border-radius:26px; border:1px solid rgba(93,130,255,0.12); box-shadow:0 18px 32px rgba(93,120,190,0.14); display:grid; grid-template-rows:auto 1fr auto; }
.header { display:flex; align-items:center; gap:1.2rem; padding:1.75rem 2rem 1.25rem; border-bottom:1px solid rgba(93,130,255,0.08); }
.avatar { width:52px; height:52px; background:rgba(93,130,255,0.18); border-radius:18px; display:grid; place-items:center; font-size:1.8rem; }
.header h3 { margin:0; font-size:1.3rem; color:#1e2a4a; }
.header p { margin:0.2rem 0 0; color:#5c6b93; }
.message-list { padding:1.8rem 2rem; display:flex; flex-direction:column; gap:1.1rem; overflow-y:auto; max-height:520px; position:relative; }
.message-list::before { content:""; position:absolute; top:0; left:0; right:0; height:16px; background:linear-gradient(to bottom,rgba(255,255,255,0.9),rgba(255,255,255,0)); pointer-events:none; }
.message { display:flex; }
.message.ai { justify-content:flex-start; }
.message.user { justify-content:flex-end; }
.bubble { max-width:80%; border-radius:20px; padding:1rem 1.2rem; background:rgba(246,249,255,0.92); border:1px solid rgba(93,130,255,0.12); box-shadow:0 12px 24px rgba(93,130,255,0.12); display:grid; gap:0.4rem; }
.message.user .bubble { background:linear-gradient(135deg,#5d82ff,#8fa3ff); color:#fff; border:none; }
.bubble time { font-size:0.74rem; opacity:.6; }
.typing { align-self:flex-start; display:inline-flex; gap:0.3rem; background:rgba(246,249,255,0.92); padding:0.6rem 0.8rem; border-radius:999px; }
.typing span { width:8px; height:8px; border-radius:50%; background:rgba(93,130,255,0.6); animation:bounce 1s infinite ease-in-out; }
.typing span:nth-child(2){ animation-delay:.2s; }
.typing span:nth-child(3){ animation-delay:.4s; }
@keyframes bounce { 0%,80%,100% { transform:translateY(0);} 40% { transform:translateY(-6px);} }
.placeholder { color:#5c6b93; }
.composer { display:grid; grid-template-columns:auto 1fr auto; gap:1rem; padding:1.5rem 2rem; border-top:1px solid rgba(93,130,255,0.08); background:rgba(249,252,255,0.88); }
.composer textarea { border:1px solid rgba(93,130,255,0.18); border-radius:16px; padding:0.9rem 1.1rem; font-size:1rem; resize:none; }
.composer textarea:focus { outline:none; border-color:rgba(93,130,255,0.5); box-shadow:0 0 0 4px rgba(93,130,255,0.18); }
.composer button { border:none; border-radius:14px; padding:0.8rem 1rem; font-weight:600; cursor:pointer; transition:transform .2s, box-shadow .2s; }
.guide-btn { background:rgba(93,130,255,0.12); color:#4d6bff; }
.composer button[type=submit] { background:linear-gradient(135deg,#5d82ff,#8fa3ff); color:#fff; box-shadow:0 12px 24px rgba(93,130,255,0.2); }
.action-group { display:flex; flex-direction:column; gap:0.5rem; }
.stop-btn { background:#ff6b6b; color:#fff; border:none; border-radius:14px; padding:0.8rem 1rem; font-weight:600; cursor:pointer; box-shadow:0 8px 18px rgba(255,107,107,0.25); }
.stop-btn:hover { background:#ff5252; }
.stop-btn:active { background:#ff3b3b; }
.markdown-body { font-size:0.95rem; line-height:1.55; }
.markdown-body pre { background:#1e1e1e; color:#eee; padding:12px 14px; border-radius:10px; overflow:auto; }
.markdown-body code { background:#f5f7fb; padding:2px 5px; border-radius:4px; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,"Courier New",monospace; }
.loading-older { text-align:center; font-size:0.75rem; color:#7082a3; }
@media (max-width:980px){ .chat { grid-template-columns:1fr; } .session-panel { order:2; } }
@media (max-width:640px){ .composer { grid-template-columns:1fr; } .guide-btn { justify-self:flex-start; } }
</style>
