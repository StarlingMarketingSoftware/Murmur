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
	Table as TableType,
	Row,
} from '@tanstack/react-table';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dispatch,
	SetStateAction,
	useEffect,
	useState,
	useMemo,
	useCallback,
	useRef,
	ReactNode,
} from 'react';
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
	setSelectedRows?: ((rows: number[]) => void) | Dispatch<SetStateAction<number[]>>;
	singleSelection?: boolean;
	handleRowClick?: (rowData: TData) => void;
	isSelectable?: boolean;
	noDataMessage?: string;
	searchable?: boolean;
	initialSelectAll?: boolean;
	rowsPerPage?: number;
	displayRowsPerPage?: boolean;
	constrainHeight?: boolean;
	hidePagination?: boolean;
	headerAction?: ReactNode;
}

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
	tableRef?: (table: TableType<TData>) => void;
	useAutoLayout?: boolean;
	allowColumnOverflow?: boolean;
}

export function CustomTable<TData, TValue>({
	columns,
	data,
	setSelectedRows,
	singleSelection,
	handleRowClick,
	isSelectable = false,
	noDataMessage = 'No data was found.',
	variant = 'primary',
	searchable = true,
	tableRef,
	initialSelectAll = false,
	rowsPerPage = 20,
	displayRowsPerPage = true,
	constrainHeight = false,
	hidePagination = false,
	headerAction,
	useAutoLayout = false,
	allowColumnOverflow = false,
}: CustomTableProps<TData, TValue>) {
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: rowsPerPage,
	});

	// Track last clicked row original id for Shift+click range selection (stable across sorting/filtering)
	const lastClickedRowIdRef = useRef<string | number | null>(null);

	// Resolve a stable identifier for a row: prefer the domain `original.id`, fallback to TanStack `row.id`
	const getRowOriginalId = (r: Row<TData>): string | number => {
		const original = r.original as Record<string, unknown>;
		if (original && typeof original === 'object' && 'id' in original) {
			const value = (original as Record<string, unknown>).id as unknown;
			if (typeof value === 'string' || typeof value === 'number') {
				return value;
			}
		}
		return r.id;
	};

	// Initialize all rows as selected
	const getInitialRowSelection = useCallback(() => {
		if (!data || !isSelectable) return {};
		return data.reduce((acc, _, index) => {
			acc[index] = initialSelectAll;
			return acc;
		}, {} as Record<string, boolean>);
	}, [data, isSelectable, initialSelectAll]);

	const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState('');

	// Create a stable key for the data to detect changes
	const dataKey = useMemo(() => {
		if (!data) return 'no-data';
		return data.length + '-' + (data[0] ? JSON.stringify(Object.keys(data[0])) : '');
	}, [data]);

	// Reset table state when data changes (using dataKey to prevent infinite loops)
	useEffect(() => {
		if (data) {
			setRowSelection(getInitialRowSelection());
			setPagination({ pageIndex: 0, pageSize: rowsPerPage });
		}
	}, [dataKey, rowsPerPage, data, getInitialRowSelection]);

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

	// Add this effect to pass the table instance to parent
	useEffect(() => {
		setPagination((prev) => ({
			...prev,
			pageSize: rowsPerPage,
		}));
	}, [rowsPerPage]);

	useEffect(() => {
		if (tableRef) {
			tableRef(table);
		}
	}, [table, tableRef]);

	// Update parent component with selected rows
	useEffect(() => {
		if (setSelectedRows && isSelectable) {
			const selectedRowsData = table
				.getFilteredSelectedRowModel()
				.rows.map((row) => {
					const original = row.original as Record<string, unknown>;
					return 'id' in original && typeof original.id === 'number'
						? original.id
						: undefined;
				})
				.filter((id): id is number => id !== undefined);
			setSelectedRows(selectedRowsData);
		}
	}, [rowSelection, setSelectedRows, isSelectable, table]);

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

	return (
		<div className="w-full [&_::-webkit-scrollbar]:h-[4px] [&_::-webkit-scrollbar]:md:h-[7px] [&_::-webkit-scrollbar-thumb]:bg-gray-300 [&_::-webkit-scrollbar-thumb]:rounded-full [&_::-webkit-scrollbar]:w-[4px] [&_::-webkit-scrollbar]:md:w-[7px]">
			<div className="flex items-center justify-between py-4 gap-4 w-[1185px] max-w-full mx-auto">
				<div className="flex items-center gap-4 flex-wrap">
					{searchable && (
						<Input
							placeholder="Search all columns..."
							value={globalFilter ?? ''}
							onChange={(event) => setGlobalFilter(event.target.value)}
							className="min-w-[200px]"
						/>
					)}
					{displayRowsPerPage && (
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground text-nowrap">
								Rows per page:
							</span>
							<Select
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
							</Select>
						</div>
					)}
					{isSelectable && (
						<div className="text-sm text-muted-foreground">
							{table.getFilteredSelectedRowModel().rows.length} of{' '}
							{table.getFilteredRowModel().rows.length} rows selected.
						</div>
					)}
				</div>
				{isSelectable && headerAction ? headerAction : null}
			</div>
			<div
				className={cn(
					'border-2 border-black relative overflow-y-auto overflow-x-auto overscroll-contain custom-scrollbar w-[1185px] max-w-full mx-auto',
					constrainHeight && 'h-[429px]'
				)}
				tabIndex={0}
				style={{ WebkitOverflowScrolling: 'touch' }}
				onWheel={(e) => {
					const el = e.currentTarget;
					const canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight;
					const canScrollUp = el.scrollTop > 0;
					if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
						e.stopPropagation();
					}
				}}
			>
				<Table
					className={cn(
						'relative min-w-full',
						allowColumnOverflow ? 'w-max' : 'w-full',
						useAutoLayout ? 'table-auto' : 'table-fixed'
					)}
					variant={variant}
				>
					<TableHeader variant={variant} sticky>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow className="sticky top-0" key={headerGroup.id} variant={variant}>
								{headerGroup.headers.map((header) => {
									const totalColumns = headerGroup.headers.length;
									const columnWidth = `${100 / totalColumns}%`;
									return (
										<TableHead
											key={header.id}
											variant={variant}
											style={useAutoLayout ? undefined : { width: columnWidth }}
											className="whitespace-nowrap min-w-[120px]"
										>
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
									className={cn(
										(handleRowClick || (setSelectedRows && isSelectable)) &&
											'cursor-pointer'
									)}
									onMouseDown={(e) => {
										// Prevent text selection on shift-click
										if (e.shiftKey && isSelectable) {
											e.preventDefault();
										}
									}}
									onClick={(e) => {
										if (isSelectable) {
											const rows = table.getRowModel().rows as Row<TData>[];
											const rowOriginalId = getRowOriginalId(row as Row<TData>);
											const currentIndex = rows.findIndex(
												(r) => getRowOriginalId(r as Row<TData>) === rowOriginalId
											);
											const lastIndex =
												lastClickedRowIdRef.current !== null
													? rows.findIndex(
															(r) =>
																getRowOriginalId(r as Row<TData>) ===
																lastClickedRowIdRef.current
													  )
													: -1;

											if (e.shiftKey && lastIndex !== -1 && currentIndex !== -1) {
												// Prevent text selection on shift-click
												e.preventDefault();
												window.getSelection()?.removeAllRanges();

												const start = Math.min(currentIndex, lastIndex);
												const end = Math.max(currentIndex, lastIndex);

												// Clear all selections first, then select only the range
												const newSelection: Record<string, boolean> = {};
												for (let i = start; i <= end; i++) {
													newSelection[rows[i].id] = true;
												}
												setRowSelection(newSelection);
												// Keep the existing anchor on Shift-click (traditional behavior)
											} else {
												row.toggleSelected();
												lastClickedRowIdRef.current = rowOriginalId;
											}
										} else if (handleRowClick) {
											handleRowClick(row.original);
										}
									}}
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map((cell) => {
										const totalColumns = row.getVisibleCells().length;
										const columnWidth = `${100 / totalColumns}%`;
										return (
											<TableCell
												key={cell.id}
												variant={variant}
												style={useAutoLayout ? undefined : { width: columnWidth }}
												className="whitespace-nowrap min-w-[120px]"
											>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										);
									})}
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
			{!hidePagination && (
				<div className="w-[1185px] max-w-full mx-auto">
					<CustomPagination<TData> currentPage={pagination.pageIndex} table={table} />
				</div>
			)}
		</div>
	);
}

export default CustomTable;
