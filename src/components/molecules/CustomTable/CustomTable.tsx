'use client';
import {
	Column,
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
import CustomPagination from '@/components/molecules/CustomPagination/CustomPagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[] | undefined;
	setSelectedRows?: ((rows: TData[]) => void) | Dispatch<SetStateAction<TData[]>>;
	singleSelection?: boolean;
	handleRowClick?: (rowData: TData) => void;
	isSelectable?: boolean;
	noDataMessage?: string;
	initialRowSelectionState?: string[];
	searchable?: boolean;
}

// https://ui.shadcn.com/docs/components/data-table
interface TableSortingButtonProps<TData> {
	column: Column<TData, unknown>;
	label: string;
}

import { cn } from '@/utils';

interface NoDataCellProps {
	className?: string;
}

export const NoDataCell = ({ className }: NoDataCellProps) => {
	return (
		<span className={cn('text-muted-foreground text-sm italic', className)}>No data</span>
	);
};

export function TableSortingButton<TData>({
	column,
	label,
}: TableSortingButtonProps<TData>) {
	return (
		<Button
			noPadding
			variant="ghost"
			className="!max-w-fit !w-fit hover:opacity-70"
			onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
		>
			{label}
			<ArrowUpDown className="h-4 w-4" />
		</Button>
	);
}

interface CustomTableProps<TData, TValue> extends DataTableProps<TData, TValue> {
	variant?: 'primary' | 'secondary';
}

export function CustomTable<TData, TValue>({
	columns,
	data,
	setSelectedRows,
	singleSelection,
	handleRowClick,
	isSelectable = false,
	noDataMessage = 'No data was found.',
	initialRowSelectionState,
	variant = 'primary',
	searchable = true,
}: CustomTableProps<TData, TValue>) {
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	});

	const getInitialRowSelection = () => {
		if (!initialRowSelectionState || !data || !isSelectable) return {};

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
		onPaginationChange: setPagination,
		autoResetPageIndex: false,
		enableRowSelection: isSelectable,
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: 'includesString',
		state: {
			sorting,
			columnFilters,
			rowSelection,
			globalFilter,
			pagination,
		},
	});

	useEffect(() => {
		if (!data) return;

		const totalPages = Math.ceil(data.length / pagination.pageSize);
		const currentPage = pagination.pageIndex;

		// If we're on a page that no longer exists, go to the last available page
		if (currentPage > 0 && currentPage >= totalPages) {
			setPagination((prev) => ({
				...prev,
				pageIndex: Math.max(0, totalPages - 1),
			}));
		}
	}, [pagination.pageIndex, pagination.pageSize, data]);

	useEffect(() => {
		if (!setSelectedRows || !data || !isSelectable) return;

		const updateSelectedRows = () => {
			const selectedRows = table.getSelectedRowModel().rows;
			if (!singleSelection) {
				setSelectedRows(selectedRows.map((row) => row.original));
			} else {
				const firstSelectedRow = selectedRows[0];
				setSelectedRows(firstSelectedRow ? [firstSelectedRow.original] : []);
			}
		};

		if (isInitialMount || initialRowSelectionState?.length) {
			setIsInitialMount(false);
			updateSelectedRows();
		} else if (!isInitialMount) {
			updateSelectedRows();
		}
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, [
		setSelectedRows,
		rowSelection,
		data,
		singleSelection,
		isInitialMount,
		initialRowSelectionState,
	]);

	return (
		<div>
			<div className="flex items-center justify-between py-4">
				<div className="flex items-center gap-4">
					{searchable && (
						<Input
							placeholder="Search all columns..."
							value={globalFilter ?? ''}
							onChange={(event) => setGlobalFilter(event.target.value)}
							className="max-w-sm"
						/>
					)}
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Rows per page:</span>
						{/* <Select
							value={pagination.pageSize.toString()}
							onValueChange={(value) =>
								setPagination((prev) => ({ ...prev, pageSize: parseInt(value, 10) }))
							}
						>
							<SelectTrigger className="w-[100px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[10, 20, 30, 50, 100, 200, 500, 1000].map((size) => (
									<SelectItem key={size} value={size.toString()}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select> */}
					</div>
				</div>
				{isSelectable && (
					<div className="flex-1 text-sm text-muted-foreground">
						{table.getFilteredSelectedRowModel().rows.length} of{' '}
						{table.getFilteredRowModel().rows.length} rows selected.
					</div>
				)}
			</div>
			<div className="rounded-md border">
				<Table variant={variant}>
					<TableHeader variant={variant}>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} variant={variant}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead className={twMerge()} key={header.id} variant={variant}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody variant={variant}>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									variant={variant}
									className={twMerge(
										(handleRowClick || (setSelectedRows && isSelectable)) &&
											'cursor-pointer'
									)}
									onClick={() => {
										if (isSelectable) {
											row.toggleSelected();
										} else if (handleRowClick) {
											handleRowClick(row.original);
										}
									}}
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} variant={variant}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow variant={variant}>
								<TableCell
									variant={variant}
									colSpan={columns.length}
									className="h-24 text-center"
								>
									{noDataMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<CustomPagination<TData> currentPage={pagination.pageIndex} table={table} />
		</div>
	);
}

export default CustomTable;
