<script setup lang="ts">
import {computed, onMounted, reactive, ref, watch, onUnmounted} from "vue";
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import {ElMessage} from "element-plus";
import { sha256 } from 'js-sha256';

const appStore = useAppStore();
const achievedAchievements = computed(() => appStore.dashboardSummary.Achievements.filter(item => item.achievedAt));
const unachievedAchievements = computed(() => appStore.dashboardSummary.Achievements.filter(item => !item.achievedAt));

const settings = reactive({
  shareAggregated: false,
  nightlyReminder: false,
  breathingNotification: false,
});

// ---------------- 编辑资料对话框状态 ----------------
const editDialogVisible = ref(false);
const profileForm = reactive({
  avatar: '',
  nickname: '',
  motto: '',
  studentId: '',
  email: '',
});
let originalProfileSnapshot = { avatar: '', nickname: '', motto: '' };

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
  loading: false,
});

const emailForm = reactive({
  email: '',
  code: '',
  sending: false,
  countdown: 0,
  updating: false,
});
let countdownTimer: number | null = null;

const openEditDialog = () => {
  profileForm.avatar = appStore.user.avatar;
  profileForm.nickname = appStore.user.nickname;
  profileForm.motto = appStore.user.motto;
  profileForm.studentId = appStore.user.studentId;
  profileForm.email = appStore.user.email;
  originalProfileSnapshot = {
    avatar: profileForm.avatar,
    nickname: profileForm.nickname,
    motto: profileForm.motto,
  };
  editDialogVisible.value = true;
};

const closeEditDialog = () => {
  editDialogVisible.value = false;
  // 重置敏感表单
  passwordForm.oldPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  emailForm.code = '';
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  emailForm.countdown = 0;
};

// 计算变更字段
const buildProfilePayload = () => {
  const payload: Record<string, string> = {};
  if (profileForm.avatar && profileForm.avatar !== originalProfileSnapshot.avatar) payload.avatar = profileForm.avatar;
  if (profileForm.nickname && profileForm.nickname !== originalProfileSnapshot.nickname) payload.nickname = profileForm.nickname;
  if (profileForm.motto !== undefined && profileForm.motto !== originalProfileSnapshot.motto) payload.motto = profileForm.motto;
  return payload;
};

const submittingProfile = ref(false);
const submitProfile = async () => {
  const payload = buildProfilePayload();
  if (Object.keys(payload).length === 0) {
    ElMessage.warning("没有需要更新的内容");
    return;
  }
  submittingProfile.value = true;
  try {
    const response = await api.put('/user/profile', payload);
    if (response.data.code === 1) {
      // 合并更新到 store
      appStore.updateUser({
        nickname: payload.nickname ?? appStore.user.nickname,
        studentId: appStore.user.studentId,
        email: appStore.user.email,
        avatar: payload.avatar ?? appStore.user.avatar,
        motto: payload.motto ?? appStore.user.motto,
      });
      originalProfileSnapshot = {
        avatar: appStore.user.avatar,
        nickname: appStore.user.nickname,
        motto: appStore.user.motto,
      };
      ElMessage.success('基本信息已更新');
      closeEditDialog();
    } else {
      ElMessage.error(response.data.message || '更新失败');
    }
  } catch (e) {
    ElMessage.error('网络错误，更新失败');
  } finally {
    submittingProfile.value = false;
  }
};

// 头像上传
const uploadingAvatar = ref(false);
const handleAvatarFile = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return;
  }
  const formData = new FormData();
  formData.append('file', file);
  uploadingAvatar.value = true;
  try {
    const response = await api.post('/common/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    if (response.data.code === 1) {
      profileForm.avatar = response.data.data;
      ElMessage.success('头像上传成功');
    } else {
      ElMessage.error(response.data.message || '头像上传失败');
    }
  } catch {
    ElMessage.error('头像上传失败');
  } finally {
    uploadingAvatar.value = false;
    input.value = '';
  }
};

