# Spec: Video UX Components

**Status**: Proposed
**Author**: System
**Created**: 2025-01-17
**Related Changes**: `add-veo-video-generation`

---

## ADDED Requirements

### Requirement: History Image Selector Modal
Users SHALL be able to select reference images from their generation history instead of uploading new images every time when generating videos.

#### Scenario: Select Reference Image from History
- **WHEN** user clicks "Select from History" button in video generation form
- **THEN** system displays modal with recent generated images (20 per page, sorted by time descending), allows search by prompt, and auto-fills `reference_image_url` field upon selection

---

### Requirement: Inline Prompt Optimizer Button
Smart prompt optimizer SHALL support video content type with inline "✨ AI优化" button in video generation form for one-click optimization.

#### Scenario: Optimize Video Prompt Inline
- **WHEN** user clicks "✨ AI优化" button after entering prompt in video form
- **THEN** system calls optimizer with `content_type: 'video'` parameter, returns video-optimized prompt with camera movements and scene descriptions, and directly replaces input content without modal popup

---

### Requirement: Portal Hero Section Video Carousel
Homepage hero section SHALL display video generation capability using auto-rotating video cards (3-5 featured videos, 5-second intervals).

#### Scenario: Display Video Carousel in Hero
- **WHEN** user visits homepage
- **THEN** hero section displays featured videos with thumbnails, play buttons, prompt descriptions, supports manual navigation with arrow buttons, and opens fullscreen modal on play

---

### Requirement: Features Section Video Card
Features section SHALL include "AI Video Generation" feature card with icon, title, description, and link to video generation page.

#### Scenario: Display Video Feature Card
- **WHEN** user views Features section on homepage
- **THEN** video feature card displays with hover animation (scale + shadow), links to `/tools/video-generation`, and shows video generation capabilities

---

### Requirement: Showcase Tab for Videos
Showcase page SHALL have dedicated "Videos" tab to display only video showcase items separately from images.

#### Scenario: View Video Showcase Tab
- **WHEN** user clicks "Videos" tab in Showcase page
- **THEN** system displays only `content_type = 'video'` items with thumbnails, play buttons, prompts, like counts, authors, supports like/unlike functionality, and opens fullscreen modal on play

---

### Requirement: Unified Video Generation Form
The system SHALL provide a single unified video generation form supporting both text-to-video and image-to-video (no separate forms).

#### Scenario: Submit Video Generation Request
- **WHEN** user fills video generation form with prompt, optional reference image, duration (4/6/8s), resolution (720p/1080p), aspect ratio (16:9/9:16)
- **THEN** form displays real-time credit cost calculation, validates credit balance and concurrent limit before submission, and shows inline "✨ AI优化" button

---

### Requirement: Video Generation Status Page
The system SHALL provide real-time status page showing video generation progress and results with auto-polling every 10 seconds.

#### Scenario: Monitor Video Generation Progress
- **WHEN** user submits video request and redirects to status page
- **THEN** page displays current status (processing/downloading/completed), estimated remaining time, auto-polls `/api/video/status/:task_id` every 10s, shows video player and download button on completion, or error message with refund confirmation on failure

---

## Related Specs
- `specs/video-generation/spec.md` - Core API
- `specs/smart-prompt/spec.md` - Prompt optimizer
- `specs/showcase/spec.md` - Showcase system
- `specs/profile/spec.md` - Generation history
