import { ROUTE_PATH } from '@/app/router/path'
import type { PermissionCode } from '@/lib/types'
import { useAuthStore } from '@/shared/stores/auth'
import { createRouter, createWebHashHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiredPermission?: PermissionCode
    requiredAnyPermission?: PermissionCode[]
  }
}

// Hash history: chạy được trên GitHub Pages / Netlify mà không cần cấu hình redirect
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: ROUTE_PATH.LOGIN, component: () => import('@/pages/login.vue'), meta: { title: 'Đăng nhập' } },
    { path: ROUTE_PATH.FORBIDDEN, component: () => import('@/pages/forbidden.vue') },
    {
      path: '/',
      component: () => import('@/pages/main.vue'),
      children: [
        {
          path: '',
          component: () => import('@/pages/main/index.vue'),
          meta: { title: 'Dashboard', requiredPermission: 'VIEW_REPORT' },
        },
        { path: 'profile', component: () => import('@/pages/main/profile.vue'), meta: { title: 'Hồ sơ' } },
        {
          path: 'org-units',
          component: () => import('@/pages/main/org-units.vue'),
          meta: { title: 'Quản trị tổ chức', requiredPermission: 'MANAGE_ORG' },
        },
        {
          path: 'accounts',
          component: () => import('@/pages/main/accounts.vue'),
          meta: { title: 'Quản trị tài khoản', requiredPermission: 'MANAGE_ACCOUNT' },
        },
        {
          path: 'roles',
          component: () => import('@/pages/main/roles.vue'),
          meta: { title: 'Quản trị vai trò', requiredPermission: 'MANAGE_ACCOUNT' },
        },
        {
          path: 'products',
          component: () => import('@/pages/main/products.vue'),
          meta: { title: 'Quản trị mã hàng', requiredPermission: 'MANAGE_PRODUCT' },
        },
        {
          path: 'progress',
          component: () => import('@/pages/main/progress.vue'),
          meta: { title: 'Báo cáo tiến độ', requiredPermission: 'REPORT_PROGRESS' },
        },
        {
          path: 'history',
          component: () => import('@/pages/main/history.vue'),
          meta: {
            title: 'Lịch sử báo cáo',
            requiredAnyPermission: ['VIEW_REPORT', 'REPORT_PROGRESS'],
          },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

/** Trang đầu tiên người dùng được phép vào */
export function homeFor(has: (p: PermissionCode) => boolean) {
  if (has('VIEW_REPORT')) return ROUTE_PATH.DASHBOARD
  if (has('REPORT_PROGRESS')) return ROUTE_PATH.PROGRESS
  if (has('MANAGE_PRODUCT')) return ROUTE_PATH.PRODUCTS
  if (has('MANAGE_ACCOUNT')) return ROUTE_PATH.ACCOUNTS
  if (has('MANAGE_ORG')) return ROUTE_PATH.ORGANIZATION
  return ROUTE_PATH.PROFILE
}

router.beforeEach(async (to) => {
  const { isInitialized, isAuthenticated, hasPermission, checkAuth } = useAuthStore()
  if (!isInitialized.value) await checkAuth()

  if (to.path !== ROUTE_PATH.LOGIN && !isAuthenticated.value) {
    return { path: ROUTE_PATH.LOGIN, query: { redirect: to.fullPath } }
  }
  if (to.path === ROUTE_PATH.LOGIN && isAuthenticated.value) {
    return homeFor(hasPermission)
  }
  const required = to.meta.requiredPermission
  const any = to.meta.requiredAnyPermission
  if ((required && !hasPermission(required)) || (any && !any.some((p) => hasPermission(p)))) {
    // Dashboard là trang chủ: nếu không có quyền xem thì chuyển tới trang phù hợp
    if (to.path === ROUTE_PATH.DASHBOARD) return homeFor(hasPermission)
    return { path: ROUTE_PATH.FORBIDDEN }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | FOMECO Mini-MES` : 'FOMECO Mini-MES'
})

export default router
