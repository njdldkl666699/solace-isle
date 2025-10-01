<template>
  <div class="not-found">
    <div class="card">
      <p class="code">404</p>
      <h1>迷路了？</h1>
      <p>你抵达了一片尚未开发的小岛。回到主页继续探索吧。</p>
      <RouterLink to="/dashboard">返回我的主页</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f4f8ff 0%, #fbf1ff 100%);
}

.card {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 24px;
  padding: 3rem 3.2rem;
  box-shadow: 0 24px 48px rgba(93, 120, 190, 0.18);
  text-align: center;
  display: grid;
  gap: 1rem;
}

.code {
  margin: 0;
  font-size: 3.4rem;
  font-weight: 700;
  color: #5d82ff;
}

h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #253257;
}

p {
  margin: 0;
  color: #54648d;
  line-height: 1.6;
}

a {
  text-decoration: none;
  color: #fff;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  padding: 0.8rem 1.6rem;
  border-radius: 14px;
  font-weight: 600;
  box-shadow: 0 16px 32px rgba(93, 130, 255, 0.18);
}

a:hover {
  opacity: 0.92;
}
</style>
