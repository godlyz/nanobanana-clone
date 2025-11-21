# credits Specification

## Purpose
TBD - created by archiving change add-veo-video-generation. Update Purpose after archive.
## Requirements
### Requirement: Video Generation Transaction Types
The credit transaction system SHALL support new transaction types `video_generation` and `video_refund` with proper metadata recording.

#### Scenario: Record Video Generation Deduction
- **WHEN** user successfully initiates video generation request
- **THEN** system creates transaction record with type `video_generation`, negative amount, description including video parameters, and metadata containing `task_id`, `duration`, `resolution`, `aspect_ratio`

#### Scenario: Record Video Generation Refund
- **WHEN** video generation fails
- **THEN** system calls `addCredits()` with type `video_refund`, positive amount, description explaining failure reason, and metadata referencing `original_task_id` and error details

---

### Requirement: Video Credit Pricing Configuration
The system SHALL support dynamic configuration of video credit pricing in `system_configs` table instead of hardcoding in code.

#### Scenario: Configure Video Credit Multiplier
- **WHEN** admin adjusts video pricing strategy
- **THEN** system stores `video_credit_per_second` (default 10) and `video_1080p_multiplier` (default 1.5) in configs, applies formula `credits = duration × per_second × (is1080p ? multiplier : 1.0)`, and takes effect on next generation

---

### Requirement: Prevent Double Refund
The system SHALL prevent duplicate refunds for the same failed video task.

#### Scenario: Check If Already Refunded
- **WHEN** system detects video generation failure needing refund
- **THEN** system checks `credit_transactions` for existing refund record with same `task_id`, skips refund if found and logs warning, otherwise executes refund with `original_task_id` in metadata

---

