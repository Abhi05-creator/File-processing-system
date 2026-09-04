# File Processing Pipeline

Upload a file, walk away — processing happens in the background, not during the request.

Live demo: https://file-processing-api-68ff.onrender.com


## What it does

Accepts image, PDF, or plain text uploads and processes each one differently, asynchronously:

- Images→ resized to 3 sizes (small / medium / large), each uploaded to object storage
- PDFs → text extracted and stored as a `.txt` output
- Text files → word frequency count (common stop words filtered out)

The upload request returns immediately with a job ID — you never wait on processing. A status endpoint lets you poll for progress, and a minimal frontend does that polling for you.

## Use case

-This is the same pattern behind things like resume screening tools, video upload
processing (YouTube-style), or image hosting services — anywhere a file needs
real work done to it before it's usable, but the user shouldn't have to sit
and wait for that work to finish.

-Applies to the image branch (profile picture uploads needing multiple sizes for different UI contexts) and the text branch (basic content analysis on user-submitted text).

## Architecture


Upload → multer validates → file → Supabase Storage
                           → job record → MongoDB (status: queued)
                           → job ID → Redis queue (BullMQ)

Worker (separate process) → picks up job from queue
                           → downloads file from Supabase
                           → processes by file type
                           → uploads results back to Supabase
                           → updates MongoDB (status: success / failed)


Upload and processing are fully decoupled — the API and the worker are two separate running processes, coordinating only through Redis (the queue) and MongoDB (job state). If a job fails, it retries up to 3 times with exponential backoff before being marked `failed` with the actual error message — nothing hangs silently.

## Stack

- Node.js / Express — API
- MongoDB (Atlas) — job records and results
- Redis Cloud + BullMQ** — job queue
- Supabase Storage — file storage (S3-compatible)
- sharp — image resizing
- pdf-parse — PDF text extraction
- Plain HTML/CSS/JS frontend — no framework, served directly by Express

## API

POST /upload
Multipart form upload, field name `file`. Accepts image/*, application/pdf, text/plain, up to 10MB.
json:
{ "success": true, "mongoId": "...", "status": "queued" }


GET /jobs/:id
Returns the job's current state.
json:
{
  "status": "success",
  "filename": "photo.jpg",
  "filetype": "image/jpeg",
  "result": [{ "label": "small", "url": "..." }, ...],
  "word_frequency": { ... },
  "error_message": null
}


## Running locally

bash-
npm install


Create test/config.env with:

MONGO_URI=mongodb://localhost:27017/file-pipeline
REDIS_HOST=...
REDIS_PORT=...
REDIS_USERNAME=default
REDIS_PASSWORD=...
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_BUCKET=uploads


Run the API and worker as two separate processes:
bash-
node server.js
node worker.js


Visit : http://localhost:3000.

## Known limitations

- No auth — anyone can upload
- Deployed worker runs on a free-tier service with no dedicated background-process support, so it's kept alive via a minimal health-check server; it can still sleep from inactivity
- No cleanup job for stuck/orphaned jobs if a worker crashes mid-processing
- Supabase bucket policy is fully open (INSERT allowed for anyone) — fine for a portfolio project, would be locked down for production
