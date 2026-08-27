<template>
  <el-container class="layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo">
        <img src="/vite.svg" alt="logo" />
        <span v-show="!isCollapse">农情监测平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#ffffff"
        class="menu"
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <!-- 有子菜单 -->
          <el-sub-menu v-if="route.children && route.children.length > 1" :index="route.path">
            <template #title>
              <el-icon><component :is="route.meta?.icon" /></el-icon>
              <span>{{ route.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in route.children"
              :key="child.path"
              :index="`${route.path}/${child.path}`"
            >
              {{ child.meta?.title }}
            </el-menu-item>
          </el-sub-menu>
          <!-- 单个菜单项 -->
          <el-menu-item v-else :index="route.children?.[0] ? `${route.path}/${route.children[0].path}` : route.path">
            <el-icon><component :is="route.meta?.icon || route.children?.[0]?.meta?.icon" /></el-icon>
            <span>{{ route.children?.[0]?.meta?.title || route.meta?.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item">{{ item }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-badge :value="unreadCount" :hidden="!unreadCount" class="alert-badge">
            <el-icon class="header-icon" @click="$router.push('/system/alert')"><Bell /></el-icon>
          </el-badge>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span>{{ userStore.userInfo?.name || userStore.userInfo?.phone }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 页面内容 -->
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getUnreadCount } from '@/api/alert'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)
const unreadCount = ref(0)

const activeMenu = computed(() => route.path)

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((r) => r.meta?.title)
  return matched.map((r) => r.meta.title as string)
})

// 过滤出菜单路由
const menuRoutes = computed(() => {
  const main = router.options.routes.find((r) => r.path === '/')
  return main?.children?.filter((r) => r.meta?.title) || []
})

async function loadUnread() {
  try {
    const res: any = await getUnreadCount()
    unreadCount.value = res.data?.count || 0
  } catch {}
}

function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}

onMounted(() => {
  userStore.fetchUser()
  loadUnread()
  // 每分钟刷新未读数
  setInterval(loadUnread, 60000)
})
</script>

<style scoped>
.layout {
  height: 100vh;
}
.aside {
  background: #001529;
  transition: width 0.3s;
  overflow: hidden;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #ffffff1a;
}
.logo img {
  width: 28px;
  height: 28px;
}
.menu {
  border-right: none;
  height: calc(100vh - 60px);
  overflow-y: auto;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}
.header-icon {
  font-size: 20px;
  cursor: pointer;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.main {
  background: #f5f5f5;
  overflow-y: auto;
}
</style>
