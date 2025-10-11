"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

// Hook to handle viewport height changes for mobile keyboards
const useViewportHeight = () => {
  React.useEffect(() => {
    const updateVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    updateVh()
    window.addEventListener('resize', updateVh)
    window.addEventListener('orientationchange', updateVh)

    return () => {
      window.removeEventListener('resize', updateVh)
      window.removeEventListener('orientationchange', updateVh)
    }
  }, [])
}

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  useViewportHeight()
  
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      className={cn("fixed inset-0 z-50 bg-black/80", "h-[calc(var(--vh,1vh)*100)]", className)}
      {...props}
    />
  )
})
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false)
  const [focusedInput, setFocusedInput] = React.useState<HTMLElement | null>(null)
  
  React.useEffect(() => {
    const initialViewportHeight = window.visualViewport?.height || window.innerHeight
    
    const handleViewportChange = () => {
      const currentViewportHeight = window.visualViewport?.height || window.innerHeight
      const heightDifference = initialViewportHeight - currentViewportHeight
      
      // Consider keyboard open if viewport height decreased significantly (more than 150px)
      setIsKeyboardOpen(heightDifference > 150)
    }

    // Handle input focus to scroll to focused element when keyboard opens
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setFocusedInput(target)
        // Small delay to ensure keyboard is open before scrolling
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
        }, 300)
      }
    }

    const handleFocusOut = () => {
      setFocusedInput(null)
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
    } else {
      window.addEventListener('resize', handleViewportChange)
    }
    
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange)
      } else {
        window.removeEventListener('resize', handleViewportChange)
      }
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-x-0 z-50 flex flex-col rounded-t-[10px] bg-background",
          "transition-all duration-300 ease-in-out", // Smooth transitions
          isKeyboardOpen 
            ? "bottom-0 h-[calc(100dvh-env(keyboard-inset-height,0px))] max-h-[80vh]" 
            : "bottom-0 mt-24 h-auto max-h-[90vh]",
          className
        )}
        style={{
          // Ensure drawer doesn't go above safe area
          minHeight: isKeyboardOpen ? '50vh' : 'auto',
        }}
        {...props}
      >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-primary/20 flex-shrink-0" />
        <div className="flex-1 overflow-auto px-1">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col gap-2 p-4 flex-shrink-0 bg-background border-t border-white/10 sticky bottom-0", 
      className
    )} 
    {...props} 
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}