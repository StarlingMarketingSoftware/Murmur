# Test Data Usage Guide

## Overview
This test data feature allows you to work on the UI without affecting real data or needing backend connections.

## How to Use

### Enable Test Data
In `src/constants/testData.ts`, set:
```typescript
export const USE_TEST_DATA = {
  campaigns: true, // Set to false to use real data
};
```

### Features
- 8 realistic test campaigns with varying dates, statuses, and content
- Simulated network delay for realistic loading states
- Works with both the campaigns list and individual campaign details
- No backend changes required

### Switching Back to Real Data
Simply set `campaigns: false` in the `USE_TEST_DATA` object to use your actual API data.

### Customizing Test Data
You can modify the `generateTestCampaigns()` function in `src/constants/testData.ts` to:
- Add more campaigns
- Change campaign properties
- Adjust dates, names, or any other fields

## Benefits
- Work on UI improvements without API dependencies
- Test various UI states with different data
- No risk of affecting production data
- Easy to toggle on/off
