<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from "vue";
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import { ElMessage } from "element-plus";
import type { DiaryEntry } from "../stores/appStore";

// 新增：本地日期格式化函数，避免使用 toISOString 产生的时区偏移
const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type HistoryView = "list" | "calendar";

const appStore = useAppStore();

const historyView = ref<HistoryView>("list");
const selectedEmoji = ref<string>("");
const entrySaved = ref(false);

// 新增：选择的文件
const selectedFile = ref<File | null>(null);

const draft = reactive({
  moodEmoji: "",
  moodLabel: "",
  content: "",
  image: "",//URL
  tags: [] as string[],
});

const entries = computed(() => appStore.diary.entries);

// 使用本地当前时间避免解析 YYYY-MM-DD 触发 UTC 偏移
const activeMonth = ref(new Date());

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
    days.push({ date, inMonth: false, key: formatLocalDate(date) });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({ date, inMonth: true, key: formatLocalDate(date) });
  }
  const remainder = days.length % 7;
  if (remainder) {
    for (let i = 1; i <= 7 - remainder; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, inMonth: false, key: formatLocalDate(date) });
    }
  }
  return { year, month, label: `${year}年${month + 1}月`, days };
});

const moodForDate = (date: Date) => {
  const key = formatLocalDate(date);
  return calendarMap.value.find((entry) => entry.date === key)?.moodEmoji || "";
};

// const smartTags = ref<string[]>([]);
const tagInput = ref("");
// 新增：内部输入框 ref 与聚焦方法
const tagInnerInput = ref<HTMLInputElement | null>(null);
const focusTagInput = () => tagInnerInput.value?.focus();

// 新增：提交输入标签
const commitTag = () => {
  const value = tagInput.value.trim();
  if (!value) return;
  if (!draft.tags.includes(value)) {
    draft.tags.push(value);
  }
  tagInput.value = "";
};

// 新增：键盘事件（回车提交）
const handleTagKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitTag();
  }
};

// 新增：移除标签
const removeSmartTag = (tag: string) => {
  draft.tags = draft.tags.filter(t => t !== tag);
};

// 生成智能标签保持不变
const getSmartTags = async () => {
  try {
    const response = await api.post("/diary/tags", { content: draft.content });

    if(response.data.code === 1){
      // 后端若返回数组或单个标签，做兼容
      const data = response.data.data;
      if (Array.isArray(data)) {
        data.forEach((t: string) => { if (t && !draft.tags.includes(t)) draft.tags.push(t); });
      } else if (typeof data === 'string') {
        if (data && !draft.tags.includes(data)) draft.tags.push(data);
      }
    }else {
      ElMessage.error("无法生成情绪标签");
    }
  }catch (err: any){
    ElMessage.error("无法生成情绪标签");
  }
};

const handleSave = async () => {
  entrySaved.value = true;
  // 仅当存在文件时才上传
  if (selectedFile.value) {
    draft.image = await uploadFile();
    if (!draft.image) {
      entrySaved.value = false;
      return; // 上传失败则不继续
    }
  }
  try {
    const response = await api.post("/diary", {
      moodEmoji: draft.moodEmoji,
      moodLabel: draft.moodLabel,
      content: draft.content,
      image: draft.image,
      tags: draft.tags,
    });

    if(response.data.code === 1){
      await getEntries(); // 保存成功后刷新列表
      ElMessage.success("已保存到你的私人日记");
      entrySaved.value = false;
      draft.moodEmoji="";
      draft.moodLabel="";
      draft.content="";
      draft.image="";
      draft.tags=[];
      selectedFile.value = null; // 重置已选文件
      selectedEmoji.value = "";
    }else {
      ElMessage.error("保存失败，请稍后再试");
      entrySaved.value = false;
    }
  }catch (err){
    ElMessage.error("保存失败，请稍后再试");
    entrySaved.value = false;
  }
};

const uploadFile = async (): Promise<string> => {
  if (!selectedFile.value) return ""; // 没选择文件则返回空串
  const formData = new FormData();
  formData.append("file", selectedFile.value);
  try {
    const res = await api.post("/common/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    if (res.data.code === 1) {
      return res.data.data as string;
    } else {
      ElMessage.error("图片上传失败");
      return "";
    }
  } catch (e) {
    ElMessage.error("图片上传失败");
    return "";
  }
};

