"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export interface MonthYearValue {
  month: string
  year: string
}

export function MonthYearFilter({
  value,
  onChange,
  years,
}: {
  value: MonthYearValue
  onChange: (value: MonthYearValue) => void
  years: number[]
}) {
  return (
    <div className="flex items-center gap-2">
      <Select value={value.month} onValueChange={(month) => onChange({ ...value, month })}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Months</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={m} value={String(i)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.year} onValueChange={(year) => onChange({ ...value, year })}>
        <SelectTrigger className="h-9 w-[110px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
