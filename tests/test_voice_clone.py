import subprocess
import sys
from pathlib import Path

def test_voice_clone_execution(tmp_path: Path):
    # Prepare dummy reference and instrumental wav files (empty files suffice for placeholder)
    ref = tmp_path / "ref.wav"
    instr = tmp_path / "instr.wav"
    ref.write_bytes(b"RIFF\x00\x00\x00WAVEfmt ")
    instr.write_bytes(b"RIFF\x00\x00\x00WAVEfmt ")
    # Run the voice_clone_adapt script
    result = subprocess.run([sys.executable, "../audio_pipeline/voice_clone_adapt.py", str(ref), str(instr)], cwd=tmp_path, capture_output=True, text=True)
    assert result.returncode == 0, f"Script failed: {result.stderr}"
    # Verify metadata file exists and contains expected keys
    meta_path = tmp_path / "ref" / "voice_metadata.json"
    assert meta_path.is_file()
    import json
    meta = json.loads(meta_path.read_text())
    assert "cloned_voice" in meta and "final_mix" in meta and "confidence" in meta
