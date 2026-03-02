"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { useI18n } from "@/firebase/client-provider"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const { locale } = useI18n()
  const dateLocale = locale === 'es' ? es : enUS
  
  // Try to find the selected date for the header display
  // Supports single date and assumes it's a Date object or can be converted
  const selectedDate = React.useMemo(() => {
    if (props.mode === "single" && props.selected instanceof Date) {
      return props.selected
    }
    return null
  }, [props.mode, props.selected])

  return (
    <div className="flex flex-col overflow-hidden bg-background rounded-xl border shadow-xl max-w-[320px]">
      {/* Header section (Material Design Inspired) */}
      <div className="bg-primary text-primary-foreground p-6 flex justify-between items-start transition-colors duration-300">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
            {locale === 'es' ? 'SELECCIONAR FECHA' : 'SELECT DATE'}
          </p>
          <h2 className="text-3xl font-semibold mt-2 leading-tight">
            {selectedDate ? (
              <span className="capitalize">
                {format(selectedDate, "EEE, MMM d", { locale: dateLocale })}
              </span>
            ) : (
              <span className="opacity-50">---, --- --</span>
            )}
          </h2>
        </div>
        <Pencil className="h-5 w-5 opacity-60 hover:opacity-100 cursor-pointer transition-opacity mt-1" />
      </div>

      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-4", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4 w-full",
          month_caption: "flex justify-between items-center h-10 px-1 mb-4",
          caption_label: "hidden", // We use dropdowns for month/year
          nav: "flex items-center gap-1",
          button_previous: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 opacity-60 hover:opacity-100 hover:bg-accent rounded-full"
          ),
          button_next: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 opacity-60 hover:opacity-100 hover:bg-accent rounded-full"
          ),
          month_grid: "w-full border-collapse space-y-1",
          weekdays: "flex justify-between",
          weekday: "text-muted-foreground w-9 font-semibold text-[0.7rem] text-center uppercase tracking-tighter",
          week: "flex w-full mt-1 justify-between",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-medium aria-selected:opacity-100 rounded-full transition-all text-sm"
          ),
          day_button: "h-9 w-9 p-0 font-normal rounded-full",
          range_end: "day-range-end",
          selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-md",
          today: "text-primary font-bold ring-1 ring-primary/30",
          outside: "day-outside text-muted-foreground/40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          disabled: "text-muted-foreground/20 pointer-events-none",
          range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          hidden: "invisible",
          dropdowns: "flex items-center gap-1 font-bold text-sm text-foreground/90",
          dropdown: "rdp-dropdown hover:bg-accent px-2 py-1 rounded-md transition-colors",
          dropdown_container: "relative inline-flex items-center",
          dropdown_month: "hover:text-primary transition-colors",
          dropdown_year: "hover:text-primary transition-colors ml-1",
          ...classNames,
        }}
        components={{
          Chevron: (props) => {
            if (props.orientation === 'left') return <ChevronLeft className="h-5 w-5" />
            return <ChevronRight className="h-5 w-5" />
          }
        }}
        locale={dateLocale}
        {...props}
      />
      
      {/* Footer section with Material style buttons */}
      <div className="flex justify-end gap-1 px-4 pb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary font-bold hover:bg-primary/5 text-xs tracking-wide px-4 h-9"
          type="button"
        >
          {locale === 'es' ? 'CANCELAR' : 'CANCEL'}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary font-bold hover:bg-primary/5 text-xs tracking-wide px-4 h-9"
          type="button"
        >
          OK
        </Button>
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }