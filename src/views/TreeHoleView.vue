<script setup lang="ts">
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";

const appStore = useAppStore();
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
              <span class="warms">暖心值 {{ post.warms }}</span>
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
}

@media (max-width: 780px) {
  .posts li {
    grid-template-columns: 1fr;
  }
  .emoji {
    order: -1;
  }
}
</style>

