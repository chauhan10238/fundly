# Add the actions to `app/analyse/page.tsx`

Add this import:

```tsx
import { AnalysisReportActions } from "@/components/dios/analysis-report-actions"
```

Then, inside the existing `{report && (...)}` block, place this immediately
before the `InstitutionalIntelligenceView` or before the existing
"Log recommendation" button:

```tsx
<AnalysisReportActions
  report={report}
  intelligence={intelligence}
  snapshot={market}
  context={externalContext}
/>
```

Recommended structure:

```tsx
{report && (
  <>
    <AnalysisReportActions
      report={report}
      intelligence={intelligence}
      snapshot={market}
      context={externalContext}
    />

    {intelligence && (
      <InstitutionalIntelligenceView intelligence={intelligence} />
    )}

    {/* existing Log recommendation button and AnalysisReportView */}
  </>
)}
```

If your page currently renders `InstitutionalIntelligenceView` outside the
`report` block, leave it there and add only `AnalysisReportActions` inside the
`report` block.
