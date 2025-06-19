import { FC } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { CheckIcon } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';

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

const FEATURE_LABELS: Record<keyof Feature, Record<string, string>> = {
	contactFeatures: {
		contactGeneration: 'Contact Generation',
		additionalContactGeneration: 'Additional Contact Generation',
		monthlyContactLimit: 'Monthly Contact Limit',
		contactImportTools: 'Contact Import Tools',
		automatedContactScrubbing: 'Automated Contact Scrubbing',
	},
	emailFeatures: {
		customEmailsWithAI: 'Custom Emails with AI',
		greaterAiPersonalization: 'Greater AI Personalization',
		premiumEmailTemplates: 'Premium Email Templates',
		advancedEmailAnalytics: 'Advanced Email Analytics',
		abTesting: 'A/B Testing',
	},
	usageFeatures: {
		entryLevelUsage: 'Entry Level Usage',
		extensiveUsage: 'Extensive Usage',
		mostUsage: 'Most Usage',
		customDomains: 'Custom Domains',
	},
	supportFeatures: {
		emailSupport: 'Email Support',
		campaignConsultation: 'Campaign Consultation',
		'1on1Consultation': '1-on-1 Consultation',
	},
};

const SECTION_LABELS: Record<keyof Feature, string> = {
	contactFeatures: 'Contact Features',
	emailFeatures: 'Email Features',
	usageFeatures: 'Usage Features',
	supportFeatures: 'Support Features',
};

interface CheckCellProps {
	checked: boolean;
	bgColor?: string;
}
const CheckCell: FC<CheckCellProps> = ({ checked, bgColor = '' }) => {
	return (
		<TableCell className={`text-center border-y-0 border-x-1 border-gray-200 ${bgColor}`}>
			<div className="w-full flex justify-center">
				{checked && <CheckIcon className="h-4 w-4 text-center" />}
			</div>
		</TableCell>
	);
};

interface FeatureCellProps {
	value: boolean | string;
	bgColor?: string;
}
const FeatureCell: FC<FeatureCellProps> = ({ value, bgColor = '' }) => {
	if (typeof value === 'boolean') {
		return <CheckCell checked={value} bgColor={bgColor} />;
	}
	return (
		<TableCell className={`text-center border-y-0 border-x-1 border-gray-200 ${bgColor}`}>
			<Typography className="text-center text-[16px]">{value}</Typography>
		</TableCell>
	);
};

interface FeatureRowProps<T extends keyof Feature> {
	sectionKey: T;
	featureKey: keyof Feature[T];
	isEven: boolean;
}
const FeatureRow = <T extends keyof Feature>({
	sectionKey,
	featureKey,
	isEven,
}: FeatureRowProps<T>) => {
	const featureLabel = FEATURE_LABELS[sectionKey][featureKey as string];
	const rowBgColor = isEven ? 'bg-background' : 'bg-gray-100';

	return (
		<TableRow className={`border-x-2 border-gray-200 border-y-0 ${rowBgColor}`}>
			<TableCell
				className={`font-medium !pl-5 border-y-0 border-x-1 border-gray-200 ${rowBgColor}`}
			>
				<Typography className="text-[16px]">{featureLabel}</Typography>
			</TableCell>
			<FeatureCell
				value={FEATURE_DATA.basic[sectionKey][featureKey] as boolean | string}
				bgColor={rowBgColor}
			/>
			<FeatureCell
				value={FEATURE_DATA.standard[sectionKey][featureKey] as boolean | string}
				bgColor={rowBgColor}
			/>
			<FeatureCell
				value={FEATURE_DATA.pro[sectionKey][featureKey] as boolean | string}
				bgColor={rowBgColor}
			/>
		</TableRow>
	);
};

// Helper component for section headers
interface SectionHeaderProps {
	title: string;
}
const SectionHeader: FC<SectionHeaderProps> = ({ title }) => {
	const cn = 'bg-gray-200 border-y-0 border-x-1 border-gray-200';
	return (
		<TableRow className="border-x-2 border-gray-200 border-y-0">
			<TableHead className="bg-gray-200 font-semibold text-foreground !pl-5 border-y-0 border-x-1 border-gray-200">
				<Typography className="text-[16px] font-bold italic">{title}</Typography>
			</TableHead>
			<TableHead className={cn} />
			<TableHead className={cn} />
			<TableHead className={cn} />
		</TableRow>
	);
};

export const FeaturesTable: FC = () => {
	const renderSection = <T extends keyof Feature>(sectionKey: T) => {
		const features = Object.keys(FEATURE_DATA.basic[sectionKey]) as Array<
			keyof Feature[T]
		>;

		return (
			<>
				<SectionHeader title={SECTION_LABELS[sectionKey]} />
				{features.map((featureKey, index) => (
					<FeatureRow
						key={`${sectionKey}-${String(featureKey)}`}
						sectionKey={sectionKey}
						featureKey={featureKey}
						isEven={index % 2 === 0}
					/>
				))}
			</>
		);
	};

	const tableHeadingStyles = 'text-center text-[22px] font-bold italic pb-2';

	return (
		<Table className="max-w-[1395px] mx-auto">
			<TableHeader className="">
				<TableRow className="border-none pointer-events-none">
					<TableHead className="w-1/3"></TableHead>
					<TableHead className="">
						<Typography className={tableHeadingStyles} variant="h3">
							Basic
						</Typography>
					</TableHead>
					<TableHead className="">
						<Typography
							className={twMerge(
								tableHeadingStyles,
								'border-b-solid border-b-2 border-secondary'
							)}
							variant="h3"
						>
							Standard
						</Typography>
					</TableHead>
					<TableHead className="">
						<Typography className={tableHeadingStyles} variant="h3">
							Pro
						</Typography>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableHeader>
				<TableRow
					className={twMerge(
						'border-solid border-x-2 border-gray-200 pointer-events-none bg-gray-50'
					)}
				>
					<TableHead className="w-1/3">
						<Typography variant="h4" className="font-bold italic text-[18px]">
							Features
						</Typography>
					</TableHead>
					<TableHead className="text-center"></TableHead>
					<TableHead className="text-center"></TableHead>
					<TableHead className="text-center"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{renderSection('contactFeatures')}
				{renderSection('emailFeatures')}
				{renderSection('usageFeatures')}
				{renderSection('supportFeatures')}
			</TableBody>
		</Table>
	);
};
