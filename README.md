# Krishi Mitra  🌾

Krishi Mitra is an intelligent platform and backend service designed to empower farmers and citizens with comprehensive information on central and state government agricultural schemes, subsidies, and welfare benefits across India.

This repository provides database schemas, automated ingestion pipelines for national MyScheme datasets (CSV/JSON), and querying interfaces for seamless search by tags, states, ministries, and categories.

---

## 📋 Table of Contents
- [Prerequisites](#-prerequisites)
- [Quick Start Guide (First-Time Setup)](#-quick-start-guide-first-time-setup)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Set Up Virtual Environment](#2-set-up-virtual-environment)
  - [3. Install Dependencies](#3-install-dependencies)
  - [4. Configure Environment Variables](#4-configure-environment-variables)
  - [5. Initialize Database Schema](#5-initialize-database-schema)
  - [6. Import Scheme Dataset](#6-import-scheme-dataset)
  - [7. Verify Connection & Run Tests](#7-verify-connection--run-tests)
- [Project Structure](#-project-structure)
- [Database & Query API Reference](#-database--query-api-reference)
- [Troubleshooting & Common FAQs](#-troubleshooting--common-faqs)

---

## ⚙️ Prerequisites

Before running the project, make sure you have the following installed on your machine:

1. **Python**: Version `3.10` or higher (Python `3.12` recommended)
   - Verify: `python --version` or `python3 --version`
2. **PostgreSQL**: Version `14` or higher (Local PostgreSQL or Cloud-hosted like [Supabase](https://supabase.com/), [Neon](https://neon.tech/), or [Render](https://render.com/))
3. **Git**: For source version control
   - Verify: `git --version`

---

## 🚀 Quick Start Guide (First-Time Setup)

Follow these step-by-step instructions when setting up the project for the first time.

### 1. Clone Repository
```bash
git clone <repository-url>
cd "krisi mitra"
```

### 2. Set Up Virtual Environment

Create and activate an isolated Python virtual environment:

#### On Windows (PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
> *Note for Windows users*: If you see an `Execution_Policies` script restriction error, run:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```
> then re-run the activation script.

#### On Windows (Command Prompt - cmd):
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

#### On Linux / macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### 3. Install Dependencies

Ensure your virtual environment is active, then install all required packages:

```bash
pip install -r requirements.txt
```

*(Packages include `psycopg2-binary` for PostgreSQL database connectivity and `python-dotenv` for environment configuration.)*

---

### 4. Configure Environment Variables

Create your local `.env` file by copying the provided example template:

#### On Windows (PowerShell / CMD):
```cmd
copy .env.example .env
```

#### On Linux / macOS:
```bash
cp .env.example .env
```

Open `.env` in your text editor and set your PostgreSQL connection string:

```env
# Format: postgresql://<user>:<password>@<host>:<port>/<dbname>

# Local PostgreSQL Example:
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/krisi_mitra

# Cloud Supabase Example:
DATABASE_URL=postgresql://postgres.<project_ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

---

### 5. Initialize Database Schema

You must create the `schemes` table before importing data. You can find the SQL schema in `backend/database/schema.sql`.

Execute the schema using one of the methods below:

#### Option A: Using `psql` command line
```bash
psql "<YOUR_DATABASE_URL>" -f backend/database/schema.sql
```

#### Option B: Using Supabase / Cloud Database Console
1. Navigate to your Supabase Project dashboard.
2. Go to the **SQL Editor** tab.
3. Paste the contents of [`backend/database/schema.sql`](backend/database/schema.sql) and click **Run**.

#### Option C: Using pgAdmin or DBeaver
1. Connect to your database.
2. Open the SQL Query Tool, paste [`backend/database/schema.sql`](backend/database/schema.sql), and execute.

---

### 6. Import Scheme Dataset

The dataset containing government schemes is located in `data/raw/` (`gov_myscheme_data.csv` or `gov_myscheme_data.json`). Run the ingestion script:

#### Using CSV:
```bash
python data/raw/import_schemes.py data/raw/gov_myscheme_data.csv
```

#### Or Using JSON:
```bash
python data/raw/import_schemes.py data/raw/gov_myscheme_data.json
```

> **Safe to Re-Run**: The import script automatically upserts records using `scheme_slug`. If a scheme already exists, it updates the record instead of creating duplicates.

---

### 7. Verify Connection & Run Tests

Run the test suite scripts to verify database connectivity and ensure queries work properly:

#### Test 1: Verify Connection & Column Structure
```bash
python scripts/test_connection.py
```
*Expected Output*: Displays `"Database connected successfully!"`, total number of schemes, and listed columns.

#### Test 2: Test Search & Filtering Queries
```bash
python scripts/test_queries.py
```
*Expected Output*: Tests retrieval of all schemes, single scheme lookup by ID, state/ministry search, and keyword/tag filtering.

---

## 📁 Project Structure

```text
krisi mitra/
├── backend/
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py        # Database connection pool and configuration loader
│   │   ├── queries.py           # Core query functions (filter, pagination, tags search)
│   │   └── schema.sql           # PostgreSQL table DDL & performance indexing
│   ├── __init__.py
│   └── app.py                   # Application entrypoint / API server
├── data/
│   ├── exports/                 # Exported data outputs
│   ├── processed/               # Cleaned / transformed datasets
│   └── raw/
│       ├── gov_myscheme_data.csv# Raw government schemes CSV dataset
│       ├── gov_myscheme_data.json# Raw government schemes JSON dataset
│       └── import_schemes.py    # Batch data importer & upsert pipeline
├── scripts/
│   ├── test_connection.py       # Sanity check for database connection
│   └── test_queries.py          # Functional test suite for database queries
├── .env.example                 # Sample environment variables configuration
├── .gitignore                   # Git ignore rules for environments and secrets
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation & onboarding guide
```

---

## 🔍 Database & Query API Reference

The functions in `backend/database/queries.py` provide a clean Python interface to the database:

### 1. `get_all_schemes(limit=None, offset=0)`
Returns a paginated list of schemes.
```python
from backend.database.queries import get_all_schemes

# Fetch the first 20 schemes
first_page = get_all_schemes(limit=20, offset=0)
```

### 2. `get_scheme_by_id(scheme_id)`
Fetch complete details for a single scheme by its primary key ID.
```python
from backend.database.queries import get_scheme_by_id

scheme = get_scheme_by_id(1)
print(scheme["scheme_name"], scheme["benefits"])
```

### 3. `get_schemes_by_state_or_ministry(search_term)`
Case-insensitive search across state, union territory, or ministry names.
```python
from backend.database.queries import get_schemes_by_state_or_ministry

karnataka_schemes = get_schemes_by_state_or_ministry("Karnataka")
```

### 4. `get_schemes_by_tags(tags)`
Search schemes matching one or more tags (e.g., `Farmer`, `Agriculture`, `Financial Assistance`).
```python
from backend.database.queries import get_schemes_by_tags

results = get_schemes_by_tags(["Farmer", "Agriculture"])
```

---

## 🛠️ Troubleshooting & Common FAQs

### 1. `psycopg2.OperationalError: connection to server at "localhost" failed`
- **Cause**: PostgreSQL is not running locally, or the port/password in `.env` is incorrect.
- **Fix**: Check your PostgreSQL service status (`Services.msc` on Windows or `sudo systemctl status postgresql` on Linux), verify credentials, or verify your Cloud Database connection string in `.env`.

### 2. `ValueError: DATABASE_URL not found. Check your .env file.`
- **Cause**: `.env` file does not exist in the root folder or does not contain `DATABASE_URL`.
- **Fix**: Ensure `.env` exists in the project root directory alongside `requirements.txt`.

### 3. `ModuleNotFoundError: No module named 'backend'`
- **Cause**: Script executed from a subfolder where Python does not include the project root in `sys.path`.
- **Fix**: Always execute scripts from the root directory (`d:\krisi mitra`), e.g.:
  ```bash
  python scripts/test_connection.py
  ```
  or run as module:
  ```bash
  python -m scripts.test_connection
  ```

### 4. `csv.Error: field larger than field limit`
- **Handled**: The import script automatically configures `csv.field_size_limit(2**31 - 1)` for large eligibility text and scheme descriptions.
