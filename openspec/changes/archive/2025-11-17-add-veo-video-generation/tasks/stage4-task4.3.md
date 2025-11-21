# Task 4.3: Update Pricing Page with Video Costs

**File**: Existing pricing page
**Estimated Time**: 1 hour
**Dependencies**: None
**Priority**: P2 (Nice to have)

## Overview

Add video generation credit costs to existing pricing page

## Implementation

```typescript
// app/pricing/page.tsx (add to existing pricing table)

const videoPricing = [
  { duration: "4s", resolution: "720p", credits: 40 },
  { duration: "4s", resolution: "1080p", credits: 60 },
  { duration: "6s", resolution: "720p", credits: 60 },
  { duration: "6s", resolution: "1080p", credits: 90 },
  { duration: "8s", resolution: "720p", credits: 80 },
  { duration: "8s", resolution: "1080p", credits: 120 },
];

<section className="mt-12">
  <h2 className="text-2xl font-bold mb-4">{t("pricing.videoCosts")}</h2>
  <table className="w-full">
    <thead>
      <tr>
        <th>Duration</th>
        <th>Resolution</th>
        <th>Credits</th>
      </tr>
    </thead>
    <tbody>
      {videoPricing.map((item) => (
        <tr key={`${item.duration}-${item.resolution}`}>
          <td>{item.duration}</td>
          <td>{item.resolution}</td>
          <td>{item.credits}</td>
        </tr>
      ))}
    </tbody>
  </table>
  <p className="text-sm text-muted-foreground mt-2">
    {t("pricing.videoNote")}
  </p>
</section>
```

### Add Translations

```typescript
const translations = {
  en: {
    pricing: {
      videoCosts: "Video Generation Costs",
      videoNote: "Failed generations are automatically refunded",
    },
  },
  zh: {
    pricing: {
      videoCosts: "视频生成费用",
      videoNote: "失败的生成会自动退款",
    },
  },
};
```

## Acceptance Criteria

- [ ] Video pricing table added to pricing page
- [ ] All 6 pricing tiers displayed
- [ ] Refund note included
- [ ] Translation keys added
- [ ] Table styled consistently
