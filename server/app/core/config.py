from pydantic import  Field, HttpUrl, FilePath, field_validator
from pydantic_settings import BaseSettings
from typing import List


class Config(BaseSettings):
    FIREBASE_CREDENTIAL_PATH: FilePath = Field(..., description="Path to Firebase credentials JSON file")
    GEMINI_API_KEY: str = Field(..., description="Google API key")
    GOOGLE_CLIENT_SECRET: str = Field(..., description="Google client secret")
    GOOGLE_CLIENT_ID: str = Field(..., description="Google client ID") 
    GOOGLE_REDIRECT_URI: HttpUrl = Field(..., description="Google redirect URI")
    AUTH_URI: HttpUrl = Field(..., description="OAuth auth endpoint")
    TOKEN_URI: HttpUrl = Field(..., description="OAuth token endpoint")
    ALLOWED_ORIGINS: List[HttpUrl] = Field(..., description="Comma-separated list of allowed CORS origins")
    FRONTEND_URL: List[HttpUrl] = Field(..., description="Comma-separated frontend URLs")
    BACKEND_BASE_URL: HttpUrl = Field(..., description="Base URL of backend API")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def split_allowed_origins(cls, value):
        if isinstance(value, str):
            return [url.strip() for url in value.split(",")]
        return value

  