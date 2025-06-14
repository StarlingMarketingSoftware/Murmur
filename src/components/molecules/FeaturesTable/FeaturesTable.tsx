import { FC } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableCaption,
	TableFooter,
} from '@/components/ui/table';
import { CheckIcon } from 'lucide-react';

type Feature = {
	contactFeatures: {
		contactGeneration: boolean;
		additionalContactGeneration: boolean;
		monthlyContactLimit: string;
		contactImportTools: string;
		automatedContactScrubbing: boolean;
	};
	emailFeatures: {
		customEmailsWithAI: boolean;
		greaterAiPersonalization: boolean;
		premiumEmailTemplates: boolean;
		advancedEmailAnalytics: string;
		abTesting: boolean;
	};
	usageFeatures: {
		entryLevelUsage: boolean;
		extensiveUsage: boolean;
		mostUsage: boolean;
		customDomains: boolean;
	};
	supportFeatures: {
		emailSupport: boolean;
		campaignConsultation: boolean;
		'1on1Consultation': boolean;
	};
};

type Plan = 'basic' | 'standard' | 'pro';

const FEATURE_DATA: Record<Plan, Feature> = {
	basic: {
		contactFeatures: {
			contactGeneration: true,
			additionalContactGeneration: false,
			monthlyContactLimit: '100',
			contactImportTools: 'Basic',
			automatedContactScrubbing: false,
		},
		emailFeatures: {
			customEmailsWithAI: true,
			greaterAiPersonalization: false,
			premiumEmailTemplates: false,
			advancedEmailAnalytics: '',
			abTesting: false,
		},
		usageFeatures: {
			entryLevelUsage: true,
			extensiveUsage: false,
			mostUsage: false,
			customDomains: false,
		},
		supportFeatures: {
			emailSupport: true,
			campaignConsultation: false,
			'1on1Consultation': false,
		},
	},
	standard: {
		contactFeatures: {
			contactGeneration: true,
			additionalContactGeneration: true,
			monthlyContactLimit: '500',
			contactImportTools: 'Advanced',
			automatedContactScrubbing: true,
		},
		emailFeatures: {
			customEmailsWithAI: true,
			greaterAiPersonalization: true,
			premiumEmailTemplates: true,
			advancedEmailAnalytics: 'Basic',
			abTesting: false,
		},
		usageFeatures: {
			entryLevelUsage: true,
			extensiveUsage: true,
			mostUsage: false,
			customDomains: true,
		},
		supportFeatures: {
			emailSupport: true,
			campaignConsultation: true,
			'1on1Consultation': false,
		},
	},
	pro: {
		contactFeatures: {
			contactGeneration: true,
			additionalContactGeneration: true,
			monthlyContactLimit: 'Unlimited',
			contactImportTools: 'Premium',
			automatedContactScrubbing: true,
		},
		emailFeatures: {
			customEmailsWithAI: true,
			greaterAiPersonalization: true,
			premiumEmailTemplates: true,
			advancedEmailAnalytics: 'Advanced',
			abTesting: true,
		},
		usageFeatures: {
			entryLevelUsage: true,
			extensiveUsage: true,
			mostUsage: true,
			customDomains: true,
		},
		supportFeatures: {
			emailSupport: true,
			campaignConsultation: true,
			'1on1Consultation': true,
		},
	},
};

interface CheckCellProps {
	checked: boolean;
}
const CheckCell: FC<CheckCellProps> = ({ checked }) => {
	return (
		<TableCell className="text-center">
			{checked ? <CheckIcon className="h-4 w-4 text-green-500" /> : '—'}
		</TableCell>
	);
};

