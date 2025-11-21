# Spec: Showcase System (Video Support)

**Status**: Proposed
**Author**: System
**Created**: 2025-01-17
**Related Changes**: `add-veo-video-generation`

---

## ADDED Requirements

### Requirement: Extend Showcase Items for Video Content
The `showcase_items` table SHALL support video content type with additional fields for video URL, thumbnail, duration, and resolution.

#### Scenario: Store Video in Showcase
- **WHEN** user or admin adds generated video to showcase
- **THEN** system creates record with `content_type = 'video'`, stores `video_url`, `thumbnail_url`, `duration`, `resolution`, and sets `image_url` to NULL

---

### Requirement: Video Showcase Tab
Showcase page SHALL provide dedicated tab to filter and display only video content.

#### Scenario: Filter Showcase by Content Type
- **WHEN** user clicks "Videos" tab in Showcase page
- **THEN** system displays only `content_type = 'video'` items with thumbnails, play buttons, prompts, like counts, and opens fullscreen modal on play

---

## Related Specs
- `specs/video-generation/spec.md`
- `specs/video-ux/spec.md`
