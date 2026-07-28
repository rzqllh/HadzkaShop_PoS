import * as React from "react"
import { toast as sonnerToast } from "sonner"
import { AnimatedToast, type ToastType } from "@/components/ui/animated-toast"

type ToastOptions = {
  description?: string
  duration?: number
}

function createAnimatedToast(type: ToastType, title: string, options?: ToastOptions) {
  return sonnerToast.custom(
    (id) => (
      <AnimatedToast
        id={id}
        title={title}
        description={options?.description}
        type={type}
      />
    ),
    {
      duration: options?.duration || 4000,
    }
  )
}

export const toast = {
  success: (title: string, options?: ToastOptions) => createAnimatedToast("success", title, options),
  error: (title: string, options?: ToastOptions) => createAnimatedToast("error", title, options),
  info: (title: string, options?: ToastOptions) => createAnimatedToast("info", title, options),
  warning: (title: string, options?: ToastOptions) => createAnimatedToast("warning", title, options),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
}
