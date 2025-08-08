// scripts/generateVectorEmbeddings.ts
import fetch from 'node-fetch';
import XLSX from 'xlsx';
import { existsSync } from 'fs';
import { join } from 'path';

// Define the response type
interface GenerateEmbeddingsResponse {
	totalContacts: number;
	processedResults: Array<{
		contactId: string;
		status: 'success' | 'error';
		id?: string;
		error?: string;
	}>;
}

// Define the log entry type
interface LogEntry {
	timestamp: string;
	iteration: number;
	processed: string;
	totalContacts: number;
	successCount: number;
	errorCount: number;
	status: string;
}

// Excel file path
const EXCEL_FILE_PATH = join(process.cwd(), 'vector-embeddings-progress.xlsx');

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
export async function generateVectorEmbeddingsWithExcelLogging() {
	console.log(`Starting vector embeddings generation with Excel logging...`);
	console.log(`Progress will be saved to: ${EXCEL_FILE_PATH}`);

	let isComplete = false;
	let iteration = 1;
	const startTime = new Date();

	while (!isComplete) {
		console.log(`\n--- Starting iteration ${iteration}... ---`);

		const response = await fetch(
			'http://localhost:3000/api/vector-search/generate-embeddings',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					// Add your auth headers if needed
				},
			}
		);

		const result: GenerateEmbeddingsResponse =
			(await response.json()) as GenerateEmbeddingsResponse;

		const successCount = result.processedResults.filter(
			(r) => r.status === 'success'
		).length;
		const errorCount = result.processedResults.filter((r) => r.status === 'error').length;

		console.log(`Iteration ${iteration} complete:`);
		console.log(`- Processed: ${successCount}/${result.totalContacts}`);
		console.log(`- Errors: ${errorCount}`);
		console.log(`- Total contacts: ${result.totalContacts}`);

		// Create log entry
		const logEntry: LogEntry = {
			timestamp: new Date().toISOString(),
			iteration,
			processed: `${successCount}/${result.totalContacts}`,
			totalContacts: result.totalContacts,
			successCount,
			errorCount,
			status: result.totalContacts === 0 ? 'Complete' : 'In Progress',
		};

		// Save to Excel
		saveProgressToExcel(logEntry);

		// Completion logic - stop when no more contacts to process
		isComplete = result.totalContacts === 0;
		iteration++;

		// Optional: Add delay between iterations
		if (!isComplete) {
			console.log('Waiting 1 second before next iteration...');
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	const endTime = new Date();
	const totalDuration = (endTime.getTime() - startTime.getTime()) / 1000;

	console.log('\n=== VECTOR EMBEDDINGS GENERATION COMPLETE ===');
	console.log(`Total iterations: ${iteration - 1}`);
	console.log(`Total duration: ${totalDuration.toFixed(2)}s`);
	console.log(`Final progress saved to: ${EXCEL_FILE_PATH}`);
}

export async function generateVectorEmbeddings() {
	let isComplete = false;
	let iteration = 1;

	while (!isComplete) {
		console.log(`Starting iteration ${iteration}...`);

		const response = await fetch(
			'http://localhost:3000/api/vector-search/generate-embeddings',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					// Add your auth headers if needed
				},
			}
		);

		const result: GenerateEmbeddingsResponse =
			(await response.json()) as GenerateEmbeddingsResponse;

		const successCount = result.processedResults.filter(
			(r) => r.status === 'success'
		).length;
		const errorCount = result.processedResults.filter((r) => r.status === 'error').length;

		console.log(`Iteration ${iteration} complete:`);
		console.log(`- Processed: ${successCount}/${result.totalContacts}`);
		console.log(`- Errors: ${errorCount}`);

		// Completion logic - stop when no more contacts to process
		isComplete = result.totalContacts === 0;
		iteration++;

		// Optional: Add delay between iterations
		if (!isComplete) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	console.log('All vector embeddings generated!');
}

// Call the function if this script is run directly
// Use the Excel logging version by default
generateVectorEmbeddingsWithExcelLogging().catch(console.error);
