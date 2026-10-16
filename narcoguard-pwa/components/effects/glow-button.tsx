"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RippleEffect } from "./ripple-effect"
import type { ComponentProps, ReactNode } from "react"

interface GlowButtonProps extends Omit<ComponentProps<typeof Button>, "variant" | "size" | "children"> {
  children: ReactNode
  onClick?: () => void
  variant?: "default" | "outline" | "emergency" | "success"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function GlowButton({
  children,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  ...props
}: GlowButtonProps) {
  const variantClasses = {
    default: "pulse-glow bg-primary hover:bg-primary/90 text-primary-foreground",
    outline: "border border-primary/60 bg-transparent text-primary hover:bg-primary/10",
    emergency: "emergency-pulse bg-destructive-solid hover:bg-destructive-solid/90 text-destructive-foreground",
    success: "pulse-glow bg-green-600 hover:bg-green-700 text-white",
  }

  return (
    <RippleEffect>
      <Button
        {...props}
        onClick={onClick}
        // Only the default look builds on Button's gradient; the other variants supply their
        // own background, which a background-image underneath would otherwise hide.
        variant={variant === "default" ? "default" : null}
        size={size}
        className={cn(variantClasses[variant], "transition-all duration-300 transform hover:scale-105", className)}
      >
        {children}
      </Button>
    </RippleEffect>
  )
}
