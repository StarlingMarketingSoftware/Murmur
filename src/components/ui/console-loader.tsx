import React, { useEffect, useState, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface ConsoleLoaderProps {
	className?: string;
	searchQuery?: string;
}

interface LogLine {
	id: number;
	text: string;
	type: 'process' | 'success' | 'info' | 'detail';
	timestamp: number;
	speed?: 'instant' | 'fast' | 'normal' | 'slow';
}

// Messages with varied lengths and complexity for visual rhythm
const messageSequences = [
	// Initial burst
	{ text: 'Initializing neural search pipeline...', delay: 100, type: 'process' },
	{ text: 'Allocating compute resources', delay: 50, type: 'info' },
	{ text: 'GPU memory allocated: 4.2GB VRAM on NVIDIA A100', delay: 80, type: 'detail' },
	
	// Thoughtful pause, then analysis
	{ text: 'Analyzing query semantics and extracting intent vectors from natural language input', delay: 800, type: 'process' },
	{ text: 'Tokenization complete', delay: 120, type: 'success' },
	
	// Quick succession
	{ text: 'Loading BERT-large-uncased model weights from cache', delay: 60, type: 'info' },
	{ text: 'Model loaded', delay: 40, type: 'success' },
	{ text: 'Warmup inference', delay: 30, type: 'detail' },
	
	// Longer technical operation
	{ text: 'Computing 768-dimensional embedding vectors using transformer architecture with 24 layers and 16 attention heads', delay: 600, type: 'process' },
	{ text: 'Embeddings generated successfully with cosine similarity threshold of 0.892', delay: 200, type: 'success' },
	
	// Database operations with detail
	{ text: 'Connecting to distributed PostgreSQL cluster across 12 shards', delay: 400, type: 'process' },
	{ text: 'Established connections to us-west-2a, us-west-2b, us-west-2c availability zones', delay: 150, type: 'detail' },
	{ text: 'Connection pool initialized: 128 connections, 12ms average latency', delay: 100, type: 'info' },
	
	// Search execution
	{ text: 'Executing parallel vector similarity search across 8.4 million indexed documents', delay: 700, type: 'process' },
	{ text: 'Scanning inverted index partitions', delay: 60, type: 'info' },
	{ text: 'Partition 1/8: 1,847 candidates', delay: 40, type: 'detail' },
	{ text: 'Partition 2/8: 2,103 candidates', delay: 40, type: 'detail' },
	{ text: 'Partition 3/8: 1,556 candidates', delay: 40, type: 'detail' },
	
	// Thoughtful processing
	{ text: 'Aggregating results and computing weighted relevance scores using gradient boosted trees', delay: 900, type: 'process' },
	{ text: 'Applied 147 feature transformations', delay: 200, type: 'info' },
	{ text: 'XGBoost model inference: 23ms', delay: 100, type: 'detail' },
	
	// Filtering phase
	{ text: 'Applying sophisticated filtering pipeline with custom business logic rules', delay: 500, type: 'process' },
	{ text: 'Email validation: checking MX records and SMTP handshake protocols', delay: 300, type: 'info' },
	{ text: 'Validated 3,847 addresses', delay: 150, type: 'success' },
	{ text: 'Removing bounced addresses from suppression list (last updated: 2 hours ago)', delay: 200, type: 'info' },
	{ text: 'Deduplication pass using SHA-256 hashing', delay: 180, type: 'process' },
	
	// Quality checks
	{ text: 'Running quality assurance checks on contact dataset integrity', delay: 600, type: 'process' },
	{ text: 'Verification status: 94.3% high confidence', delay: 200, type: 'success' },
	
	// Machine learning ranking
	{ text: 'Applying advanced ML ranking using ensemble of deep neural networks and random forests', delay: 800, type: 'process' },
	{ text: 'Feature extraction: 512 dimensional feature vectors computed', delay: 150, type: 'info' },
	{ text: 'Neural network forward pass: batch size 256', delay: 100, type: 'detail' },
	{ text: 'Softmax normalization applied', delay: 80, type: 'detail' },
	{ text: 'Ranking optimization complete with NDCG score of 0.917', delay: 300, type: 'success' },
	
	// Data enrichment
	{ text: 'Enriching contact profiles with real-time data from 17 external APIs', delay: 700, type: 'process' },
	{ text: 'LinkedIn data: fetched', delay: 60, type: 'detail' },
	{ text: 'Company information: fetched', delay: 60, type: 'detail' },
	{ text: 'Social presence: analyzed', delay: 60, type: 'detail' },
	{ text: 'Engagement metrics calculated using proprietary scoring algorithm', delay: 400, type: 'info' },
	
	// Final optimization
	{ text: 'Performing final optimization pass using simulated annealing algorithm', delay: 900, type: 'process' },
	{ text: 'Temperature parameter: 0.95 → 0.01 over 1000 iterations', delay: 200, type: 'detail' },
	{ text: 'Global optimum found at iteration 847', delay: 300, type: 'success' },
	
	// System metrics
	{ text: 'Performance metrics: 47ms p50, 89ms p95, 134ms p99 latency', delay: 400, type: 'info' },
	{ text: 'Cache hit ratio: 0.923 (saved 1.2 seconds)', delay: 150, type: 'detail' },
	{ text: 'Total operations executed: 1,847,293', delay: 100, type: 'detail' },
	
	// Preparing results
	{ text: 'Serializing response payload with gzip compression (68% size reduction)', delay: 500, type: 'process' },
	{ text: 'Streaming results initiated via WebSocket connection', delay: 200, type: 'info' },
	{ text: 'Transfer complete', delay: 150, type: 'success' },
];

// Function to get next delay - creates organic timing
const getNextDelay = (index: number): number => {
	if (index >= messageSequences.length) {
		index = index % messageSequences.length;
	}
	const baseDelay = messageSequences[index].delay;
	// Add some randomness to make it feel more organic
	const variation = Math.random() * 0.4 - 0.2; // ±20% variation
	return Math.floor(baseDelay * (1 + variation));
};

// Golden ratio for perfect proportions
const GOLDEN_RATIO = 1.618;
const INVERSE_GOLDEN = 0.618;

export function ConsoleLoader({ className, searchQuery }: ConsoleLoaderProps) {
	const [logs, setLogs] = useState<LogLine[]>([]);
	const [opsPerSec, setOpsPerSec] = useState(0);
	const [isThinking, setIsThinking] = useState(false);
	const logIdRef = useRef(0);
	const messageIndexRef = useRef(0);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Reset on query change
		setLogs([]);
		logIdRef.current = 0;
		messageIndexRef.current = 0;
		setOpsPerSec(Math.floor(Math.random() * 50000 + 20000));
		setIsThinking(false);

		const addNextMessage = () => {
			// Loop back when reaching the end
			if (messageIndexRef.current >= messageSequences.length) {
				messageIndexRef.current = 0;
			}

			const messageData = messageSequences[messageIndexRef.current];
			const text = messageData.text;
			
			// Occasionally show "thinking" state
			if (messageData.delay > 600) {
				setIsThinking(true);
				setTimeout(() => setIsThinking(false), messageData.delay - 100);
			}
			
			const newLog: LogLine = {
				id: logIdRef.current++,
				text,
				type: messageData.type as LogLine['type'],
				timestamp: Date.now(),
				speed: messageData.delay < 100 ? 'fast' : messageData.delay > 500 ? 'slow' : 'normal',
			};

			setLogs((prev) => {
				const updated = [...prev, newLog];
				// Keep 8 lines for golden ratio balance
				if (updated.length > 8) {
					return updated.slice(-8);
				}
				return updated;
			});

			messageIndexRef.current++;
			
			// Schedule next message with organic timing
			const nextDelay = getNextDelay(messageIndexRef.current);
			timeoutRef.current = setTimeout(addNextMessage, nextDelay);
		};

		// Start the sequence
		addNextMessage();

		// Fade out old messages
		const fadeInterval = setInterval(() => {
			setLogs((prev) => {
				const now = Date.now();
				return prev.filter((log) => now - log.timestamp < 5000);
			});
		}, 100);

		// Update ops/sec counter with variation
		const opsInterval = setInterval(() => {
			setOpsPerSec(prev => {
				// Organic fluctuation
				const change = Math.floor(Math.random() * 10000 - 5000);
				const newValue = prev + change;
				return Math.max(10000, Math.min(80000, newValue));
			});
		}, 1500);

		return () => {
			if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
			clearInterval(fadeInterval);
			clearInterval(opsInterval);
		};
	}, [searchQuery]);

	const getLogStyle = (log: LogLine) => {
		const age = Date.now() - log.timestamp;
		const fadeStart = 3000;
		const fadeEnd = 5000;
		const opacity = age < fadeStart ? 1 : Math.max(0, 1 - (age - fadeStart) / (fadeEnd - fadeStart));
		
		// Color based on type - subtle grays only
		let color = 'rgba(75, 85, 99, 0.8)'; // default gray-600
		switch (log.type) {
			case 'success':
				color = `rgba(45, 55, 72, ${opacity * 0.9})`; // darker gray
				break;
			case 'process':
				color = `rgba(26, 32, 44, ${opacity * 0.85})`; // near black
				break;
			case 'detail':
				color = `rgba(113, 128, 150, ${opacity * 0.6})`; // lighter gray
				break;
			case 'info':
				color = `rgba(74, 85, 104, ${opacity * 0.75})`; // medium gray
				break;
		}
		
		// Subtle entrance animation
		const isNew = age < 100;
		const translateY = isNew ? 1 : (age > 4000 ? -1 : 0);
		
		return {
			color,
			transform: `translateY(${translateY}px)`,
			opacity: isNew ? 0.8 : (age > 4500 ? 0 : 1),
			transition: `all ${isNew ? '0.2s' : '0.5s'} cubic-bezier(0.4, 0, 0.2, 1)`,
		};
	};

	// Golden ratio spacing: base unit 16px
	const baseUnit = 16;
	const goldenLarge = Math.round(baseUnit * GOLDEN_RATIO); // 26px
	const goldenSmall = Math.round(baseUnit * INVERSE_GOLDEN); // 10px

	return (
		<div className={twMerge('relative', className)}>
			{/* Main container with golden ratio padding */}
			<div style={{ 
				padding: `${goldenLarge * 2}px ${goldenLarge * 3}px`,
				minHeight: `${baseUnit * 21}px` // 21 is fibonacci number
			}}>
				{/* Console output area - slightly offset for visual interest */}
				<div 
					className="font-mono text-[13px] space-y-[2px]"
					style={{ 
						lineHeight: GOLDEN_RATIO,
						minHeight: `${baseUnit * 13}px`, // 13 is fibonacci number
						marginLeft: `${baseUnit * 5}px`, // Intentional asymmetry
						maxWidth: '90%' // Prevents edge-to-edge text
					}}
				>
					{logs.map((log) => (
						<div
							key={log.id}
							style={getLogStyle(log)}
						>
							<span 
								className="inline-block text-gray-400/60 mr-3"
								style={{ width: `${goldenSmall * 2}px` }}
							>
								{log.type === 'success' ? '✓' : 
								 log.type === 'process' ? '◆' : 
								 log.type === 'detail' ? '·' : '›'}
							</span>
							<span style={{ 
								letterSpacing: log.type === 'detail' ? '0.015em' : '0.005em',
								fontSize: log.type === 'detail' ? '12px' : '13px',
							}}>
								{log.text}
							</span>
						</div>
					))}
					
					{/* Thinking indicator or active cursor */}
					<div 
						className="text-gray-500"
						style={{ height: `${goldenSmall * 2}px` }}
					>
						{isThinking ? (
							<span className="text-gray-400 text-[11px]">
								<span 
									className="inline-block mr-3"
									style={{ width: `${goldenSmall * 2}px` }}
								>◆</span>
								<span className="opacity-50">Analyzing</span>
								<span className="inline-flex ml-2">
									{[...Array(3)].map((_, i) => (
										<span
											key={i}
											className="inline-block w-[2px] h-[2px] bg-gray-400/60 rounded-full mx-[1px]"
											style={{
												animation: 'thinking-pulse 1.4s ease-in-out infinite',
												animationDelay: `${i * 0.15}s`,
											}}
										/>
									))}
								</span>
							</span>
						) : (
							<>
								<span 
									className="inline-block mr-3"
									style={{ width: `${goldenSmall * 2}px` }}
								>›</span>
								<span 
									className="inline-block w-[2px] bg-gray-400"
									style={{
										height: `${Math.round(baseUnit * INVERSE_GOLDEN)}px`,
										animation: 'blink 1.2s steps(2, start) infinite'
									}}
								/>
							</>
						)}
					</div>
				</div>

				{/* Ultra-minimal progress indicator - positioned with golden ratio */}
				<div 
					className="flex justify-center"
					style={{ marginTop: `${goldenLarge}px` }}
				>
					<div className="flex items-center" style={{ gap: `${goldenLarge}px` }}>
						{/* Left indicator */}
						<div className="flex gap-[3px]">
							{[...Array(3)].map((_, i) => (
								<div
									key={i}
									className="w-[1.5px] h-[1.5px] bg-gray-300 rounded-full"
									style={{
										animation: 'gentle-fade 2.4s ease-in-out infinite',
										animationDelay: `${i * 0.2}s`,
									}}
								/>
							))}
						</div>
						
						{/* Center text */}
						<div 
							className="text-[10px] text-gray-400 font-mono tracking-wider uppercase"
							style={{ minWidth: `${baseUnit * 8}px` }}
						>
							<span className="tabular-nums">
								{(opsPerSec / 1000).toFixed(1)}k ops
							</span>
						</div>
						
						{/* Right indicator */}
						<div className="flex gap-[3px]">
							{[...Array(3)].map((_, i) => (
								<div
									key={i}
									className="w-[1.5px] h-[1.5px] bg-gray-300 rounded-full"
									style={{
										animation: 'gentle-fade 2.4s ease-in-out infinite',
										animationDelay: `${(2 - i) * 0.2}s`,
									}}
								/>
							))}
						</div>
					</div>
				</div>
			</div>


		</div>
	);
}

export default ConsoleLoader;