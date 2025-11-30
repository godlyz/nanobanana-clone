# Task 3.4: Integrate Prompt Optimizer

**File**: Integration updates to existing editor
**Estimated Time**: 2 hours
**Dependencies**: Task 3.1 (Video Generation Form)
**Priority**: P2 (Nice to have)

## Overview

Add prompt optimization button to video generation form using existing prompt optimizer API:
- "Optimize Prompt" button next to prompt textarea
- Call existing `/api/optimize-prompt` endpoint
- Replace prompt with optimized version
- Show loading state during optimization
- Display before/after comparison
- Reuse existing prompt optimizer component logic

## Subtasks

### 3.4.1: Update Video Generation Form with Optimizer

```typescript
// components/video/video-generation-form.tsx (add to existing component)
import { Sparkles } from "lucide-react";

// Add state for prompt optimization
const [isOptimizing, setIsOptimizing] = useState(false);
const [originalPrompt, setOriginalPrompt] = useState("");

const optimizePrompt = async () => {
  const currentPrompt = watch("prompt");
  if (!currentPrompt || currentPrompt.length < 10) {
    return;
  }

  setIsOptimizing(true);
  setOriginalPrompt(currentPrompt);

  try {
    const response = await fetch("/api/optimize-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: currentPrompt }),
    });

    if (!response.ok) {
      throw new Error("Failed to optimize prompt");
    }

    const data = await response.json();
    setValue("prompt", data.optimizedPrompt);
  } catch (error) {
    console.error("Error optimizing prompt:", error);
  } finally {
    setIsOptimizing(false);
  }
};

// Add button next to prompt textarea
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label htmlFor="prompt">{t("video.generation.prompt")} *</Label>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={optimizePrompt}
      disabled={isOptimizing || !watchedPrompt || watchedPrompt.length < 10}
    >
      {isOptimizing ? (
        <>
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          {t("video.generation.optimizing")}
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-3 w-3" />
          {t("video.generation.optimize")}
        </>
      )}
    </Button>
  </div>
  <Textarea
    id="prompt"
    placeholder={t("video.generation.promptPlaceholder")}
    {...register("prompt")}
    rows={4}
    className="resize-none"
  />
  {/* ... rest of prompt field ... */}
</div>
```

### 3.4.2: Add Translation Keys

```typescript
// lib/language-context.tsx
const translations = {
  en: {
    video: {
      generation: {
        optimize: "Optimize Prompt",
        optimizing: "Optimizing...",
      },
    },
  },
  zh: {
    video: {
      generation: {
        optimize: "优化提示词",
        optimizing: "优化中...",
      },
    },
  },
};
```

## Verification Steps

```bash
# 1. Test optimize button
# - Enter a simple prompt (e.g., "A cat")
# - Click "Optimize Prompt" button
# - Verify optimized prompt replaces original

# 2. Test loading state
# - Click optimize button
# - Verify button shows "Optimizing..." with spinner

# 3. Test button disabled states
# - Empty prompt: button should be disabled
# - Prompt < 10 chars: button should be disabled
# - During optimization: button should be disabled

# 4. Test translation
# - Switch language to ZH
# - Verify button label translates correctly
```

## Acceptance Criteria

- [ ] Optimize button added to video generation form
- [ ] Button calls existing `/api/optimize-prompt` endpoint
- [ ] Optimized prompt replaces original in textarea
- [ ] Loading state shows during optimization
- [ ] Button disabled when prompt too short or empty
- [ ] Translation keys added
- [ ] Error handling for optimization failures
