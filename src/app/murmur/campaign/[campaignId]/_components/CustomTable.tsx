'use client';
import {
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
} from '@tanstack/react-table';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import CustomPagination from '@/components/CustomPagination';
import { Input } from '@/components/ui/input';

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[] | undefined;
	setSelectedRows?: ((rows: TData[]) => void) | Dispatch<SetStateAction<TData[]>>;
	singleSelection?: boolean;
	handleRowClick?: (rowData: TData) => void;
	noDataMessage?: string;
	initialRowSelectionState?: string[];
}

// https://ui.shadcn.com/docs/components/data-table
export function CustomTable<TData, TValue>({
	columns,
	data,
	setSelectedRows,
	singleSelection,
	handleRowClick,
	noDataMessage = 'No data was found.',
	initialRowSelectionState,
}: DataTableProps<TData, TValue>) {
	const getInitialRowSelection = () => {
		if (!initialRowSelectionState || !data) return {};
		console.log(
			'🚀 ~ getInitialRowSelection ~ initialRowSelectionState:',
			initialRowSelectionState
		);

		return data.reduce((acc, row, index) => {
			const isSelected = initialRowSelectionState.some(
				(selectedRow) => JSON.stringify(selectedRow) === JSON.stringify(row)
			);
			if (isSelected) {
				acc[index] = true;
			}
			return acc;
		}, {} as Record<string, boolean>);
	};

	const [rowSelection, setRowSelection] = useState(getInitialRowSelection());
	console.log('🚀 ~ rowSelection:', rowSelection);
	const [isInitialMount, setIsInitialMount] = useState(true);

	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState('');

	const table = useReactTable({
		data: data || [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		onRowSelectionChange: setRowSelection,
		enableMultiRowSelection: !singleSelection,
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: 'includesString',
		state: {
			sorting,
			columnFilters,
			rowSelection,
			globalFilter,
		},
	});

	const rowModel = table.getSelectedRowModel();

	useEffect(() => {
		// Only update selected rows if:
		// 1. It's not the initial mount, OR
		// 2. We have initial selection state
		if (!setSelectedRows) return;
		if (isInitialMount || initialRowSelectionState?.length) {
			setIsInitialMount(false);
			if (!singleSelection) {
				setSelectedRows(table.getSelectedRowModel().rows.map((row) => row.original));
			} else {
				const firstSelectedRow = table.getSelectedRowModel().rows[0];
				setSelectedRows(firstSelectedRow ? [firstSelectedRow.original] : []);
			}
		} else if (!isInitialMount) {
			if (!singleSelection) {
				setSelectedRows(table.getSelectedRowModel().rows.map((row) => row.original));
			} else {
				const firstSelectedRow = table.getSelectedRowModel().rows[0];
				setSelectedRows(firstSelectedRow ? [firstSelectedRow.original] : []);
			}
		}
	}, [rowModel, table, singleSelection]);

	// // Mark initial mount as complete after first render
	// useEffect(() => {
	// 	setIsInitialMount(false);
	// }, []);

	// // Reset isInitialMount when data changes
	// useEffect(() => {
	// 	if (data) {
	// 		setIsInitialMount(true);
	// 	}
	// }, [data]);

	return (
		<div>
			<div className="flex-1 text-sm text-muted-foreground">
				{table.getFilteredSelectedRowModel().rows.length} of{' '}
				{table.getFilteredRowModel().rows.length} contact rows selected.
			</div>
			<div className="flex items-center py-4">
				<Input
					placeholder="Search all columns..."
					value={globalFilter ?? ''}
					onChange={(event) => setGlobalFilter(event.target.value)}
					className="max-w-sm"
				/>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead className={twMerge()} key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									className={twMerge(
										(handleRowClick || setSelectedRows) && 'cursor-pointer'
									)}
									onClick={() => {
										if (!handleRowClick) {
											row.toggleSelected();
										} else {
											handleRowClick(row.original);
										}
									}}
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									{noDataMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<CustomPagination<TData> currentPage={0} table={table} />
		</div>
	);
}

export default CustomTable;
