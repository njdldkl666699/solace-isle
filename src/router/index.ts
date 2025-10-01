import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    component: () => import("../views/LoginView.vue"),
    meta: { layout: "auth" },
  },
  {
    path: "/register",
    component: () => import("../views/RegisterView.vue"),
    meta: { layout: "auth" },
  },
  {
    path: "/dashboard",
    component: () => import("../views/DashboardView.vue"),
  },
  {
    path: "/diary",
    component: () => import("../views/DiaryView.vue"),
  },
  {
    path: "/chat",
    component: () => import("../views/ChatView.vue"),
  },
  {
    path: "/cbt",
    component: () => import("../views/CbtListView.vue"),
  },
  {
    path: "/cbt/scenario/:id",
    name: "cbt-scenario",
    component: () => import("../views/CbtScenarioView.vue"),
    props: true,
  },
  {
    path: "/profile",
    component: () => import("../views/ProfileView.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    component: () => import("../views/NotFoundView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
