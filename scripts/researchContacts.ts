// scripts/researchContacts.tsx
import fetch from 'node-fetch';
import XLSX from 'xlsx';
import { existsSync } from 'fs';
import { join } from 'path';

// Define the response type
interface ResearchContactsResponse {
	successCount: number;
	totalCount: number;
	runningTime: number;
	perplexityTokensUsed?: number;
	remainingUnresearched?: number;
	isComplete?: boolean;
}

// Define the log entry type
interface LogEntry {
	timestamp: string;
	iteration: number;
	processed: string;
	totalCount: number;
	runningTime: number;
	perplexityTokensUsed?: number;
	remainingUnresearched?: number;
	isComplete: boolean;
	status: string;
}

// Excel file path
const EXCEL_FILE_PATH = join(process.cwd(), 'research-contacts-progress.xlsx');

// Function to save progress to Excel
function saveProgressToExcel(logEntry: LogEntry) {
	try {
		let workbook: XLSX.WorkBook;
		let worksheet: XLSX.WorkSheet;

		// Check if file exists
		if (existsSync(EXCEL_FILE_PATH)) {
			// Load existing workbook
			workbook = XLSX.readFile(EXCEL_FILE_PATH);
			worksheet =
				workbook.Sheets['Research Progress'] || workbook.Sheets[workbook.SheetNames[0]];
		} else {
			// Create new workbook
			workbook = XLSX.utils.book_new();
			worksheet = XLSX.utils.json_to_sheet([]);
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Research Progress');
		}

		// Convert worksheet to JSON to add new entry
		const existingData: LogEntry[] = XLSX.utils.sheet_to_json(worksheet);
		existingData.push(logEntry);

		// Create new worksheet with updated data
		const newWorksheet = XLSX.utils.json_to_sheet(existingData);

		// Replace the worksheet in the workbook
		workbook.Sheets['Research Progress'] = newWorksheet;

		// Write to file
		XLSX.writeFile(workbook, EXCEL_FILE_PATH);

		console.log(`✓ Progress saved to ${EXCEL_FILE_PATH}`);
	} catch (error) {
		console.error('Error saving to Excel:', error);
	}
}

// Wrapper function that saves progress to Excel
export async function researchContactsWithExcelLogging() {
	console.log(`Starting research contacts with Excel logging...`);
	console.log(`Progress will be saved to: ${EXCEL_FILE_PATH}`);

	let isComplete = false;
	let iteration = 1;
	const startTime = new Date();

	while (!isComplete) {
		console.log(`\n--- Starting iteration ${iteration}... ---`);

		const response = await fetch(
			'http://localhost:3000/api/contacts/management/research-contacts',
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					// Add your auth headers if needed
				},
			}
		);

		const result: ResearchContactsResponse =
			(await response.json()) as ResearchContactsResponse;

		console.log(`Iteration ${iteration} complete:`);
		console.log(`- Processed: ${result.successCount}/${result.totalCount}`);
		console.log(`- Time: ${result.runningTime}s`);
		console.log(`- Perplexity tokens used: ${result.perplexityTokensUsed}`);
		console.log(`- Remaining unresearched: ${result.remainingUnresearched}`);

		// Create log entry
		const logEntry: LogEntry = {
			timestamp: new Date().toISOString(),
			iteration,
			processed: `${result.successCount}/${result.totalCount}`,
			totalCount: result.totalCount,
			runningTime: result.runningTime,
			perplexityTokensUsed: result.perplexityTokensUsed,
			remainingUnresearched: result.remainingUnresearched,
			isComplete: result.isComplete || false,
			status: result.isComplete ? 'Complete' : 'In Progress',
		};

		// Save to Excel
		saveProgressToExcel(logEntry);

		// Fix the completion logic
		isComplete =
			result.totalCount === 0 || result.isComplete || result.remainingUnresearched === 0;
		iteration++;

		// Optional: Add delay between iterations
		if (!isComplete) {
			console.log('Waiting 1 second before next iteration...');
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	const endTime = new Date();
	const totalDuration = (endTime.getTime() - startTime.getTime()) / 1000;

	console.log('\n=== RESEARCH COMPLETE ===');
	console.log(`Total iterations: ${iteration - 1}`);
	console.log(`Total duration: ${totalDuration.toFixed(2)}s`);
	console.log(`Final progress saved to: ${EXCEL_FILE_PATH}`);
}

export async function researchContacts() {
	let isComplete = false;
	let iteration = 1;

	while (!isComplete) {
		console.log(`Starting iteration ${iteration}...`);

		const response = await fetch(
			'http://localhost:3000/api/contacts/management/research-contacts',
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					// Add your auth headers if needed
				},
			}
		);

		const result: ResearchContactsResponse =
			(await response.json()) as ResearchContactsResponse;

		console.log(`Iteration ${iteration} complete:`);
		console.log(`- Processed: ${result.successCount}/${result.totalCount}`);
		console.log(`- Time: ${result.runningTime}s`);
		console.log(`- Perplexity tokens used: ${result.perplexityTokensUsed}`);

		// Fix the completion logic
		isComplete =
			result.totalCount === 0 || result.isComplete || result.remainingUnresearched === 0;
		iteration++;

		// Optional: Add delay between iterations
		if (!isComplete) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	console.log('All contacts processed!');
}

// Call the function if this script is run directly
// Use the Excel logging version by default
researchContactsWithExcelLogging().catch(console.error);
