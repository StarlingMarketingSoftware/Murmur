import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	{
		ignores: ['prisma/seed-data/contact-embeddings.ts'],
	},
	...compat.extends('next/core-web-vitals', 'next/typescript'),
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'react-hooks/exhaustive-deps': 'warn',
			'no-use-before-define': 'off',
			'@typescript-eslint/no-use-before-define': [
				'error',
				{
					functions: false,
					classes: true,
					variables: true,
					typedefs: false,
					ignoreTypeReferences: true,
					enums: true,
					allowNamedExports: false,
				},
			],
		},
	},
	{
		// Legacy files exempt from no-use-before-define. Remove entries as files are cleaned up.
		// `**` is required to traverse the literal `[campaignId]` directory (minimatch treats `[...]` as a char class).
		files: [
			'src/app/(public)/HomePageClient.tsx',
			'src/app/admin/contacts/useManageContacts.tsx',
			'src/app/api/apollo/tsv/route.ts',
			'src/app/murmur/campaign/**/DraftingSection/EmailGeneration/DraftedEmails/useDraftedEmails.tsx',
			'src/app/murmur/campaign/**/DraftingSection/EmailGeneration/DraftingTable/DraftingTableSkeleton.tsx',
			'src/app/murmur/campaign/**/DraftingSection/useDraftingSection.ts',
			'src/app/murmur/dashboard/page.tsx',
			'src/app/murmur/dashboard/DashboardPageClient.tsx',
			'src/components/molecules/CampaignPageSkeleton/CampaignPageSkeleton.tsx',
			'src/components/molecules/HybridPromptInput/useHybridPromptInput.tsx',
			'src/components/molecules/LandingHeroSearchBar/LandingHeroSearchBar.tsx',
			'src/components/molecules/LandingPageGoogleMapBackground/LandingPageMapMiniSearchBar.tsx',
			'src/components/molecules/SearchResultsMap/SearchResultsMap.tsx',
			'src/components/organisms/_dialogs/ContactCSVUploadDialog/useContactTSVUploadDialog.tsx',
			'src/components/organisms/_dialogs/EditContactListDialog/useEditContactListDialog.tsx',
			'src/components/organisms/_dialogs/ManageSignaturesDialog/useManageSignaturesDialog.ts',
			'src/components/organisms/_tables/CampaignsTable/useCampaignsTable.tsx',
			'src/components/organisms/_tables/ContactListTable/useContactListTable.tsx',
			'src/components/organisms/_tables/ContactVerificationTable/useContactVerificationTable.tsx',
			'src/components/ui/form.tsx',
			'src/constants/ai.ts',
			'src/contexts/PageTransitionContext.tsx',
			'src/utils/html.tsx',
		],
		rules: {
			'@typescript-eslint/no-use-before-define': 'off',
		},
	},
];

export default eslintConfig;
