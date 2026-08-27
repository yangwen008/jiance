import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Index.vue'),
        meta: { title: '数据概览', icon: 'Odometer' },
      },
      {
        path: 'weather',
        name: 'Weather',
        redirect: '/weather/realtime',
        meta: { title: '气象监测', icon: 'Sunny' },
        children: [
          { path: 'realtime', name: 'WeatherRealtime', component: () => import('@/views/weather/Realtime.vue'), meta: { title: '实时数据' } },
          { path: 'history', name: 'WeatherHistory', component: () => import('@/views/weather/History.vue'), meta: { title: '历史查询' } },
          { path: 'accumulation', name: 'WeatherAccumulation', component: () => import('@/views/weather/Accumulation.vue'), meta: { title: '积温积光' } },
          { path: 'soil', name: 'WeatherSoil', component: () => import('@/views/weather/Soil.vue'), meta: { title: '墒情分析' } },
        ],
      },
      {
        path: 'pest',
        name: 'Pest',
        redirect: '/pest/realtime',
        meta: { title: '虫情监测', icon: 'Bug' },
        children: [
          { path: 'realtime', name: 'PestRealtime', component: () => import('@/views/pest/Realtime.vue'), meta: { title: '实时虫情' } },
          { path: 'trend', name: 'PestTrend', component: () => import('@/views/pest/Trend.vue'), meta: { title: '趋势分析' } },
          { path: 'verify', name: 'PestVerify', component: () => import('@/views/pest/Verify.vue'), meta: { title: '人工复核' } },
        ],
      },
      {
        path: 'camera',
        name: 'Camera',
        component: () => import('@/views/camera/Index.vue'),
        meta: { title: '视频监控', icon: 'VideoCamera' },
      },
      {
        path: 'service',
        name: 'Service',
        redirect: '/service/provider',
        meta: { title: '社会化服务', icon: 'Service' },
        children: [
          { path: 'provider', name: 'ServiceProvider', component: () => import('@/views/service/Provider.vue'), meta: { title: '服务商管理' } },
          { path: 'machine', name: 'ServiceMachine', component: () => import('@/views/service/Machine.vue'), meta: { title: '农机管理' } },
          { path: 'dryer', name: 'ServiceDryer', component: () => import('@/views/service/Dryer.vue'), meta: { title: '烘干站管理' } },
          { path: 'order', name: 'ServiceOrder', component: () => import('@/views/service/Order.vue'), meta: { title: '订单管理' } },
        ],
      },
      {
        path: 'audit',
        name: 'Audit',
        component: () => import('@/views/audit/Index.vue'),
        meta: { title: '资质审核', icon: 'Checked' },
      },
      {
        path: 'ai',
        name: 'AI',
        component: () => import('@/views/ai/Index.vue'),
        meta: { title: 'AI 助手', icon: 'ChatDotRound' },
      },
      {
        path: 'system',
        name: 'System',
        redirect: '/system/device',
        meta: { title: '系统管理', icon: 'Setting' },
        children: [
          { path: 'device', name: 'SystemDevice', component: () => import('@/views/system/Device.vue'), meta: { title: '设备管理' } },
          { path: 'alert', name: 'SystemAlert', component: () => import('@/views/system/Alert.vue'), meta: { title: '预警管理' } },
          { path: 'user', name: 'SystemUser', component: () => import('@/views/system/User.vue'), meta: { title: '用户管理' } },
        ],
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || ''} - 农业虫情监测平台`
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
