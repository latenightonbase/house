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
      'px-4 py-6 md:px-4 md:py-8',
      className
    )}>
      {children}
    </div>
  )
}
