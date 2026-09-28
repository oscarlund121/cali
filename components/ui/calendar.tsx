"use client";

import * as React from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onDayDrop?: (date: Date, taskId: string) => void;
  isDragActive?: boolean;
};

function DayButton({
  day,
  modifiers,
  className,
  children,
  onTaskDrop,
  dropActive,
  ...props
}: DayButtonProps & {
  onTaskDrop?: (taskId: string) => void;
  dropActive?: boolean;
}) {
  const selected =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle;
  const rangeStart = modifiers.range_start;
  const rangeEnd = modifiers.range_end;
  const rangeMiddle = modifiers.range_middle;
  const isToday = modifiers.today && !selected && !rangeStart && !rangeEnd && !rangeMiddle;
  const muted = modifiers.outside || modifiers.disabled;
  const filled = selected || rangeStart || rangeEnd;

  return (
    <button
      type="button"
      className={cn(
        "relative flex h-9 w-full items-center justify-center whitespace-nowrap rounded-lg p-0 text-sm text-foreground outline-offset-2 transition-colors",
        "hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70",
        muted && "text-foreground/30",
        modifiers.disabled && "line-through",
        selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        rangeStart && "rounded-e-none rounded-s-lg bg-primary text-primary-foreground",
        rangeEnd && "rounded-s-none rounded-e-lg bg-primary text-primary-foreground",
        rangeMiddle && "rounded-none bg-accent text-foreground",
        isToday && "bg-accent text-accent-foreground",
        dropActive && "border border-dashed border-primary/30",
        className,
      )}
      onDragOver={(e) => {
        if (onTaskDrop) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(e) => {
        if (onTaskDrop) {
          e.preventDefault();
          const taskId = e.dataTransfer.getData("text/plain");
          if (taskId) onTaskDrop(taskId);
        }
      }}
      {...props}
    >
      {children}
      {modifiers.hasTasks ? (
        <span
          className={cn(
            "pointer-events-none absolute bottom-1 start-1/2 size-[3px] -translate-x-1/2 rounded-full",
            filled ? "bg-primary-foreground" : "bg-primary",
          )}
        />
      ) : null}
    </button>
  );
}

function Calendar({
  className,
  classNames,
  components,
  onDayDrop,
  isDragActive,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      className={cn("w-full", className)}
      weekStartsOn={1}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "w-full",
        month_caption: "relative mx-10 mb-1 flex h-9 items-center justify-center z-20",
        caption_label: "text-sm font-medium",
        nav: "absolute top-0 flex w-full justify-between z-10",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 text-muted-foreground/80 hover:text-foreground p-0",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 text-muted-foreground/80 hover:text-foreground p-0",
        ),
        weekdays: "",
        weekday: "h-9 p-0 text-xs font-medium text-muted-foreground/80",
        week: "",
        month_grid: "w-full border-collapse table-fixed",
        day: "relative p-0 text-sm",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) =>
          props.orientation === "left" ? (
            <ChevronLeftIcon className="size-4" {...props} aria-hidden="true" />
          ) : (
            <ChevronRightIcon className="size-4" {...props} aria-hidden="true" />
          ),
        DayButton: (btnProps) => (
          <DayButton
            {...btnProps}
            dropActive={isDragActive}
            onTaskDrop={(taskId) => onDayDrop?.(btnProps.day.date, taskId)}
          />
        ),
        ...components,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
