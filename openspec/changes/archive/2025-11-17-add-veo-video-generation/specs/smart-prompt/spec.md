# Spec: Smart Prompt Optimizer (Video Support)

**Status**: Proposed
**Author**: System
**Created**: 2025-01-17
**Related Changes**: `add-veo-video-generation`

---

## ADDED Requirements

### Requirement: Video Prompt Optimization
Smart prompt optimizer SHALL extend to support video content type with video-specific optimization (camera movements, scene descriptions, actions).

#### Scenario: Optimize Prompt for Video Generation
- **WHEN** user clicks "✨ AI优化" button in video form
- **THEN** system calls `/api/optimize-prompt` with `content_type: 'video'`, returns optimized prompt with cinematic descriptions and camera movements, and directly replaces input content

---

## Related Specs
- `specs/video-ux/spec.md`
- `specs/video-generation/spec.md`
