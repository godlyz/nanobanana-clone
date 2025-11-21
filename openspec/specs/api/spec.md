# api Specification

## Purpose
TBD - created by archiving change add-veo-video-generation. Update Purpose after archive.
## Requirements
### Requirement: POST /api/v1/video/generate
The system SHALL provide RESTful API endpoint to create video generation tasks with API key authentication.

#### Scenario: Generate Video via API
- **WHEN** external client calls `POST /api/v1/video/generate` with valid API key and request parameters
- **THEN** system validates API key, verifies parameters (prompt, duration, resolution), deducts credits, creates task, and returns `task_id` for status polling

---

### Requirement: GET /api/v1/video/status/:task_id
The system SHALL provide RESTful API endpoint to query video generation task status and results.

#### Scenario: Poll Video Status via API
- **WHEN** client queries status using `task_id`
- **THEN** system returns real-time task status, video URL if completed, or error details if failed

---

