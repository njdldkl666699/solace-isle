<script setup lang="ts">
import AppShell from "../components/layout/AppShell.vue";
import { ref, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from "../api/request";
import type { TreeholePost } from '../stores/appStore';

// 列表与分页状态
const posts = ref<TreeholePost[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const order = ref<1 | 2>(1);
const loading = ref(false);

// 发表帖子草稿
const selectedEmoji = ref("");
const draftText = ref("");
const submitting = ref(false);
const manualEmoji = ref("");
// 快速表情集合（弹窗中展示）
const emojiPalette = [
  "😀","😃","😄","😁","😆","🥹","😂","🤣","😊","🙂","😉","😍","🥰","😘","😋","😎","🥳","😏","😒","😞","😔","😕","😣","😖","😫","😩","😤","😠","😢","😭","😮","😲","🤯","😳","🥺","😨","😰","😱","🤗","🤔","😴","😪","🤢","🤮","🤧","😷","🤒","🤕","😇","🤫","🤭","🤥","😈","👻","👽","🤖","🎃"
];
const quickEmojiDialogVisible = ref(false);
const openQuickEmojiDialog = () => { quickEmojiDialogVisible.value = true; };
const closeQuickEmojiDialog = () => { quickEmojiDialogVisible.value = false; };

const sanitizeManualEmoji = () => {
  let val = manualEmoji.value.trim();
  if (!val) { selectedEmoji.value = ""; return; }
  const chars = Array.from(val);
  manualEmoji.value = chars[0] as string;
  selectedEmoji.value = manualEmoji.value;
};
watch(manualEmoji, sanitizeManualEmoji);

// 点赞中的 post id 集合
const likingBusy = ref<Set<number>>(new Set());

const selectEmoji = (emo: string) => {
  if (selectedEmoji.value === emo) {
    selectedEmoji.value = "";
    manualEmoji.value = "";
  } else {
    selectedEmoji.value = emo;
    manualEmoji.value = emo; // 同步显示到输入框
  }
  quickEmojiDialogVisible.value = false; // 选择后关闭弹窗
};

// 获取帖子列表
const fetchPosts = async () => {
  loading.value = true;
  try {
    const res = await api.get('/safeSpace', { params: { order: order.value, page: page.value, pageSize: pageSize.value } });
    if (res.data?.code === 1) {
      total.value = res.data.data.total || 0;
      posts.value = (res.data.data.records || []) as TreeholePost[];
    } else {
      ElMessage.error(res.data?.msg || '获取树洞帖子失败');
    }
  } catch (e:any) {
    ElMessage.error('获取树洞帖子失败');
  } finally {
    loading.value = false;
  }
};

const changeOrder = (val: 1 | 2) => { if (order.value !== val){ order.value = val; page.value = 1; } };

const publish = async () => {
  if (!selectedEmoji.value) { ElMessage.warning('请选择或输入一个表情'); return; }
  const text = draftText.value.trim();
  if (!text) { ElMessage.warning('写点内容吧'); return; }
  submitting.value = true;
  try {
    const res = await api.post('/safeSpace', { emoji: selectedEmoji.value, text });
    if (res.data?.code === 1) {
      ElMessage.success('已投递到树洞');
      selectedEmoji.value = ''; manualEmoji.value=''; draftText.value='';
      if (order.value === 1) page.value = 1; // 最新排序回第一页
      await fetchPosts();
    } else { ElMessage.error(res.data?.msg || '发表失败'); }
  } catch { ElMessage.error('发表失败'); }
  finally { submitting.value = false; }
};

const toggleLike = async (post: TreeholePost) => {
  if (likingBusy.value.has(post.id)) return;
  likingBusy.value.add(post.id);
  const prevLiked = post.liked; const prevLike = post.like;
  post.liked = !post.liked; post.like += post.liked ? 1 : -1; if (post.like < 0) post.like = 0;
  try {
    const res = await api.put('/safeSpace/like', null, { params: { id: post.id } });
    if (res.data?.code !== 1) {
      post.liked = prevLiked; post.like = prevLike;
      ElMessage.error(res.data?.msg || '操作失败');
    }
  } catch {
    post.liked = prevLiked; post.like = prevLike;
    ElMessage.error('操作失败');
  }
  finally {
    likingBusy.value.delete(post.id);
  }
};

watch([page, pageSize, order], fetchPosts);
onMounted(fetchPosts);
</script>

<template>
  <AppShell page-title="心灵树洞" subtitle="匿名分享你的心情，让心事被温柔接住。">
    <div class="treehole-page">
      <!-- 发帖面板 -->
      <section class="publish-panel">
        <h4>分享你的此刻</h4>
        <div class="emoji-inline-row">
          <div class="current-emoji" :class="{ empty: !selectedEmoji }" @click="openQuickEmojiDialog" title="点击快速选择">
            <span v-if="selectedEmoji">{{ selectedEmoji }}</span>
            <span class="show-emoji" v-else>🙂</span>
          </div>
          <input v-model="manualEmoji" class="emoji-input" placeholder="输入表情" maxlength="4" />
          <button v-if="selectedEmoji" type="button" class="clear-btn" @click="() => { selectedEmoji=''; manualEmoji=''; }">清除</button>
        </div>
        <p class="emoji-hint">可以直接键盘输入一个表情，或点击“表情按钮”打开表情面板。</p>
        <textarea v-model="draftText" rows="4" placeholder="想说什么都可以，被匿名、被倾听…" />
        <div class="actions">
          <button type="button" class="submit" :disabled="submitting" @click="publish">{{ submitting ? '发表中…' : '发表' }}</button>
        </div>
      </section>

      <!-- 帖子列表 -->
      <section class="posts">
        <div class="list-header">
          <h4>树洞里的人声</h4>
          <div class="order-switch">
            <button type="button" :class="{ active: order === 1 }" @click="changeOrder(1)">最新</button>
            <button type="button" :class="{ active: order === 2 }" @click="changeOrder(2)">最热</button>
          </div>
        </div>

        <div v-if="loading" class="loading">加载中…</div>
        <ul v-else-if="posts.length" class="post-list">
          <li v-for="post in posts" :key="post.id" class="post-item">
            <div class="emoji" aria-hidden="true">{{ post.emoji }}</div>
            <p class="content">{{ post.text }}</p>
            <footer>
              <time>{{ new Date(post.datetime).toLocaleString('zh-CN', { hour12: false }) }}</time>
              <div class="warm-block">
                <span class="warms">暖心值 {{ post.like }}</span>
                <button type="button" class="heart-btn" :class="{ liked: post.liked }" :aria-pressed="post.liked" @click="toggleLike(post)" :disabled="likingBusy.has(post.id)" :title="post.liked ? '取消点赞' : '点赞'">
                  <span class="icon" aria-hidden="true">{{ post.liked ? '❤' : '♡' }}</span>
                </button>
              </div>
            </footer>
          </li>
        </ul>
        <p v-else class="empty">还没有帖子，做第一个说话的人吧。</p>

        <!-- 分页 -->
        <div class="pagination" v-if="total > 0">
          <el-pagination
            background
            layout="prev, pager, next, jumper, ->, sizes, total"
            :total="total"
            :page-size="pageSize"
            :current-page="page"
            :page-sizes="[5,10,20,30]"
            @update:current-page="(p:number)=> page = p"
            @update:page-size="(ps:number)=>{ pageSize = ps; page = 1; }"
          />
        </div>
      </section>

      <!-- 快速表情弹窗 -->
      <el-dialog v-model="quickEmojiDialogVisible" title="选择一个表情" width="520px" @close="closeQuickEmojiDialog" class="quick-emoji-dialog">
        <div class="emoji-dialog-grid">
          <button type="button" v-for="emo in emojiPalette" :key="emo" @click="selectEmoji(emo)" :class="{ active: selectedEmoji === emo }">{{ emo }}</button>
        </div>
        <template #footer>
          <el-button @click="closeQuickEmojiDialog">关闭</el-button>
        </template>
      </el-dialog>
    </div>
  </AppShell>
</template>

<style scoped>
.treehole-page { display: grid; gap: 2rem; }

.publish-panel {
  background: rgba(255,255,255,0.9);
  border-radius: 24px;
  padding: 1.6rem 1.9rem 1.9rem;
  border: 1px solid rgba(93,130,255,0.12);
  box-shadow: 0 14px 30px rgba(93,120,190,0.14);
  display: flex; flex-direction: column; gap: 1rem;
}
.publish-panel h4 { margin: 0 0 .2rem; font-size: 1.15rem; color:#2f3a60; }

/* 调整为弹窗模式的表情选择样式 */
.emoji-inline-row { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; }
.current-emoji { width:54px; height:54px; display:flex; align-items:center; justify-content:center; background:#fff; border:1px solid rgba(93,130,255,.25); border-radius:18px; font-size:1.7rem; cursor:pointer; box-shadow:0 4px 10px rgba(93,130,255,.15); transition:background .2s, box-shadow .2s; }
.current-emoji.empty { opacity:.75; }
.current-emoji:hover { background:#f4f7ff; box-shadow:0 6px 16px rgba(93,130,255,.18); }
.emoji-input { width:120px; text-align:center; font-size:1.1rem; padding:.55rem .6rem; border:1px solid rgba(93,130,255,.35); border-radius:14px; background:#fff; }
.emoji-input:focus { outline:none; border-color:#5d82ff; box-shadow:0 0 0 3px rgba(93,130,255,.18); }
.show-emoji{font-size: 1.7rem;}
.quick-btn, .clear-btn { border:1px solid rgba(93,130,255,.4); background:rgba(255,255,255,.85); color:#4a5d8a; padding:.5rem 1rem; font-size:.75rem; font-weight:600; border-radius:14px; cursor:pointer; transition:background .2s, box-shadow .2s; }
.quick-btn:hover, .clear-btn:hover { background:#fff; box-shadow:0 4px 12px rgba(93,130,255,.2); }
.clear-btn { border-color:rgba(255,90,111,.45); color:#ff5a6f; }
.clear-btn:hover { background:#fff5f7; }
.emoji-hint { margin:0; font-size:.8rem; color:#6b7aa6; }

.publish-panel textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(93,130,255,.28);
  border-radius: 18px; /* 圆角 */
  background: rgba(255,255,255,0.95);
  padding: 0.85rem 1rem;
  font: inherit;
  line-height: 1.5;
  resize: vertical; /* 仅允许竖向拉伸 */
  color: #2f3a60;
  transition: border-color .2s, box-shadow .2s, background .2s;
}
.publish-panel textarea:focus {
  outline: none;
  border-color: #5d82ff;
  box-shadow: 0 0 0 3px rgba(93,130,255,.18);
  background: #fff;
}
.publish-panel textarea::placeholder { color:#8fa0c3; }

.actions { display:flex; justify-content:flex-end; margin-top:.5rem; }
.actions .submit {
  background: linear-gradient(135deg,#5d82ff,#8fa3ff);
  border: none;
  border-radius: 20px;
  padding: .65rem 1.4rem;
  font-weight: 600;
  font-size: .85rem;
  letter-spacing: .5px;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(93,130,255,.22);
  transition: background .25s ease, transform .18s ease, box-shadow .25s ease;
}
.actions .submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow:0 12px 28px rgba(93,130,255,.28); }
.actions .submit:active:not(:disabled) { transform: translateY(-1px); }
.actions .submit:disabled { opacity:.55; cursor:not-allowed; box-shadow:none; }
.actions .submit:focus-visible { outline:2px solid #fff; outline-offset:2px; box-shadow:0 0 0 3px rgba(93,130,255,.55); }

.quick-emoji-dialog :deep(.el-dialog__body){ padding: .6rem 1.1rem 1.2rem; }
.emoji-dialog-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(52px,1fr)); gap:.55rem; }
.emoji-dialog-grid button { border:none; background:#f4f7ff; border-radius:16px; padding:.65rem 0; font-size:1.3rem; cursor:pointer; box-shadow:0 4px 10px rgba(93,130,255,.15); transition:background .18s, transform .15s, box-shadow .2s; }
.emoji-dialog-grid button:hover { background:#e9f0ff; transform:translateY(-2px); }
.emoji-dialog-grid button.active { background:linear-gradient(135deg,#5d82ff,#8fa3ff); color:#fff; box-shadow:0 6px 16px rgba(93,130,255,.3); }

/* 移除原直接展示的 emoji-select-block 样式保留其他部分 */
.emoji-select-block, .emoji-grid { display:none; }

.posts { background: rgba(255, 255, 255, 0.9); border-radius: 24px; padding: 2rem 2.2rem; border: 1px solid rgba(93, 130, 255, 0.12); box-shadow: 0 18px 32px rgba(93,120,190, 0.12); display: grid; gap: 1.5rem; }
.list-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
.list-header h4 { margin:0; font-size:1.25rem; color:#253257; }
.order-switch { display:inline-flex; background:rgba(93,130,255,.1); padding:.3rem; border-radius:999px; gap:.3rem; }
.order-switch button { border:none; background:transparent; padding:.4rem .95rem; border-radius:999px; font-weight:600; font-size:.8rem; cursor:pointer; color:#4a5d8a; }
.order-switch button.active { background:#fff; box-shadow:0 4px 10px rgba(93,130,255,.18); }
.order-switch button:hover { background:#fff; }

.loading { text-align:center; color:#4a5d8a; font-size:.9rem; }
.empty { text-align:center; color:#6b7aa6; font-size:.85rem; }

.post-list { list-style:none; margin:0; padding:0; display:grid; gap:1rem; }
.post-item { display:grid; grid-template-columns:auto 1fr; gap:1rem; background:rgba(246,249,255,.9); border-radius:18px; padding:1.1rem 1.4rem; border:1px solid rgba(93,130,255,0.1); align-items:start; }
.post-item .emoji { font-size:1.4rem; }
.post-item .content { margin:0; line-height:1.5; color:#2f3a60; white-space:pre-wrap; }
.post-item footer { grid-column:1 / -1; display:flex; justify-content:space-between; color:#5c6b93; font-size:.75rem; align-items:flex-start; }
.warm-block { display:flex; flex-direction:column; align-items:flex-end; gap:.45rem; }
.warms { font-weight:600; }
.heart-btn { border:1px solid rgba(255,99,132,.35); background:linear-gradient(135deg,#fff5f7,#ffe3e8); color:#ff5a6f; padding:.42rem .85rem; border-radius:999px; cursor:pointer; font-size:1rem; line-height:1; display:inline-flex; align-items:center; justify-content:center; transition: background .25s ease, transform .15s ease, box-shadow .25s ease, color .25s ease, border-color .25s ease; }
.heart-btn .icon { font-size:1.05rem; filter: drop-shadow(0 1px 2px rgba(255,90,111,.35)); }
.heart-btn:hover { background: linear-gradient(135deg,#ffeef1,#ffd9e0); box-shadow:0 6px 16px -6px rgba(255,90,111,.45); transform:translateY(-2px); }
.heart-btn:active { transform:translateY(0); }
.heart-btn.liked { background: linear-gradient(135deg,#ff5a6f,#ff7f92); color:#fff; border-color: rgba(255,90,111,.6); box-shadow:0 8px 20px -6px rgba(255,90,111,.55); }
.heart-btn.liked .icon { filter: drop-shadow(0 2px 4px rgba(255,90,111,.55)); }
.heart-btn.liked:hover { background: linear-gradient(135deg,#ff4d63,#ff6d82); }
.heart-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }

.pagination { display:flex; justify-content:center; }

@media (max-width:780px){
  .post-item { grid-template-columns:1fr; }
  .post-item .emoji { order:-1; }
  .warm-block { align-items:flex-start; }
}
</style>
