# Proposal: Add Project Roadmap

**Status**: Proposed
**Author**: System
**Created**: 2025-01-05
**Type**: Documentation Enhancement

---

## Why

### Problem Statement

The project currently lacks a unified roadmap document, resulting in:

1. **Fragmented Planning**: The complete 37-week Phase 0-4 plan exists only in conversation history
2. **Isolated Implementation Details**: Video generation Step 1-6 is isolated in `openspec/changes/add-veo-video-generation/tasks.md` without global context
3. **Terminology Confusion**: Phase (project-level stages) vs Step (feature-level implementation) are not clearly distinguished
4. **No Progress Tracking**: Lack of global timeline makes it difficult to track overall project progress and dependencies

### Current State

- **Phase 0-4 Planning**: Comprehensive 37-week plan exists but not documented
  - Phase 1 (Week 1-5): Legal compliance, tool pages, mobile optimization
  - Phase 2 (Week 6-15): AI features (Inpainting, Outpainting, **Video Generation**, Upscaling, Variations, Referral)
  - Phase 3 (Week 16-24): Social features
  - Phase 4 (Week 25-37): Community ecosystem

- **Video Generation**: Detailed Step 1-6 implementation plan exists in `add-veo-video-generation/tasks.md`
  - Positioned in Phase 2, Week 11-13 (15 days)
  - No connection to overall project timeline

### Need

A single source of truth document that:
- Provides a complete 37-week timeline view
- Shows all features across all phases
- Clarifies Phase vs Step terminology
- Links high-level phases to detailed implementation tasks
- Enables progress tracking and dependency management

---

## What Changes

### New Files

1. **`PROJECTROADMAP.md`** (Root directory)
   - Complete 37-week timeline (Phase 0-4)
   - Week × Feature matrix visualization
   - Phase milestones and deliverables
   - Links to detailed implementation tasks
   - Risk identification and mitigation plans

### Modified Files

1. **`openspec/changes/add-veo-video-generation/tasks.md`**
   - Add header section with project context
   - Link to PROJECTROADMAP.md
   - Clarify position: Phase 2, Week 11-13

### Documentation Structure

```
Project Root/
├── PROJECTROADMAP.md              ⭐ NEW: 37-week global view
│
├── openspec/
│   └── changes/
│       ├── add-project-roadmap/    ⭐ NEW: This proposal
│       │   ├── proposal.md
│       │   ├── tasks.md
│       │   └── design.md
│       │
│       └── add-veo-video-generation/
│           ├── tasks.md            ✏️ MODIFIED: Add context header
│           ├── proposal.md
│           ├── design.md
│           └── specs/
```

### Key Content: PROJECTROADMAP.md Outline

```markdown
# Nano Banana Project Roadmap (37 Weeks)

## Executive Summary
[Project overview, vision, timeline]

## Phase 1 (Week 1-5): Foundation
- Legal compliance & data protection
- Tool pages implementation
- Mobile optimization
- **Deliverables**: [list]
- **Success Criteria**: [list]

## Phase 2 (Week 6-15): Core AI Features
### Week 6-7: Onboarding + API Documentation
### Week 8-10: Inpainting + Outpainting
### Week 11-13: 🎬 Video Generation
  → See: [Video Generation Tasks](openspec/changes/add-veo-video-generation/tasks.md)
  - Step 1-2: Infrastructure + API Integration
  - Step 3-4: Async Processing + Frontend
  - Step 5-6: Testing + Optimization
### Week 14-15: Upscaling + Variations + Referral System

## Phase 3 (Week 16-24): Social Features
[Content]

## Phase 4 (Week 25-37): Community Ecosystem
[Content]

## Timeline Matrix
| Week | Video Gen | Inpainting | Outpainting | ... |
|------|-----------|-----------|------------|-----|
| 8    | -         | ✓         | -          | -   |
| 11   | Step 1-2  | -         | -          | -   |
| 12   | Step 3-4  | -         | -          | -   |
| 13   | Step 5-6  | -         | -          | -   |

## Dependencies & Critical Path
[Dependency graph]

## Risk Register
[Risks and mitigations]
```

---

## Impact

### Affected Components

**Specifications**: None (this is a documentation change)

**Code**: None

**Documentation**:
- ✅ **NEW**: `PROJECTROADMAP.md` (~500 lines)
- ✏️ **MODIFIED**: `openspec/changes/add-veo-video-generation/tasks.md` (header only, ~10 lines added)

**Breaking Changes**: None

### Benefits

1. **Clarity**: Clear distinction between Phase (project stages) and Step (implementation steps)
2. **Navigation**: Bidirectional links enable easy navigation between global plan and detailed tasks
3. **Visibility**: All stakeholders can see the complete 37-week timeline at a glance
4. **Coordination**: Feature dependencies and timeline conflicts become immediately visible
5. **Progress Tracking**: Enables tracking of completed vs remaining work across all phases

### Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Roadmap becomes outdated | Medium | High | Update PROJECTROADMAP.md at phase completion and change archive |
| Over-detailed roadmap difficult to maintain | Low | Medium | Keep high-level, link to detailed tasks |
| Terminology still confusing | Medium | Low | Clear definitions in glossary, consistent usage |

---

## Implementation Plan

### Deliverables

1. **PROJECTROADMAP.md**: Complete 37-week timeline document
2. **Updated tasks.md**: Video generation context header
3. **Validation**: OpenSpec validation passing

### Timeline

- **Estimated Effort**: 2-3 hours
- **Complexity**: Low (documentation only)
- **Dependencies**: None

### Success Criteria

- [ ] PROJECTROADMAP.md created with all 4 phases documented
- [ ] Video generation positioned in Phase 2 Week 11-13
- [ ] Bidirectional links working (PROJECTROADMAP ↔ tasks.md)
- [ ] `openspec validate add-project-roadmap --strict` passes
- [ ] No broken links or formatting errors

---

## Alternatives Considered

### Alternative 1: Put roadmap in docs/ directory
- **Pros**: Organized, follows docs/ convention
- **Cons**: Harder to discover, adds navigation hierarchy
- **Decision**: Rejected - root level more discoverable

### Alternative 2: Merge into README.md
- **Pros**: Single file, always visible
- **Cons**: README becomes too long, mixed purposes
- **Decision**: Rejected - separation of concerns

### Alternative 3: Use external project management tool (Notion, Jira)
- **Pros**: Rich features, collaboration tools
- **Cons**: Not versioned with code, context switching, access control
- **Decision**: Rejected - prefer docs-as-code

### Selected: Standalone PROJECTROADMAP.md in root
- **Reasoning**:
  - Easy to discover (same level as README.md)
  - Versioned with code
  - Single source of truth
  - Links directly to implementation tasks

---

## Dependencies

- None (pure documentation change)

---

## Open Questions

1. Should PROJECTROADMAP.md include cost analysis? (User's original roadmap has it)
2. Should we create similar tasks.md for other Phase 2 features (Inpainting, Outpainting)?
3. What's the update cadence for PROJECTROADMAP.md? (After each phase? Each week?)

---

## Approval

**Stakeholders**:
- [ ] Product Owner
- [ ] Technical Lead
- [ ] Documentation Reviewer

**Next Steps After Approval**:
1. Create PROJECTROADMAP.md following tasks.md checklist
2. Update video generation tasks.md header
3. Validate with `openspec validate --strict`
4. Archive change after merge
