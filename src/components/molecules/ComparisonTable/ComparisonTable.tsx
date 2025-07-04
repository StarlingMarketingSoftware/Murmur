import { MurmurHorizontalLogo } from '@/components/atoms/_svg/MurmurHorizontalLogo';
import { ChatGPTLogo } from '@/components/atoms/_svg/ChatGPTLogo';
import { MailchimpLogo } from '@/components/atoms/_svg/MailChimpLogo';
import { Check, X } from 'lucide-react';
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

const LOGO_WIDTH = '225px';
const LOGO_HEIGHT = '100px';

const CustomCheck = () => {
	return <Check className="mx-auto text-primary stroke-4 stroke-primary" size={75} />;
};

const CustomX = () => {
	return <X className="mx-auto text-destructive stroke-4 stroke-destructive" size={75} />;
};

const CustomTd = ({ children }: { children: ReactNode }) => {
	return (
		<td className="py-4 border-r-2 text-center border-r-foreground max-w-[250px]">
			{children}
		</td>
	);
};

const CustomTh = ({ children }: { children?: ReactNode }) => {
	return <th className="p-4 w-[250px]">{children}</th>;
};

export const ComparisonTable = () => {
	return (
		<div className="mx-auto flex justify-center">
			<table className="border-collapse w-fit">
				<thead>
					<tr className="">
						<CustomTh></CustomTh>
						<CustomTh>
							<MurmurHorizontalLogo
								className="fill-black mx-auto"
								height={LOGO_HEIGHT}
								width={LOGO_WIDTH}
							/>
						</CustomTh>
						<CustomTh>
							<ChatGPTLogo
								className="fill-black mx-auto"
								height={LOGO_HEIGHT}
								width={LOGO_WIDTH}
							/>
						</CustomTh>
						<CustomTh>
							<MailchimpLogo
								className="fill-black mx-auto"
								height={LOGO_HEIGHT}
								width={LOGO_WIDTH}
							/>
						</CustomTh>
					</tr>
				</thead>
				<tbody>
					{features.map((feature, index) => (
						<tr key={index}>
							<td className="pt-4 pr-8 text-[34px] font-primary border-r-2 border-r-foreground border-t-transparent text-nowrap text-center w-[250px]">
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
