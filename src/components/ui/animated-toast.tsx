import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, XIcon } from "lucide-react"
import { toast as sonnerToast } from "sonner"

export type ToastType = "success" | "error" | "info" | "warning"

interface AnimatedToastProps {
  id: string | number
  title: string
  description?: string
  type: ToastType
}

const icons = {
  success: <CircleCheckIcon className="w-5 h-5 text-emerald-500" />,
  error: <OctagonXIcon className="w-5 h-5 text-red-500" />,
  info: <InfoIcon className="w-5 h-5 text-blue-500" />,
  warning: <TriangleAlertIcon className="w-5 h-5 text-amber-500" />
}

const bgColors = {
  success: "bg-emerald-500/10",
  error: "bg-red-500/10",
  info: "bg-blue-500/10",
  warning: "bg-amber-500/10"
}

export function AnimatedToast({ id, title, description, type }: AnimatedToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        mass: 1
      }}
      className="relative w-full rounded-2xl bg-white/70 dark:bg-black/60 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-2xl p-4 flex gap-4 min-w-[320px] items-start"
    >
      <div className={`mt-0.5 flex-shrink-0 p-2 rounded-full ${bgColors[type]}`}>
        {icons[type]}
      </div>
      
      <div className="flex-1 flex flex-col gap-1 pt-1">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>

      <button
        onClick={() => sonnerToast.dismiss(id)}
        className="absolute -top-2.5 -right-2.5 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:scale-110 transition-all"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}
