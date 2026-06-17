import * as React from 'react';

/**
 * Clock-with-counterclockwise-arrow "history / ledger" glyph. Vector lifted from the
 * campaign corner-pill design SVG; viewBox tightened around the clock so it renders as a
 * standalone icon. Uses currentColor so callers control the color.
 */
function HistoryLedgerIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			width={24}
			height={24}
			viewBox="18 4 26 26"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M33.8309 7.19388C28.2851 5.70784 22.5829 8.95053 21.1031 14.4578L20.7021 13.7713C20.48 13.391 19.9917 13.2628 19.6114 13.4849C19.2311 13.707 19.1029 14.1954 19.325 14.5756L20.69 16.9127C20.9105 17.2903 21.394 17.4198 21.7738 17.2031L24.1244 15.8616C24.5069 15.6434 24.64 15.1564 24.4218 14.7739C24.2035 14.3914 23.7165 14.2582 23.334 14.4765L22.6435 14.8705C23.8915 10.2286 28.7084 7.47237 33.4181 8.73436C38.1303 9.99696 40.9242 14.7966 39.6793 19.4429C38.4343 24.0891 33.6149 26.8489 28.9027 25.5862C26.1134 24.8388 23.9943 22.8509 22.9888 20.3864C22.8224 19.9786 22.357 19.783 21.9493 19.9494C21.5415 20.1157 21.3458 20.5811 21.5122 20.9889C22.6994 23.8989 25.202 26.2457 28.4899 27.1266C34.0382 28.6133 39.7429 25.3672 41.2198 19.8556C42.6966 14.3441 39.3792 8.68053 33.8309 7.19388Z"
				fill="currentColor"
			/>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M31.7178 12.908C31.7178 12.4676 31.3608 12.1106 30.9204 12.1106C30.4801 12.1106 30.123 12.4676 30.123 12.908V17.4911L33.0146 20.3826C33.3259 20.694 33.8308 20.694 34.1423 20.3826C34.4537 20.0713 34.4537 19.5664 34.1423 19.2549L31.7178 16.8305V12.908Z"
				fill="currentColor"
			/>
		</svg>
	);
}

export default HistoryLedgerIcon;
