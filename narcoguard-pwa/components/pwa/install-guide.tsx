"use client"

import { useState } from "react"
import { Share, SquarePlus, Ellipsis, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { InstallMethod } from "@/lib/install-platform"

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold" aria-hidden="true">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

const icon = "inline h-4 w-4 align-[-2px] mx-0.5"

/** Step-by-step install for browsers without a one-tap install prompt. */
export function InstallGuide({ method, open, onOpenChange }: { method: InstallMethod; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [copied, setCopied] = useState(false)
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="install-guide">
        <DialogHeader>
          <DialogTitle>Install NarcoGuard</DialogTitle>
          <DialogDescription>
            {method === "mac-safari" ? "Safari adds NarcoGuard to your Dock as an app." : "Apple does not let websites install themselves, so it takes a few taps in Safari."}
          </DialogDescription>
        </DialogHeader>
        {method === "ios" && (
          <ol className="space-y-3 text-sm">
            <Step n={1}>Tap the Share button <Share className={icon} aria-label="Share icon" />. On iOS 26, tap <Ellipsis className={icon} aria-label="More" /> next to the address bar first.</Step>
            <Step n={2}>Scroll down and tap <strong>Add to Home Screen</strong> <SquarePlus className={icon} aria-hidden="true" />.</Step>
            <Step n={3}>Keep <strong>Open as Web App</strong> on if you see it, then tap <strong>Add</strong>.</Step>
            <Step n={4}>Open NarcoGuard from its icon on your home screen.</Step>
          </ol>
        )}
        {method === "ios-in-app" && (
          <div className="space-y-3 text-sm">
            <p>This app&apos;s built-in browser cannot add websites to your home screen.</p>
            <ol className="space-y-3">
              <Step n={1}>Tap <Ellipsis className={icon} aria-label="More" /> or <Compass className={icon} aria-label="Browser" /> and choose <strong>Open in Safari</strong> (or Open in browser).</Step>
              <Step n={2}>In Safari, tap <strong>Install</strong> at the top of NarcoGuard and follow the steps.</Step>
            </ol>
            <Button type="button" variant="outline" onClick={copyLink}>{copied ? "Link copied" : "Copy link to paste in Safari"}</Button>
          </div>
        )}
        {method === "mac-safari" && (
          <ol className="space-y-3 text-sm">
            <Step n={1}>In the menu bar, choose <strong>File</strong>, then <strong>Add to Dock</strong>. You can also use the Share button <Share className={icon} aria-label="Share icon" />.</Step>
            <Step n={2}>Click <strong>Add</strong>, then open NarcoGuard from your Dock.</Step>
          </ol>
        )}
        <p className="text-xs text-muted-foreground">No app store, account or payment needed. You can remove it like any other app.</p>
      </DialogContent>
    </Dialog>
  )
}
