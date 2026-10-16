"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlowButton } from "@/components/effects/glow-button"
import { Watch, Battery, Droplet, Wifi, Bluetooth, Zap, Activity, Settings, Package } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function WatchDetails() {
  const [selectedTab, setSelectedTab] = useState("overview")

  return (
    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 glass">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="vitals">Vitals</TabsTrigger>
        <TabsTrigger value="power">Power</TabsTrigger>
        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Watch className="w-5 h-5 text-primary pulse-glow" />
              <span className="text-sm font-medium">Device Info</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Model: NarcoGuard NG</p>
              <p>Serial: Not assigned</p>
              <p>Firmware: Not available</p>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Bluetooth className="w-5 h-5 text-blue-500 pulse-glow" />
              <span className="text-sm font-medium">Connectivity</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Bluetooth: Not connected</p>
              <p>eSIM: Not provisioned</p>
              <p>Signal: Unavailable</p>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-5 h-5 text-green-500 pulse-glow" />
              <span className="text-sm font-medium">Naloxone</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Status: Unavailable</p>
              <p>Expires: No cartridge installed</p>
              <p>Doses: Unavailable</p>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-5 h-5 text-yellow-500 pulse-glow" />
              <span className="text-sm font-medium">Power</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Battery: Unavailable</p>
              <p>Charging: Unavailable</p>
              <p>Runtime: Unavailable</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-lg neon-border">
          <h4 className="font-medium mb-3">3D Watch Model</h4>
          <div className="relative h-64 bg-muted/20 rounded-lg overflow-hidden flex items-center justify-center">
            <div className="relative w-32 h-32 rotate-3d">
              <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-primary to-purple-500 pulse-glow" />
              <div className="absolute inset-2 rounded-xl bg-background flex items-center justify-center">
                <Watch className="w-16 h-16 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="vitals" className="space-y-4 mt-4">
        <div className="space-y-4">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Heart Rate</span>
              <span className="text-2xl font-bold glow-text">Unavailable</span>
            </div>
            <Progress value={60} className="h-2 pulse-glow" />
            <p className="text-xs text-muted-foreground mt-2">No verified sensor data available</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Blood Oxygen (SpO2)</span>
              <span className="text-2xl font-bold glow-text">Unavailable</span>
            </div>
            <Progress value={98} className="h-2 pulse-glow" />
            <p className="text-xs text-muted-foreground mt-2">No verified sensor data available</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Movement Activity</span>
              <span className="text-2xl font-bold glow-text">Unavailable</span>
            </div>
            <Progress value={0} className="h-2 pulse-glow" />
            <p className="text-xs text-muted-foreground mt-2">No verified sensor data available</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              24-Hour Vitals Chart
            </h4>
            <p className="text-xs text-muted-foreground">No verified sensor history is available.</p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="power" className="space-y-4 mt-4">
        <div className="glass p-4 rounded-lg neon-border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Battery Status</h4>
            <span className="text-3xl font-bold glow-text">Unavailable</span>
          </div>
          <Progress value={0} className="h-4 pulse-glow mb-2" />
          <p className="text-xs text-muted-foreground">No runtime estimate until hardware validation</p>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Charging Methods</h4>

          <div className="glass p-4 rounded-lg neon-border opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="font-medium">Wireless Charging</p>
                  <p className="text-xs text-muted-foreground">Not on charger</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium">USB-C Fast Charge</p>
                  <p className="text-xs text-muted-foreground">Not connected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="maintenance" className="space-y-4 mt-4">
        <div className="glass p-4 rounded-lg neon-border">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-6 h-6 text-primary pulse-glow" />
            <h4 className="font-medium">Modular Components</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg glass">
              <div>
                <p className="text-sm font-medium">Naloxone Cartridge</p>
                <p className="text-xs text-muted-foreground">No cartridge installed</p>
              </div>
              <GlowButton disabled size="sm" variant="default">
                Replace
              </GlowButton>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg glass">
              <div>
                <p className="text-sm font-medium">Battery Module</p>
                <p className="text-xs text-muted-foreground">Health: Unavailable</p>
              </div>
              <GlowButton disabled size="sm" variant="default">
                Check
              </GlowButton>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg glass">
              <div>
                <p className="text-sm font-medium">Sensor Array</p>
                <p className="text-xs text-muted-foreground">Calibration: Not performed</p>
              </div>
              <GlowButton disabled size="sm" variant="default">
                Calibrate
              </GlowButton>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-lg neon-border">
          <h4 className="font-medium mb-3">Firmware Updates</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Current Version: Not available</p>
              <p className="text-xs text-muted-foreground">No firmware service connected</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
          </div>
        </div>

        <GlowButton disabled variant="default" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Advanced Settings
        </GlowButton>
      </TabsContent>
    </Tabs>
  )
}
