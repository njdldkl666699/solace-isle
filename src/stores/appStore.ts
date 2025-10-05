import { defineStore } from "pinia";

export type WeeklyMoodPoint = {
  day: string;
  score: number;
  label: string;
  note?: string;
};

export type Achievement = {
  name: string;
  description: string;
  icon: string;
  achievedAt: string | null;
};

export type DiaryEntry = {
  date: string;
  moodEmoji: string;
  moodLabel: string;
  content: string;
  tags: string[];
  image: string | null;
};

export type ChatMessage = {
  role: "user" | "ai";
  content: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export type ChatList = {
    id: string;
    title: string;
    updatedAt: string;
}

export type Evidence = {
    support: string;
    against: string;
}

export type CbtScenarioStep =
  | {
      id: string;
      type: "single-select";
      title: string;
      prompt: string;
      options: string[];
    }
  | {
      id: string;
      type: "long-text";
      title: string;
      prompt: string;
      placeholder?: string;
    }
  | {
      id: string;
      type: "evidence";
      title: string;
      prompt: string;
      placeholders: Evidence;
    };

export type CbtScenario = {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  durationLabel: string;
  coverColor: string;
  tags: string[];
  finished?: boolean;
};

export type TreeholePost = {
  id: number;
  text: string;
  datetime: string;
  emoji: string;
  like: number;
  liked: boolean;
};

export type User = {
    nickname: string;
    studentId: string;
    email: string;
    avatar: string;
    motto: string;
}

export type CurrentMood = {
    emoji: string;
    label: string;
    description: string;
}

export type WSMessage = {
    type: "remind" | "achievement",
    content: string | Achievement,
}

// 新增：快选心情表情类型（支持自定义标记）
export type QuickEmoji = { emoji: string; label: string; custom?: boolean };

export const useAppStore = defineStore("app", {
  state: () => {
    // 默认的预设快速表情
    const defaultQuickEmojis: QuickEmoji[] = [
      { emoji: "🤩", label: "超充实" },
      { emoji: "😊", label: "被照亮" },
      { emoji: "😐", label: "平平淡淡" },
      { emoji: "😔", label: "有点低落" },
      { emoji: "😣", label: "紧绷" },
      { emoji: "🥱", label: "想休息" },
    ];

    // 从本地存储恢复完整表情列表（用户可能已删除默认项）
    let loadedQuickEmojis: QuickEmoji[] | null = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('quickEmojisPersisted');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every(e => e && e.emoji && e.label)) {
            loadedQuickEmojis = parsed as QuickEmoji[];
          }
        }
      } catch (_) { /* ignore */ }
    }

    const effectiveQuickEmojis = loadedQuickEmojis !== null ? loadedQuickEmojis : defaultQuickEmojis;

    return {
    isAuthenticated: false,
    token: "",
    greeting: "你好",
    user: {
      nickname: "名字不见了😭",
      studentId: "学号不见了😭",
      email: "邮箱不见了😭",
      avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=linzhou",
      motto: "小岛虽小，总能靠岸。",
    },
    dashboardSummary: {
      currentMood: {
        emoji: "🌤️",
        label: "平静",
        description: "你保持着温柔而稳定的节奏，继续为自己创造松弛感吧。",
      },
      streakDays: 0,
      weeklyMoodTrend: [
          {day: "周一", score: 0, label: "" },
          {day: "周二",score: 0, label: "" },
          {day: "周三",score: 0, label: "" },
          {day: "周四",score: 0, label: "" },
          {day: "周五",score: 0, label: "" },
          {day: "周六",score: 0, label: "" },
          {day: "周七",score: 0, label: "" },
      ] as WeeklyMoodPoint[],
      Achievements: [] as Achievement[],
      quickReminders: [] as string[],
    },
    diary: {
      quickEmojis: effectiveQuickEmojis as QuickEmoji[],
      entries: [] as DiaryEntry[],
    },
    chat: {
      activeSessionId: "session-main",
      quickPrompts: [] as string[],
    },
    cbt: {
      scenarios: [] as CbtScenario[],
    },
    treehole: {
      posts: [] as TreeholePost[],
    },
  }},
  getters: {
    getScenario: (state) => (id: string) => {
      return state.cbt.scenarios.find((scenario) => scenario.id == id);
    },
  },
  actions: {
    authenticate(token: string) {
      this.isAuthenticated = true;
      this.token = token;
    },
    logout() {
      this.isAuthenticated = false;
      this.token = "";
    },
    updateUser(user: User){
      this.user.nickname = user.nickname || "名字不见了😭";
      this.user.studentId = user.studentId || "学号不见了😭";
      this.user.email = user.email || "邮箱不见了😭";
      this.user.avatar = user.avatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=linzhou";
      this.user.motto = user.motto || "小岛虽小，总能靠岸。";
    },
    updateCurrentMood(Mood: CurrentMood){
      this.dashboardSummary.currentMood.emoji = Mood.emoji || "🌤️";
      this.dashboardSummary.currentMood.label = Mood.label || "平静";
      this.dashboardSummary.currentMood.description = Mood.description || "你保持着温柔而稳定的节奏，继续为自己创造松弛感吧。";
    },
    updateStreakDays(days: number){
      this.dashboardSummary.streakDays = days;
    },
    updateWeeklyMoodTrend(points: WeeklyMoodPoint[]){
      this.dashboardSummary.weeklyMoodTrend = points;
    },
    updateAchievements(achievements: Achievement[]){
      this.dashboardSummary.Achievements = achievements;
    },
    updateQuickReminders(reminders: string[]){
      this.dashboardSummary.quickReminders = reminders;
    },
    updateEntries(entries: DiaryEntry[]){
      this.diary.entries = entries;
    },
    setCbtScenarios(scenarios: CbtScenario[]){
      this.cbt.scenarios = scenarios;
    },
    calcGreeting(){
      const h = new Date().getHours();
      if (h >= 5 && h < 11) return '早安';
      if (h >= 11 && h < 14) return '午安';
      if (h >= 14 && h < 18) return '下午好';
      if (h >= 18 && h < 22) return '晚上好';
      return '晚安';
    },
    updateGreeting(){
      this.greeting = this.calcGreeting();
    },
    setQuickPrompts(prompts: string[]){
      this.chat.quickPrompts = prompts;
    },
    addQuickEmoji(emoji: string, label: string): boolean {
      if (!emoji || !label) return false;
      if (this.diary.quickEmojis.some(e => e.emoji === emoji)) return false; // 避免重复
      this.diary.quickEmojis.push({ emoji, label, custom: true });
      this.persistQuickEmojis();
      return true;
    },
    removeQuickEmoji(emoji: string): boolean {
      const idx = this.diary.quickEmojis.findIndex(e => e.emoji === emoji);
      if (idx === -1) return false;
      this.diary.quickEmojis.splice(idx, 1);
      this.persistQuickEmojis();
      return true;
    },
    persistQuickEmojis(){
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('quickEmojisPersisted', JSON.stringify(this.diary.quickEmojis));
        }
      } catch(_) { /* ignore */ }
    },
    migrateOldCustomQuickEmojis(){
      try {
        if (typeof localStorage === 'undefined') return;
        if (localStorage.getItem('quickEmojisPersisted')) return; // 已有新结构
        const rawOld = localStorage.getItem('customQuickEmojis');
        if (!rawOld) return;
        const old = JSON.parse(rawOld);
        if (Array.isArray(old)) {
          const existing = this.diary.quickEmojis.map(e => e.emoji);
            old.forEach((o: any) => {
              if (o && o.emoji && o.label && !existing.includes(o.emoji)) {
                this.diary.quickEmojis.push({ emoji: o.emoji, label: o.label, custom: true });
              }
            });
          this.persistQuickEmojis();
          localStorage.removeItem('customQuickEmojis');
        }
      } catch(_) { /* ignore */ }
    },
  },
});

export type AppStore = ReturnType<typeof useAppStore>;
