import { MurmurHorizontalLogo } from '@/components/atoms/_svg/MurmurHorizontalLogo';
import { ChatGPTLogo } from '@/components/atoms/_svg/ChatGPTLogo';
import { MailchimpLogo } from '@/components/atoms/_svg/MailChimpLogo';
import SquareCheck from '@/components/atoms/_svg/SquareCheck';
import SquareX from '@/components/atoms/_svg/SquareX';
import { ReactNode } from 'react';

const features = [
	{
		label: 'Contact List Generation',
		murmur: true,
		chatgpt: false,
		mailchimp: false,
	},
	{
		label: 'Advanced Contact Research',
		murmur: true,
		chatgpt: false,
		mailchimp: false,
	},
	{
		label: 'Email Verification',
		murmur: true,
		chatgpt: false,
		mailchimp: false,
	},
	{
		label: 'Full AI Drafting',
		murmur: true,
		chatgpt: true,
		mailchimp: false,
	},
	{
		label: 'Hybrid AI Drafting',
		murmur: true,
		chatgpt: false,
		mailchimp: true,
	},
	{
		label: 'Batch AI Drafting',
		murmur: true,
		chatgpt: false,
		mailchimp: false,
	},
	{
		label: 'Email Newsletters',
		murmur: false,
		chatgpt: false,
		mailchimp: true,
	},
];

const TABLE_CELL_WIDTH = 'min-w-[55px] w-fit sm:w-[145px] md:w-[200px] lg:w-[250px]';

const LOGO_CN =
	'fill-black mx-auto w-[70px] sm:w-[96px] md:w-[140px] lg:w-[180px] h-[40px] sm:h-[60px] md:h-[80px] lg:h-[100px]';

const CustomCheck = () => {
	return (
		<SquareCheck
			className="mx-auto text-primary stroke-primary h-[75px] w-[24px] sm:w-[32px] md:w-[48px] lg:w-[64px]"
			pathClassName="!stroke-[#4C9F3B]"
		/>
	);
};

const CustomX = () => {
	return (
		<SquareX
			className="mx-auto text-destructive stroke-destructive h-[75px] w-[20px] sm:w-[28px] md:w-[42px] lg:w-[56px]"
			pathClassName="!stroke-[#AC0E0E]"
		/>
	);
};

const CustomTd = ({ children }: { children: ReactNode }) => {
	return (
		<td
			className={`py-2 md:py-3 lg:py-4 border-r-1 sm:border-r-2 text-center border-r-foreground ${TABLE_CELL_WIDTH}`}
		>
			{children}
		</td>
	);
};

const CustomTh = ({ children }: { children?: ReactNode }) => {
	return (
		<th
			className={`p-0 sm:p-2 md:p-3 lg:p-4 -rotate-45 -translate-y-3 sm:translate-y-0 sm:rotate-0 ${TABLE_CELL_WIDTH}`}
		>
			{children}
		</th>
	);
};

export const ComparisonTable = () => {
	return (
		<div className="mx-auto flex justify-center py-12 md:py-16 lg:py-24 px-2 sm:px-4 overflow-x-auto">
			<table className="border-collapse w-fit">
				<thead>
					<tr>
						<CustomTh></CustomTh>
						<CustomTh>
							<MurmurHorizontalLogo className={LOGO_CN} />
						</CustomTh>
						<CustomTh>
							<ChatGPTLogo className={LOGO_CN} />
						</CustomTh>
						<CustomTh>
							<MailchimpLogo className={LOGO_CN} />
						</CustomTh>
					</tr>
				</thead>
				<tbody>
					{features.map((feature, index) => (
						<tr key={index}>
							<td
								className={`pt-2 md:pt-3 lg:pt-4 pr-2 sm:pr-4 md:pr-6 lg:pr-8 text-[12px] sm:text-[16px] md:text-[19px] lg:text-[22px] xl:text-[27px] border-r-1 sm:border-r-2 border-r-foreground border-t-transparent break-words text-center font-secondary sm:font-primary xl:text-nowrap ${TABLE_CELL_WIDTH}`}
							>
								{feature.label}
							</td>
							<CustomTd>{feature.murmur ? <CustomCheck /> : <CustomX />}</CustomTd>
							<CustomTd>{feature.chatgpt ? <CustomCheck /> : <CustomX />}</CustomTd>
							<CustomTd>{feature.mailchimp ? <CustomCheck /> : <CustomX />}</CustomTd>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
