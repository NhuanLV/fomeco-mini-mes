import { getMyAccount } from '@/lib/api'
import { supabase, usernameToEmail } from '@/lib/supabase'
import type { Account, PermissionCode } from '@/lib/types'
import { createGlobalState } from '@vueuse/core'
import { computed, ref } from 'vue'

export const useAuthStore = createGlobalState(() => {
  const isInitialized = ref(false)
  const isAuthenticated = ref(false)
  const currentUser = ref<Account | null>(null)
  let pending: Promise<void> | null = null

  const permissions = computed(() => new Set(currentUser.value?.permissions ?? []))

  function hasPermission(code: PermissionCode) {
    return permissions.value.has(code)
  }

  async function loadProfile() {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user) {
      currentUser.value = null
      isAuthenticated.value = false
      return
    }
    const account = await getMyAccount(user.id).catch(() => null)
    if (!account || !account.active) {
      await supabase.auth.signOut()
      currentUser.value = null
      isAuthenticated.value = false
      return
    }
    currentUser.value = account
    isAuthenticated.value = true
  }

  async function checkAuth() {
    if (!pending) {
      pending = loadProfile().finally(() => {
        isInitialized.value = true
        pending = null
      })
    }
    return pending
  }

  /** Trả về thông báo lỗi (tiếng Việt) hoặc null khi đăng nhập thành công */
  async function login(username: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    if (error) {
      if (/banned/i.test(error.message)) return 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'
      if (/fetch/i.test(error.message)) return 'Không thể đăng nhập. Vui lòng kiểm tra kết nối và thử lại.'
      return 'Tên đăng nhập hoặc mật khẩu không đúng.'
    }
    await loadProfile()
    isInitialized.value = true
    if (!isAuthenticated.value) return 'Tài khoản đã bị khóa hoặc chưa được cấp quyền.'
    return null
  }

  async function logout() {
    await supabase.auth.signOut()
    currentUser.value = null
    isAuthenticated.value = false
  }

  return {
    isInitialized,
    isAuthenticated,
    currentUser,
    hasPermission,
    checkAuth,
    login,
    logout,
  }
})
