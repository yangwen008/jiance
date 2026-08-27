<template>
  <view class="page">
    <!-- 用户信息 -->
    <view v-if="userStore.isLoggedIn" class="user-card">
      <view class="avatar">👤</view>
      <view class="user-info">
        <text class="user-name">{{ userStore.userInfo?.name || '用户' }}</text>
        <text class="user-phone">{{ userStore.userInfo?.phone }}</text>
      </view>
      <view class="role-tag">{{ roleMap[userStore.userInfo?.role as string] || '用户' }}</view>
    </view>

    <!-- 未登录 -->
    <view v-else class="login-prompt">
      <text class="login-text">请先登录查看更多功能</text>
    </view>

    <!-- 功能列表 -->
    <view class="menu-list">
      <view class="menu-item" @tap="goPage('/pages/service/index')">
        <text class="menu-icon">📋</text>
        <text class="menu-text">我的订单</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goPage('/pages/weather/index')">
        <text class="menu-icon">🌤</text>
        <text class="menu-text">气象数据</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goPage('/pages/pest/index')">
        <text class="menu-icon">🐛</text>
        <text class="menu-text">虫情数据</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" v-if="userStore.isLoggedIn" @tap="handleLogout">
        <text class="menu-icon">🚪</text>
        <text class="menu-text">退出登录</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const roleMap: Record<string, string> = { admin: '管理员', manager: '运营', user: '普通用户' }

function goPage(url: string) {
  uni.switchTab({ url })
}

function handleLogout() {
  userStore.logout()
  uni.showToast({ title: '已退出登录', icon: 'success' })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.user-card { background: linear-gradient(135deg, #2979ff, #1e5fcc); border-radius: 16rpx; padding: 40rpx; display: flex; align-items: center; color: #fff; }
.avatar { font-size: 64rpx; margin-right: 24rpx; }
.user-info { flex: 1; }
.user-name { font-size: 32rpx; font-weight: bold; display: block; }
.user-phone { font-size: 24rpx; opacity: 0.8; display: block; margin-top: 4rpx; }
.role-tag { font-size: 22rpx; background: rgba(255,255,255,0.2); padding: 4rpx 16rpx; border-radius: 16rpx; }
.login-prompt { background: #fff; border-radius: 16rpx; padding: 48rpx; text-align: center; margin-bottom: 24rpx; }
.login-text { font-size: 28rpx; color: #999; }
.menu-list { background: #fff; border-radius: 12rpx; margin-top: 24rpx; }
.menu-item { display: flex; align-items: center; padding: 28rpx 24rpx; border-bottom: 1px solid #f5f5f5; }
.menu-icon { font-size: 36rpx; margin-right: 16rpx; }
.menu-text { flex: 1; font-size: 28rpx; }
.menu-arrow { font-size: 32rpx; color: #ccc; }
</style>
