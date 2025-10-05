<script setup lang="ts">
import { computed, nextTick, onMounted, ref, onBeforeUnmount } from "vue";
import AppShell from "../components/layout/AppShell.vue";
import { type ChatList, type ChatMessage, type ChatSession, useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import { ElMessage } from "element-plus";

const appStore = useAppStore();
const session = ref<ChatSession>();
const chatList = ref<ChatList[]>([]);

// 会话列表分页
const hasMoreSessions = ref(true);
const isLoadingSessions = ref(false);
const sessionListContainer = ref<HTMLUListElement | null>(null);
const pageLimit = 20;

// 消息分页（向上加载更早的）
const isLoadingMessages = ref(false);
const hasMoreMessages = ref(true);
const messageLimit = 20;

const draft = ref("");
const isTyping = ref(false);
const messageContainer = ref<HTMLDivElement | null>(null);

const quickPrompts = computed(() => appStore.chat.quickPrompts);

/* ---------------- 会话列表相关 ---------------- */
const loadSessions = async (initial = false) => {
  if (isLoadingSessions.value) return;
  if (!hasMoreSessions.value && !initial) return;
  isLoadingSessions.value = true;
  try {
    const lastItem = !initial && chatList.value.length ? chatList.value[chatList.value.length - 1] : null;
    const params: Record<string, any> = { limit: pageLimit };
    if (lastItem) params.lastId = lastItem.id;
    const response = await api.get("/chat/sessions/list", { params });
    if (response.data?.code === 1) {
      const data = response.data.data || {};
      const list: any[] = data.sessions || [];
      const mapped: ChatList[] = list.map(s => ({ id: s.id, title: s.title, updatedAt: s.datetime || s.updatedAt || new Date().toISOString() }));
      if (initial) {
        chatList.value = mapped;
      } else {
        const exist = new Set(chatList.value.map(s => s.id));
        mapped.forEach(m => { if (!exist.has(m.id)) chatList.value.push(m); });
      }
      hasMoreSessions.value = !!data.hasMore;
    } else {
      ElMessage.error("获取会话列表失败");
    }
  } catch (_) {
    ElMessage.error("获取会话列表出错");
  } finally {
    isLoadingSessions.value = false;
  }
};

const handleSessionScroll = () => {
  const el = sessionListContainer.value;
  if (!el || isLoadingSessions.value || !hasMoreSessions.value) return;
  const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  if (distanceToBottom < 40) loadSessions();
};

/* ---------------- 消息相关 ---------------- */
const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
};

