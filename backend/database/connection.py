import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

# Locate the project root
ROOT_DIR = Path(__file__).resolve().parents[2]

# Load environment variables
load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    if not DATABASE_URL:
        raise ValueError(
            "DATABASE_URL not found. Check your .env file."
        )

    return psycopg2.connect(DATABASE_URL)