import { defineStore } from "pinia";

export type WeeklyMoodPoint = {
  day: string;
  score: number;
  label: string;
  note?: string;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  achievedAt: string;
};

export type DiaryEntry = {
  id: string;
  date: string;
  moodEmoji: string;
  moodLabel: string;
  content: string;
  tags: string[];
  imagePreview?: string;
};

export type ChatMessage = {
  id: string;
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

export type CbtScenarioStep =
  | {
      id: string;
      type: "single-select";
      title: string;
      prompt: string;
      options: { label: string; value: string }[];
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
      placeholders: { support: string; against: string };
    };

export type CbtScenario = {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  durationLabel: string;
  coverColor: string;
  tags: string[];
  steps: CbtScenarioStep[];
};

export type TreeholePost = {
  id: string;
  content: string;
  createdAt: string;
  moodEmoji: string;
  warms: number;
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

export const useAppStore = defineStore("app", {
  state: () => ({
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
      streakDays: 7,
      weeklyMoodTrend: [
        { day: "周一", score: 3, label: "期待", note: "完成论文大纲" },
        { day: "周二", score: 2, label: "紧张", note: "临近汇报" },
        { day: "周三", score: 4, label: "轻松", note: "和朋友散步" },
        { day: "周四", score: 1, label: "疲惫", note: "熬夜赶DDL" },
        { day: "周五", score: 3, label: "自信", note: "演示顺利通过" },
        { day: "周六", score: 4, label: "愉快", note: "社团活动" },
        { day: "周日", score: 5, label: "充电", note: "午后冥想" },
      ] satisfies WeeklyMoodPoint[],
      recentAchievements: [
        {
          id: "streak-7",
          name: "连续记录 7 天",
          description: "坚持记录，让情绪有了温柔的被看见。",
          icon: "🔥",
          achievedAt: "2025-09-28",
        },
        {
          id: "cbt-first",
          name: "完成首个CBT训练",
          description: "尝试用新的角度解释那份担忧。",
          icon: "🧠",
          achievedAt: "2025-09-26",
        },
      ] satisfies Achievement[],
      quickReminders: ["今晚 21:30 记得完成“演讲前自信”训练的复盘。", "你和 142 位同学一起在坚持情绪记录。"],
    },
    diary: {
      quickEmojis: [
        { emoji: "🤩", label: "超充实" },
        { emoji: "😊", label: "被照亮" },
        { emoji: "😐", label: "平平淡淡" },
        { emoji: "😔", label: "有点低落" },
        { emoji: "😣", label: "紧绷" },
        { emoji: "🥱", label: "想休息" },
      ],
      entries: [
        {
          id: "entry-1",
          date: "2025-09-29",
          moodEmoji: "😊",
          moodLabel: "被照亮",
          content: "今天和项目组的伙伴碰头，大家对我的想法表示了肯定。虽然准备演示时还是紧张，但被认可的感觉很踏实。",
          tags: ["被认可", "学习"],
        },
        {
          id: "entry-2",
          date: "2025-09-28",
          moodEmoji: "😔",
          moodLabel: "略微低落",
          content: "晚上一个人在宿舍，忽然有点想家。试着写下想法后，感觉心里的结慢慢松开了。",
          tags: ["思念"],
        },
        {
          id: "entry-3",
          date: "2025-09-26",
          moodEmoji: "😣",
          moodLabel: "紧绷",
          content: "明天要路演，总觉得准备得不够充分。AI伙伴推荐我做“证据清单”练习，稍微安心了一些。",
          tags: ["压力", "CBT练习"],
        },
      ] satisfies DiaryEntry[],
      calendar: {
        "2025-09-23": "😊",
        "2025-09-24": "😐",
        "2025-09-25": "😔",
        "2025-09-26": "😣",
        "2025-09-27": "😐",
        "2025-09-28": "😔",
        "2025-09-29": "😊",
      } as Record<string, string>,
      smartTags: ["考试压力", "团队合作", "情绪稳定性"],
    },
    chat: {
      sessions: [
        {
          id: "session-main",
          title: "日常情绪陪伴",
          updatedAt: "2025-09-30T22:12:00+08:00",
          messages: [
            {
              id: "m1",
              role: "ai",
              content: "欢迎回来，林舟。想聊聊今天的心情吗？如果需要，我可以带你做一个两分钟的呼吸练习。",
              createdAt: "2025-09-30T21:58:00+08:00",
            },
            {
              id: "m2",
              role: "user",
              content: "今晚脑子里在过明天的答辩，总感觉会被问倒。",
              createdAt: "2025-09-30T22:03:00+08:00",
            },
            {
              id: "m3",
              role: "ai",
              content: "听上去你很在意这次答辩，希望表现得更好。我们来列一下你已经准备好的部分，好吗？",
              createdAt: "2025-09-30T22:05:00+08:00",
            },
          ] satisfies ChatMessage[],
        },
      ] satisfies ChatSession[],
      activeSessionId: "session-main",
      quickPrompts: ["我有点睡不着，可以陪我聊聊吗？", "帮我整理一下今天的情绪亮点。", "我担心自己的表现不够好。"],
    },
    cbt: {
      scenarios: [
        {
          id: "exam-anxiety",
          title: "演讲前的自信补给",
          description: "识别紧张背后的自动化思维，用证据让自己站稳。",
          difficulty: 2,
          durationLabel: "约 6 分钟",
          coverColor: "#b5c9ff",
          tags: ["认知重构", "现场应对"],
          steps: [
            {
              id: "step-1",
              type: "single-select",
              title: "识别情绪",
              prompt: "此刻你的心情最贴近以下哪一种？",
              options: [
                { label: "紧张", value: "紧张" },
                { label: "担心被评价", value: "担心被评价" },
                { label: "兴奋但心跳加速", value: "兴奋但心跳加速" },
              ],
            },
            {
              id: "step-2",
              type: "long-text",
              title: "捕捉想法",
              prompt: "刚刚脑海里闪过的自动化想法是什么？大胆写下它。",
              placeholder: "例如：“我一定会讲砸”、“他们会发现我准备不足”…",
            },
            {
              id: "step-3",
              type: "evidence",
              title: "寻找证据",
              prompt: "分别列出支持和反驳这个想法的证据。",
              placeholders: {
                support: "支持它的证据…",
                against: "反驳它的证据…",
              },
            },
            {
              id: "step-4",
              type: "long-text",
              title: "生成新的平衡想法",
              prompt: "结合上一步的证据，给自己写一句更平衡的鼓励话语，帮助你面对演讲。",
              placeholder: "例如：“我准备充分，即使被问到不会的也可以诚实回答”…",
            },
          ] satisfies CbtScenarioStep[],
        },
        {
          id: "teamwork-frustration",
          title: "小组协作里的挫败调频",
          description: "当你感觉被忽视或贡献不被看见时，学会重新表达需求。",
          difficulty: 3,
          durationLabel: "约 8 分钟",
          coverColor: "#ffd6a5",
          tags: ["沟通技巧", "情绪表达"],
          steps: [
            {
              id: "step-1",
              type: "single-select",
              title: "描述场景",
              prompt: "这次让你感到挫败的情境属于？",
              options: [
                { label: "想法被忽视", value: "想法被忽视" },
                { label: "贡献不平衡", value: "贡献不平衡" },
                { label: "反馈过于严厉", value: "反馈过于严厉" },
              ],
            },
            {
              id: "step-2",
              type: "long-text",
              title: "表达真实需要",
              prompt: "如果对方能听到，你希望他们了解什么？",
            },
            {
              id: "step-3",
              type: "long-text",
              title: "练习回应",
              prompt: "试着写下你愿意对队友说的话，从“我感到…”开始。",
            },
          ] satisfies CbtScenarioStep[],
        },
        {
          id: "night-calm",
          title: "夜晚安心入睡指南",
          description: "将纷乱的思绪分类安放，为自己准备一段温柔的睡前仪式。",
          difficulty: 1,
          durationLabel: "约 4 分钟",
          coverColor: "#c5f1d4",
          tags: ["睡眠", "自我关怀"],
          steps: [
            {
              id: "step-1",
              type: "long-text",
              title: "写下脑海里的想法",
              prompt: "把此刻让你睡不着的念头写下来。",
            },
            {
              id: "step-2",
              type: "single-select",
              title: "给它贴个标签",
              prompt: "这些想法更像是：",
              options: [
                { label: "担忧", value: "担忧" },
                { label: "待办事项", value: "待办事项" },
                { label: "期待", value: "期待" },
              ],
            },
            {
              id: "step-3",
              type: "long-text",
              title: "安心仪式",
              prompt: "给自己写下今晚的安心仪式或一句安稳的话。",
            },
          ] satisfies CbtScenarioStep[],
        },
      ] satisfies CbtScenario[],
    },
    treehole: {
      posts: [
        {
          id: "post-1",
          content: "今天一个人去操场跑步，风很凉。我开始愿意慢下来，倾听自己的心跳。",
          createdAt: "2025-09-29T23:20:00+08:00",
          moodEmoji: "🌙",
          warms: 27,
        },
        {
          id: "post-2",
          content: "第一次在小组里大声表达不同意见，虽然声音有些发抖，但朋友们都认真听了。",
          createdAt: "2025-09-28T18:45:00+08:00",
          moodEmoji: "💬",
          warms: 42,
        },
      ] satisfies TreeholePost[],
    },
  }),
  getters: {
    activeChatSession(state): ChatSession | undefined {
      return state.chat.sessions.find((session) => session.id === state.chat.activeSessionId);
    },
    getScenario: (state) => (id: string) => {
      return state.cbt.scenarios.find((scenario) => scenario.id === id);
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
    addUserMessage(sessionId: string, content: string) {
      const session = this.chat.sessions.find((item) => item.id === sessionId);
      if (!session) return;
      const timestamp = new Date().toISOString();
      session.messages.push({
        id: `${sessionId}-${timestamp}`,
        role: "user",
        content,
        createdAt: timestamp,
      });
      session.updatedAt = timestamp;
    },
    addAiMessage(sessionId: string, content: string) {
      const session = this.chat.sessions.find((item) => item.id === sessionId);
      if (!session) return;
      const timestamp = new Date().toISOString();
      session.messages.push({
        id: `${sessionId}-ai-${timestamp}`,
        role: "ai",
        content,
        createdAt: timestamp,
      });
      session.updatedAt = timestamp;
    },
  },
});

export type AppStore = ReturnType<typeof useAppStore>;
