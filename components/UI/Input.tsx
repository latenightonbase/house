'use client'

import { useState } from "react"
import { twMerge } from "tailwind-merge"

interface InputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  disabled?: boolean
  required?: boolean
  className?: string
  id?: string
}

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  required = false,
  className = '',
  id
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`
  const hasValue = value.length > 0
  const showError = required && hasInteracted && !hasValue

  const handleFocus = () => {
    setIsFocused(true)
    if (!hasInteracted) {
      setHasInteracted(true)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={twMerge('relative text-white flex flex-col-reverse gap-2', className)}>
      {/* Error Message */}
      {showError && (
        <p className="text-red-500 text-xs">
          {label} is required
        </p>
      )}
      
      {/* Input Field */}
      <input
      onPointerDown={(e) => e.stopPropagation()}
        id={inputId}
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={twMerge(
          'w-full px-4 py-3 rounded-lg border-[1px] bg-transparent transition-all outline-0 duration-200 text-foreground peer',
          disabled && 'border-disabled cursor-not-allowed opacity-60',
          !disabled && (isFocused || hasValue) && showError && 'border-red-500 outline-red-500',
          !disabled && (isFocused || hasValue) && !showError && 'border-primary outline-primary',
          !disabled && !(isFocused || hasValue) && 'border-white/30 ',
          isFocused && 'outline-1 outline-offset-1'
        )}
      />
      
      {/* Floating Label */}
      <label
        htmlFor={inputId}
        className={twMerge(
          'block text-sm font-medium peer-focus:text-primary ',
          disabled && 'text-disabled',
          showError && 'text-red-500',
          !showError && 'text-gray-500'
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

    </div>
  )
}
