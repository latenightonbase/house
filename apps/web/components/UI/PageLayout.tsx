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
      '',
      className
    )}>
      {children}
    </div>
  )
}
