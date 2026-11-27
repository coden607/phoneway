import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
from pathlib import Path

INPUT_DIR = Path('inputs')
OUTPUT_ROOT = Path('outputs')

class NewAudioHandler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory and event.src_path.lower().endswith(('.wav', '.mp3', '.flac')):
            time.sleep(1)  # ensure file is fully written
            input_path = Path(event.src_path)
            print(f'New audio detected: {input_path}')
            # Run demucs wrapper
            subprocess.run(['python', 'audio_pipeline/demucs_wrapper.py', str(input_path)], check=True)
            # Assuming demucs output path is outputs/<stem>
            work_dir = OUTPUT_ROOT / input_path.stem
            instrumental = work_dir / 'instrumental.wav'
            # Run voice clone adapt (placeholder) using a reference speaker file (you may provide one later)
            # Here we just reuse the instrumental as dummy target speaker
            subprocess.run(['python', 'audio_pipeline/voice_clone_adapt.py', str(instrumental), str(instrumental)], check=True)
            # Run phone calibrator with dummy reference and cloned voice
            voice_meta = work_dir / 'voice_metadata.json'
            metadata = work_dir / 'metadata.json'
            subprocess.run(['python', 'audio_pipeline/phone_calibrator.py', str(instrumental), str(work_dir / 'adapted_voice.wav'), str(metadata)], check=True)

if __name__ == '__main__':
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    observer = Observer()
    handler = NewAudioHandler()
    observer.schedule(handler, str(INPUT_DIR), recursive=False)
    observer.start()
    print(f'Watching {INPUT_DIR} for new audio files...')
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
