# smart-prompt Specification

## Purpose
TBD - created by archiving change add-veo-video-generation. Update Purpose after archive.
## Requirements
### Requirement: Video Prompt Optimization
Smart prompt optimizer SHALL extend to support video content type with video-specific optimization (camera movements, scene descriptions, actions).

#### Scenario: Optimize Prompt for Video Generation
- **WHEN** user clicks "✨ AI优化" button in video form
- **THEN** system calls `/api/optimize-prompt` with `content_type: 'video'`, returns optimized prompt with cinematic descriptions and camera movements, and directly replaces input content

---

