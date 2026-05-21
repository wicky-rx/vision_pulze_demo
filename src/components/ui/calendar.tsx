import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        // month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center h-10",
        caption_label: "text-sm font-medium",
        caption_dropdowns: "flex justify-center gap-1 items-center",
        dropdown: "h-8 px-1.5 py-0.5 font-medium bg-white border border-input rounded-md opacity-100 hover:bg-accent focus:bg-accent cursor-pointer text-sm outline-none transition-colors",
        dropdown_month: "relative inline-flex items-center",
        dropdown_year: "relative inline-flex items-center",
        vhidden: "sr-only", 
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-none w-9 font-normal text-[0.8rem]",
        row: "flex w-full",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-none [&:has([aria-selected].day-outside)]:bg-orange-50/50 [&:has([aria-selected])]:bg-orange-50 first:[&:has([aria-selected])]:rounded-none last:[&:has([aria-selected])]:rounded-none focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-none"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-orange-600 text-white hover:bg-orange-700 hover:text-white focus:bg-orange-600 focus:text-white rounded-none",
        day_today: "bg-slate-100 text-slate-900 rounded-none",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-orange-50/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-orange-50 aria-selected:text-orange-600",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Dropdown: ({ value, onChange, children, ...props }: any) => {
          const options = React.Children.toArray(children) as React.ReactElement[];
          const selected = options.find((child) => child.props.value === value);
          const handleValueChange = (newValue: string) => {
            onChange?.({ target: { value: newValue } } as any);
          };
          const isMonth = props["aria-label"]?.toLowerCase().includes("month");
          const width = isMonth ? "w-[110px]" : "w-[80px]";
          return (
            <Select
              value={value?.toString()}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className={cn("pr-1.5 focus:ring-0 h-8", width)}>
                <SelectValue>{selected?.props?.children}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="bg-white">
                <ScrollArea className="h-80">
                  {options.map((option, id: number) => (
                    <SelectItem
                      key={`${option.props.value}-${id}`}
                      value={option.props.value?.toString() ?? ""}
                    >
                      {option.props.children}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
