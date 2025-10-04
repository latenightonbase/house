'use client'

import { useState, useRef, useEffect } from "react"
import { twMerge } from "tailwind-merge"

interface DatePickerProps {
  label: string
  value: Date | null
  onChange: (date: Date | null) => void
  minDate?: Date
  disabled?: boolean
  className?: string
}

export default function DatePicker({
  label,
  value,
  onChange,
  minDate = new Date(),
  disabled = false,
  className = ''
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(value || new Date())
  const [timeInput, setTimeInput] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Initialize time input when value changes
  useEffect(() => {
    if (value) {
      const hours = value.getHours().toString().padStart(2, '0')
      const minutes = value.getMinutes().toString().padStart(2, '0')
      setTimeInput(`${hours}:${minutes}`)
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today || checkDate < minDate
  }

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    
    // Apply time if set
    if (timeInput) {
      const [hours, minutes] = timeInput.split(':').map(Number)
      newDate.setHours(hours, minutes)
    }
    
    onChange(newDate)
    // Don't close immediately to allow time adjustment
  }

  const handleTimeChange = (time: string) => {
    setTimeInput(time)
    if (value && time) {
      const [hours, minutes] = time.split(':').map(Number)
      const newDate = new Date(value)
      newDate.setHours(hours, minutes)
      onChange(newDate)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const isSelected = value && 
        value.getDate() === day && 
        value.getMonth() === currentMonth.getMonth() && 
        value.getFullYear() === currentMonth.getFullYear()
      const isDisabled = isDateDisabled(date)

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => !isDisabled && handleDateSelect(day)}
          disabled={isDisabled}
          className={twMerge(
            'p-2 text-sm rounded transition-colors',
            isSelected && 'bg-primary text-white',
            !isSelected && !isDisabled && 'hover:bg-primary/10 text-foreground',
            isDisabled && 'text-gray-300 cursor-not-allowed'
          )}
        >
          {day}
        </button>
      )
    }

    return days
  }

  return (
    <div className={twMerge('relative', className)} ref={dropdownRef}>
      {/* Display Input */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={twMerge(
          'w-full px-4 py-3 rounded-lg border-2 bg-transparent transition-all text-left',
          disabled && 'border-disabled cursor-not-allowed opacity-60',
          !disabled && isOpen && 'border-primary outline-2 outline-primary outline-offset-1',
          !disabled && !isOpen && 'border-gray-300 hover:border-gray-400'
        )}
      >
        <span className={value ? 'text-foreground' : 'text-gray-500'}>
          {formatDisplayDate(value)}
        </span>
      </button>

      {/* Floating Label */}
      <label
        className={twMerge(
          'absolute left-4 transition-all duration-200 pointer-events-none select-none',
          disabled && 'text-disabled',
          !disabled && (isOpen || value) && 'text-primary -top-2 text-sm bg-background px-1',
          !disabled && !(isOpen || value) && 'text-gray-500 top-3 text-base'
        )}
      >
        {label}
      </label>

      {/* Calendar Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-20 w-full mt-1 h-10 bg-background border border-gray-300 rounded-lg shadow-lg p-4">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-primary/10 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="font-semibold text-foreground">
              {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-primary/10 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="p-2 text-xs font-medium text-gray-500 text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {renderCalendar()}
          </div>

          {/* Time Input */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Time
            </label>
            <input
              type="time"
              value={timeInput}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-foreground bg-background focus:border-primary focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={!value}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}