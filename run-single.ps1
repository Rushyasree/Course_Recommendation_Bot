$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\frontend"
npm install
$env:VITE_API_URL = "/api"
npm run build
Pop-Location

Push-Location "$PSScriptRoot\backend"
$env:FLASK_DEBUG = "true"
$env:PRECOMPUTE_EMBEDDINGS = "false"
python run.py
Pop-Location
