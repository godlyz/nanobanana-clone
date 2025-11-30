# Spec: Admin Panel (Video Management)

**Status**: Proposed
**Author**: System
**Created**: 2025-01-17
**Related Changes**: `add-veo-video-generation`

---

## ADDED Requirements

### Requirement: User Detail Modal - Video Consumption Tab
Backend user detail modal SHALL include "Video Consumption" tab showing user video generation statistics and records.

#### Scenario: View User Video Consumption
- **WHEN** admin clicks "Video Consumption" tab in user detail modal
- **THEN** system displays total credits consumed, success rate, failure reason statistics, and supports status filtering (success/failed/in-progress) with sortable table of all video records

---

## Related Specs
- `specs/video-generation/spec.md`
- `specs/credits/spec.md`
