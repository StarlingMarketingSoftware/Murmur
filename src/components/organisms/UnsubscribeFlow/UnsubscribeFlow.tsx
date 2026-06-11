'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useMe } from '@/hooks/useMe';
import {
	useSendDeletionCode,
	useVerifyDeletionCode,
} from '@/hooks/queryHooks/useAccountDeletion';
import { urls } from '@/constants/urls';

type UnsubscribeStep = 'confirm' | 'offer' | 'lastChance' | 'survey' | 'code';

const SURVEY_OPTIONS = [
	'Too expensive for me right now',
	"I wasn't getting enough replies",
	"The contacts weren't relevant enough",
	"There weren't enough contacts in my area",
	'I already contacted the people I needed',
	'Other',
];

const TEXT_BUTTON_CLASS =
	'cursor-pointer text-[17px] font-semibold transition-opacity hover:opacity-80';

// Multi-step unsubscribe flow rendered over the bare spinning-globe dashboard
// (the page hides its hero while ?unsubscribe=1 is set). Steps are in-memory;
// only flow entry/exit is URL-driven.
export function UnsubscribeFlow() {
	const router = useRouter();
	const [step, setStep] = useState<UnsubscribeStep>('confirm');
	// Lives here (not in SurveyStep) so Back from the code step keeps the selection.
	const [selectedReason, setSelectedReason] = useState<string | null>(null);
	const { user } = useMe();
	const { user: clerkUser } = useUser();
	const email = user?.email || clerkUser?.primaryEmailAddress?.emailAddress || '';
	const sendCode = useSendDeletionCode();
	const verifyCode = useVerifyDeletionCode();

	const exitFlow = useCallback(() => {
		router.replace(urls.murmur.dashboard.index, { scroll: false });
	}, [router]);

	const handleClaimOffer = useCallback(() => {
		// TODO(unsubscribe): apply the Stripe retention coupon ($15/mo for 2 months
		// for monthly subscribers) once the pricing wiring lands.
		exitFlow();
	}, [exitFlow]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') exitFlow();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [exitFlow]);

	if (typeof window === 'undefined') return null;

	return createPortal(
		// Transparent overlay (no dimming, like SettingsModal); outside click exits.
		<div
			className="fixed inset-0 z-[100000] flex items-center justify-center"
			style={{ pointerEvents: 'auto' }}
			onClick={exitFlow}
		>
			{step === 'confirm' && (
				<ConfirmStep onYes={() => setStep('offer')} onNo={exitFlow} />
			)}
			{step === 'offer' && (
				<OfferStep
					onClaimOffer={handleClaimOffer}
					onDeleteEverything={() => setStep('lastChance')}
				/>
			)}
			{step === 'lastChance' && (
				<LastChanceStep
					onKeepEverything={handleClaimOffer}
					onContinue={() => setStep('survey')}
				/>
			)}
			{step === 'survey' && (
				<SurveyStep
					selected={selectedReason}
					onSelect={setSelectedReason}
					onBack={() => setStep('lastChance')}
					onSubmit={() => {
						// Fire-and-forget; the Resend button covers send failures.
						sendCode.mutate();
						setStep('code');
					}}
				/>
			)}
			{step === 'code' && (
				<CodeStep
					email={email}
					isVerifying={verifyCode.isPending}
					onResend={() => sendCode.mutate()}
					onBack={() => setStep('survey')}
					onSubmit={(code) =>
						verifyCode.mutate(
							{ code },
							{
								onSuccess: () => {
									// TODO(unsubscribe): trigger the actual cancellation
									// (Stripe cancel + 30-day deletion mark) when that
									// endpoint lands; verification row is the proof.
									exitFlow();
								},
							}
						)
					}
				/>
			)}
		</div>,
		document.body
	);
}

// Shared centered box matching the Settings window geometry (607×789 outer,
// 27px header band, 589×755 inner panel), in a gray or green skin.
function FlowFrame({
	variant = 'gray',
	header,
	children,
}: {
	variant?: 'gray' | 'green';
	header?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div
			onClick={(e) => e.stopPropagation()}
			className={`flex h-[789px] w-[607px] flex-col rounded-[14.15px] border-[1.786px] border-black font-inter ${
				variant === 'green' ? 'bg-[#3A7D44]' : 'bg-[#949494]'
			}`}
		>
			<div className="flex h-[27px] shrink-0 items-center px-[16px]">{header}</div>
			<div
				className={`mx-auto h-[755px] w-[589px] overflow-hidden rounded-[14.15px] border-[1.786px] border-white ${
					variant === 'green' ? 'bg-[#E8F7E9]' : 'bg-[#424242]'
				}`}
			>
				{children}
			</div>
		</div>
	);
}

const SettingsHeader = () => (
	<span className="text-[17px] font-semibold leading-none text-black">Settings</span>
);

const BreadcrumbHeader = () => (
	<span className="text-[17px] leading-none text-black">
		<span className="font-semibold">Settings</span> &gt; Unsubscribe &gt; Confirmation
	</span>
);

function ConfirmStep({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
	return (
		<FlowFrame header={<SettingsHeader />}>
			<div className="flex flex-col px-[16px] py-[14px] text-white">
				<h2 className="text-[17px] font-semibold">Are You Sure?</h2>
				<div className="mt-[18px] flex items-center gap-[40px]">
					<button type="button" onClick={onYes} className={TEXT_BUTTON_CLASS}>
						Yes
					</button>
					<button type="button" onClick={onNo} className={TEXT_BUTTON_CLASS}>
						No
					</button>
				</div>
			</div>
		</FlowFrame>
	);
}

function OfferStep({
	onClaimOffer,
	onDeleteEverything,
}: {
	onClaimOffer: () => void;
	onDeleteEverything: () => void;
}) {
	return (
		<FlowFrame variant="green" header={null}>
			<div className="flex h-full flex-col px-[28px] py-[26px] text-black">
				<h2 className="text-[26px] font-bold leading-[1.4]">
					Wait, Dont throw it all away.
					<br />
					Keep everything for{' '}
					<span className="whitespace-nowrap rounded-[10px] border-[2px] border-black px-[8px] py-[2px]">
						$15/month
					</span>
				</h2>
				<p className="mt-[20px] text-[15.5px] font-semibold leading-[1.5]">
					Booking shows is seasonal, and budgets are real. Stay on and we&apos;ll cut
					your price to a quarter for the next 2 months with reduced usage to keep
					everything you&apos;ve worked hard to build here safe and sound.
				</p>
				<div className="mt-[20px] flex flex-col gap-[14px] text-[15.5px] font-bold">
					<p>You&apos;ll keep everything</p>
					<p>No need to worry about starting over</p>
					<p>Thats the last thing you need</p>
				</div>
				{/* TODO(unsubscribe): derive $60/$15 from the user's actual monthly plan
				    once the Stripe pricing wiring lands. */}
				<div className="mt-[26px] flex items-center justify-center gap-[14px] rounded-[14px] bg-[#9CD6A4] px-[20px] py-[18px]">
					<span className="text-[20px] font-semibold line-through opacity-70">
						$60/mo
					</span>
					<span className="text-[34px] font-bold">$15/mo</span>
					<span className="text-[15.5px] font-semibold">for your next 2 months</span>
				</div>
				<button
					type="button"
					onClick={onClaimOffer}
					className="mt-[26px] h-[110px] w-full cursor-pointer rounded-[14px] bg-[#57BD5F] text-[26px] font-bold text-white transition hover:brightness-95"
				>
					Claim Offer
				</button>
				<div className="mt-auto flex justify-center pb-[6px]">
					<button
						type="button"
						onClick={onDeleteEverything}
						className="cursor-pointer rounded-full bg-[#C9C9C9] px-[16px] py-[7px] text-[14px] font-semibold text-black/60 transition hover:bg-[#BDBDBD]"
					>
						Delete Everything and unsubscribe
					</button>
				</div>
			</div>
		</FlowFrame>
	);
}

function LastChanceStep({
	onKeepEverything,
	onContinue,
}: {
	onKeepEverything: () => void;
	onContinue: () => void;
}) {
	return (
		<FlowFrame header={<BreadcrumbHeader />}>
			<div className="flex h-full flex-col gap-[12px] px-[20px] py-[18px] text-[14.5px] font-semibold leading-[1.45] text-white">
				<p>So. It has come to this.</p>
				<p>
					You stand at the edge of the network, finger hovering over the button.
					Somewhere, a venue booker refreshes an inbox that will soon no longer exist.
				</p>
				<p>
					If you continue, your account will be marked for extinction. Your messages
					will be silenced.
				</p>
				<p>
					Your contacts will be scattered to the winds. Your opportunities will wither
					on the vine, unwatered, unloved.
				</p>
				<p>Your replies will arrive at an empty mailbox like letters to a ghost town.</p>
				<p>
					The venues will not mourn you. Venues feel nothing. But your saved lists —
					100,000 doors you could have knocked on — will be swallowed by the void,
					along with your inbox history, your drafts, your folders, and that one really
					good email template you spent an hour on.
				</p>
				<div className="mt-auto rounded-[14px] bg-[#B5B5B5] p-[16px] text-black">
					<p className="text-[13.5px] font-semibold leading-[1.4]">
						Okay, real talk for one second: unsubscribing stops billing immediately and
						permanently deletes your account data after 30 days. If you want to keep it
						all, consider downgrading to effectively pause but keep all the messages
						coming in.
					</p>
					<button
						type="button"
						onClick={onKeepEverything}
						className="mt-[14px] h-[48px] w-full cursor-pointer rounded-[12px] bg-[#57BD5F] text-[16px] font-bold text-white transition hover:brightness-95"
					>
						Keep Everything and Downgrade to 15/mo
					</button>
				</div>
				<div className="flex justify-center pb-[2px] pt-[4px]">
					<button
						type="button"
						onClick={onContinue}
						className="cursor-pointer rounded-full border-[1.786px] border-white/70 px-[18px] py-[8px] text-[14px] font-semibold text-white/80 transition hover:bg-white/10"
					>
						Delete Everything and Unsubscribe
					</button>
				</div>
			</div>
		</FlowFrame>
	);
}

function SurveyStep({
	selected,
	onSelect,
	onBack,
	onSubmit,
}: {
	selected: string | null;
	onSelect: (reason: string) => void;
	onBack: () => void;
	onSubmit: () => void;
}) {
	return (
		<FlowFrame header={<BreadcrumbHeader />}>
			<div className="flex h-full flex-col px-[20px] py-[18px] text-white">
				<p className="text-[15.5px] font-semibold">
					please fill out this survey to let us know why you&apos;re leaving
				</p>
				<div className="mt-[26px] flex flex-col gap-[14px]">
					{SURVEY_OPTIONS.map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => onSelect(option)}
							className={`h-[52px] w-full cursor-pointer rounded-[12px] px-[16px] text-left text-[15.5px] font-semibold text-black transition-colors ${
								selected === option ? 'bg-[#D9D9D9]' : 'bg-[#6B6B6B] hover:bg-[#7A7A7A]'
							}`}
						>
							{option}
						</button>
					))}
				</div>
				<div className="relative mt-auto flex items-center justify-center pb-[6px]">
					<button
						type="button"
						onClick={onBack}
						className={`absolute left-0 ${TEXT_BUTTON_CLASS} text-[15.5px]`}
					>
						←Back
					</button>
					<button
						type="button"
						onClick={onSubmit}
						disabled={!selected}
						className={`${TEXT_BUTTON_CLASS} disabled:cursor-default disabled:opacity-50`}
					>
						Submit
					</button>
				</div>
			</div>
		</FlowFrame>
	);
}

