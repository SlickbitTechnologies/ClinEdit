from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from core.config import Config

from core.firestore import db
from api.routes import templates
from api.routes import documents
from api.routes import comments


config = Config()
app = FastAPI()
app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(templates.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