const handleEmojiSelect = (emoji: string) => {
  if (selectedEmoji.value === emoji) {
    selectedEmoji.value = "";
    draft.moodEmoji = "";
    draft.moodLabel = "";
  } else {
    selectedEmoji.value = emoji;
    const found = appStore.diary.quickEmojis.find(e => e.emoji === emoji);
    draft.moodEmoji = emoji;
    draft.moodLabel = found?.label || "";
  }
};

const goPrevMonth = () => {
  activeMonth.value = new Date(activeMonth.value.getFullYear(), activeMonth.value.getMonth() - 1, 1);
};

const goNextMonth = () => {
  activeMonth.value = new Date(activeMonth.value.getFullYear(), activeMonth.value.getMonth() + 1, 1);
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedFile.value = file;
  }
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

watch(activeMonth,() => getEntries());

onMounted(() => {
  getEntries();
});

// 管理快速表情相关状态
const manageDialogVisible = ref(false);
const newEmoji = ref("");
const newLabel = ref("");
const emojiPaletteVisible = ref(false);
const QUICK_EMOJI_LIMIT = 20; // 适度限制，避免过多撑坏布局

// 简单表情面板数据（常用分类的一小部分）
const emojiPalette = [
  "😀","😃","😄","😁","😆","🥹","😂","🤣","😊","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥱","😤","😠","😡","😶","😐","😑","😯","😦","😧","😢","😭","😮","😲","🤯","😳","🥺","😨","😰","😥","😱","😓","🤗","🤔","🤤","😴","😪","🤢","🤮","🤧","😷","🤒","🤕","🫡","🤠","😇","🤫","🤭","🫢","🫣","🤥","😈","👿","💀","☠️","👻","👽","👾","🤖","🎃"
];

const openManageDialog = () => {
  manageDialogVisible.value = true;
  newEmoji.value = "";
  newLabel.value = "";
  emojiPaletteVisible.value = false;
};

const selectPaletteEmoji = (emo: string) => {
  newEmoji.value = emo;
  emojiPaletteVisible.value = false;
};

const addQuickEmoji = () => {
  if (appStore.diary.quickEmojis.length >= QUICK_EMOJI_LIMIT) {
    ElMessage.warning(`最多添加 ${QUICK_EMOJI_LIMIT} 个表情`);
    return;
  }
  const emoji = newEmoji.value.trim();
  const label = newLabel.value.trim();
  if (!emoji || !label) {
    ElMessage.warning("请先选择表情并填写标签");
    return;
  }
  if (emoji.length > 4) {
    ElMessage.warning("请使用单个表情");
    return;
  }
  const ok = appStore.addQuickEmoji(emoji, label);
  if (!ok) {
    ElMessage.error("添加失败：表情已存在");
    return;
  }
  ElMessage.success("已添加");
  newEmoji.value = "";
  newLabel.value = "";
};

const removeQuickEmoji = (emoji: string) => {
  const ok = appStore.removeQuickEmoji(emoji);
  if (ok) {
    if (selectedEmoji.value === emoji) {
      selectedEmoji.value = "";
      draft.moodEmoji = "";
      draft.moodLabel = "";
    }
    ElMessage.success("已删除");
  }
};

// 允许用户粘贴/输入，但只保留第一个“表情”/字符（使用 Array.from 处理代理对）
const sanitizeEmojiInput = () => {
  // 允许用户粘贴/输入，但只保留第一个“表情”/字符（使用 Array.from 处理代理对）
  let val = newEmoji.value.trim();
  if (!val) return;
  const chars = Array.from(val);
  if (chars.length > 1) {
    // 如果第一个是组合表情（例如国旗、肤色），尽量保留最初粘贴的前两个以内（简单策略）
    newEmoji.value = chars[0] as string;
  } else {
    newEmoji.value = val;
  }
  // 过滤掉常规字母数字（如果需要严格限制，可加更详细的正则，这里只是简单判断长度）
  if (newEmoji.value.length > 4) {
    newEmoji.value = Array.from(newEmoji.value)[0] as string;
  }
};

watch(newEmoji, () => sanitizeEmojiInput());

const dayEntryDialogVisible = ref(false);
const dayEntry = ref<DiaryEntry | null>(null);

const openDayEntry = (date: Date) => {
  const key = formatLocalDate(date);
  const entry = entries.value.find(e => e.date === key) || null;
  if (entry) {
    dayEntry.value = entry;
    dayEntryDialogVisible.value = true;
  }
};

const closeDayEntry = () => {
  dayEntryDialogVisible.value = false;
  dayEntry.value = null;
};
</script>

