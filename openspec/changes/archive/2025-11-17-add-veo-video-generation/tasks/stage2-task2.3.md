# Task 2.3: Extend Credit Service for Video Transactions

**File**: `lib/credit-service.ts`
**Estimated Time**: 2 hours
**Dependencies**: Task 1.2 (system_configs table), existing credit service
**Priority**: P0 (Blocking)

## Overview

Extend the existing credit service to support video generation transactions:
- Add new transaction types (`video_generation`, `video_refund`)
- Implement dynamic pricing from `system_configs` table
- Add transaction validation to prevent duplicate refunds
- Maintain credit balance integrity

## Subtasks

### 2.3.1: Add Video Transaction Types

```typescript
// lib/credit-service.ts (extend existing code)

export type TransactionType =
  | 'purchase'
  | 'reward'
  | 'refund'
  | 'image_generation'  // existing
  | 'video_generation'  // NEW
  | 'video_refund';     // NEW

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: TransactionType;
  description: string;
  createdAt: string;
}
```

### 2.3.2: Add Dynamic Video Pricing Method

```typescript
// lib/credit-service.ts

export class CreditService {
  // ... existing methods ...

  /**
   * Get video credit pricing from system_configs
   * Falls back to default formula if not configured
   */
  async getVideoCreditCost(
    duration: number,
    resolution: '720p' | '1080p'
  ): Promise<number> {
    const configKey = `video_credits_${duration}s_${resolution}`;

    const { data } = await this.supabase
      .from('system_configs')
      .select('value')
      .eq('key', configKey)
      .single();

    if (data?.value) {
      return parseInt(data.value, 10);
    }

    // Fallback to formula: credits = duration × 10 × (is1080p ? 1.5 : 1.0)
    const baseCredits = duration * 10;
    const multiplier = resolution === '1080p' ? 1.5 : 1.0;
    return Math.floor(baseCredits * multiplier);
  }

  /**
   * Validate transaction before processing
   * Prevents duplicate refunds
   */
  async validateTransaction(
    userId: string,
    transactionType: TransactionType,
    relatedTaskId?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check for duplicate refunds
    if (transactionType === 'video_refund' && relatedTaskId) {
      const { data: existingRefund } = await this.supabase
        .from('credit_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('transaction_type', 'video_refund')
        .contains('description', relatedTaskId)
        .single();

      if (existingRefund) {
        return { valid: false, reason: 'DUPLICATE_REFUND' };
      }
    }

    return { valid: true };
  }
}
```

### 2.3.3: Update Credit Transaction Methods

```typescript
// lib/credit-service.ts

async addCredits(
  userId: string,
  amount: number,
  transactionType: TransactionType,
  description: string
): Promise<{ success: boolean; newBalance: number }> {
  // Validate transaction
  const validation = await this.validateTransaction(userId, transactionType);
  if (!validation.valid) {
    throw new Error(`TRANSACTION_INVALID: ${validation.reason}`);
  }

  // Insert transaction record
  const { error: txError } = await this.supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount,
      transaction_type: transactionType,
      description,
    });

  if (txError) {
    throw new Error(`TRANSACTION_FAILED: ${txError.message}`);
  }

  // Update user balance
  const { data, error } = await this.supabase.rpc('add_user_credits', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(`BALANCE_UPDATE_FAILED: ${error.message}`);
  }

  return { success: true, newBalance: data };
}

async deductCredits(
  userId: string,
  amount: number,
  transactionType: TransactionType,
  description: string
): Promise<{ success: boolean; newBalance: number }> {
  // Check sufficient balance
  const balance = await this.getUserBalance(userId);
  if (balance < amount) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  // Insert transaction record (negative amount)
  const { error: txError } = await this.supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      transaction_type: transactionType,
      description,
    });

  if (txError) {
    throw new Error(`TRANSACTION_FAILED: ${txError.message}`);
  }

  // Update user balance
  const { data, error } = await this.supabase.rpc('deduct_user_credits', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(`BALANCE_UPDATE_FAILED: ${error.message}`);
  }

  return { success: true, newBalance: data };
}
```

## Verification Steps

```bash
# 1. Test video credit cost calculation
node -e "
const { getCreditService } = require('./lib/credit-service');
const service = getCreditService();

// Test 4s 720p (should be 40 credits)
service.getVideoCreditCost(4, '720p').then(cost => console.log('4s 720p:', cost));

// Test 8s 1080p (should be 120 credits)
service.getVideoCreditCost(8, '1080p').then(cost => console.log('8s 1080p:', cost));
"

# 2. Test transaction validation (prevent duplicate refunds)
node -e "
const { getCreditService } = require('./lib/credit-service');
const service = getCreditService();

service.validateTransaction('user-id', 'video_refund', 'task-123').then(result => {
  console.log('First refund validation:', result); // should be valid: true
});

// Try again (should fail)
service.validateTransaction('user-id', 'video_refund', 'task-123').then(result => {
  console.log('Second refund validation:', result); // should be valid: false
});
"

# 3. Test add credits for refund
node -e "
const { getCreditService } = require('./lib/credit-service');
const service = getCreditService();

service.addCredits('user-id', 40, 'video_refund', 'Refund: Task task-123 failed').then(result => {
  console.log('Refund result:', result);
});
"

# 4. Test deduct credits for generation
node -e "
const { getCreditService } = require('./lib/credit-service');
const service = getCreditService();

service.deductCredits('user-id', 60, 'video_generation', 'Video: 6s 720p').then(result => {
  console.log('Deduct result:', result);
});
"

# 5. Verify dynamic pricing from system_configs
psql $DATABASE_URL -c "
INSERT INTO system_configs (key, value, description)
VALUES ('video_credits_4s_720p', '35', 'Custom price for 4s 720p video')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
"

# Test with custom config
node -e "
const { getCreditService } = require('./lib/credit-service');
const service = getCreditService();
service.getVideoCreditCost(4, '720p').then(cost => console.log('4s 720p (custom):', cost)); // should be 35
"
```

## Acceptance Criteria

- [ ] Video transaction types added (`video_generation`, `video_refund`)
- [ ] Dynamic pricing from `system_configs` works
- [ ] Falls back to formula if config missing
- [ ] Duplicate refund detection works
- [ ] Transaction validation prevents errors
- [ ] Credit add/deduct methods updated
- [ ] All tests pass
- [ ] No double refunds possible
