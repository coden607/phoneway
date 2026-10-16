# NarcoGuard wearable concept: BOM and validation notes

This document describes the current engineering concept. It is not a manufacturing drawing, medical-device specification, or evidence that the hardware can safely administer medication.

## 2026-10-05 modernization (watch-only design)

The candidate BOM on `/watch` was reviewed against current, buyable parts:

- **Compute:** Snapdragon W5+ Gen 1 → **W5+ Gen 2** (announced Aug 2025; Skylo NB-NTN satellite SOS, Location ML 3.0 GNSS) ([CNX Software](https://www.cnx-software.com/2025/08/21/snapdragon-w5-and-w5-gen-2-wearable-platforms-gain-nb-ntn-satellite-support/)). The nRF5340 is kept as an independent safety MCU.
- **Storage:** the listed Micron MT29F4G01 is 4 Gbit (512 MB) SPI NAND, too small for Wear OS → 32 GB eMMC 5.1, vendor by quote.
- **Cellular:** SDX35 relabelled correctly as a **5G RedCap** modem with LTE Cat 4 fallback and L1+L5 GNSS ([CNX Software](https://www.cnx-software.com/2023/02/08/qualcomm-snapdragon-x35-5g-nr-light-modem-smartwatches-industrial-iot-xr-glasses/)). The Thales ELS62 (a separate LTE module, not an eSIM) is replaced by an ST4SIM eUICC; the separate Broadcom GNSS chip is removed as redundant.
- **Removed:** Alta Devices GaAs solar (company shut down in 2019, [pv magazine](https://www.pv-magazine.com/2020/11/12/equipment-auction-sounds-final-note-for-hanergy-owned-alta-devices/)), kinetic and thermoelectric harvesters (wrist harvesting is far below a cellular watch's load), the "fingerprint" part (Goodix GH3220 is a heart-rate AFE, not a fingerprint sensor), the FSR skin-contact pad (contact comes from the PPG front end), the micro-valve and the separate speech-synthesis IC (the platform handles audio).
- **Injector:** 30 G / 4 mm micro-needle and 0.4 mg dose removed as clinically inappropriate for intramuscular naloxone; needle, dose and drug container are now "to be specified" by clinical engineering and a licensed pharmaceutical partner, and the module is labelled future research requiring FDA review as a drug-device combination product.
- **Claims removed:** "Same class as Apple Watch", Apple Pay, "Patent-Pending", HIPAA compliance, fixed accuracy figures (±1 BPM, ±2 % SpO2, ±0.1 °C), fixed weight, 2000-nit brightness and <3 s deployment. These remain targets to measure.

Known limitation: published overdose-detection research mainly uses chest-worn respiration sensing ([PneumoWave protocol](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11422748/), [closed-loop injector](https://pmc.ncbi.nlm.nih.gov/articles/PMC11920833/)). Wrist-only detection of opioid-induced respiratory depression is unproven and is the largest technical risk of the watch-only design.

## Modular bill of materials

| Module | Function | Replaceable boundary | Pre-prototype validation required |
| --- | --- | --- | --- |
| Enclosure and strap | Protects electronics and holds the watch on the wrist | Screws/clips; strap is independent | Ergonomics, ingress protection, skin contact, impact and heat testing |
| Main compute board | Runs firmware, signal conditioning, logging and communications | Board-to-board connector | Power budget, thermal envelope, watchdog and fault recovery |
| PPG/ECG sensor assembly | Optical/electrical pulse measurements | Sensor flex/connector | Motion artefact, skin-tone, placement and calibration study |
| Pulse-oximeter assembly | Estimates oxygen saturation | Sensor flex/connector | FDA/IEC-appropriate validation and calibration; not validated by this app |
| Motion/IMU assembly | Motion and respiration-related proxy signal | Sensor module/connector | Orientation, vibration and false-positive characterization |
| Temperature sensor | Skin-temperature trend input | Sensor module/connector | Thermal lag and ambient-temperature characterization |
| Battery, protection and charger | Energy storage and safe charging | Battery pack and protected connector | Capacity, abuse, short-circuit, charging and transport testing |
| Radio module | Bluetooth/Wi-Fi/cellular communication | Certified module connector | RF, privacy, pairing and loss-of-network behavior |
| Alert/user interface | Haptic, display and audible feedback | UI board/module | Accessibility, alarm acknowledgement and fail-safe behavior |
| Medication-delivery mechanism | Future research module only | Isolated cartridge/actuator bay | Independent clinical, mechanical, regulatory and human-factors program before any use |

## Placement assumptions

- Optical sensors contact the underside of the wrist with controlled pressure and a light shield.
- The IMU is close to the enclosure centroid to reduce rotational coupling.
- The battery and radio remain separated from analog sensor traces as far as the enclosure permits.
- The cartridge/actuator bay is mechanically isolated from the sensing board and must have a physical service lockout.
- Every module needs a keyed connector, strain relief, polarity protection and a documented replacement procedure.

## Revised physical architecture

The original all-in-one planar sum is not a valid manufacturable layout: it totals 2,469 mm² against a 1,250 mm² single-plane allowance. The revised concept separates the sealed watch core from the medication pod:

- Display/optical plane: 1,089 mm² modeled footprint, 2 mm maximum target height.
- Compute/connectivity plane: 548 mm² modeled footprint, 2 mm maximum target height.
- Battery plane: 616 mm² modeled footprint, 5 mm maximum target height.
- Inter-layer clearance assumption: 0.6 mm; modeled core stack: 10.2 mm inside the 13.8 mm case target, leaving 3.6 mm before real gasket, flex, fastener, and tolerance data.
- Medication pod: 216 mm² modeled footprint, up to 10 mm target height, mechanically separate with its own pressure boundary. It is not part of the sealed watch-core stack and is not permitted to deploy underwater.

These are feasibility calculations, not CAD evidence. The core remains conditional until a tolerance-aware 3D CAD assembly demonstrates clearances, heat paths, flex routing, antenna keep-outs, seal compression, and service access.

## Water-resistance requirement

Water resistance is a required design constraint, not a current product claim. The target is an IP68 enclosure qualification under [IEC 60529](https://webstore.iec.ch/en/publication/2453) together with water-resistant-watch qualification under [ISO 22810:2010](https://www.iso.org/standard/45334.html). The applicable standards define the test methods and marking requirements; a rendered blueprint or gasket specification cannot substitute for those tests.

The enclosure concept must use a continuous case-back seal, controlled crystal and crown interfaces, sealed service connectors, a sealed charging strategy, protected sensor windows, and a cartridge bay that cannot compromise the pressure boundary. The medication module must be mechanically locked out during water exposure and must not be represented as safe to deploy underwater.

Required prototype evidence:

- dimensional inspection and gasket compression/tolerance stack-up;
- pressure, immersion, thermal-cycle, sweat/chemical, and condensation testing on assembled units;
- leak detection before and after drop, button, charging, and cartridge-service cycling;
- post-test battery isolation, charging safety, radio operation, display, sensor optical path, and alarm checks;
- independent qualification and controlled production sampling before any water-resistance marking.

Current status: unverified. The repository has no physical enclosure, CAD interference model, or laboratory test report.

## Current diagrams

The public concept page includes these illustrative assets: `ng-blueprint.jpg`, `ng-blueprint-detailed.jpg`, `ng-exploded-view.jpg`, and `ng-modular-exploded.jpg`. They communicate intended placement and modular boundaries only; dimensions, tolerances, fastener specifications, material selection and actuator safety margins still require CAD and prototype verification.

**These renders predate this revision and contradict it.** `ng-modular-exploded.jpg` and `ng-exploded-view.jpg` still label a solar cell, a thermoelectric generator, a micro-dosing motor and a filled naloxone cartridge; `ng-blueprint-detailed.jpg` carries a "NG2 PRO REV 4.2" title and a dosed cartridge callout that appear nowhere in this document or in the parts list on `/watch`. Every page that shows them now states this in view as well as in alt text. Replacing them needs new artwork generated from the current watch-only design; until then they must never be presented as the current configuration or as engineering evidence.

## Simulation status

The repository now has a deterministic regression test for Kalman filtering, confidence-weighted fusion, normal readings, sustained multi-signal deterioration and escalation gating. This verifies software behavior only. It cannot establish sensor accuracy, overdose detection sensitivity/specificity, safe medication delivery, or clinical efficacy.

Before a physical prototype is considered, the engineering review must add CAD interference checks, tolerance stack-up, battery/thermal analysis, ingress and drop models, sensor test fixtures, calibration data, fault-injection tests, and an independent clinical/regulatory review.

## Authoritative component references

These links are manufacturer or standards-body sources used to bound the candidate claims; they do not constitute system validation:

- [Qualcomm Snapdragon W5+ Gen 2 / W5 Gen 2 announcement coverage](https://www.cnx-software.com/2025/08/21/snapdragon-w5-and-w5-gen-2-wearable-platforms-gain-nb-ntn-satellite-support/) — current platform, satellite SOS and GNSS.
- [Qualcomm Snapdragon X35 product brief](https://docs.qualcomm.com/doc/87-27160-1/87-27160-1_REV_A_Snapdragon_X35_5G_Modem-RF_System_Product_Brief.pdf) — 5G RedCap modem capabilities.
- [Analog Devices MAX86178](https://www.analog.com/en/products/max86178.html) — PPG, ECG, and BioZ AFE capabilities.
- [Texas Instruments BQ25619](https://www.ti.com/product/BQ25619) — single-cell, single-input charger/power-path constraints.
- [Texas Instruments BQ51013B](https://www.ti.com/lit/ds/symlink/bq51013b.pdf) — Qi receiver constraints.
- [Nordic nRF5340 product specification](https://docs.nordicsemi.com/r/bundle/ps_nrf5340/page/keyfeatures_html5.html) — MCU supply, package, and operating limits.
- [Bosch BMP390](https://www.bosch-sensortec.com/en/products/environmental-sensors/pressure-sensors/pressure-sensors-bmp390.html), [ST LSM6DSO32X](https://www.st.com/en/mems-and-sensors/lsm6dso32x.html), and [Melexis MLX90632](https://www.melexis.com/en/product/MLX90632/Miniature-SMD-Infrared-Thermometer-IC) — candidate environmental, motion, and temperature-sensor limits.

Supplier availability, package variants, PCB stack-up, antenna matching, battery certification, sealing, and all medical performance remain open verification items.