function CodeStep({
	email,
	isVerifying,
	onResend,
	onBack,
	onSubmit,
}: {
	email: string;
	isVerifying: boolean;
	onResend: () => void;
	onBack: () => void;
	onSubmit: (code: string) => void;
}) {
	const [code, setCode] = useState('');

	// Override the shadcn slot's joined-boxes look into separate gray squares.
	// border-0/first:border-0 and the first:/last: rounded overrides are required —
	// twMerge only merges classes per modifier prefix.
	const OTP_SLOT_CLASS =
		'h-[64px] w-[64px] rounded-[10px] border-0 first:border-0 first:rounded-[10px] ' +
		'last:rounded-[10px] bg-[#D9D9D9] text-[26px] font-semibold text-black ' +
		'data-[active=true]:outline data-[active=true]:outline-2 data-[active=true]:outline-white';

	return (
		<FlowFrame header={<BreadcrumbHeader />}>
			<div className="flex h-full flex-col px-[20px] py-[18px] text-white">
				<p className="text-[15.5px] font-semibold leading-[1.45]">
					Deleting your account is permanent. We need to know its really you.
				</p>
				<p className="mt-[22px] break-all text-[15.5px] font-semibold">{email}</p>
				<p className="mt-[34px] text-[15.5px] font-semibold">
					Enter the code we sent to your email
				</p>
				<div className="mt-[18px] w-fit">
					<InputOTP
						maxLength={6}
						value={code}
						onChange={setCode}
						pattern={REGEXP_ONLY_DIGITS}
						containerClassName="gap-[14px]"
					>
						<InputOTPGroup className="gap-[14px]">
							{[0, 1, 2, 3, 4, 5].map((index) => (
								<InputOTPSlot key={index} index={index} className={OTP_SLOT_CLASS} />
							))}
						</InputOTPGroup>
					</InputOTP>
					<div className="mt-[14px] flex justify-end">
						<button
							type="button"
							onClick={onResend}
							className={`${TEXT_BUTTON_CLASS} text-[15.5px]`}
						>
							Resend
						</button>
					</div>
				</div>
				<div className="relative mt-auto flex items-center justify-center pb-[6px]">
					<button
						type="button"
						onClick={onBack}
						className={`absolute left-0 ${TEXT_BUTTON_CLASS} text-[15.5px]`}
					>
						←Back
					</button>
					<button
						type="button"
						onClick={() => onSubmit(code)}
						disabled={code.length < 6 || isVerifying}
						className={`${TEXT_BUTTON_CLASS} disabled:cursor-default disabled:opacity-50`}
					>
						{isVerifying ? 'Verifying…' : 'Submit'}
					</button>
				</div>
			</div>
		</FlowFrame>
	);
}