<template>
  <AppShell page-title="心灵日记本" subtitle="在这里，任何情绪都值得被温柔放下。">
    <div class="diary">
      <section class="record-panel">
        <div class="text-entry">
          <div class="quick-emoji-block">
            <div class="title-row">
              <p class="title">用一个表情描述现在的你</p>
              <button class="manage-btn" type="button" @click="openManageDialog">管理</button>
            </div>
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

          <!-- 替换：标签输入与展示框 -->
          <div class="tag-area">
            <div class="tag-header">
              <span class="label">情绪标签</span>
              <button type="button" class="gen-btn" @click="getSmartTags">智能生成</button>
            </div>
            <div class="tag-input-wrapper" @click="focusTagInput">
              <div
                v-for="tag in draft.tags"
                :key="tag"
                class="tag-item"
                :class="{ selected: draft.tags.includes(tag) }"
              >
                <span class="hash">#</span>{{ tag }}
                <button type="button" class="remove-tag" title="删除" @click.stop="removeSmartTag(tag)">×</button>
              </div>
              <input
                ref="tagInnerInput"
                v-model="tagInput"
                placeholder="输入后回车创建…"
                @keydown="handleTagKeydown"
                class="tag-text-input"
                maxlength="12"
              />
            </div>
            <small class="tag-hint">输入后按回车创建标签 ；点击 × 号删除标签。</small>
          </div>

          <div class="attachments">
            <label>
              上传图片
              <input type="file" accept="image/*" @change="handleFileChange" />
            </label>
          </div>
          <p v-if="selectedFile" class="file-name">{{ selectedFile.name }}</p>

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
            <header class="entry-header">
              <span class="emoji">{{ entry.moodEmoji }}</span>
              <div class="meta-row">
                <p class="date">{{ entry.date }}</p>
                <p class="label">{{ entry.moodLabel }}</p>
              </div>
              <div class="tags">
                <span v-for="tag in entry.tags" :key="tag">#{{ tag }}</span>
              </div>
            </header>
            <p>{{ entry.content }}</p>
            <img v-if="entry.image" :src="entry.image" alt="图片不见了" class="entry-image" />
          </article>
        </div>
        <div v-else class="calendar-view">
          <div class="calendar-grid">
            <span class="weekday" v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day">周{{ day }}</span>
            <div
              v-for="item in monthInfo.days"
              :key="item.key"
              class="day"
              :class="{ 'out-month': !item.inMonth, 'has-entry': moodForDate(item.date) }"
              @click="openDayEntry(item.date)"
            >
              <span class="date">{{ item.date.getDate() }}</span>
              <span class="mood" v-if="moodForDate(item.date)">{{ moodForDate(item.date) }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AppShell>

  <!-- 管理快速表情对话框 -->
  <el-dialog v-model="manageDialogVisible" title="管理快速表情" width="560px" class="quick-emoji-dialog">
    <div class="current-emojis">
      <p class="section-label">当前表情（点击删除）</p>
      <div class="emoji-grid">
        <div
          v-for="qe in appStore.diary.quickEmojis"
          :key="qe.emoji"
          class="emoji-item"
          @click="removeQuickEmoji(qe.emoji)"
          :title="`删除: ${qe.label}`"
        >
          <span class="emo">{{ qe.emoji }}</span>
          <span class="lbl">{{ qe.label }}</span>
          <span class="del-hint">×</span>
        </div>
        <p v-if="!appStore.diary.quickEmojis.length" class="empty">暂无表情</p>
      </div>
    </div>

    <div class="add-form">
      <p class="section-label">新增表情</p>
      <div class="row">
        <div class="emoji-picker-field">
          <input class="emoji-display" v-model="newEmoji" placeholder="表情" @input="sanitizeEmojiInput" @click="emojiPaletteVisible = !emojiPaletteVisible" />
          <button type="button" class="toggle-emoji" @click="emojiPaletteVisible = !emojiPaletteVisible">选择</button>
          <div v-if="emojiPaletteVisible" class="emoji-palette" @click.stop>
            <div class="palette-grid">
              <button type="button" v-for="emo in emojiPalette" :key="emo" @click="selectPaletteEmoji(emo)">{{ emo }}</button>
            </div>
          </div>
        </div>
        <input class="label-input" v-model="newLabel" maxlength="6" placeholder="标签(<=6)" />
        <button type="button" class="add-btn" @click="addQuickEmoji">添加</button>
      </div>
      <small class="hint-line">上限 {{ QUICK_EMOJI_LIMIT }} 个；点击上方已有表情即可删除；可直接输入或使用“选择”面板。</small>
    </div>

    <template #footer>
      <el-button @click="manageDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 日记内容查看对话框 -->
  <el-dialog v-model="dayEntryDialogVisible" width="600px" class="day-entry-dialog" :title="dayEntry ? dayEntry.date + ' 的日记' : '日记'">
    <div v-if="dayEntry" class="day-entry-body">
      <div class="header-line">
        <span class="emoji">{{ dayEntry.moodEmoji }}</span>
        <div class="meta">
          <p class="mood-label">{{ dayEntry.moodLabel }}</p>
          <div class="tags" v-if="dayEntry.tags?.length">
            <span v-for="tag in dayEntry.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>
        </div>
      </div>
      <p class="content">{{ dayEntry.content }}</p>
      <img v-if="dayEntry.image" :src="dayEntry.image" class="preview" alt="日记图片" />
    </div>
    <template #footer>
      <el-button @click="closeDayEntry">关闭</el-button>
    </template>
  </el-dialog>
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
  border: 1px solid rgba(93, 130, 255, 0.28);
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

.tag-area { display: flex; flex-direction: column; gap: .5rem; }
.tag-header { display: flex; align-items: center; justify-content: space-between; }
.tag-header .label { font-size: .9rem; font-weight: 600; color:#4a5d8a; }
.gen-btn { border:1px solid rgba(93,130,255,.4); background:rgba(255,255,255,.85); color:#4a5d8a; padding:.35rem .9rem; border-radius:14px; font-size:.75rem; font-weight:600; cursor:pointer; transition:background .2s, box-shadow .2s; }
.gen-btn:hover { background:#fff; box-shadow:0 4px 10px rgba(93,130,255,.18); }

.tag-input-wrapper { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; padding:.55rem .7rem; min-height:54px; border:1px solid rgba(93,130,255,.28); background:rgba(255,255,255,.9); border-radius:18px; cursor:text; }
.tag-item { position:relative; display:inline-flex; align-items:center; gap:.25rem; padding:.35rem .85rem .35rem .7rem; font-size:.75rem; font-weight:600; background:linear-gradient(135deg,#eef3ff,#f8faff); color:#486098; border:1px solid rgba(93,130,255,.35); border-radius:999px; line-height:1; cursor:pointer; transition:background .2s, border-color .2s, transform .15s; }
.tag-item.selected { background:rgba(93,130,255,.18); border-color:rgba(93,130,255,.6); }
.tag-item:hover { border-color:rgba(93,130,255,.55); }
.tag-item .hash { opacity:.6; }
.remove-tag { position:absolute; top:-6px; right:-6px; width:18px; height:18px; border:none; background:#fff; color:#5d74a7; font-size:12px; font-weight:600; border-radius:50%; box-shadow:0 2px 6px rgba(93,130,255,.35); cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; padding:0; }
.remove-tag:hover { background:#5d82ff; color:#fff; }
.tag-text-input { flex:1; min-width:120px; border:none; outline:none; background:transparent; padding:.35rem .2rem; font:inherit; color:#2f3a60; }
.tag-text-input::placeholder { color:#8fa0c3; font-size:.75rem; }
.tag-hint { font-size:.65rem; color:#6b7aa6; }

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

.entry-card header.entry-header { /* 让 emoji 固定左上，其余内容在右侧 */
  display: grid;
  grid-template-columns: auto 1fr auto; /* emoji | meta | tags */
  align-items: start;
  column-gap: 1rem;
  row-gap: .35rem;
  padding: 0; /* 保持紧凑 */
}
.entry-card header.entry-header .emoji {
  grid-column: 1;
  grid-row: 1;
  font-size: 1.9rem;
  line-height: 1;
  align-self: start; /* 顶部对齐 */
}
.entry-card header.entry-header .meta-row {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-wrap: wrap;
  gap: .65rem;
  align-items: baseline;
  min-width: 0;
}
.entry-card header.entry-header .tags {
  grid-column: 3;
  grid-row: 1;
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
  justify-content: flex-end;
}
/* 移除旧 header 内部图片，改为 header 下单独一行 */
.entry-card header img { display: none; }
.entry-card > img.entry-image {
  /* 居中显示：左右 auto */
  margin: .1rem auto 0; /* 顶部 0.1rem，水平居中 */
  display: block;
  max-width: 500px;
  max-height: 500px;
  width: auto;
  height: auto;
  border-radius: 14px;
  object-fit: contain;
  background: #f2f5fa;
  box-shadow: 0 4px 12px rgba(93,130,255,0.12);
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

.day.has-entry { cursor: pointer; border-color: rgba(93,130,255,0.28); box-shadow: 0 4px 10px rgba(93,130,255,0.18); }
.day.has-entry:hover { background: #fff; }

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

.title-row { display: flex; align-items: center; justify-content: space-between; }
.manage-btn {
  border: 1px solid rgba(93,130,255,0.35);
  background: rgba(255,255,255,0.7);
  padding: 0.35rem 0.8rem;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: background .2s;
}
.manage-btn:hover { background: #fff; }
.quick-emoji-dialog :deep(.el-dialog__body){ padding-top: 0.5rem; }
.current-emojis { margin-bottom: 1rem; }
.section-label { margin: 0 0 .4rem; font-size: .85rem; color: #5c6b93; font-weight: 600; }
.emoji-grid { display: flex; flex-wrap: wrap; gap: .6rem; }
.emoji-item { position: relative; display: flex; flex-direction: column; align-items: center; gap: .25rem; padding: .55rem .55rem .4rem; background: #f4f7ff; border: 1px solid rgba(93,130,255,.18); border-radius: 14px; cursor: pointer; min-width: 64px; }
.emoji-item:hover { background: #fff; box-shadow: 0 4px 12px rgba(93,130,255,.18); }
.emoji-item .emo { font-size: 1.4rem; }
.emoji-item .lbl { font-size: .7rem; color: #4a5d8a; font-weight: 600; }
.emoji-item .del-hint { position: absolute; top: 2px; right: 6px; font-size: .85rem; color: #8b98b8; }
.add-form .row { display: flex; align-items: stretch; gap: .6rem; flex-wrap: wrap; }
.emoji-picker-field { position: relative; display: flex; align-items: center; }
.emoji-display { width: 80px; text-align: center; font-size:0.9rem; border: 1px solid rgba(93,130,255,.35); border-radius: 12px; background: #fff; padding: .4rem .5rem; cursor: pointer; }
.toggle-emoji { margin-left: .4rem; border: none; background: linear-gradient(135deg,#5d82ff,#8fa3ff); color:#fff; padding:.45rem .8rem; border-radius:12px; cursor: pointer; font-size:.75rem; font-weight:600; }
.emoji-palette { position: absolute; left: 0; top: 105%; z-index: 30; width: 320px; max-height: 260px; overflow: auto; background: #fff; border: 1px solid rgba(93,130,255,.3); border-radius: 18px; box-shadow: 0 12px 28px rgba(93,130,255,.25); padding: .6rem; }
.palette-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap: .35rem; }
.palette-grid button { border: none; background: #f3f6ff; border-radius: 10px; padding: .35rem 0; font-size: 1.1rem; cursor: pointer; transition: background .15s; }
.palette-grid button:hover { background: #e2eaff; }
.label-input { width: 120px; border:1px solid rgba(93,130,255,.35); border-radius:12px; padding:.45rem .7rem; font: inherit; }
.add-btn { border:none; background: linear-gradient(135deg,#5d82ff,#8fa3ff); color:#fff; padding:.55rem 1.1rem; border-radius:14px; font-weight:600; cursor:pointer; box-shadow:0 6px 14px rgba(93,130,255,.25); }
.add-btn:hover { box-shadow:0 8px 18px rgba(93,130,255,.3); }
.hint-line { display:block; margin-top:.45rem; font-size:0.8rem; color:#6b7aa6; }
.empty { font-size:.75rem; color:#6b7aa6; }

.day-entry-dialog :deep(.el-dialog__body){ padding-top: .75rem; }
.day-entry-body { display:flex; flex-direction:column; gap:.9rem; }
.day-entry-body .header-line { display:flex; align-items:center; gap:.9rem; }
.day-entry-body .emoji { font-size:2rem; }
.day-entry-body .mood-label { margin:0; font-weight:600; color:#2f3a60; }
.day-entry-body .tags { display:flex; flex-wrap:wrap; gap:.4rem; }
.day-entry-body .tags .tag { background:rgba(93,130,255,.14); padding:.25rem .55rem; border-radius:999px; font-size:.7rem; color:#4a5d8a; }
.day-entry-body .content { white-space:pre-wrap; line-height:1.55; margin:0; color:#2f3a60; }
.day-entry-body .preview { max-width:100%; border-radius:16px; box-shadow:0 6px 18px rgba(93,130,255,.15); }
</style>
