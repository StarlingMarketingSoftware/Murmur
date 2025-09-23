'use client';
import { useMe } from '@/hooks/useMe';
import { FC, ReactNode } from 'react';

interface MaintenanceScreenProps {
	children: ReactNode;
}

const MaintenanceScreen: FC<MaintenanceScreenProps> = ({ children }) => {
	const { user } = useMe();
	const isScheduledDowntime = process.env.NEXT_PUBLIC_SCHEDULED_DOWNTIME;
	const displayDowntime = isScheduledDowntime === 'true' && user?.role !== 'admin';

	if (displayDowntime) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
				<div className="max-w-md w-full bg-background rounded-lg shadow-xl p-8 text-center">
					<div className="mb-6">
						<div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg
								className="w-8 h-8 text-indigo-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
						<h1 className="text-2xl font-bold text-gray-900 mb-2">Murmur</h1>
						<h2 className="text-xl font-semibold text-gray-800 mb-4">
							System Maintenance
						</h2>
					</div>

					<div className="mb-6">
						<p className="text-gray-600 leading-relaxed">
							Murmur is undergoing a major update and will be inaccessible until{' '}
							<strong>noon, Eastern Time, on July 12th, 2025</strong>.
						</p>
					</div>

					<div className="bg-gray-50 rounded-lg p-4 mb-6">
						<p className="text-sm text-gray-500">
							We apologize for any inconvenience and appreciate your patience as we work
							to improve your experience.
						</p>
					</div>

					<div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>Expected downtime: ~2 hours</span>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
};

export default MaintenanceScreen;
