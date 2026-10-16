import json
import random
from pathlib import Path

# Placeholder implementation for phone weighing to 0.1g accuracy
# In a real system this would interface with sensor hardware and apply calibration.

def weigh(sample_path: str, metadata_path: str) -> float:
    """Return a simulated weight measurement with 0.1g precision.
    The confidence score is a dummy value between 0.6 and 0.9.
    """
    # Simulate reading a raw sensor value (e.g., from a CSV or binary file)
    # Here we just generate a random weight around a nominal 100g.
    raw_weight = 100.0 + random.uniform(-0.5, 0.5)  # +/-0.5g noise
    # Round to nearest 0.1g as required
    weight = round(raw_weight, 1)
    confidence = round(random.uniform(0.6, 0.9), 2)
    # Update metadata with confidence
    meta_path = Path(metadata_path)
    data = {}
    if meta_path.is_file():
        data = json.loads(meta_path.read_text())
    data.update({"weight_g": weight, "confidence": confidence})
    meta_path.write_text(json.dumps(data, indent=2))
    print(f"Measured weight: {weight}g with confidence {confidence}")
    return weight

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python phone_weighing.py <sample_path> <metadata_json>")
        sys.exit(1)
    weigh(sys.argv[1], sys.argv[2])
