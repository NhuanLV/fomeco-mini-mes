import type { Ref, VNodeChild } from 'vue'

type ToastColor = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral'
type ToastOptions = {
  color?: ToastColor
  summary?: string
  detail?: string | VNodeChild
  life?: number
  closable?: boolean
  group?: string
  icon?: string
  ui?: Record<string, unknown>
}
type ToastInstance = {
  toasts: Ref<Array<{ id: string | number }>>
  add: (toast: Record<string, unknown>) => unknown
  remove: (id: string | number) => void
}

let toastInstance: ToastInstance | null = null

export function setToastInstance(toast: ToastInstance) {
  toastInstance = toast
}

export function showToast(options: ToastOptions) {
  toastInstance?.add({
    id: options.group,
    color: options.color,
    title: options.summary,
    description: options.detail,
    duration: options.life,
    close: options.closable,
    icon: options.icon,
    ui: options.ui,
  })
}

export function showSuccess(message: string, life = 3000) {
  showToast({
    color: 'success',
    summary: 'Thành công',
    detail: message,
    life,
  })
}

export function showWarn(message: string, life = 3000) {
  showToast({
    color: 'warning',
    summary: 'Cảnh báo',
    detail: message,
    life,
  })
}

export function showError(message: string, life = 3000) {
  showToast({
    color: 'error',
    summary: 'Lỗi',
    detail: message,
    life,
  })
}

export function showLoading(message: string, summary = 'Đang xử lý', group = 'loading') {
  clearToastGroup(group)
  showToast({
    color: 'info',
    summary,
    detail: message,
    life: 0,
    closable: false,
    icon: 'i-lucide-loader-circle',
    ui: { icon: 'animate-spin' },
    group,
  })
}

export function clearLoading(group = 'loading') {
  clearToastGroup(group)
}

export function clearToastGroup(group: string) {
  toastInstance?.toasts.value
    .filter((toast) => toast.id === group)
    .forEach((toast) => toastInstance?.remove(toast.id))
}
