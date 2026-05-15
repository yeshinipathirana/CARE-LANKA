from __future__ import annotations

import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

_app_initialized = False
_firestore_client = None


def _resolve_service_account_path() -> Path:
    raw_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not raw_path:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT_PATH is not set. Point it to your Firebase service-account JSON file."
        )

    path = Path(raw_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    return path


def init_firebase_admin() -> None:
    global _app_initialized
    if _app_initialized:
        return

    service_account_path = _resolve_service_account_path()
    if not service_account_path.exists():
        raise RuntimeError(f"Firebase service-account file not found: {service_account_path}")

    firebase_credentials = credentials.Certificate(str(service_account_path))
    if not firebase_admin._apps:
        firebase_admin.initialize_app(firebase_credentials)

    _app_initialized = True


def get_firestore_client():
    global _firestore_client
    if _firestore_client is None:
        init_firebase_admin()
        _firestore_client = firestore.client()
    return _firestore_client
