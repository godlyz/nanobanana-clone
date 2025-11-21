# video-generation Specification

## Purpose
TBD - created by archiving change add-veo-video-generation. Update Purpose after archive.
## Requirements
### Requirement: Video Generation API Endpoint
The system SHALL provide a video generation API endpoint that accepts text prompts and optional reference images to generate video content using Google Veo 3.1 API.

#### Scenario: Text-to-Video Generation
- **WHEN** user submits a text prompt with video parameters (duration, resolution, aspect ratio) to `/api/generate-video`
- **THEN** system validates credit balance, checks concurrent task limit (max 3), deducts credits immediately, calls Google Veo 3.1 API, and returns `operation_id` and `task_id` with status `processing`

---

### Requirement: Asynchronous Processing and Polling
The system SHALL provide asynchronous processing mechanism with status polling endpoint due to video generation taking 11 seconds to 6 minutes.

#### Scenario: Polling Video Generation Status
- **WHEN** user queries generation status using `task_id`
- **THEN** system returns real-time status (`processing`, `downloading`, `completed`, `failed`), video URL if completed, or error message with refund confirmation if failed

---

### Requirement: Automatic Video Storage and Download
The system SHALL automatically download generated videos from Google's temporary storage (2-day expiry) to Supabase Storage for permanent access.

#### Scenario: Automatic Download After Generation
- **WHEN** Vercel Cron Job detects Google Veo video generation completion
- **THEN** system downloads video from Google temporary URL, uploads to Supabase Storage `videos` bucket, generates thumbnail, updates status to `completed`, and retries 3 times if download fails before marking as `failed` and refunding credits

---

### Requirement: Credit Pricing and Deduction
The system SHALL calculate credit cost based on video parameters (duration, resolution) using formula: `credits = duration × 10 × (is1080p ? 1.5 : 1.0)` and implement deduct-first-refund-later strategy.

#### Scenario: Calculate Credit Cost
- **WHEN** user selects video generation parameters
- **THEN** system calculates credit cost with 6 pricing tiers: 4s 720p (40 credits), 4s 1080p (60 credits), 6s 720p (60 credits), 6s 1080p (90 credits), 8s 720p (80 credits), 8s 1080p (120 credits)

#### Scenario: Deduct Credits Before Generation
- **WHEN** user initiates video generation request with sufficient credits
- **THEN** system deducts credits BEFORE calling Google API and creates transaction record with type `video_generation`

#### Scenario: Refund Credits on Failure
- **WHEN** video generation fails (safety filter, API error, download failure)
- **THEN** system calls `addCredits()` method to refund credits and creates transaction record with type `video_refund`

---

### Requirement: Concurrent Task Limiting
The system SHALL limit each user to maximum 3 simultaneous video generation tasks to prevent resource abuse.

#### Scenario: Enforce 3 Concurrent Tasks Limit
- **WHEN** user attempts to create new video generation task
- **THEN** system queries current `processing` or `downloading` tasks for user, rejects request with error `CONCURRENT_LIMIT_EXCEEDED` if count >= 3, otherwise allows creation

---

### Requirement: Video Generation History
The system SHALL record all video generation tasks in history for user query and management.

#### Scenario: List User Video Generation History
- **WHEN** user accesses video generation records in personal center
- **THEN** system returns all records sorted by creation time descending, supports pagination (20 per page), and status filtering (all, success, failed, in-progress)

---

### Requirement: Error Handling and Retry Logic
The system SHALL handle various error scenarios with clear error messages and automatic retry mechanism.

#### Scenario: Handle Google API Errors
- **WHEN** Google Veo API returns error (safety filter, rate limit, invalid parameters)
- **THEN** system records error to `error_message` and `error_code` fields, refunds credits immediately, and sets status to `failed`

#### Scenario: Retry Failed Downloads
- **WHEN** downloading video from Google to Supabase Storage fails
- **THEN** system retries up to 3 times with 30-second intervals, increments `retry_count`, and marks as `failed` with credit refund if all retries fail

---

### Requirement: Video Extension (extend-video)
The system SHALL allow users to extend existing Veo-generated videos by adding 7 seconds, with maximum final length of 148 seconds.

#### Scenario: Extend Existing Video
- **WHEN** user requests to extend a completed video (duration < 148s, resolution 720p)
- **THEN** system validates source video is Veo-generated, checks `gemini_video_uri` exists, verifies `duration + 7 <= 148`, calls Google Veo extension API with source video URI, deducts 40 credits, and returns new `task_id`

#### Scenario: Validate Extension Constraints
- **WHEN** system receives extension request
- **THEN** system validates: `status = 'completed'`, `gemini_video_uri` is not null, `resolution = '720p'` (only 720p supported), `duration_seconds + 7 <= 148`, rejects request with error code if any constraint fails

#### Scenario: Reject 1080p Video Extension
- **WHEN** user attempts to extend a 1080p video
- **THEN** system returns error `EXTENSION_NOT_SUPPORTED_FOR_1080P` and suggests re-generating in 720p if extension is needed

---

### Requirement: Person Generation Control
The system SHALL control whether people are generated in videos and their age restrictions based on generation mode.

#### Scenario: Apply Person Generation Policy by Mode
- **WHEN** user creates video generation task
- **THEN** system applies `personGeneration` value based on mode:
  - text-to-video / extend-video: allows `allow_all`, `allow_adult`, `dont_allow`
  - image-to-video / reference-images / first-last-frame: forces `allow_adult` only
  - rejects request if incompatible `personGeneration` value is provided

#### Scenario: Regional Restrictions for Person Generation
- **WHEN** request comes from EU/UK/CH/MENA regions
- **THEN** system forces `personGeneration = 'allow_adult'` for Veo 3.1, regardless of user input

---

### Requirement: Parameter Validation by Generation Mode
The system SHALL enforce mode-specific parameter restrictions to prevent invalid API calls to Google Veo.

#### Scenario: Validate Reference Images Mode Parameters
- **WHEN** user selects `reference-images` mode
- **THEN** system forces `aspectRatio = '16:9'` and `durationSeconds = 8`, rejects request if user provides `aspectRatio = '9:16'` or `durationSeconds = 4/6` with error code `INVALID_PARAMETERS_FOR_MODE`

#### Scenario: Validate First-Last-Frame Mode Parameters
- **WHEN** user selects `first-last-frame` mode
- **THEN** system forces `durationSeconds = 8`, allows both `aspectRatio = '16:9'` and `'9:16'`, rejects request if `durationSeconds != 8`

#### Scenario: Validate Extension Mode Parameters
- **WHEN** user requests video extension
- **THEN** system forces `resolution = '720p'`, `durationSeconds = 8`, inherits `aspectRatio` from source video, rejects request if source video is 1080p

---

