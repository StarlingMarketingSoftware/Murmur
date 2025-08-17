/**
 * Script to seed test campaigns for development and testing
 * Run with: npx tsx scripts/seed-campaigns.ts
 */

import { PrismaClient, Status, DraftingMode, DraftingTone, HybridBlock } from '@prisma/client';

const prisma = new PrismaClient();

// Test user clerk IDs - update these to match your test users
const TEST_USER_IDS = [
  'user_2yfwTts2NJrPFiydjSimNx9HW4r', // Admin user from seed data
  'user_2yfwfFMcWIho4NSUT25o8V1LYHu', // Regular user from seed data
];

interface TestCampaign {
  name: string;
  subject: string;
  fullAiPrompt: string;
  senderEmail: string;
  senderName: string;
  status: Status;
  draftingMode: DraftingMode;
  draftingTone: DraftingTone;
  handwrittenPrompt?: string;
  hybridPrompt?: string;
  isAiSubject: boolean;
  paragraphs: number;
  font: string;
}

const campaignTemplates: TestCampaign[] = [
  {
    name: 'Q1 Product Launch Campaign',
    subject: 'Introducing Our Revolutionary New Product',
    fullAiPrompt: 'Write an engaging email about our new product launch focusing on innovation and customer benefits',
    senderEmail: 'marketing@company.com',
    senderName: 'Marketing Team',
    status: Status.active,
    draftingMode: DraftingMode.hybrid,
    draftingTone: DraftingTone.excited,
    hybridPrompt: 'Emphasize the cutting-edge features and early bird discount',
    isAiSubject: true,
    paragraphs: 3,
    font: 'Arial',
  },
  {
    name: 'Customer Retention Campaign',
    subject: 'We Miss You! Special Offer Inside',
    fullAiPrompt: 'Create a warm re-engagement email for inactive customers with a special discount',
    senderEmail: 'support@company.com',
    senderName: 'Customer Success',
    status: Status.active,
    draftingMode: DraftingMode.ai,
    draftingTone: DraftingTone.normal,
    isAiSubject: false,
    paragraphs: 2,
    font: 'Times New Roman',
  },
  {
    name: 'Summer Sales Outreach',
    subject: 'Summer Deals Are Here!',
    fullAiPrompt: 'Write an exciting summer sales email with beach and vacation themes',
    senderEmail: 'sales@company.com',
    senderName: 'Sales Team',
    status: Status.active,
    draftingMode: DraftingMode.handwritten,
    draftingTone: DraftingTone.casual,
    handwrittenPrompt: 'Hey there! Summer is here and so are our amazing deals...',
    isAiSubject: true,
    paragraphs: 4,
    font: 'Georgia',
  },
  {
    name: 'B2B Partnership Proposal',
    subject: 'Partnership Opportunity with {{company}}',
    fullAiPrompt: 'Draft a professional B2B partnership proposal email',
    senderEmail: 'partnerships@company.com',
    senderName: 'Business Development',
    status: Status.active,
    draftingMode: DraftingMode.hybrid,
    draftingTone: DraftingTone.normal,
    hybridPrompt: 'Focus on mutual benefits and ROI',
    isAiSubject: true,
    paragraphs: 3,
    font: 'Arial',
  },
  {
    name: 'Event Invitation Campaign',
    subject: 'You\'re Invited: Exclusive Industry Event',
    fullAiPrompt: 'Create an invitation email for our upcoming industry conference',
    senderEmail: 'events@company.com',
    senderName: 'Events Team',
    status: Status.active,
    draftingMode: DraftingMode.ai,
    draftingTone: DraftingTone.excited,
    isAiSubject: false,
    paragraphs: 3,
    font: 'Helvetica',
  },
  {
    name: 'Newsletter - Tech Updates',
    subject: 'Monthly Tech Digest',
    fullAiPrompt: 'Write a monthly newsletter about latest tech trends and company updates',
    senderEmail: 'newsletter@company.com',
    senderName: 'Editorial Team',
    status: Status.inactive,
    draftingMode: DraftingMode.handwritten,
    draftingTone: DraftingTone.normal,
    handwrittenPrompt: 'This month in tech: AI advances, cloud innovations, and more...',
    isAiSubject: true,
    paragraphs: 5,
    font: 'Arial',
  },
  {
    name: 'Holiday Greetings Campaign',
    subject: 'Season\'s Greetings from Our Team',
    fullAiPrompt: 'Create a warm holiday greeting email with year-end reflection',
    senderEmail: 'team@company.com',
    senderName: 'The Entire Team',
    status: Status.inactive,
    draftingMode: DraftingMode.hybrid,
    draftingTone: DraftingTone.casual,
    hybridPrompt: 'Include gratitude for customers and excitement for the new year',
    isAiSubject: false,
    paragraphs: 2,
    font: 'Georgia',
  },
  {
    name: 'Product Feedback Survey',
    subject: 'Your Opinion Matters - Quick Survey',
    fullAiPrompt: 'Write an email requesting product feedback with survey link',
    senderEmail: 'feedback@company.com',
    senderName: 'Product Team',
    status: Status.active,
    draftingMode: DraftingMode.ai,
    draftingTone: DraftingTone.normal,
    isAiSubject: true,
    paragraphs: 2,
    font: 'Arial',
  },
];

