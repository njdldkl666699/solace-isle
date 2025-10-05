<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from "vue";
import AppShell from "../components/layout/AppShell.vue";
import {type ChatList, type ChatMessage, type ChatSession, useAppStore} from "../stores/appStore";
import api from "../api/request.ts";
import { ElMessage } from "element-plus";

const appStore = useAppStore();
const session = ref<ChatSession>();
const chatList = ref<ChatList[]>([]);

const draft = ref("");
const isTyping = ref(false);
const messageContainer = ref<HTMLDivElement | null>(null);

const quickPrompts = computed(() => appStore.chat.quickPrompts);

const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
};

const addUserMessage = (content: string, date: string) => {
  if (!session.value) return;

  const newMessage: ChatMessage = {
    role: "user",
    content: content,
    createdAt: date,
  };

  session.value.messages.push(newMessage);
};

const addAIMessage = (content: string, date: string) => {
  if (!session.value) return;

  const newMessage: ChatMessage = {
    role: "ai",
    content: content,
    createdAt: date,
  };

  session.value.messages.push(newMessage);
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

  // 添加用户消息
  addUserMessage(content ,new Date().toISOString());
  scrollToBottom();

  isTyping.value = true;
  //调用API获取AI回复

  isTyping.value = false;
};

const usePrompt = (prompt: string) => {
  draft.value = prompt;
};

const getQuickPrompts = async () => {
  try {
    const response = await api.get("/chat");

    if(response.data.code === 1){
      appStore.setQuickPrompts(response.data.data || []);
    } else {
      ElMessage.error("获取快捷提示词失败，请稍后重试。");
    }
  } catch (error) {
    ElMessage.error("获取快捷提示词失败，请稍后重试。");
  }
};

const createNewSession = async () => {
  try {
    const response = await api.get("/chat/sessions");

    if (response.data.code === 1) {
      appStore.chat.activeSessionId = response.data.data;
      session.value = {
        id: response.data.data,
        title: "新的对话",
        messages: [] as ChatMessage[],
        updatedAt: new Date().toISOString(),
      }
    } else {
      ElMessage.error("创建新对话失败，请稍后重试。");
    }
  } catch (error) {
    ElMessage.error("创建新对话失败，请稍后重试。");
  }
};

watch(
  () => session.value?.messages.length,
  () => {
    scrollToBottom();
  }
);

onMounted(() => {
  getQuickPrompts();
  createNewSession();
})
</script>

<template>
  <AppShell page-title="AI 心理伙伴" subtitle="在这里，总有人愿意倾听你的故事。">
    <div class="chat">
      <aside class="session-panel">
        <p class="panel-title">我的对话</p>
        <ul>
          <li v-if="!chatList">暂无会话</li>
          <li v-else v-for="chat in chatList" class="active">
            <div class="session-title">{{ chat.title }}</div>
            <p class="time">最近更新：{{ new Date(chat.updatedAt).toLocaleString("zh-CN", { hour12: false }) }}</p>
          </li>
        </ul>

        <div class="prompt-box">
          <p>不知道从哪里开始？可以试试：</p>
          <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="usePrompt(prompt)">
            {{ prompt }}
          </button>
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
          <template v-if="session">
            <article v-for="message in session.messages" class="message" :class="message.role">
              <div class="bubble">
                <p>{{ message.content }}</p>
                <time>{{
                  new Date(message.createdAt).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                }}</time>
              </div>
            </article>
            <div v-if="isTyping" class="typing">
              <span />
              <span />
              <span />
            </div>
          </template>
          <p v-else class="placeholder">开始第一段对话，让我认识你。</p>
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
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