export const FeaturesTable: FC = () => {
	return (
		<Table className="max-w-[1395px] mx-auto">
			<TableCaption>Features of our products</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead></TableHead>
					<TableHead>Basic</TableHead>
					<TableHead>Standard</TableHead>
					<TableHead>Pro</TableHead>
				</TableRow>
			</TableHeader>
			<TableHeader>
				<TableRow>
					<TableHead>Features</TableHead>
					<TableHead></TableHead>
					<TableHead></TableHead>
					<TableHead></TableHead>
				</TableRow>
			</TableHeader>
			<TableHeader>
				<TableRow>
					<TableHead>Contact Features</TableHead>
					<TableHead></TableHead>
					<TableHead></TableHead>
					<TableHead></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>Contact Generation</TableCell>
					<CheckCell checked={FEATURE_DATA.basic.contactFeatures.contactGeneration} />
					<CheckCell checked={FEATURE_DATA.standard.contactFeatures.contactGeneration} />
					<CheckCell checked={FEATURE_DATA.pro.contactFeatures.contactGeneration} />
				</TableRow>
				<TableRow>
					<TableCell>Additional Contact Generation</TableCell>
					<CheckCell
						checked={FEATURE_DATA.basic.contactFeatures.additionalContactGeneration}
					/>
					<CheckCell
						checked={FEATURE_DATA.standard.contactFeatures.additionalContactGeneration}
					/>
					<CheckCell
						checked={FEATURE_DATA.pro.contactFeatures.additionalContactGeneration}
					/>
				</TableRow>
				<TableRow>
					<TableCell>Monthly Contact Limit</TableCell>
					<TableCell>{FEATURE_DATA.basic.contactFeatures.monthlyContactLimit}</TableCell>
					<TableCell>
						{FEATURE_DATA.standard.contactFeatures.monthlyContactLimit}
					</TableCell>
					<TableCell>{FEATURE_DATA.pro.contactFeatures.monthlyContactLimit}</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Contact Import Tools</TableCell>
					<TableCell>{FEATURE_DATA.basic.contactFeatures.contactImportTools}</TableCell>
					<TableCell>
						{FEATURE_DATA.standard.contactFeatures.contactImportTools}
					</TableCell>
					<TableCell>{FEATURE_DATA.pro.contactFeatures.contactImportTools}</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Automated Contact Scrubbing</TableCell>
					<CheckCell
						checked={FEATURE_DATA.basic.contactFeatures.automatedContactScrubbing}
					/>
					<CheckCell
						checked={FEATURE_DATA.standard.contactFeatures.automatedContactScrubbing}
					/>
					<CheckCell
						checked={FEATURE_DATA.pro.contactFeatures.automatedContactScrubbing}
					/>
				</TableRow>

				<TableRow>
					<TableHead>Email Features</TableHead>
					<TableHead></TableHead>
					<TableHead></TableHead>
					<TableHead></TableHead>
				</TableRow>
				<TableRow>
					<TableCell>Contact Generation</TableCell>
					<CheckCell checked={FEATURE_DATA.basic.contactFeatures.contactGeneration} />
					<CheckCell checked={FEATURE_DATA.standard.contactFeatures.contactGeneration} />
					<CheckCell checked={FEATURE_DATA.pro.contactFeatures.contactGeneration} />
				</TableRow>
				<TableRow>
					<TableCell>Additional Contact Generation</TableCell>
					<CheckCell
						checked={FEATURE_DATA.basic.contactFeatures.additionalContactGeneration}
					/>
					<CheckCell
						checked={FEATURE_DATA.standard.contactFeatures.additionalContactGeneration}
					/>
					<CheckCell
						checked={FEATURE_DATA.pro.contactFeatures.additionalContactGeneration}
					/>
				</TableRow>
				<TableRow>
					<TableCell>Monthly Contact Limit</TableCell>
					<TableCell>{FEATURE_DATA.basic.contactFeatures.monthlyContactLimit}</TableCell>
					<TableCell>
						{FEATURE_DATA.standard.contactFeatures.monthlyContactLimit}
					</TableCell>
					<TableCell>{FEATURE_DATA.pro.contactFeatures.monthlyContactLimit}</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Contact Import Tools</TableCell>
					<TableCell>{FEATURE_DATA.basic.contactFeatures.contactImportTools}</TableCell>
					<TableCell>
						{FEATURE_DATA.standard.contactFeatures.contactImportTools}
					</TableCell>
					<TableCell>{FEATURE_DATA.pro.contactFeatures.contactImportTools}</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Automated Contact Scrubbing</TableCell>
					<CheckCell
						checked={FEATURE_DATA.basic.contactFeatures.automatedContactScrubbing}
					/>
					<CheckCell
						checked={FEATURE_DATA.standard.contactFeatures.automatedContactScrubbing}
					/>
					<CheckCell
						checked={FEATURE_DATA.pro.contactFeatures.automatedContactScrubbing}
					/>
				</TableRow>
			</TableBody>
			<TableFooter>
				<TableRow>
					<TableCell colSpan={2}>End of features list</TableCell>
				</TableRow>
			</TableFooter>
		</Table>
	);
};
