import { CampaignWithRelations, Draft } from '@/constants/types';
import { FC, useEffect, useState } from 'react';
import SavedDraftsTable from './SavedDraftsTable/SavedDraftsTable';
import { useAppSelector } from '@/lib/redux/hooks';
import { Contact } from '@prisma/client';
import ComposeEmailSection from './ComposeEmailSection/ComposeEmailSection';

const sampleDrafts: Draft[] = [
	{
		subject: 'Meeting Reminder',
		message: "Don't forget about our meeting scheduled for tomorrow at 10 AM.",
		contactEmail: 'john.doe@example.com',
	},
	{
		subject: 'Project Update',
		message:
			'The latest update on the project is now available. Please review and provide feedback.',
		contactEmail: 'jane.smith@example.com',
	},
	{
		subject: 'Invoice Submission',
		message: 'Please find attached the invoice for this month’s services.',
		contactEmail: 'billing@company.com',
	},
	{
		subject: 'Event Invitation',
		message:
			'You are invited to our annual company event on March 15th. RSVP by March 1st.',
		contactEmail: 'events@company.com',
	},
	{
		subject: 'Technical Support Request',
		message: 'I am experiencing an issue with my account login. Can you assist?',
		contactEmail: 'support@service.com',
	},
	{
		subject: 'Job Application',
		message: 'I am applying for the Software Engineer position. My resume is attached.',
		contactEmail: 'hr@company.com',
	},
	{
		subject: 'Feedback Request',
		message: 'We would appreciate your feedback on our new product.',
		contactEmail: 'feedback@company.com',
	},
	{
		subject: 'Subscription Renewal',
		message:
			'Your subscription will expire soon. Renew now to continue enjoying our services.',
		contactEmail: 'subscriptions@service.com',
	},
	{
		subject: 'Security Alert',
		message:
			'A new login attempt was detected on your account. If this wasn’t you, reset your password.',
		contactEmail: 'security@service.com',
	},
	{
		subject: 'Weekly Newsletter',
		message: 'Check out this week’s updates and news in our latest newsletter.',
		contactEmail: 'newsletter@company.com',
	},
	{
		subject: 'Password Reset Request',
		message: 'Click the link below to reset your password.',
		contactEmail: 'noreply@service.com',
	},
	{
		subject: 'Product Inquiry',
		message:
			'I am interested in learning more about your latest product. Can you provide details?',
		contactEmail: 'sales@company.com',
	},
	{
		subject: 'Meeting Reschedule',
		message: 'Can we move our scheduled meeting to a later time?',
		contactEmail: 'colleague@example.com',
	},
	{
		subject: 'Customer Support Follow-up',
		message: 'Following up on my previous support request regarding my order status.',
		contactEmail: 'support@ecommerce.com',
	},
	{
		subject: 'Collaboration Proposal',
		message: 'I’d love to discuss a potential collaboration opportunity with you.',
		contactEmail: 'business@company.com',
	},
];

interface DraftsPageProps {
	campaign: CampaignWithRelations;
}

const DraftPage: FC<DraftsPageProps> = ({ campaign }) => {
	const [selectedRows, setSelectedRows] = useState<Draft[]>([]);
	const [drafts, setDrafts] = useState<Draft[]>([]); // TODO store this in localStorage as well in case app crashes

	return (
		<>
			<ComposeEmailSection campaign={campaign} />
			<SavedDraftsTable drafts={drafts} setSelectedRows={setSelectedRows} />
		</>
	);
};

export default DraftPage;
