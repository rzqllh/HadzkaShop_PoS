import { toast as sonnerToast } from "sonner"

type ToastOptions = {
  description?: string
  duration?: number
}

export const toast = {
  success: (title: string, options?: ToastOptions) => sonnerToast.success(title, { description: options?.description, duration: options?.duration }),
  error: (title: string, options?: ToastOptions) => sonnerToast.error(title, { description: options?.description, duration: options?.duration }),
  info: (title: string, options?: ToastOptions) => sonnerToast.info(title, { description: options?.description, duration: options?.duration }),
  warning: (title: string, options?: ToastOptions) => sonnerToast.warning(title, { description: options?.description, duration: options?.duration }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
}
