from firebase_admin import credentials, firestore, initialize_app
from core.config import Config

config = Config()
cred = credentials.Certificate(config.FIREBASE_CREDENTIAL_PATH)
initialize_app(cred)
db = firestore.client()