// 修改密码
const updatePassword = async () => {
  if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    ElMessage.warning('请填写完整的密码信息');
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致');
    return;
  }
  if (passwordForm.newPassword === passwordForm.oldPassword) {
    ElMessage.warning('新旧密码不能相同');
    return;
  }
  passwordForm.loading = true;
  try {
    const oldHash = await sha256(passwordForm.oldPassword);
    const newHash = await sha256(passwordForm.newPassword);
    const response = await api.put('/user/profile/updatePassword', {
      oldPassword: oldHash,
      newPassword: newHash,
    });
    if (response.data.code === 1) {
      ElMessage.success('密码已更新');
      passwordForm.oldPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';
    } else {
      ElMessage.error(response.data.msg || '密码更新失败');
    }
  } catch {
    ElMessage.error('网络错误，密码更新失败');
  } finally {
    passwordForm.loading = false;
  }
};

// 发送邮箱验证码
const validateEmailFormat = (email: string) => /\S+@\S+\.\S+/.test(email);

const sendEmailCode = async () => {
  if (!emailForm.email) {
    ElMessage.warning('请输入新邮箱');
    return;
  }
  if (!validateEmailFormat(emailForm.email)) {
    ElMessage.error('邮箱格式不正确');
    return;
  }
  if (emailForm.email === appStore.user.email) {
    ElMessage.info('新邮箱与当前邮箱相同');
    return;
  }
  if (emailForm.countdown > 0) return;
  emailForm.sending = true;
  try {
    const response = await api.get('/auth/sendCode', { params: { email: emailForm.email } });
    if (response.data.code === 1) {
      ElMessage.success('验证码已发送');
      emailForm.countdown = 60;
      countdownTimer = window.setInterval(() => {
        if (emailForm.countdown <= 1) {
          if (countdownTimer) clearInterval(countdownTimer);
          countdownTimer = null;
          emailForm.countdown = 0;
        } else {
          emailForm.countdown -= 1;
        }
      }, 1000);
    } else {
      ElMessage.error(response.data.msg || '验证码发送失败');
    }
  } catch {
    ElMessage.error('验证码发送失败');
  } finally {
    emailForm.sending = false;
  }
};

// 更新邮箱
const updateEmail = async () => {
  if (!emailForm.email || !emailForm.code) {
    ElMessage.warning('请填写新邮箱和验证码');
    return;
  }
  if (!validateEmailFormat(emailForm.email)) {
    ElMessage.error('邮箱格式不正确');
    return;
  }
  emailForm.updating = true;
  try {
    const response = await api.put('/user/profile/updateEmail', {
      email: emailForm.email,
      code: emailForm.code,
    });
    if (response.data.code === 1) {
      ElMessage.success('邮箱已更新');
      appStore.updateUser({
        nickname: appStore.user.nickname,
        studentId: appStore.user.studentId,
        email: emailForm.email,
        avatar: appStore.user.avatar,
        motto: appStore.user.motto,
      });
      profileForm.email = emailForm.email;
      emailForm.code = '';
    } else {
      ElMessage.error(response.data.msg || '邮箱更新失败');
    }
  } catch {
    ElMessage.error('网络错误，邮箱更新失败');
  } finally {
    emailForm.updating = false;
  }
};

const getAchievements = async () => {
  try {
    const response = await api.get("/dashboard/achievements");

    if (response.data.code === 1) {
      appStore.updateAchievements(response.data.data);
    } else {
      ElMessage.error("无法获取成就信息");
    }
  } catch {
    ElMessage.error("无法获取成就信息");
  }
};

const getSettings = async () => {
  try {
    const response = await api.get("/user/settings");

    if (response.data.code === 1) {
      settings.shareAggregated = response.data.data.shareAggregated;
      settings.nightlyReminder = response.data.data.nightlyReminder;
      settings.breathingNotification = response.data.data.breathingNotification;
    } else {
      ElMessage.error("无法获取习惯设置信息");
    }
  } catch {
    ElMessage.error("无法获取习惯设置信息");
  }
}

const updateSettings = async () => {
  try {
    const response = await api.put("/user/settings", {
      shareAggregated: settings.shareAggregated,
      nightlyReminder: settings.nightlyReminder,
      breathingNotification: settings.breathingNotification,
    });

    if (response.data.code !== 1) {
      ElMessage.error("无法更新习惯设置信息");
      await getSettings();
    }
  } catch {
    ElMessage.error("无法更新习惯设置信息");
    await getSettings();
  }
}

