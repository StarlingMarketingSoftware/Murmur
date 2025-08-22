import { MurmurHorizontalLogo } from '@/components/atoms/_svg/MurmurHorizontalLogo';
import { ChatGPTLogo } from '@/components/atoms/_svg/ChatGPTLogo';
import { MailchimpLogo } from '@/components/atoms/_svg/MailChimpLogo';
import SquareCheck from '@/components/atoms/_svg/SquareCheck';
import SquareX from '@/components/atoms/_svg/SquareX';
import { ReactNode } from 'react';

const features = [
	{ label: 'Contact List Generation', murmur: true, chatgpt: false, mailchimp: false },
	{ label: 'Advanced Contact Research', murmur: true, chatgpt: false, mailchimp: false },
	{ label: 'Email Verification', murmur: true, chatgpt: false, mailchimp: false },
	{ label: 'Full Automated Drafting', murmur: true, chatgpt: true, mailchimp: false },
	{ label: 'Hybrid Automated Drafting', murmur: true, chatgpt: false, mailchimp: true },
	{ label: 'Batch Automated Drafting', murmur: true, chatgpt: false, mailchimp: false },
	{ label: 'Email Newsletters', murmur: false, chatgpt: false, mailchimp: true },
];

const TABLE_CELL_WIDTH = '';

const LOGO_CN =
	'fill-white mx-auto w-[40px] sm:w-[88px] md:w-[128px] lg:w-[168px] h-[20px] sm:h-[54px] md:h-[72px] lg:h-[90px]';

const CustomCheck = () => {
	return (
		<SquareCheck
			className="mx-auto text-primary stroke-primary h-[20px] sm:h-[66px] w-[12px] sm:w-[28px] md:w-[42px] lg:w-[56px]"
			pathClassName="!stroke-[#4C9F3B]"
		/>
	);
};

const CustomX = () => {
	return (
		<SquareX
			className="mx-auto h-[20px] sm:h-[66px] w-[12px] sm:w-[24px] md:w-[38px] lg:w-[50px]"
			pathClassName="!stroke-[#FFFFFF]"
		/>
	);
};

const CustomTd = ({
	children,
	isLast = false,
}: {
	children: ReactNode;
	isLast?: boolean;
}) => {
	return (
		<td
			className={`py-1 sm:py-2 md:py-3 lg:py-4 px-1 sm:px-2 ${
				!isLast ? 'border-r border-r-white' : ''
			} text-center text-white ${TABLE_CELL_WIDTH}`}
		>
			{children}
		</td>
	);
};

const CustomTh = ({ children }: { children?: ReactNode }) => {
	return (
		<th className={`p-1 sm:p-2 md:p-3 lg:p-4 text-white ${TABLE_CELL_WIDTH}`}>
			{children}
		</th>
	);
};

export const ComparisonTable = () => {
	return (
		<div className="mx-auto w-full max-w-[943px] py-6 md:py-8 lg:py-12 px-4 text-white font-secondary">
			<div className="w-full">
				<table className="border-collapse w-full border-0 border-none">
					<thead>
						<tr>
							<CustomTh></CustomTh>
							<CustomTh>
								<MurmurHorizontalLogo className={LOGO_CN} pathClassName="fill-white" />
							</CustomTh>
							<CustomTh>
								<ChatGPTLogo className={LOGO_CN} />
							</CustomTh>
							<CustomTh>
								<MailchimpLogo className={LOGO_CN} pathClassName="fill-white" />
							</CustomTh>
						</tr>
					</thead>
					<tbody>
						{features.map((feature, index) => (
							<tr key={index}>
								<td
									className={`pt-2 md:pt-3 lg:pt-4 pr-1 sm:pr-4 md:pr-6 lg:pr-8 text-[9px] sm:text-[14px] md:text-[17px] lg:text-[20px] xl:text-[24px] border-r border-r-white break-words text-left font-secondary font-light xl:text-nowrap text-white ${TABLE_CELL_WIDTH}`}
								>
									{feature.label}
								</td>
								<CustomTd>{feature.murmur ? <CustomCheck /> : <CustomX />}</CustomTd>
								<CustomTd>{feature.chatgpt ? <CustomCheck /> : <CustomX />}</CustomTd>
								<CustomTd isLast>
									{feature.mailchimp ? <CustomCheck /> : <CustomX />}
								</CustomTd>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
