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
  multiline?: boolean
  rows?: number
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
  id,
  multiline = false,
  rows = 4
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const sharedClassName = twMerge(
    'w-full px-4 py-3 rounded-lg border-[1px] bg-surface-2 transition-all outline-0 duration-200 text-foreground placeholder:text-caption/70 peer',
    disabled && 'border-disabled cursor-not-allowed opacity-60',
    !disabled && showError && 'border-negative',
    !disabled && !showError && isFocused && 'border-primary ring-2 ring-primary/25',
    !disabled && !showError && !isFocused && 'border-line hover:border-line-strong'
  )

  return (
    <div className={twMerge('relative text-white flex flex-col-reverse gap-2', className)}>
      {/* Error Message */}
      {showError && (
        <p className="text-negative text-xs">
          {label} is required
        </p>
      )}
      
      {/* Input Field */}
      {multiline ? (
        <textarea
          onPointerDown={(e) => e.stopPropagation()}
          id={inputId}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          className={twMerge(sharedClassName, 'resize-none')}
        />
      ) : (
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
          className={sharedClassName}
        />
      )}
      
      {/* Floating Label */}
      <label
        htmlFor={inputId}
        className={twMerge(
          'block text-xs font-semibold uppercase tracking-[0.12em] peer-focus:text-primary-light',
          disabled && 'text-disabled',
          showError && 'text-negative',
          !showError && 'text-caption'
        )}
      >
        {label}
        {required && <span className="text-negative ml-1">*</span>}
      </label>

    </div>
  )
}
