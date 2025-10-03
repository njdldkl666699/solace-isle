<script setup lang="ts">
import { computed, reactive, ref, onMounted } from "vue";
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import {ElMessage} from "element-plus";

type HistoryView = "list" | "calendar";

const appStore = useAppStore();

const historyView = ref<HistoryView>("list");
const selectedEmoji = ref<string>("");
const entrySaved = ref(false);

const draft = reactive({
  content: "",
  attachmentName: "",
  tags: [] as string[],
});

const entries = computed(() => appStore.diary.entries);

const currentDate = computed(() => new Date().toISOString().slice(0, 10));
const activeMonth = ref(new Date(currentDate.value));

const calendarMap = computed(() => appStore.diary.entries);

const monthInfo = computed(() => {
  const year = activeMonth.value.getFullYear();
  const month = activeMonth.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstDayWeek = firstDay.getDay() || 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [] as { date: Date; inMonth: boolean; key: string }[];
  for (let i = 1; i < firstDayWeek; i++) {
    const date = new Date(year, month, 1 - (firstDayWeek - i));
    days.push({ date, inMonth: false, key: date.toISOString() });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({ date, inMonth: true, key: date.toISOString() });
  }
  const remainder = days.length % 7;
  if (remainder) {
    for (let i = 1; i <= 7 - remainder; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, inMonth: false, key: date.toISOString() });
    }
  }
  return { year, month, label: `${year}年${month + 1}月`, days };
});

const moodForDate = (date: Date) => {
  const key = date.toISOString().slice(0, 10);
  return calendarMap.value.find((entry) => entry.date === key)?.moodEmoji || "";
};

const smartTags = computed(() => appStore.diary.smartTags);

const handleSave = () => {
  entrySaved.value = true;
  window.setTimeout(() => {
    entrySaved.value = false;
    draft.content = "";
    draft.attachmentName = "";
    draft.tags = [];
    selectedEmoji.value = ""; // clear selected emoji after save
  }, 1200);
};

const handleEmojiSelect = (emoji: string) => {
  selectedEmoji.value = emoji === selectedEmoji.value ? "" : emoji; // toggle selection
};

const goPrevMonth = () => {
  activeMonth.value = new Date(activeMonth.value.getFullYear(), activeMonth.value.getMonth() - 1, 1);
};

const goNextMonth = () => {
  activeMonth.value = new Date(activeMonth.value.getFullYear(), activeMonth.value.getMonth() + 1, 1);
};