// 将 API 返回的成对消息拆分
const splitPairs = (pairs: any[]): ChatMessage[] => {
  const result: ChatMessage[] = [];
  for (const p of pairs) {
    if (!p) continue;
    const baseId = p.id || genLocalMsgId();
    const time = p.datetime || new Date().toISOString();
    if (p.query) result.push({ id: baseId, role: "user", content: p.query, createdAt: time });
    if (p.answer) result.push({ id: baseId, role: "ai", content: p.answer, createdAt: time });
  }
  // 按时间升序展示
  return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

// 初次加载或切换会话：获取最新消息
const fetchLatestMessages = async (sessionId: string) => {
  if (isLoadingMessages.value) return;
  isLoadingMessages.value = true;
  hasMoreMessages.value = true; // 重置
  try {
    const resp = await api.get(`/chat/sessions/${sessionId}`, { params: { limit: messageLimit } });
    if (resp.data?.code === 1) {
      const data = resp.data.data || {};
      const pairs: any[] = data.messages || [];
      const msgs = splitPairs(pairs);
      if (!session.value) return;
      session.value.messages = msgs; // 覆盖
      hasMoreMessages.value = !!data.hasMore;
      scrollToBottom();
    } else {
      ElMessage.error("加载消息失败");
    }
  } catch (_) {
    ElMessage.error("加载消息出错");
  } finally {
    isLoadingMessages.value = false;
  }
};

// 向上滚动时加载更早消息
const loadOlderMessages = async () => {
  if (!session.value || isLoadingMessages.value || !hasMoreMessages.value) return;
  if (!session.value.messages.length) return; // 没有消息不用加载
  isLoadingMessages.value = true;
  const firstId = session.value.messages[0]?.id; // 当前第一条（最早显示）对应的成对 id
  const prevScrollHeight = messageContainer.value?.scrollHeight || 0;
  try {
    const resp = await api.get(`/chat/sessions/${session.value.id}`, { params: { firstId, limit: messageLimit } });
    if (resp.data?.code === 1) {
      const data = resp.data.data || {};
      const pairs: any[] = data.messages || [];
      if (pairs.length) {
        const older = splitPairs(pairs);
        // 这些 older 都比当前 first 更早，需前置
        session.value.messages = [...older, ...session.value.messages];
        // 维持滚动位置（不跳动）
        nextTick(() => {
          if (messageContainer.value) {
            const newHeight = messageContainer.value.scrollHeight;
            messageContainer.value.scrollTop = newHeight - prevScrollHeight;
          }
        });
      }
      hasMoreMessages.value = !!data.hasMore;
    } else {
      ElMessage.error("加载更早消息失败");
    }
  } catch (_) {
    ElMessage.error("加载更早消息出错");
  } finally {
    isLoadingMessages.value = false;
  }
};

const handleMessageScroll = () => {
  const el = messageContainer.value;
  if (!el || isLoadingMessages.value || !hasMoreMessages.value) return;
  if (el.scrollTop < 40) {
    loadOlderMessages();
  }
};

// 选择会话
const selectSession = (chat: ChatList) => {
  if (appStore.chat.activeSessionId === chat.id) return; // 已是当前
  appStore.chat.activeSessionId = chat.id;
  session.value = { id: chat.id, title: chat.title, updatedAt: chat.updatedAt, messages: [] };
  fetchLatestMessages(chat.id);
};

const sendMessage = async () => {
  if (!session.value) {
    ElMessage.error("会话未初始化，请稍后重试。");
    return;
  }
  if (!draft.value.trim()) {
    ElMessage.warning("请输入消息内容");
    return;
  }
  const content = draft.value.trim();
  draft.value = "";
  scrollToBottom();
  isTyping.value = true;
  // TODO: 调用 AI 回复接口获取回答并追加 (保持与拆分逻辑一致)
  isTyping.value = false;
};

const usePrompt = (prompt: string) => { draft.value = prompt; };

const getQuickPrompts = async () => {
  try {
    const response = await api.get("/chat");
    if (response.data.code === 1) {
      appStore.setQuickPrompts(response.data.data || []);
    } else {
      ElMessage.error("获取快捷提示词失败，请稍后重试。");
    }
  } catch (_) {
    ElMessage.error("获取快捷提示词失败，请稍后重试。");
  }
};

const createNewSession = async () => {
  try {
    const response = await api.get("/chat/sessions");
    if (response.data.code === 1) {
      appStore.chat.activeSessionId = response.data.data;
      session.value = { id: response.data.data, title: "新的对话", messages: [], updatedAt: new Date().toISOString() };
    } else {
      ElMessage.error("创建新对话失败，请稍后重试。");
    }
  } catch (_) {
    ElMessage.error("创建新对话失败，请稍后重试。");
  }
};

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
          <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="usePrompt(prompt)">{{ prompt }}</button>
          <button class="refresh-btn" @click="getQuickPrompts">换一批🔎</button>
        </div>
      </aside>
      <section class="conversation" aria-live="polite">
        <div class="header">
          <div class="avatar">🤖</div>
          <div>
            <h3>心屿伙伴</h3>
            <p>温柔倾听 · 24h 同步陪伴</p>
          </div>
        </div>
        <div ref="messageContainer" class="message-list">
          <template v-if="session && session.messages.length">
            <article v-for="m in session.messages" :key="m.id + '-' + m.role" class="message" :class="m.role">
              <div class="bubble">
                <p>{{ m.content }}</p>
                <time>{{ new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }}</time>
              </div>
            </article>
            <div v-if="isLoadingMessages" class="loading-older">加载更早...</div>
            <div v-if="isTyping" class="typing"><span/><span/><span/></div>
          </template>
          <p v-else class="placeholder">{{ session ? '暂无消息，开始你的第一句吧。' : '开始第一段对话，让我认识你。' }}</p>
        </div>
        <form class="composer" @submit.prevent="sendMessage">
          <button type="button" class="guide-btn" @click="createNewSession">新的对话</button>
          <textarea v-model="draft" rows="2" placeholder="分享此刻的想法与感受…" />
          <button type="submit">发送</button>
        </form>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.chat {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(0, 2fr);
  gap: 2rem;
}

.session-panel {
  background: rgba(255, 255, 255, 0.86);
  border-radius: 24px;
  padding: 1.75rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(91, 118, 190, 0.12);
  display: grid;
  gap: 1.2rem;
  align-content: start;
}

.panel-title {
  margin: 0;
  font-weight: 600;
  color: #2f3a60;
}

.session-panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.8rem;
}

.session-panel li {
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(246, 249, 255, 0.85);
  border: 1px solid rgba(93, 130, 255, 0.08);
}

.session-panel li.active {
  border-color: rgba(93, 130, 255, 0.32);
  box-shadow: 0 8px 18px rgba(93, 130, 255, 0.18);
}

.session-title {
  font-weight: 600;
  color: #24345b;
}

.time {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: #67759d;
}

.prompt-box {
  display: grid;
  gap: 0.6rem;
  color: #56628a;
  font-size: 0.93rem;
}

.prompt-box button {
  padding: 0.45rem 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(93, 130, 255, 0.18);
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s ease, box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
}