async function seedCampaigns() {
  console.log('🚀 Starting campaign seeding...');
  
  try {
    // Check if users exist
    const users = await prisma.user.findMany({
      where: {
        clerkId: {
          in: TEST_USER_IDS,
        },
      },
    });

    if (users.length === 0) {
      console.error('❌ No test users found. Please run the main seed script first: npx prisma db seed');
      return;
    }

    console.log(`✅ Found ${users.length} test users`);

    let campaignsCreated = 0;

    for (const user of users) {
      console.log(`\n📧 Creating campaigns for user: ${user.email}`);
      
      // Create a random subset of campaigns for each user
      const numCampaigns = Math.floor(Math.random() * (campaignTemplates.length - 3 + 1)) + 3;
      const shuffled = [...campaignTemplates].sort(() => 0.5 - Math.random());
      const selectedCampaigns = shuffled.slice(0, numCampaigns);

      for (let i = 0; i < selectedCampaigns.length; i++) {
        const template = selectedCampaigns[i];
        // Add some randomization to make campaigns unique
        const randomNum = Math.floor(Math.random() * 1000);
        const companyNames = ['TechCorp', 'InnovateCo', 'FutureBiz', 'GlobalNet', 'SmartSolutions'];
        const randomCompany = companyNames[Math.floor(Math.random() * companyNames.length)];
        
        const campaign = await prisma.campaign.create({
          data: {
            name: `${template.name} - ${randomNum}`,
            userId: user.clerkId,
            subject: template.subject,
            fullAiPrompt: template.fullAiPrompt,
            senderEmail: template.senderEmail.replace('company', randomCompany.toLowerCase()),
            senderName: template.senderName,
            status: template.status,
            draftingMode: template.draftingMode,
            draftingTone: template.draftingTone,
            handwrittenPrompt: template.handwrittenPrompt,
            hybridPrompt: template.hybridPrompt,
            isAiSubject: template.isAiSubject,
            paragraphs: template.paragraphs,
            font: template.font,
            hybridBlockPrompts: [
              { id: 'introduction', type: 'introduction', value: 'Introduction to our services and value proposition' },
              { id: 'research', type: 'research', value: 'Research about your company and needs' },
              { id: 'action', type: 'action', value: 'Schedule a call' },
            ],
            hybridAvailableBlocks: [HybridBlock.text, HybridBlock.research],
            // Random dates within the last 3 months
            createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          },
        });

        console.log(`  ✅ Created campaign: ${campaign.name}`);
        campaignsCreated++;
      }
    }

    console.log(`\n🎉 Successfully created ${campaignsCreated} test campaigns!`);
    console.log('\n📌 You can now view these campaigns in the "Your Campaigns" section of the dashboard.');
    
  } catch (error) {
    console.error('❌ Error seeding campaigns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedCampaigns()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
