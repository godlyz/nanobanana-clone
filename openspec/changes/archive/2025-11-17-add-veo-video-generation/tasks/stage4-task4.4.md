# Task 4.4: Update API Documentation

**File**: Existing API docs page
**Estimated Time**: 2 hours
**Dependencies**: Task 2.4 (API endpoints)
**Priority**: P1 (Important)

## Overview

Add video generation API documentation to existing API docs page

## Implementation

```markdown
# API Documentation (add to existing docs)

## Video Generation API

### POST /api/v1/video/generate

Generate a new video from a text prompt.

**Headers:**
- `x-api-key`: Your API key (required)
- `Content-Type`: application/json

**Request Body:**
```json
{
  "prompt": "A cat playing piano in a jazz club",
  "negative_prompt": "blurry, low quality",  // optional
  "aspect_ratio": "16:9",  // "16:9" or "9:16"
  "resolution": "720p",  // "720p" or "1080p"
  "duration": 4,  // 4, 6, or 8 seconds
  "reference_image_url": "https://..."  // optional
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "operation_id": "projects/123/operations/456",
  "status": "processing",
  "credit_cost": 40,
  "estimated_completion_time": "11s-6min"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid API key
- `400 Bad Request`: Invalid parameters
- `402 Payment Required`: Insufficient credits
- `429 Too Many Requests`: Exceeded concurrent limit (max 3)
- `503 Service Unavailable`: Google Veo API error (credits refunded)

### GET /api/v1/video/status/:task_id

Get the status of a video generation task.

**Headers:**
- `x-api-key`: Your API key (required)

**Response (Processing):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "created_at": "2025-01-17T10:30:00Z"
}
```

**Response (Completed):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "video_url": "https://storage.supabase.co/...",
  "thumbnail_url": "https://storage.supabase.co/...",
  "completed_at": "2025-01-17T10:35:00Z",
  "created_at": "2025-01-17T10:30:00Z"
}
```

**Response (Failed):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error_message": "Safety filter triggered",
  "error_code": "SAFETY_FILTER",
  "refund_confirmed": true,
  "created_at": "2025-01-17T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid API key
- `403 Forbidden`: Unauthorized access to task
- `404 Not Found`: Task not found

## Credit Costs

| Duration | Resolution | Credits |
|----------|-----------|---------|
| 4s       | 720p      | 40      |
| 4s       | 1080p     | 60      |
| 6s       | 720p      | 60      |
| 6s       | 1080p     | 90      |
| 8s       | 720p      | 80      |
| 8s       | 1080p     | 120     |

**Note:** Failed generations are automatically refunded.

## Rate Limits

- Maximum 3 concurrent video generation tasks per user
- No daily request limit
- Generation time: 11 seconds to 6 minutes

## Code Examples

### cURL

```bash
curl -X POST https://nanobanana.com/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "prompt": "A cat playing piano in a jazz club",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": 4
  }'
```

### JavaScript/Node.js

```javascript
const response = await fetch('https://nanobanana.com/api/v1/video/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: JSON.stringify({
    prompt: 'A cat playing piano in a jazz club',
    aspect_ratio: '16:9',
    resolution: '720p',
    duration: 4,
  }),
});

const data = await response.json();
console.log('Task ID:', data.task_id);

// Poll for status
const checkStatus = async (taskId) => {
  const statusResponse = await fetch(
    `https://nanobanana.com/api/v1/video/status/${taskId}`,
    {
      headers: { 'x-api-key': 'YOUR_API_KEY' },
    }
  );
  return statusResponse.json();
};

// Wait for completion
while (true) {
  const status = await checkStatus(data.task_id);
  console.log('Status:', status.status);

  if (status.status === 'completed') {
    console.log('Video URL:', status.video_url);
    break;
  } else if (status.status === 'failed') {
    console.error('Generation failed:', status.error_message);
    break;
  }

  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
}
```

### Python

```python
import requests
import time

# Generate video
response = requests.post(
    'https://nanobanana.com/api/v1/video/generate',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY',
    },
    json={
        'prompt': 'A cat playing piano in a jazz club',
        'aspect_ratio': '16:9',
        'resolution': '720p',
        'duration': 4,
    }
)

data = response.json()
task_id = data['task_id']
print(f'Task ID: {task_id}')

# Poll for status
while True:
    status_response = requests.get(
        f'https://nanobanana.com/api/v1/video/status/{task_id}',
        headers={'x-api-key': 'YOUR_API_KEY'}
    )
    status = status_response.json()
    print(f'Status: {status["status"]}')

    if status['status'] == 'completed':
        print(f'Video URL: {status["video_url"]}')
        break
    elif status['status'] == 'failed':
        print(f'Generation failed: {status["error_message"]}')
        break

    time.sleep(5)  # Wait 5 seconds
```
```

## Acceptance Criteria

- [ ] Video generation API endpoints documented
- [ ] Request/response examples provided
- [ ] Error responses documented
- [ ] Credit costs table included
- [ ] Rate limits documented
- [ ] Code examples in cURL, JavaScript, Python
- [ ] Polling pattern explained
- [ ] Error handling best practices documented
