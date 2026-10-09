from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_RAW = ROOT / "ml" / "data" / "raw"
DATA_PROCESSED = ROOT / "ml" / "data" / "processed"
MODELS_DIR = ROOT / "ml" / "models"
REPORTS_DIR = ROOT / "ml" / "reports"

RANDOM_STATE = 42
TEST_SIZE = 0.2

FAKE = 1
REAL = 0
LABEL_NAMES = {FAKE: "FAKE", REAL: "REAL"}

MIN_TEXT_CHARS = 20
MAX_TEXT_CHARS = 20_000
