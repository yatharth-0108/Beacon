from typing import Literal
from pydantic import BaseModel, Field, field_validator
from ml.src import config


class PredictRequest(BaseModel):
    text: str = Field(..., max_length=config.MAX_TEXT_CHARS)

    @field_validator("text")
    @classmethod
    def long_enough(cls, v: str) -> str:
        if len(v.strip()) < config.MIN_TEXT_CHARS:
            raise ValueError(f"Text must have at least {config.MIN_TEXT_CHARS} characters.")
        return v


class PredictResponse(BaseModel):
    label: Literal["FAKE", "REAL"]
    fake_score: float
    model_version: str
    disclaimer: str