watch(settings, updateSettings, { deep: true });

onMounted(() => {
  getAchievements();
  getSettings();
});

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});
</script>

<template>
  <AppShell page-title="个人中心" subtitle="调节习惯、收藏回忆，和自己保持同频。">
    <div class="profile">
      <section class="hero-card">
        <img :src="appStore.user.avatar" alt="用户头像" />
        <div>
          <h3>{{ appStore.user.nickname }}</h3>
          <p class="id">学号（脱敏）：{{ appStore.user.studentId.slice(0, 4) }}****</p>
          <p class="motto">“{{ appStore.user.motto }}”</p>
        </div>
        <div class="hero-actions">
          <button type="button" @click="openEditDialog">编辑资料</button>
          <button type="button" class="logout-btn" @click="appStore.logout()">退出登录</button>
        </div>
      </section>

      <section class="settings">
        <h4>我的习惯设置</h4>
        <ul>
          <li>
            <div>
              <p>允许与学校共享统计趋势</p>
              <span>仅提供匿名化数据，帮助老师了解整体状态。</span>
            </div>
            <label class="switch">
              <input v-model="settings.shareAggregated" type="checkbox" />
              <span />
            </label>
          </li>
          <li>
            <div>
              <p>晚间情绪记录提醒</p>
              <span>每天 22:00 推送温柔提醒，适当放下白天的累。</span>
            </div>
            <label class="switch">
              <input v-model="settings.nightlyReminder" type="checkbox" />
              <span />
            </label>
          </li>
          <li>
            <div>
              <p>呼吸练习通知</p>
              <span>当连续 3 天情绪紧绷时自动提醒。</span>
            </div>
            <label class="switch">
              <input v-model="settings.breathingNotification" type="checkbox" />
              <span />
            </label>
          </li>
        </ul>
      </section>

      <section class="achievements">
        <h4>我的成就勋章</h4>
        <div class="grid">
          <article v-for="item in achievedAchievements" :key="item.name" class="achieved">
            <span class="status-badge done">已完成</span>
            <span class="icon">{{ item.icon }}</span>
            <h5>{{ item.name }}</h5>
            <p>{{ item.description }}</p>
            <time>{{ item.achievedAt }}</time>
          </article>
          <article v-for="item in unachievedAchievements" :key="item.name">
            <span class="status-badge undone">未完成</span>
            <span class="icon">{{ item.icon }}</span>
            <h5>{{ item.name }}</h5>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </section>
    </div>

    <!-- 编辑资料弹窗 -->
    <div v-if="editDialogVisible" class="modal-backdrop" @click.self="closeEditDialog">
      <div class="edit-modal">
        <header>
          <h3>编辑资料</h3>
          <button class="close-btn" @click="closeEditDialog">×</button>
        </header>
        <div class="modal-body">
          <section class="block">
            <h4>基本信息</h4>
            <div class="avatar-row">
              <div class="avatar-wrapper">
                <img :src="profileForm.avatar" alt="头像预览" />
              </div>
              <label class="upload-btn">
                <input type="file" accept="image/*" @change="handleAvatarFile" />
                <span v-if="!uploadingAvatar">更换头像</span>
                <span v-else>上传中...</span>
              </label>
            </div>
            <div class="form-row">
              <label>昵称</label>
              <input v-model="profileForm.nickname" type="text" maxlength="30" placeholder="输入昵称" />
            </div>
            <div class="form-row">
              <label>座右铭</label>
              <textarea v-model="profileForm.motto" rows="2" maxlength="80" placeholder="写一句此刻支撑你的话" />
            </div>
            <div class="form-row">
              <label>学号</label>
              <input :value="profileForm.studentId" disabled />
            </div>
            <div class="form-row">
              <label>当前邮箱</label>
              <input :value="profileForm.email" disabled />
            </div>
            <div class="form-row">
              <label>密码</label>
              <input value="********" disabled />
            </div>
            <div class="actions">
              <button class="primary" :disabled="submittingProfile" @click="submitProfile">{{ submittingProfile ? '保存中…' : '保存修改' }}</button>
              <button class="ghost" @click="closeEditDialog">取消</button>
            </div>
          </section>
          <section class="block">
            <h4>修改密码</h4>
            <div class="form-row">
              <label>旧密码</label>
              <input v-model="passwordForm.oldPassword" type="password" placeholder="输入旧密码" />
            </div>
            <div class="form-row">
              <label>新密码</label>
              <input v-model="passwordForm.newPassword" type="password" placeholder="输入新密码" />
            </div>
            <div class="form-row">
              <label>确认新密码</label>
              <input v-model="passwordForm.confirmPassword" type="password" placeholder="再次输入新密码" />
            </div>
            <div class="actions">
              <button class="primary" :disabled="passwordForm.loading" @click="updatePassword">{{ passwordForm.loading ? '提交中…' : '更新密码' }}</button>
            </div>
          </section>
          <section class="block">
            <h4>修改邮箱</h4>
            <div class="form-row">
              <label>新邮箱</label>
              <input v-model="emailForm.email" type="email" placeholder="输入新邮箱地址" />
            </div>
            <div class="form-row code-row">
              <label>验证码</label>
              <div class="code-input-group">
                <input v-model="emailForm.code" type="text" placeholder="输入验证码" />
                <button class="ghost small" :disabled="emailForm.sending || emailForm.countdown>0" @click="sendEmailCode">
                  <span v-if="emailForm.countdown===0">{{ emailForm.sending ? '发送中…' : '发送验证码' }}</span>
                  <span v-else>{{ emailForm.countdown }}秒后可重新发送</span>
                </button>
              </div>
            </div>
            <div class="actions">
              <button class="primary" :disabled="emailForm.updating" @click="updateEmail">{{ emailForm.updating ? '更新中…' : '更新邮箱' }}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.profile {
  display: grid;
  gap: 2rem;
}

