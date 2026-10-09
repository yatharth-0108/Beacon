import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ml.src.predict import Predictor
from ml.src.image_predict import ImagePredictor
from .schemas import PredictRequest, PredictResponse

DISCLAIMER = "Automated model prediction based on writing patterns; not a fact-check."
IMAGE_DISCLAIMER = "Automated digital artifact and compression analysis; not human forensic certification."

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager that loads the trained Predictor artifact
    and ImagePredictor once at startup into app.state.
    """
    try:
        app.state.predictor = Predictor.load()
        logger.info("Successfully loaded Predictor artifact.")
    except FileNotFoundError:
        app.state.predictor = None
        logger.warning("Predictor artifact not found at startup.")

    try:
        app.state.image_predictor = ImagePredictor.load()
        logger.info("Successfully loaded ImagePredictor.")
    except Exception as e:
        app.state.image_predictor = None
        logger.warning(f"ImagePredictor failed to load: {e}")

    yield


app = FastAPI(title="Fake News Detection API", lifespan=lifespan)

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4000", "*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware logging request path, HTTP method, status code, and latency.

    Why: Keeps server access logs clean and privacy-compliant by explicitly NOT logging input article text.
    """
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000  # in ms
    logger.info(
        f"path={request.url.path} method={request.method} status={response.status_code} latency={process_time:.2f}ms"
    )
    return response


def get_predictor(request: Request) -> Predictor:
    """Helper to retrieve the loaded Predictor from app.state, raising 503 if unavailable."""
    p = request.app.state.predictor
    if p is None:
        raise HTTPException(status_code=503, detail="Model not available. Train it first.")
    return p


def get_image_predictor(request: Request) -> ImagePredictor:
    """Helper to retrieve the loaded ImagePredictor from app.state, raising 503 if unavailable."""
    p = request.app.state.image_predictor
    if p is None:
        raise HTTPException(status_code=503, detail="Image model not available.")
    return p


@app.get("/health")
def health(request: Request):
    """Healthcheck endpoint reporting service status and model readiness."""
    return {
        "status": "ok",
        "model_loaded": request.app.state.predictor is not None,
        "image_model_loaded": request.app.state.image_predictor is not None,
    }


@app.get("/model-info")
def model_info(request: Request):
    """Returns model card metadata dictionary."""
    return get_predictor(request).card


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest, request: Request):
    """Predicts fake news score and label for input text."""
    predictor = get_predictor(request)
    try:
        result = predictor.predict(body.text)
    except Exception:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail="Prediction failed.")
    return {**result, "disclaimer": DISCLAIMER}


@app.post("/predict-image")
async def predict_image(request: Request, image: UploadFile = File(...)):
    """Predicts fake or real verdict for uploaded image using digital artifact and ELA analysis."""
    if not image or not image.filename:
        raise HTTPException(status_code=400, detail="No image file provided.")

    allowed_exts = (".jpg", ".jpeg", ".png", ".webp")
    if not image.filename.lower().endswith(allowed_exts):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported formats are: JPG, JPEG, PNG, WEBP."
        )

    image_predictor = get_image_predictor(request)
    try:
        contents = await image.read()
        max_bytes = 15 * 1024 * 1024  # 15 MB
        if len(contents) > max_bytes:
            raise HTTPException(status_code=400, detail="Image file exceeds maximum allowed size of 15MB.")

        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = image_predictor.predict(contents, filename=image.filename)
        return {**result, "disclaimer": IMAGE_DISCLAIMER}
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.exception("Image prediction failed")
        raise HTTPException(status_code=500, detail=f"Image prediction failed: {str(e)}")

