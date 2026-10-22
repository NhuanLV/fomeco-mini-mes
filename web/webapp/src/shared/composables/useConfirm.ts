import ConfirmModal from '@/shared/components/ConfirmModal.vue'
import { useOverlay } from '@nuxt/ui/composables'

type ConfirmOptions = {
  header?: string
  message?: string
  icon?: string
  acceptLabel?: string
  rejectLabel?: string
  acceptProps?: {
    label?: string
    color?: 'primary' | 'error' | 'warning' | 'neutral'
  }
  rejectProps?: {
    label?: string
  }
  accept?: () => void | Promise<void>
}

export function useConfirm() {
  const modal = useOverlay().create(ConfirmModal)

  return {
    async require(options: ConfirmOptions) {
      const instance = modal.open({
        title: options.header ?? 'Xác nhận',
        description: options.message ?? '',
        icon: options.icon,
        confirmLabel: options.acceptProps?.label ?? options.acceptLabel ?? 'Đồng ý',
        cancelLabel: options.rejectProps?.label ?? options.rejectLabel ?? 'Hủy',
        confirmColor:
          options.acceptProps?.color === 'warning'
            ? 'warning'
            : options.acceptProps?.color === 'error'
              ? 'error'
              : 'primary',
      })

      const confirmed = await instance
      if (confirmed) void options.accept?.()
      return confirmed
    },
  }
}
