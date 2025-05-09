# Video Review™

This is a fullstack video review platform built with Flask (backend) and React (frontend). It allows authenticated users to upload, view, and collaboratively comment on videos, with export capabilities to Word documents.

## Features

- User registration & login
- Video upload & playback
- Timestamped comments with reactions
- Editable and appendable comment threads
- Versioned .docx exports
- Shareable review links

## Project Structure
video-review/
├── video_review_backend/
│   ├── app.py
│   ├── templates/
│   └── uploads/, exports/
└── video_review_frontend/
├── public/
├── src/
└── build/
## Setup

### Backend

1. `cd video_review_backend`
2. `python -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `python app.py`

### Frontend

1. `cd video_review_backend/video_review_frontend`
2. `npm install`
3. `npm start`

## Deployment

You can deploy both frontend and backend as separate services on Render.com.

## License

MIT