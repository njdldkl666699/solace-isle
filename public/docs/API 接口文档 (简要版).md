### **API 接口文档 (简要版)**

**基础信息**

* **基础URL:** `/api/v1`
* **认证方式:** 除登录注册外，所有请求头需携带 `Authorization: Bearer <jwt_token>`
* **数据格式:** `application/json`

---

#### **1. 认证模块**

| 方法   | 端点               | 描述   | 请求体                                 | 成功响应                  |
|:---- |:---------------- |:---- |:----------------------------------- |:--------------------- |
| POST | `/auth/login`    | 用户登录 | `{ username, password }`            | `{ token, userInfo }` |
| POST | `/auth/register` | 用户注册 | `{ studentId, password, nickname }` | `{ message }`         |

---

#### **2. 用户与仪表盘**

| 方法  | 端点                   | 描述        | 参数/请求体                 | 成功响应                                                              |
|:--- |:-------------------- |:--------- |:---------------------- |:----------------------------------------------------------------- |
| GET | `/user/profile`      | 获取用户个人信息  | -                      | `{ nickname, avatar, ... }`                                       |
| PUT | `/user/profile`      | 更新用户个人信息  | `{ nickname, avatar }` | `{ message }`                                                     |
| GET | `/dashboard/summary` | 获取仪表盘摘要数据 | -                      | `{ currentMood, streakDays, weeklyMoodData, recentAchievements }` |

---

#### **3. 心灵日记本**

| 方法     | 端点                   | 描述          | 参数/请求体                | 成功响应                            |
|:------ |:-------------------- |:----------- |:--------------------- |:------------------------------- |
| POST   | `/diary/entries`     | 创建一篇新的文字日记  | `{ content, image? }` | `{ diaryId, analyzedMoodTags }` |
| POST   | `/diary/quick-check` | 快速表情打卡      | `{ emojiCode }`       | `{ message }`                   |
| GET    | `/diary/entries`     | 获取日记列表（可分页） | `page, limit`         | `{ list: [ ... ], total }`      |
| GET    | `/diary/calendar`    | 获取日历视图数据    | `year, month`         | `{ [date]: moodCode }`          |
| DELETE | `/diary/entries/:id` | 删除一篇日记      | -                     | `{ message }`                   |

---

#### **4. AI伙伴对话**

| 方法     | 端点                            | 描述            | 参数/请求体        | 成功响应                                |
|:------ |:----------------------------- |:------------- |:------------- |:----------------------------------- |
| POST   | `/chat/sessions`              | 创建一个新的对话会话    | `-`           | `{ sessionId }`                     |
| POST   | `/chat/sessions/:id/messages` | 在指定会话中发送用户消息  | `{ message }` | `{ aiReply, requiresCrisisAlert? }` |
| GET    | `/chat/sessions`              | 获取当前用户的对话会话列表 | -             | `{ list: [ ... ] }`                 |
| GET    | `/chat/sessions/:id/messages` | 获取指定会话的完整消息历史 | -             | `{ messages: [ ... ] }`             |
| POST   | `/chat/messages/:id/favorite` | 收藏一条AI的回复     | -             | `{ message }`                       |
| DELETE | `/chat/sessions/:id`          | 删除一个对话会话及其历史  | -             | `{ message }`                       |

---

#### **5. CBT训练舱**

| 方法   | 端点                        | 描述              | 参数/请求体           | 成功响应                                   |
|:---- |:------------------------- |:--------------- |:---------------- |:-------------------------------------- |
| GET  | `/cbt/scenarios`          | 获取所有可用的训练情景列表   | -                | `{ scenarios: [ ... ] }`               |
| GET  | `/cbt/scenarios/:id`      | 获取某个训练情景的详细信息   | -                | `{ title, description, steps }`        |
| POST | `/cbt/sessions`           | 开始一次CBT训练       | `{ scenarioId }` | `{ sessionId, firstStep }`             |
| POST | `/cbt/sessions/:id/steps` | 提交当前步骤的答案并进入下一步 | `{ answer }`     | `{ nextStep, isCompleted, summary? }`  |
| GET  | `/cbt/progress`           | 获取用户的训练进度和成就    | -                | `{ completedScenarios, achievements }` |

---

#### **6. 心灵树洞 (匿名社区)**

| 方法   | 端点                            | 描述             | 参数/请求体        | 成功响应                       |
|:---- |:----------------------------- |:-------------- |:------------- |:-------------------------- |
| GET  | `/treehole/posts`             | 获取树洞帖子列表（匿名）   | `page, limit` | `{ list: [ ... ], total }` |
| POST | `/treehole/posts`             | 发布一篇新的树洞帖子（匿名） | `{ content }` | `{ postId }`               |
| POST | `/treehole/posts/:id/comfort` | 给帖子点一个“暖心”（匿名） | -             | `{ message }`              |

---

**说明：**

1. **类型暂未定义：** 文档中未明确指定参数和返回值的具体类型（String, Number, Array, Object），这需要在开发初期由团队共同约定。
2. **错误处理：** 所有接口应遵循统一的错误格式，例如 `{ code: 400, message: "错误描述" }`。
3. **分页：** 列表类接口应支持分页，响应格式可统一为 `{ list: [], total: 100, page: 1, limit: 20 }`。
4. **此文档是蓝图：** 这份简要文档为前后端分工协作提供了清晰的契约。双方可以在此基础上，为每个接口进一步细化字段定义。
