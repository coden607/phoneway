export type WatchDesignModule = {
  label: string
  widthMm: number
  heightMm: number
}

export type WatchDesignLayer = {
  label: string
  modules: readonly WatchDesignModule[]
  maximumHeightMm: number
}

export const watchDesignModel = {
  caseDiameterMm: 46,
  caseThicknessMm: 13.8,
  usableInternalPlanarAreaMm2: 1250,
  nominalBatteryCapacityMah: 500,
  nominalBatteryVoltage: 3.7,
  sensorMonitoringPowerMw: 12.4,
  placement: [
    { label: "SoC + co-processor", widthMm: 18, heightMm: 18 },
    { label: "Display module", widthMm: 31, heightMm: 31 },
    { label: "Battery cell", widthMm: 28, heightMm: 22 },
    { label: "Medication module", widthMm: 18, heightMm: 12 },
    { label: "Connectivity stack", widthMm: 16, heightMm: 14 },
    { label: "Sensor ring", widthMm: 32, heightMm: 4 },
  ] satisfies WatchDesignModule[],
  coreLayers: [
    {
      label: "Display and optical sensor plane",
      modules: [
        { label: "Display module", widthMm: 31, heightMm: 31 },
        { label: "Sensor ring", widthMm: 32, heightMm: 4 },
      ],
      maximumHeightMm: 2,
    },
    {
      label: "Compute and connectivity plane",
      modules: [
        { label: "SoC + co-processor", widthMm: 18, heightMm: 18 },
        { label: "Connectivity stack", widthMm: 16, heightMm: 14 },
      ],
      maximumHeightMm: 2,
    },
    {
      label: "Battery plane",
      modules: [{ label: "Battery cell", widthMm: 28, heightMm: 22 }],
      maximumHeightMm: 5,
    },
  ] satisfies WatchDesignLayer[],
  medicationPod: {
    module: { label: "Medication pod", widthMm: 18, heightMm: 12 },
    targetMaximumHeightMm: 10,
    separatePressureBoundary: true,
    underwaterDeployment: false,
  },
  interLayerClearanceMm: 0.6,
  waterResistance: {
    target: "IP68 enclosure + ISO 22810 water-resistant watch qualification",
    status: "unverified" as const,
    sealedInterfaces: [
      "case-back perimeter",
      "crystal and crown interfaces",
      "sealed Qi charging boundary",
      "bonded sensor windows",
      "membrane-protected acoustic ports",
      "controlled service/cartridge boundary",
    ],
  },
} as const

export function calculatePlanarFootprint(modules: readonly WatchDesignModule[]) {
  return modules.reduce((sum, module) => sum + module.widthMm * module.heightMm, 0)
}

export function calculateIdealizedRuntimeHours(capacityMah: number, voltage: number, loadMw: number) {
  if (capacityMah <= 0 || voltage <= 0 || loadMw <= 0) return 0
  return Math.round((capacityMah * voltage) / loadMw)
}
export function calculateLayerFootprint(layer: WatchDesignLayer) {
  return calculatePlanarFootprint(layer.modules)
}


export const watchDesignCalculations = {
  planarFootprintMm2: calculatePlanarFootprint(watchDesignModel.placement),
  planarFitMarginMm2:
    watchDesignModel.usableInternalPlanarAreaMm2 - calculatePlanarFootprint(watchDesignModel.placement),
  idealizedRuntimeHours: calculateIdealizedRuntimeHours(
    watchDesignModel.nominalBatteryCapacityMah,
    watchDesignModel.nominalBatteryVoltage,
    watchDesignModel.sensorMonitoringPowerMw,
  ),
  coreLayerFootprintsMm2: watchDesignModel.coreLayers.map(calculateLayerFootprint),
  coreLayerMarginsMm2: watchDesignModel.coreLayers.map(
    (layer) => watchDesignModel.usableInternalPlanarAreaMm2 - calculateLayerFootprint(layer),
  ),
  coreStackHeightMm:
    watchDesignModel.coreLayers.reduce((sum, layer) => sum + layer.maximumHeightMm, 0) +
    (watchDesignModel.coreLayers.length - 1) * watchDesignModel.interLayerClearanceMm,
  coreThicknessMarginMm: Number(
    (watchDesignModel.caseThicknessMm -
      (watchDesignModel.coreLayers.reduce((sum, layer) => sum + layer.maximumHeightMm, 0) +
        (watchDesignModel.coreLayers.length - 1) * watchDesignModel.interLayerClearanceMm)).toFixed(2),
  ),
  medicationPodFootprintMm2: calculatePlanarFootprint([watchDesignModel.medicationPod.module]),
} as const
