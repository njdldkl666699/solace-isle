<script setup lang="ts">
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";
import { ref } from 'vue';

const appStore = useAppStore();
// 本地点赞状态（不影响暖心值，只做视觉心形切换）
const liked = ref<Set<string>>(new Set());
const toggleLike = (id: string) => {
  if (liked.value.has(id)) {
    liked.value.delete(id); // 允许取消，若不需要取消可改成 return;
  } else {
    liked.value.add(id);
  }
  // 未实现暖心值变动，应你需求仅做样式切换
};
</script>

<template>
  <AppShell page-title="心灵树洞" subtitle="匿名分享你的心情，让心事被温柔接住。">
    <div class="treehole-page">
      <section class="intro">
        <p>这里的每一段心声都匿名呈现。你可以静静阅读，也可以写下一点此刻的感受。</p>
      </section>
      <section class="posts">
        <h4>最新心声</h4>
        <ul>
          <li v-for="post in appStore.treehole.posts" :key="post.id">
            <div class="emoji" aria-hidden="true">{{ post.moodEmoji }}</div>
            <p class="content">{{ post.content }}</p>
            <footer>
              <time>{{ new Date(post.createdAt).toLocaleString("zh-CN", { hour12: false }) }}</time>
              <div class="warm-block">
                <span class="warms">暖心值 {{ post.warms }}</span>
                <button
                  type="button"
                  class="heart-btn"
                  :class="{ liked: liked.has(post.id) }"
                  :aria-pressed="liked.has(post.id)"
                  @click="toggleLike(post.id)"
                  :title="liked.has(post.id) ? '取消点赞' : '点赞'
                "
                >
                  <span class="icon" aria-hidden="true">{{ liked.has(post.id) ? '❤' : '♡' }}</span>
                </button>
              </div>
            </footer>
          </li>
        </ul>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.treehole-page {
  display: grid;
  gap: 2rem;
}

.intro {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  padding: 1.5rem 1.8rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 12px 28px rgba(93, 120, 190, 0.12);
  line-height: 1.6;
  color: #455279;
}

.posts {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  padding: 2rem 2.2rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.12);
  display: grid;
  gap: 1.5rem;
}

.posts h4 {
  margin: 0;
  font-size: 1.25rem;
  color: #253257;
}

.posts ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.posts li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  background: rgba(246, 249, 255, 0.9);
  border-radius: 18px;
  padding: 1.1rem 1.4rem;
  border: 1px solid rgba(93, 130, 255, 0.1);
  align-items: start;
}

.emoji {
  font-size: 1.4rem;
}

.content {
  margin: 0;
  line-height: 1.5;
  color: #2f3a60;
}

.posts footer {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  color: #5c6b93;
  font-size: 0.85rem;
  align-items: flex-start;
}

.warm-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: .45rem;
}
.warms { font-weight: 600; }

/* 心形按钮样式 */
.heart-btn {
  border:1px solid rgba(255,99,132,.35);
  background: linear-gradient(135deg,#fff5f7,#ffe3e8);
  color:#ff5a6f;
  padding:.42rem .85rem;
  border-radius:999px;
  cursor:pointer;
  font-size:1rem;
  line-height:1;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  transition: background .25s ease, transform .15s ease, box-shadow .25s ease, color .25s ease, border-color .25s ease;
}
.heart-btn .icon { font-size:1.05rem; filter: drop-shadow(0 1px 2px rgba(255,90,111,.35)); }
.heart-btn:hover { background: linear-gradient(135deg,#ffeef1,#ffd9e0); box-shadow:0 6px 16px -6px rgba(255,90,111,.45); transform:translateY(-2px); }
.heart-btn:active { transform:translateY(0); }
.heart-btn.liked {
  background: linear-gradient(135deg,#ff5a6f,#ff7f92);
  color:#fff;
  border-color: rgba(255,90,111,.6);
  box-shadow:0 8px 20px -6px rgba(255,90,111,.55);
}
.heart-btn.liked .icon { filter: drop-shadow(0 2px 4px rgba(255,90,111,.55)); }
.heart-btn.liked:hover { background: linear-gradient(135deg,#ff4d63,#ff6d82); }

@media (hover:none) { .heart-btn:hover { transform:none; box-shadow:none; } }
@media (max-width:780px){ .posts li { grid-template-columns:1fr; } .emoji{ order:-1; } .warm-block { align-items:flex-start; } }
</style>
