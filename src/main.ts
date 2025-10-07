import { createApp } from "vue";
import { createPinia } from "pinia";
import { useAppStore } from "./stores/appStore"; // 新增: 引入 store 以调用迁移
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from "./App.vue";
import router from "./router";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
// 正确引入中文基础包
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 自定义中文：分页 Go to -> 前往, 5/page -> 5/版, Total -> 总计 {total}
const customZhCn = {
  ...zhCn,
  el: {
    ...(zhCn as any).el,
    pagination: {
      ...(zhCn as any).el?.pagination,
      goto: '前往',
      pagesize: ' 条 / 页', // 使下拉显示 5/版
      total: '总计 {total} 条分享',
      pageClassifier: '页'
    }
  }
};

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate)
app.use(pinia);
app.use(router);
app.use(ElementPlus, { locale: customZhCn as any });

// 迁移旧的 localStorage 自定义表情数据（一次性）
const store = useAppStore();
store.migrateOldCustomQuickEmojis();

app.mount("#app");
