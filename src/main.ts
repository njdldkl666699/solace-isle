import { createApp } from "vue";
import { createPinia } from "pinia";
import { useAppStore } from "./stores/appStore"; // 新增: 引入 store 以调用迁移
import App from "./App.vue";
import router from "./router";
import ElementPlus from 'element-plus'
import "./style.css";
import 'element-plus/dist/index.css'

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(ElementPlus);

// 迁移旧的 localStorage 自定义表情数据（一次性）
const store = useAppStore();
store.migrateOldCustomQuickEmojis();

app.mount("#app");
