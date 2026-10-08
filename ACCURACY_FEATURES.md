# Phoneway v3.0 — Ultra-Precision Features

## Display Resolution: 0.1g — Measured Accuracy = Your Verification Ledger

> Honest note (foundation v5): 0.1g is display resolution, not guaranteed accuracy.
> Tilt-based measurement on a phone typically achieves ±0.2–0.5g depending on device,
> surface, and calibration. Your on-device Verification Ledger is the only source of truth
> for what THIS device can do. Grades below reflect measured error bands, not promises.

---

## 🎯 Key Features

### 1. Multi-Sensor Fusion (15+ Sensors)

| Sensor | Purpose | Confidence Weight |
|--------|---------|-------------------|
| Linear Accelerometer | Primary weight detection | 1.0 |
| Vibration Hammer | Resonance frequency shift | 0.9 |
| Audio FFT | Microphone resonance analysis | 0.8 |
| Gyroscope | Tilt-based mass estimation | 0.75 |
| Camera Optical Flow | Visual vibration analysis | 0.6 |
| Touch Force | Contact pressure | 0.35 |
| Magnetometer | Metal object detection | 0.3 |
| Barometer | Environmental stability | 0.15 |
| Battery Monitor | Thermal compensation | 0.1 |
| Orientation Sensor | Positioning quality | 0.2 |

### 2. Advanced Algorithms

#### Particle Filter Fusion
- 500 particles for non-Gaussian noise handling
- Multi-modal distribution support
- Outlier-resistant estimation

#### Neural Network Corrector
- On-device lightweight MLP (12→24→16→1)
- 12 input features from all sensors
- Online learning from verified measurements
- Self-improving with each verification

#### Sensor Agreement Detection
- Real-time outlier detection
- Multi-sensor consensus voting
- Automatic sensor weight adjustment

#### Environmental Compensation
- Barometric pressure tracking
- Battery thermal drift compensation
- Orientation quality scoring
- Time-based drift correction

### 3. Self-Learning System

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Verifies  │───→│  Error Logged   │───→│  ML Training    │
│  Known Weight   │    │  Global + Local │    │  NN + Ensemble  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                            │
         └────────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Auto-Correct  │
                    │  Future Reads  │
                    └────────────────┘
```

### 4. Accuracy Grading System

| Grade | Precision | Description |
|-------|-----------|-------------|
| A+ | ±0.03g | Laboratory quality |
| A | ±0.05g | Target achieved |
| B+ | ±0.1g | Excellent |
| B | ±0.2g | Good |
| C | ±0.5g | Fair |
| D | >0.5g | Needs calibration |

---

## 📊 How to Achieve 0.1g Accuracy

### 1. Optimal Setup
- **Surface**: Mouse pad or thick notebook (soft, compliant)
- **Position**: Phone flat, not tilted (>95% orientation quality)
- **Environment**: Stable temperature, no charging
- **Rest**: 5 minutes after charging

### 2. Calibration
1. Use a **US Nickel (5.00g)** as primary reference
2. Add a **Dollar Bill (1.00g)** for 2-point calibration
3. Perform calibration on intended weighing surface
4. Re-calibrate weekly or when accuracy degrades

### 3. Verification
- Use known weights periodically
- At least 5 verifications trains the neural network
- Each verification improves future accuracy

### 4. Ultra-Precision Mode
- Press **0.1g** button for extended measurement
- Waits for optimal environmental conditions
- Targets ±0.05g precision
- May take 5-15 seconds

---

## 🧠 Machine Learning Features

### Error Logging
Every verified measurement logs:
- Expected vs measured weight
- Error magnitude and direction
- Sensor modes active
- Environmental conditions
- Battery level and thermal state

### Adaptive Calibration
- Learns device-specific response curves
- Corrects for non-linearity
- Compensates for sensor drift
- Temperature-aware corrections

### Community Priors
Removed in the v5 rebase — `data/community-priors.json` was fabricated data fetched only by the deleted `learningEngine.js`. Calibration priors now come only from your own device (localStorage).

---

## 🔧 Technical Architecture

### Modules

The v5 rebase removed the ML/fusion modules that used to live here
(see `docs/legacy/DEAD-CODE-2026-10-08.md`). Live architecture:

```
js/
├── simpleScale.js          # tilt→grams measurement path
├── verificationLedger.js   # the only source of ±Xg claims
├── scaleMath.js            # calibration-curve math
├── backgroundFusion.js     # passive validators (confidence only)
└── app.js                  # main app
```

### Data Flow

```
DeviceMotion (gravity axis, m/s²) → baseline → tilt-delta
    → calibration curve (tilt-delta → grams)
    → median/moving-average/Kalman smoothing
    → Final Weight (display resolution 0.1g;
      accuracy = verification-ledger claim, typically ±0.5g)
```

---

## 📈 Performance Metrics

### Tracking
- Real-time precision (σ) display
- Accuracy grade indicator
- ML training sample count
- Environmental stability score
- Per-sensor reliability ratings

### Reports
Access via **STATS** button:
- Current accuracy grade
- Precision statistics
- Systematic error tracking
- ML model status
- Environmental status
- Recommendations for improvement
- Export data as JSON

---

## 🌍 Self-Learning & Crowd Intelligence

### Local Learning
- Device-specific calibration curves
- User behavior adaptation
- Error pattern recognition
- Continuous improvement

### Global Learning (Optional)
- Anonymous error aggregation
- Regional accuracy patterns
- Surface quality database
- Phone model correlations

---

## 🎮 UI Elements

### New Buttons
- **0.1g**: Ultra-precision measurement
- **STATS**: Accuracy report panel
- **VERIFY**: Known-weight verification

### Status Indicators
- **σ**: Real-time precision (mg/g)
- **ML**: Verification count
- **GRADE**: A+ to D accuracy grade
- **SURFACE**: Quality assessment

### Panels
- **Accuracy Report**: Comprehensive metrics
- **Verify Panel**: Known-weight testing
- **Calibration**: Step-by-step setup

---

## 🔬 Validation Testing

Recommended test protocol:
1. Calibrate with nickel (5g) + bill (1g)
2. Verify with 10 different known weights
3. Check environmental stability >90%
4. Run ultra-precision mode 5 times
5. Confirm grade A or A+

---

## ⚠️ Limitations

### Physical Constraints
- Maximum weight: ~100-200g (phone-dependent)
- Minimum weight: ~0.1g (surface-dependent)
- Requires compliant (springy) surface
- Not for commercial/legal trade

### Environmental
- Temperature changes affect accuracy
- Air currents can disturb small weights
- Phone must remain flat
- Avoid during charging

---

## 🚀 Future Enhancements

Planned features for v3.1:
- Multiple phone networking (distributed sensors)
- Cloud-based model training
- Advanced thermal modeling
- Magnetic interference compensation
- Weight prediction from partial data

---

## 📚 References

- Spring-mass physics model
- Kalman filtering techniques
- Particle filter estimation
- Neural network regression
- Sensor fusion algorithms

---

**Created**: 2026-02-28  
**Version**: 3.0 Ultra-Precision  
**Reality**: no ML claim ships without on-device evidence in the Verification Ledger.