.hero-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.5rem;
  align-items: center;
  background: rgba(255, 255, 255, 0.86);
  border-radius: 26px;
  padding: 2rem 2.4rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.12);
  position: relative; /* allow absolute logout positioning */
  padding-bottom: 2rem; /* revert from 3rem since logout is no longer absolute */
}

.hero-card img {
  width: 82px;
  height: 82px;
  border-radius: 24px;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.9);
}

.hero-card h3 {
  margin: 0 0 0.3rem;
  font-size: 1.45rem;
  color: #253257;
}

.hero-card .id {
  margin: 0;
  color: #5c6b93;
}

.hero-card .motto {
  margin: 0.6rem 0 0;
  color: #445784;
}

.hero-card button {
  border: none;
  border-radius: 14px;
  padding: 0.75rem 1.4rem;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.hero-card .logout-btn {
  background: #eef1f5;
  color: #7a8896;
  border: 1px solid #d5dbe2;
  padding: 0.6rem 1.2rem;
  border-radius: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .18s, color .18s, border-color .18s, box-shadow .18s;
}
.hero-card .logout-btn:hover {
  background: #e2e8ee;
  color: #5d6b78;
  border-color: #c5ced6;
  box-shadow: 0 4px 10px -4px rgba(0,0,0,0.08);
}
.hero-card .logout-btn:active { box-shadow: none; }
.hero-card .hero-actions { display: flex; flex-direction: column; gap: .65rem; align-items: flex-end; }
.hero-card .hero-actions button { width: 100%; }

.settings,
.achievements {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 24px;
  padding: 2rem 2.2rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.12);
  display: grid;
  gap: 1.5rem;
}

h4 {
  margin: 0;
  font-size: 1.25rem;
  color: #253257;
}

.settings ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.2rem;
}

.settings li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.2rem;
  align-items: center;
  padding: 1rem 1.2rem;
  border-radius: 20px;
  background: rgba(246, 249, 255, 0.9);
  border: 1px solid rgba(93, 130, 255, 0.08);
}

.settings p {
  margin: 0;
  font-weight: 600;
  color: #2f3a60;
}

