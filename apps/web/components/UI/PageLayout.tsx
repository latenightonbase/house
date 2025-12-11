import { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

interface PageLayoutProps {
  children: ReactNode
  className?: string
}

export default function PageLayout({ 
  children, 
  className = ''
}: PageLayoutProps) {
  return (
    <div className={twMerge(
      'px-2 py-3 lg:px-4 lg:py-8',
      className
    )}>
      {children}
    </div>
  )
}
