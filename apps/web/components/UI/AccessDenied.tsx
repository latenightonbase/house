'use client'

import { RiLockLine } from 'react-icons/ri'

interface AccessDeniedProps {
  message?: string
}

export default function AccessDenied({ message = 'Please login to continue.' }: AccessDeniedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 lg:-mt-16">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-line flex items-center justify-center mx-auto mb-6">
          <RiLockLine className="text-2xl text-caption" />
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
        <p className="text-caption text-sm">{message}</p>
      </div>
    </div>
  )
}