const addTag = (tag: string) => {
  if (!draft.tags.includes(tag)) {
    draft.tags.push(tag);
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  draft.attachmentName = file?.name ?? "";
};

const getEntries = async () => {
  try {
    // 这里的 date 参数需要传入当前要查询的月份，格式为 YYYY-MM
    const date = `${activeMonth.value.getFullYear()}-${String(activeMonth.value.getMonth() + 1).padStart(2, '0')}`;
    const response = await api.get("/diary", { params: { date:  date} });

    if(response.data.code === 1){
      appStore.updateEntries(response.data.data);
    }else {
      ElMessage.error("无法获取心灵日记");
    }
  }catch (err: any){
    ElMessage.error("无法获取心灵日记");
  }
}

onMounted(() => {
  getEntries();
});
</script>

<template>
  <AppShell page-title="心灵日记本" subtitle="在这里，任何情绪都值得被温柔放下。">
    <div class="diary">
      <section class="record-panel">
        <div class="text-entry">
          <!-- 合并的快速打卡区域，放在智能情绪标签上方 -->
          <div class="quick-emoji-block">
            <p class="title">用一个表情描述现在的你</p>
            <div class="emoji-row">
              <button
                v-for="option in appStore.diary.quickEmojis"
                :key="option.emoji"
                type="button"
                :class="{ active: selectedEmoji === option.emoji }"
                @click="handleEmojiSelect(option.emoji)"
              >
                <span>{{ option.emoji }}</span>
                <small>{{ option.label }}</small>
              </button>
            </div>
          </div>

          <textarea v-model="draft.content" placeholder="此刻，你有什么想说的…" rows="8" />

          <div class="tag-suggestions">
            <span>智能情绪标签</span>
            <div class="chips">
              <button
                v-for="tag in smartTags"
                :key="tag"
                type="button"
                class="chip"
                :class="{ selected: draft.tags.includes(tag) }"
                @click="addTag(tag)"
              >
                #{{ tag }}
              </button>
            </div>
          </div>

          <div class="attachments">
            <label>
              上传图片
              <input type="file" accept="image/*" @change="handleFileChange" />
              <small v-if="draft.attachmentName" class="file-name">{{ draft.attachmentName }}</small>
            </label>
          </div>

          <div class="save-row">
            <p v-if="entrySaved" class="hint">已保存到你的私人日记。</p>
            <button class="primary" type="button" @click="handleSave">保存记录</button>
          </div>
        </div>
      </section>

      <!-- 历史面板保持不变 -->
      <section class="history-panel">
        <div class="history-header">
          <h3>历史回顾</h3>
          <div class="view-switch">
            <button type="button" :class="{ active: historyView === 'list' }" @click="historyView = 'list'">列表</button>
            <button type="button" :class="{ active: historyView === 'calendar' }" @click="historyView = 'calendar'">日历</button>
          </div>
        </div>
        <div class="calendar-nav">
          <button type="button" @click="goPrevMonth">←</button>
          <span>{{ monthInfo.label }}</span>
          <button type="button" @click="goNextMonth">→</button>
        </div>
        <div v-if="historyView === 'list'" class="entry-list">
          <article v-for="entry in entries" :key="entry.date" class="entry-card">
            <header>
              <span class="emoji">{{ entry.moodEmoji }}</span>
              <div>
                <p class="date">{{ entry.date }}</p>
                <p class="label">{{ entry.moodLabel }}</p>
                <img v-if="entry.image" :src="entry.image" alt="图片不见了"/>
              </div>
              <div class="tags">
                <span v-for="tag in entry.tags" :key="tag">#{{ tag }}</span>
              </div>
            </header>
            <p>{{ entry.content }}</p>
          </article>
        </div>
        <div v-else class="calendar-view">
          <div class="calendar-grid">
            <span class="weekday" v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day">周{{ day }}</span>
            <div
              v-for="item in monthInfo.days"
              :key="item.key"
              class="day"
              :class="{ 'out-month': !item.inMonth }"
            >
              <span class="date">{{ item.date.getDate() }}</span>
              <span class="mood" v-if="moodForDate(item.date)">{{ moodForDate(item.date) }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.diary {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 2rem;
}

/* 新增：恢复容器布局并统一内部元素间距（含表情块与 textarea 之间的间距）*/
.text-entry {
  display: flex;
  flex-direction: column;
  gap: 1.2rem; /* 控制表情选择区与 textarea 之间、以及其他元素的竖直间距 */
}

.text-entry textarea {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  resize: vertical; /* 仅上下拖动 */
  padding: 0.9rem 1rem;
  line-height: 1.5;
  font: inherit;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(93,130,255,0.28);
  border-radius: 18px;
  color: #2f3a60;
  overflow: auto;
}
.text-entry textarea:focus {
  outline: none;
  border-color: #5d82ff;
  box-shadow: 0 0 0 3px rgba(93,130,255,0.18);
}

.record-panel,
.history-panel {
  background: rgba(255, 255, 255, 0.86);
  border-radius: 26px;
  padding: 2rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 36px rgba(93, 120, 190, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.quick-emoji-block {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.quick-emoji-block .title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #4a5d8a;
}

.quick-emoji-block .emoji-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 0.8rem;
}

.emoji-row button {
  border: none;
  border-radius: 18px;
  padding: 0.9rem 0.6rem;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 12px 24px rgba(93, 130, 255, 0.12);
  display: grid;
  gap: 0.35rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.emoji-row button.active,
.emoji-row button:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(93, 130, 255, 0.2);
}

.emoji-row span {
  font-size: 1.6rem;
}

.tag-suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #5c6b93;
}

.chips {
  margin-top: 0.4rem;
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.chip {
  border: 1px solid rgba(93, 130, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  color: #445784;
  transition: all 0.2s ease;
}

.chip.selected,
.chip:hover {
  border-color: rgba(93, 130, 255, 0.6);
  background: rgba(93, 130, 255, 0.12);
}

.attachments {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #54648d;
}

.attachments label {
  display: inline-flex;
  flex-direction: column;
  gap: 0.4rem;
  font-weight: 600;
  color: #2f3a60;
}

.attachments input {
  padding: 0.6rem 0.9rem;
  border-radius: 14px;
  border: 1px dashed rgba(13, 246, 32, 0.3);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  cursor: pointer;
}
/* 自定义文件选择按钮为圆角胶囊 */
.attachments input[type="file"]::file-selector-button,
.attachments input[type="file"]::-webkit-file-upload-button {
  margin-right: .9rem;
  background: linear-gradient(135deg,#5d82ff,#8fa3ff);
  color: #fff;
  border: 1px solid #5d82ff;
  padding: .5rem 1.2rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: .8rem;
  letter-spacing: .5px;
  cursor: pointer;
  transition: background .2s ease, box-shadow .2s ease, transform .15s ease;
}
.attachments input[type="file"]::file-selector-button:hover,
.attachments input[type="file"]::-webkit-file-upload-button:hover {
  background: linear-gradient(135deg,#5477ee,#7d97f5);
  box-shadow: 0 6px 16px -4px rgba(93,130,255,.45);
}
.attachments input[type="file"]::file-selector-button:active,
.attachments input[type="file"]::-webkit-file-upload-button:active {
  transform: translateY(1px);
  box-shadow: 0 3px 10px -3px rgba(93,130,255,.4);
}
.attachments input[type="file"]:focus-visible::file-selector-button {
  outline: 2px solid #5d82ff;
  outline-offset: 2px;
}
/* 深色背景兼容（如果以后容器改色） */
@media (prefers-color-scheme: dark) {
  .attachments input[type="file"]::file-selector-button,
  .attachments input[type="file"]::-webkit-file-upload-button {
    background: linear-gradient(135deg,#6b8dff,#9fb6ff);
    border-color: #6b8dff;
  }
}

.primary {
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  border: none;
  border-radius: 14px;
  padding: 0.7rem 1.4rem;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 16px 32px rgba(93, 130, 255, 0.18);
  margin-top: 1rem;
}

.hint {
  margin: 0;
  color: #4d6bff;
  font-size: 0.9rem;
}

.save-row {
  display: flex;
  flex-direction: column; /* 改为纵向堆叠 */
  align-items: center;    /* 水平居中 */
  gap: 0.6rem;            /* 间距缩小以适配纵向布局 */
  justify-content: center;
}

.save-row .hint {
  margin: 0;              /* 移除自动推开布局 */
  margin-right: 0;
}

.file-name { /* 还原文件名样式，避免空规则警告 */
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #5c6b93;
  font-weight: 400;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-switch {
  display: inline-flex;
  background: rgba(93, 130, 255, 0.08);
  border-radius: 999px;
  padding: 0.25rem;
}

.view-switch button {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  color: #4a5d8a;
  font-weight: 600;
  cursor: pointer;
}

.view-switch button.active {
  background: #fff;
}

.entry-list {
  display: grid;
  gap: 1.2rem;
}

.entry-card {
  padding: 1.35rem 1.5rem;
  border-radius: 20px;
  background: rgba(246, 249, 255, 0.8);
  border: 1px solid rgba(93, 130, 255, 0.1);
  display: grid;
  gap: 0.9rem;
}

.entry-card header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.entry-card .emoji {
  font-size: 1.8rem;
}

.entry-card .date {
  margin: 0;
  font-weight: 600;
  color: #29355a;
}

.entry-card .label {
  margin: 0;
  color: #526187;
}

.entry-card .tags {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.entry-card .tags span {
  background: rgba(93, 130, 255, 0.14);
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  font-size: 0.85rem;
  color: #4a5d8a;
}

.calendar-view {
  display: grid;
  gap: 1rem;
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-weight: 600;
  color: #2f3a60;
}

.calendar-nav button {
  border: none;
  background: rgba(93, 130, 255, 0.12);
  border-radius: 12px;
  width: 34px;
  height: 34px;
  cursor: pointer;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.6rem;
}

.weekday {
  text-align: center;
  font-weight: 600;
  color: #4a5d8a;
}

.day {
  min-height: 72px;
  border-radius: 16px;
  background: rgba(246, 249, 255, 0.9);
  border: 1px solid rgba(93, 130, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.day.out-month {
  opacity: 0.35;
}

.day .date {
  font-weight: 600;
  color: #2f3a60;
}

.day .mood {
  font-size: 1.2rem;
}

/* 新增：限制 textarea 只能竖直方向拉伸，宽度始终占满容器且不可被拖宽 */
.text-entry textarea {
  width: 100%;
  max-width: 100%; /* 防止某些浏览器在 resize:vertical 时仍然可横向溢出 */
  box-sizing: border-box;
  resize: vertical; /* 仅允许上下方向 */
  overflow: auto; /* 保持内容可滚动 */
  padding: 0.9rem 1rem;
  line-height: 1.5;/*良好的行高，提升可读性*/
  border: 1px solid rgba(93,130,255,0.28);
  border-radius: 18px;/*设置圆角*/
  background: rgba(255,255,255,0.92);
  font: inherit;/*继承字体样式*/
  color: #2f3a60;
}

/*聚焦样式状态*/
.text-entry textarea:focus {
  outline: none;/*移除默认的轮廓线*/
  border-color: #5d82ff;
  box-shadow: 0 0 0 3px rgba(93,130,255,0.18);
}

@media (max-width: 1080px) {
  .diary {
    grid-template-columns: 1fr;
  }

  .record-panel,
  .history-panel {
    padding: 1.6rem;
  }
}

@media (max-width: 640px) {
  .emoji-row {
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  }

  .calendar-grid {
    gap: 0.4rem;
  }
}
</style>