/* 新增：普通提示按钮的悬浮/交互反馈（不影响刷新按钮） */
.prompt-box button:not(.refresh-btn):hover {
  background: linear-gradient(135deg, #f6f9ff, #eef3ff);
  border-color: rgba(93,130,255,0.45);
  box-shadow: 0 6px 14px rgba(93,130,255,0.18);
  transform: translateY(-2px);
  color: #2c3a5c;
}
.prompt-box button:not(.refresh-btn):active {
  transform: translateY(0);
  box-shadow: 0 3px 8px rgba(93,130,255,0.25);
  background: linear-gradient(135deg, #edf2ff, #e4ecff);
}
.prompt-box button:not(.refresh-btn):focus-visible {
  outline: none;
  border-color: rgba(93,130,255,0.7);
  box-shadow: 0 0 0 3px rgba(93,130,255,0.35);
}

.prompt-box .refresh-btn {
  height: 40px;
  width: 120px; /* 更窄 */
  justify-self: start;
  background: linear-gradient(135deg, #4d75ff, #6f8dff);
  color: #fff;
  border: none;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 18px rgba(93, 130, 255, 0.28);
  position: relative;
  overflow: hidden;
}

.prompt-box .refresh-btn::after {
  content: "";
  position: absolute;
  top: 0;
  left: -60%;
  width: 50%;
  height: 100%;
  background: rgba(255,255,255,0.35);
  transform: skewX(-25deg);
  transition: left 0.5s ease;
}

.prompt-box .refresh-btn:hover::after {
  left: 120%;
}

.prompt-box .refresh-btn:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 12px 24px rgba(93, 130, 255, 0.38);
}

.prompt-box .refresh-btn:active {
  transform: translateY(0);
  box-shadow: 0 6px 14px rgba(93, 130, 255, 0.28);
}

.conversation {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 26px;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.14);
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 1.75rem 2rem 1.25rem;
  border-bottom: 1px solid rgba(93, 130, 255, 0.08);
}

.avatar {
  width: 52px;
  height: 52px;
  background: rgba(93, 130, 255, 0.18);
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 1.8rem;
}

.header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #1e2a4a;
}

.header p {
  margin: 0.2rem 0 0;
  color: #5c6b93;
}

.message-list {
  padding: 1.8rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  overflow-y: auto;
  max-height: 520px;
}

.message-list::before {
  /* 可选顶部渐隐 */
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 16px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.message {
  display: flex;
}

.message.ai {
  justify-content: flex-start;
}

.message.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 80%;
  border-radius: 20px;
  padding: 1rem 1.2rem;
  background: rgba(246, 249, 255, 0.92);
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 12px 24px rgba(93, 130, 255, 0.12);
  position: relative;
  display: grid;
  gap: 0.4rem;
}

.message.user .bubble {
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  border: none;
}

.bubble time {
  font-size: 0.74rem;
  opacity: 0.6;
}

.typing {
  align-self: flex-start;
  display: inline-flex;
  gap: 0.3rem;
  background: rgba(246, 249, 255, 0.92);
  padding: 0.6rem 0.8rem;
  border-radius: 999px;
}

.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(93, 130, 255, 0.6);
  animation: bounce 1s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-6px);
  }
}

.placeholder {
  color: #5c6b93;
}

.composer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(93, 130, 255, 0.08);
  background: rgba(249, 252, 255, 0.88);
}

.composer textarea {
  border: 1px solid rgba(93, 130, 255, 0.18);
  border-radius: 16px;
  padding: 0.9rem 1.1rem;
  font-size: 1rem;
  resize: none;
}

.composer textarea:focus {
  outline: none;
  border-color: rgba(93, 130, 255, 0.5);
  box-shadow: 0 0 0 4px rgba(93, 130, 255, 0.18);
}

.composer button {
  border: none;
  border-radius: 14px;
  padding: 0.8rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.guide-btn {
  background: rgba(93, 130, 255, 0.12);
  color: #4d6bff;
}

.composer button[type="submit"] {
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  box-shadow: 0 12px 24px rgba(93, 130, 255, 0.2);
}

.session-list-scroll {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
  display: grid;
  gap: 0.8rem;
}

.session-list-scroll::-webkit-scrollbar {
  width: 6px;
}

.session-list-scroll::-webkit-scrollbar-thumb {
  background: rgba(93, 130, 255, 0.35);
  border-radius: 3px;
}

.session-item {
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(246, 249, 255, 0.85);
  border: 1px solid rgba(93, 130, 255, 0.08);
}

.session-item.active {
  border-color: rgba(93, 130, 255, 0.32);
  box-shadow: 0 8px 18px rgba(93, 130, 255, 0.18);
}

.session-list-scroll .loading,
.session-list-scroll .no-more {
  text-align: center;
  font-size: 0.8rem;
  color: #67759d;
  padding: 0.4rem 0;
}

.loading-older {
  text-align: center;
  font-size: 0.75rem;
  color: #7082a3;
}

.message-list {
  position: relative;
}

.message-list::before {
  /* 可选顶部渐隐 */
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 16px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
  pointer-events: none;
}

@media (max-width: 980px) {
  .chat {
    grid-template-columns: 1fr;
  }

  .session-panel {
    order: 2;
  }
}

@media (max-width: 640px) {
  .composer {
    grid-template-columns: 1fr;
  }

  .guide-btn {
    justify-self: flex-start;
  }
}
</style>