.settings span {
  display: block;
  margin-top: 0.35rem;
  color: #5c6b93;
  font-size: 0.9rem;
}

.switch {
  position: relative;
  width: 52px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch span {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(93, 130, 255, 0.2);
  border-radius: 999px;
  transition: background 0.2s ease;
}

.switch span::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(93, 130, 255, 0.25);
}

.switch input:checked + span {
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
}

.switch input:checked + span::after {
  transform: translateX(24px);
}

.achievements .grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.2rem;
}

.achievements .grid article {
  background: rgba(246, 249, 255, 0.9);
  border-radius: 20px;
  padding: 1.4rem;
  border: 1px solid rgba(93, 130, 255, 0.1);
  display: grid;
  gap: 0.6rem;
  position: relative;
}

.icon {
  font-size: 1.8rem;
}

.status-badge {
  position: absolute;
  top: 6px;
  right: 10px;
  /* layout */
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  padding: .36rem .78rem .42rem; /* enlarged padding */
  border-radius: 999px;
  font-size: .85rem; /* was .7rem */
  letter-spacing: 1.2px; /* slightly more spacing for bigger text */
  line-height: 1;
  pointer-events: none;
  user-select: none;
  /* glass / depth */
  backdrop-filter: blur(6px) saturate(160%);
  -webkit-backdrop-filter: blur(6px) saturate(160%);
  box-shadow: 0 2px 4px -1px rgba(0,0,0,.15), 0 4px 12px -2px rgba(0,0,0,.12);
  position: absolute;
  overflow: hidden;
}
.status-badge::before {
  font-size: .85rem; /* sync with main font-size */
  font-weight: 600;
  transform: translateY(-2px); /* adjust vertical alignment after size increase */
}
/* Achieved (已完成) */
.status-badge.done {
  color: #1f7a34;
  background: linear-gradient(135deg,#e4f9ea,#d0f3dc 45%,#bfeccf);
  border: 1px solid rgba(47,158,68,.45);
  text-shadow: 0 1px 0 rgba(255,255,255,.65);
}
.status-badge.done::before { content: '✔'; }
/* Unachieved (未完成) now red */
.status-badge.undone {
  color: #b61616;
  background: linear-gradient(135deg,#ffe6e6,#ffd0d0 45%,#ffc1c1);
  border: 1px solid rgba(224,49,49,.45);
  text-shadow: 0 1px 0 rgba(255,255,255,.6);
}
.status-badge.undone::before { content: '✧'; }
/* Subtle shine animation for achieved */
.status-badge.done::after {
  content: '';
  position: absolute;
  top: 0; left: -60%;
  width: 160%; height: 100%;
  background: linear-gradient(115deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.55) 45%,rgba(255,255,255,0) 70%);
  transform: translateX(0);
  animation: badge-shine 3.8s linear infinite;
  mix-blend-mode: screen;
  pointer-events: none;
}
@keyframes badge-shine {
  0% { transform: translateX(0); opacity: .15; }
  55% { opacity: .55; }
  100% { transform: translateX(60%); opacity: 0; }
}
/* Focus on reduced motion users */
@media (prefers-reduced-motion: reduce) {
  .status-badge.done::after { animation: none; opacity: .25; }
}
/* Hover reveal (desktop only) - slight lift */
@media (hover: hover) and (pointer: fine) {
  .achievements .grid article:hover .status-badge { box-shadow: 0 4px 10px -2px rgba(0,0,0,.22), 0 2px 4px -1px rgba(0,0,0,.18); }
}

/* Modal styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 30, 60, 0.32);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 4rem 1rem 2rem;
  z-index: 1000;
}

.edit-modal {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(93, 130, 255, 0.15);
  box-shadow: 0 24px 48px -12px rgba(40, 60, 120, 0.25);
  border-radius: 28px;
  width: min(860px, 100%);
  display: grid;
  grid-template-rows: auto 1fr;
  max-height: 100%;
}

.edit-modal header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.6rem;
  border-bottom: 1px solid rgba(93,130,255,0.12);
}

.edit-modal header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #253257;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: #5c6b93;
  padding: .3rem .6rem;
  border-radius: 8px;
}
.close-btn:hover { background: rgba(93,130,255,0.1); }

.modal-body {
  display: grid;
  gap: 1.6rem;
  padding: 1.4rem 1.6rem 2rem;
  overflow-y: auto;
}

.block {
  background: rgba(246, 249, 255, 0.9);
  border: 1px solid rgba(93,130,255,0.1);
  border-radius: 22px;
  padding: 1.2rem 1.4rem 1.6rem;
  display: grid;
  gap: 1rem;
}
.block h4 { margin: 0 0 .4rem; font-size: 1.05rem; color: #2f3a60; }

.avatar-row {
  display: flex;
  align-items: center;
  gap: 1.2rem;
}
.avatar-wrapper img {
  width: 86px;
  height: 86px;
  border-radius: 24px;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 6px 18px rgba(93,120,190,0.2);
}
.upload-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  font-size: .9rem;
  font-weight: 600;
  padding: .7rem 1.1rem;
  border-radius: 14px;
  cursor: pointer;
}
.upload-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

.form-row { display: grid; gap: .45rem; }
.form-row label { font-size: .8rem; letter-spacing: .5px; text-transform: uppercase; color: #5c6b93; font-weight: 600; }
.form-row input, .form-row textarea {
  width: 100%;
  border: 1px solid rgba(93,130,255,0.25);
  background: rgba(255,255,255,0.8);
  padding: .65rem .8rem;
  border-radius: 14px;
  font-size: .95rem;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border .15s, box-shadow .15s;
}
.form-row input:focus, .form-row textarea:focus { border-color: #5d82ff; box-shadow: 0 0 0 3px rgba(93,130,255,0.15); }
.form-row input:disabled { background: rgba(240,244,255,0.7); cursor: not-allowed; }

.actions { display: flex; gap: .8rem; justify-content: flex-end; margin-top: .4rem; }
.actions button { border: none; padding: .65rem 1.2rem; border-radius: 14px; cursor: pointer; font-weight: 600; font-size: .9rem; }
.actions .primary { background: linear-gradient(135deg, #5d82ff,#8fa3ff); color: #fff; }
.actions .primary:disabled { opacity: .6; cursor: not-allowed; }
.actions .ghost { background: rgba(93,130,255,0.12); color: #2f3a60; }
.actions .ghost:hover { background: rgba(93,130,255,0.18); }

.code-row .code-input-group { display: flex; gap: .6rem; }
.code-input-group input { flex: 1; }
/* 发送验证码按钮：浅蓝色圆角胶囊样式 */
.code-row .code-input-group button.ghost.small {
  border-radius: 999px;
  background: #e6f2ff; /* 浅蓝底 */
  border: 1px solid #b5d7ff;
  color: #1b4d7d;
  font-weight: 600;
  padding: .55rem 1.15rem;
  line-height: 1;
  transition: background .18s, transform .18s, box-shadow .18s;
}
.code-row .code-input-group button.ghost.small:hover:not(:disabled) {
  background: #d8ecff;
  box-shadow: 0 4px 10px -4px rgba(60,120,200,.35);
  transform: translateY(-2px);
}
.code-row .code-input-group button.ghost.small:active:not(:disabled) {
  transform: translateY(0);
  background: #cfe7ff;
}
.code-row .code-input-group button.ghost.small:disabled {
  background: #cfe4f7;
  color: #5f7792;
  border-color: #bfd8ef;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
/* 移动端/无 hover 环境下避免悬浮位移闪烁 */
@media (hover: none) {
  .code-row .code-input-group button.ghost.small:hover:not(:disabled) { transform: none; box-shadow: none; }
}

button.small { padding: .55rem .9rem; font-size: .75rem; }

@media (max-width: 960px) {
  .hero-card {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .hero-card button {
    width: 100%;
  }

  .settings li {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .settings span {
    text-align: center;
  }

  .switch {
    justify-self: center;
  }

  .edit-modal { width: 100%; }
  .modal-body { padding: 1.1rem 1rem 1.6rem; }
}
</style>
