<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";

type DiaryTab = "text" | "quick";
type HistoryView = "list" | "calendar";

const appStore = useAppStore();

const activeTab = ref<DiaryTab>("text");
const historyView = ref<HistoryView>("list");
const selectedEmoji = ref<string>("");
const entrySaved = ref(false);

const draft = reactive({
  content: "",
  attachmentName: "",
  tags: [] as string[],
});

const entries = computed(() => appStore.diary.entries);

const latestDate = computed(() => entries.value[0]?.date ?? new Date().toISOString().slice(0, 10));
const activeMonth = ref(new Date(latestDate.value));

const calendarMap = computed(() => appStore.diary.calendar);

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
  return {
    year,
    month,
    label: `${year}年${month + 1}月`,
    days,
  };
});

const moodForDate = (date: Date) => {
  const key = date.toISOString().slice(0, 10);
  return calendarMap.value[key];
};

const smartTags = computed(() => appStore.diary.smartTags);

const handleSave = () => {
  entrySaved.value = true;
  window.setTimeout(() => {
    entrySaved.value = false;
    draft.content = "";
    draft.attachmentName = "";
    draft.tags = [];
  }, 1200);
};

const handleEmojiSelect = (emoji: string) => {
  selectedEmoji.value = emoji;
  entrySaved.value = true;
  window.setTimeout(() => {
    entrySaved.value = false;
    selectedEmoji.value = "";
  }, 900);
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
</script>

<template>
  <AppShell page-title="心灵日记本" subtitle="在这里，任何情绪都值得被温柔放下。">
    <div class="diary">
      <section class="record-panel">
        <div class="tab-switch">
          <button
            v-for="tab in [
              { id: 'text', label: '文字记录', emoji: '📝' },
              { id: 'quick', label: '快速打卡', emoji: '⚡' },
            ]"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            type="button"
            @click="activeTab = tab.id as DiaryTab"
          >
            <span>{{ tab.emoji }}</span>
            {{ tab.label }}
          </button>
        </div>

        <div v-if="activeTab === 'text'" class="text-entry">
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
            </label>
            <p>
              {{ draft.attachmentName ? `已选择：${draft.attachmentName}` : "AI 会辅助读取图片情绪元素。" }}
            </p>
          </div>

          <button class="primary" type="button" @click="handleSave">保存记录</button>
          <p v-if="entrySaved" class="hint">已保存到你的私人日记。</p>
        </div>

        <div v-else class="quick-entry">
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
          <p v-if="entrySaved" class="hint">已打卡，感谢你对情绪的诚实。</p>
        </div>
      </section>

      <section class="history-panel">
        <div class="history-header">
          <h3>历史回顾</h3>
          <div class="view-switch">
            <button type="button" :class="{ active: historyView === 'list' }" @click="historyView = 'list'">
              列表
            </button>
            <button type="button" :class="{ active: historyView === 'calendar' }" @click="historyView = 'calendar'">
              日历
            </button>
          </div>
        </div>

        <div v-if="historyView === 'list'" class="entry-list">
          <article v-for="entry in entries" :key="entry.id" class="entry-card">
            <header>
              <span class="emoji">{{ entry.moodEmoji }}</span>
              <div>
                <p class="date">{{ entry.date }}</p>
                <p class="label">{{ entry.moodLabel }}</p>
              </div>
              <div class="tags">
                <span v-for="tag in entry.tags" :key="tag">#{{ tag }}</span>
              </div>
            </header>
            <p>{{ entry.content }}</p>
          </article>
        </div>

        <div v-else class="calendar-view">
          <div class="calendar-nav">
            <button type="button" @click="goPrevMonth">←</button>
            <span>{{ monthInfo.label }}</span>
            <button type="button" @click="goNextMonth">→</button>
          </div>
          <div class="calendar-grid">
            <span class="weekday" v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day"
              >周{{ day }}</span
            >
            <div v-for="item in monthInfo.days" :key="item.key" class="day" :class="{ 'out-month': !item.inMonth }">
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

.tab-switch {
  display: inline-flex;
  padding: 0.35rem;
  background: rgba(93, 130, 255, 0.08);
  border-radius: 999px;
  gap: 0.3rem;
}

.tab-btn {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
  font-weight: 600;
  color: #4a5d8a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #fff;
  box-shadow: 0 10px 20px rgba(93, 130, 255, 0.18);
  color: #2d3a63;
}

.text-entry textarea {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(93, 130, 255, 0.18);
  padding: 1.1rem 1.25rem;
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 180px;
}

.text-entry textarea:focus {
  outline: none;
  border-color: rgba(93, 130, 255, 0.5);
  box-shadow: 0 0 0 4px rgba(93, 130, 255, 0.18);
}

.tag-suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #5c6b93;
}

.chips {
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
  border: 1px dashed rgba(93, 130, 255, 0.3);
  background: rgba(255, 255, 255, 0.85);
}

.primary {
  align-self: flex-end;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  border: none;
  border-radius: 14px;
  padding: 0.7rem 1.4rem;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 16px 32px rgba(93, 130, 255, 0.18);
}

.hint {
  margin: 0;
  color: #4d6bff;
  font-size: 0.9rem;
}

.quick-entry {
  display: grid;
  gap: 1.25rem;
  text-align: center;
}

.quick-entry .title {
  margin: 0;
  font-size: 1.1rem;
  color: #4a5d8a;
}

.emoji-row {
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
