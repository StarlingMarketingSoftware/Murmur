import { FC } from 'react';
import SearchPanel from '@/components/atoms/_svg/SearchPanel';
import ContactsPanel from '@/components/atoms/_svg/ContactsPanel';
import WritingPanel from '@/components/atoms/_svg/WritingPanel';
import DraftsPanel from '@/components/atoms/_svg/DraftsPanel';
import SentPanel from '@/components/atoms/_svg/SentPanel';
import InboxPanel from '@/components/atoms/_svg/InboxPanel';
import { cn } from '@/utils';

interface CampaignRightPanelProps {
	className?: string;
	view?: 'search' | 'contacts' | 'testing' | 'drafting' | 'sent' | 'inbox' | 'all';
	onTabChange?: (tab: 'search' | 'contacts' | 'testing' | 'drafting' | 'sent' | 'inbox') => void;
}

export const CampaignRightPanel: FC<CampaignRightPanelProps> = ({ className, view, onTabChange }) => {
	// Position to the right of the rightmost panel based on view
	const getLeftPosition = () => {
		if (view === 'all') {
			// All view: 4 columns (330px each) + 3 gaps (30px) = 1410px total, centered
			// Right edge at 50% + 705px, so position at 50% + 705px + 39px
			return 'calc(50% + 744px)';
		}
		if (view === 'search') {
			// Search view: wider research panel (396px) at offset 384px + 32px
			return 'calc(50% + 384px + 32px + 396px + 20px)';
		}
		if (view === 'inbox') {
			// Inbox view: research panel (259px) at offset 453.5px + 32px
			return 'calc(50% + 453.5px + 32px + 259px + 20px)';
		}
		// Other views: standard research panel (375px) at offset 250px + 32px
		return 'calc(50% + 250px + 32px + 375px + 20px)';
	};
	
	const leftPosition = getLeftPosition();
	
	return (
		<div
			className={cn(
				'fixed top-[50px]',
				'pointer-events-none',
				'z-0',
				'overflow-visible',
				className
			)}
			style={{
				left: leftPosition,
			}}
		>
			<div className="relative flex flex-col items-center overflow-visible pt-[180px]">
				{/* Border box for All tab - centered around the 6 SVG icons */}
				{view === 'all' && (
					<div
						style={{
							position: 'absolute',
							top: '162px',
							left: '50%',
							transform: 'translateX(-50%)',
							width: '112px',
							height: '538px',
							backgroundColor: 'transparent',
							borderRadius: '8px',
							border: '2px solid #D0D0D0',
							zIndex: -1,
						}}
					/>
				)}
				<div 
					className="relative flex items-center justify-center pointer-events-auto cursor-pointer"
					onClick={() => onTabChange?.('search')}
				>
					{view === 'search' && (
						<div
							style={{
								position: 'absolute',
								width: '99px',
								height: '72px',
								backgroundColor: '#A6E2A8',
								borderRadius: '4px',
								border: '1px solid #000000',
							}}
						/>
					)}
					<SearchPanel style={{ display: 'block', position: 'relative', opacity: view === 'contacts' || view === 'testing' || view === 'drafting' || view === 'sent' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					className="relative flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('contacts')}
				>
					{view === 'contacts' && (
						<div
							style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -50%)',
								width: '99px',
								height: '72px',
								backgroundColor: '#A6E2A8',
								borderRadius: '4px',
								border: '1px solid #000000',
							}}
						/>
					)}
					<ContactsPanel style={{ display: 'block', position: 'relative', opacity: view === 'search' || view === 'testing' || view === 'drafting' || view === 'sent' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					className="relative flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('testing')}
				>
					{view === 'testing' && (
						<div
							style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -50%)',
								width: '99px',
								height: '72px',
								backgroundColor: '#A6E2A8',
								borderRadius: '4px',
								border: '1px solid #000000',
							}}
						/>
					)}
					<WritingPanel style={{ display: 'block', position: 'relative', opacity: view === 'search' || view === 'contacts' || view === 'drafting' || view === 'sent' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					className="relative flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('drafting')}
				>
					{view === 'drafting' && (
						<div
							style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -50%)',
								width: '99px',
								height: '72px',
								backgroundColor: '#A6E2A8',
								borderRadius: '4px',
								border: '1px solid #000000',
							}}
						/>
					)}
					<DraftsPanel style={{ display: 'block', position: 'relative', opacity: view === 'search' || view === 'contacts' || view === 'testing' || view === 'sent' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					className="relative flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('sent')}
				>
					{view === 'sent' && (
						<div
							style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -50%)',
								width: '99px',
								height: '72px',
								backgroundColor: '#A6E2A8',
								borderRadius: '4px',
								border: '1px solid #000000',
							}}
						/>
					)}
					<SentPanel style={{ display: 'block', position: 'relative', opacity: view === 'search' || view === 'contacts' || view === 'testing' || view === 'drafting' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					className="relative flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('inbox')}
				>
					{view === 'inbox' && (
						<div
							style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -50%)',
								width: '99px',
								height: '72px',
								backgroundColor: '#A6E2A8',
								borderRadius: '4px',
								border: '1px solid #000000',
							}}
						/>
					)}
					<InboxPanel style={{ display: 'block', position: 'relative', opacity: view === 'search' || view === 'contacts' || view === 'testing' || view === 'drafting' || view === 'sent' ? 0.3 : 1 }} />
				</div>
			</div>
		</div>
	);
};

