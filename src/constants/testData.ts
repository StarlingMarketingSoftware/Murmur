// Test data configuration for development
import { Campaign, Status, DraftingMode, DraftingTone, HybridBlock } from '@prisma/client';

// Toggle this to enable/disable test data
export const USE_TEST_DATA = {
  campaigns: false, // Set to false to use real data
};

// Generate test campaigns with realistic data
export const generateTestCampaigns = (): Campaign[] => {
  const currentDate = new Date();
  
  const testCampaigns: Campaign[] = [
    {
      id: 1,
      name: 'Q1 Product Launch Campaign',
      userId: 'test-user',
      createdAt: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updatedAt: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      fullAiPrompt: 'Launch our new product line with engaging email campaigns',
      subject: 'Introducing Our Revolutionary New Product Line',
      testMessage: null,
      testSubject: null,
      senderEmail: 'marketing@company.com',
      senderName: 'Marketing Team',
      status: Status.active,
      signatureId: null,
      font: 'Arial',
      identityId: null,
      draftingMode: DraftingMode.hybrid,
      draftingTone: DraftingTone.normal,
      handwrittenPrompt: null,
      hybridPrompt: null,
      isAiSubject: true,
      paragraphs: 3,
      hybridBlockPrompts: [
        { id: 'introduction', type: 'introduction', value: '' },
        { id: 'research', type: 'research', value: '' },
        { id: 'action', type: 'action', value: '' }
      ],
      hybridAvailableBlocks: [HybridBlock.text],
    },
    {
      id: 2,
      name: 'Summer Sale Outreach',
      userId: 'test-user',
      createdAt: new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      updatedAt: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      fullAiPrompt: 'Promote our summer sale with personalized offers',
      subject: 'Exclusive Summer Deals Just for You!',
      testMessage: null,
      testSubject: null,
      senderEmail: 'sales@company.com',
      senderName: 'Sales Department',
      status: Status.active,
      signatureId: null,
      font: 'Arial',
      identityId: null,
      draftingMode: DraftingMode.hybrid,
      draftingTone: DraftingTone.casual,
      handwrittenPrompt: null,
      hybridPrompt: null,
      isAiSubject: true,
      paragraphs: 4,
      hybridBlockPrompts: [
        { id: 'introduction', type: 'introduction', value: '' },
        { id: 'research', type: 'research', value: '' },
        { id: 'action', type: 'action', value: '' }
      ],
      hybridAvailableBlocks: [HybridBlock.text],
    },
    {
      id: 3,
      name: 'Customer Feedback Survey',
      userId: 'test-user',
      createdAt: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      updatedAt: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      fullAiPrompt: 'Request feedback from recent customers',
      subject: 'We Value Your Opinion - Quick Survey',
      testMessage: null,
      testSubject: null,
      senderEmail: 'feedback@company.com',
      senderName: 'Customer Success',
      status: Status.active,
      signatureId: null,
      font: 'Arial',
      identityId: null,
      draftingMode: DraftingMode.ai,
      draftingTone: DraftingTone.formal,
      handwrittenPrompt: null,
      hybridPrompt: null,
      isAiSubject: true,
      paragraphs: 2,
      hybridBlockPrompts: [
        { id: 'introduction', type: 'introduction', value: '' },
        { id: 'research', type: 'research', value: '' },
        { id: 'action', type: 'action', value: '' }
      ],
      hybridAvailableBlocks: [HybridBlock.text],
    },
    {
      id: 4,
      name: 'B2B Partnership Proposal',
      userId: 'test-user',
      createdAt: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      updatedAt: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      fullAiPrompt: 'Reach out to potential B2B partners',
      subject: 'Strategic Partnership Opportunity',
      testMessage: null,
      testSubject: null,
      senderEmail: 'partnerships@company.com',
      senderName: 'Business Development',
      status: Status.active,
      signatureId: null,
      font: 'Arial',
      identityId: null,
      draftingMode: DraftingMode.hybrid,
      draftingTone: DraftingTone.formal,
      handwrittenPrompt: null,
      hybridPrompt: null,
      isAiSubject: true,
      paragraphs: 5,
      hybridBlockPrompts: [
        { id: 'introduction', type: 'introduction', value: '' },
        { id: 'research', type: 'research', value: '' },
        { id: 'action', type: 'action', value: '' }
      ],
      hybridAvailableBlocks: [HybridBlock.text],
    },
    {
      id: 5,
      name: 'Year-End Client Appreciation',
      userId: 'test-user',
      createdAt: new Date(currentDate.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      updatedAt: new Date(currentDate.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      fullAiPrompt: 'Thank our clients for their business this year',
      subject: 'Thank You for a Wonderful Year!',
      testMessage: null,
      testSubject: null,
      senderEmail: 'team@company.com',
      senderName: 'The Entire Team',
      status: Status.active,
      signatureId: null,
      font: 'Arial',
      identityId: null,
      draftingMode: DraftingMode.handwritten,
      draftingTone: DraftingTone.casual,
      handwrittenPrompt: 'Personal thank you message',
      hybridPrompt: null,
      isAiSubject: false,
      paragraphs: 3,
      hybridBlockPrompts: [
        { id: 'introduction', type: 'introduction', value: '' },
        { id: 'research', type: 'research', value: '' },
        { id: 'action', type: 'action', value: '' }
      ],
      hybridAvailableBlocks: [HybridBlock.text],
    },
    {
      id: 6,
      name: 'New Feature Announcement',
      userId: 'test-user',
      createdAt: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      updatedAt: new Date(currentDate.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      fullAiPrompt: 'Announce our latest platform features',
      subject: 'Exciting New Features Now Available!',
      testMessage: null,
      testSubject: null,
      senderEmail: 'product@company.com',
      senderName: 'Product Team',
      status: Status.active,
      signatureId: null,
      font: 'Arial',
      identityId: null,
      draftingMode: DraftingMode.hybrid,
      draftingTone: DraftingTone.casual,
      handwrittenPrompt: null,
      hybridPrompt: null,
      isAiSubject: true,
      paragraphs: 4,
      hybridBlockPrompts: [
        { id: 'introduction', type: 'introduction', value: '' },
        { id: 'research', type: 'research', value: '' },
        { id: 'action', type: 'action', value: '' }
      ],
      hybridAvailableBlocks: [HybridBlock.text],
    },
    {
      id: 7,
      name: 'Webinar Invitation Series',
      userId: 'test-user',
      createdAt: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      updatedAt: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      fullAiPrompt: 'Invite contacts to our educational webinar series',
      subject: 'Join Our Expert-Led Webinar Series',
      testMessage: null,
      testSubject: null,
      senderEmail: 'events@company.com',
      senderName: 'Events Team',
      status: Status.active,
      signatureId: null,
      font: 'Arial',
      identityId: null,
      draftingMode: DraftingMode.ai,
      draftingTone: DraftingTone.explanatory,
      handwrittenPrompt: null,
      hybridPrompt: null,
      isAiSubject: true,
      paragraphs: 3,
      hybridBlockPrompts: [
        { id: 'introduction', type: 'introduction', value: '' },
        { id: 'research', type: 'research', value: '' },
        { id: 'action', type: 'action', value: '' }
      ],
      hybridAvailableBlocks: [HybridBlock.text],
    },
    {
      id: 8,
      name: 'Holiday Promotion Campaign',
      userId: 'test-user',
      createdAt: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      updatedAt: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      fullAiPrompt: 'Holiday season special offers and promotions',
      subject: 'Exclusive Holiday Deals Inside! 🎁',
      testMessage: null,
      testSubject: null,
      senderEmail: 'holidays@company.com',
      senderName: 'Holiday Team',
      status: Status.active,
      signatureId: null,
      font: 'Arial',
      identityId: null,
      draftingMode: DraftingMode.hybrid,
      draftingTone: DraftingTone.casual,
      handwrittenPrompt: null,
      hybridPrompt: null,
      isAiSubject: true,
      paragraphs: 4,
      hybridBlockPrompts: [
        { id: 'introduction', type: 'introduction', value: '' },
        { id: 'research', type: 'research', value: '' },
        { id: 'action', type: 'action', value: '' }
      ],
      hybridAvailableBlocks: [HybridBlock.text],
    },
  ];

  return testCampaigns;
};
