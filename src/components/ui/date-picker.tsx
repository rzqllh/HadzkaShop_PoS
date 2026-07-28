"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
}: {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "w-full h-8 flex justify-start items-center gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm font-normal shadow-none hover:bg-transparent dark:bg-input/30 dark:hover:bg-input/50 active:scale-100 whitespace-nowrap overflow-hidden",
          !date && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0" />
        <span className="truncate">{date ? format(date, "yyyy-MM-dd") : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
