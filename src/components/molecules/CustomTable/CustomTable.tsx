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
	headerInlineAction?: ReactNode;
}

interface TableSortingButtonProps<TData> {
	column: Column<TData, unknown>;
	label: string;
}

import { cn } from '@/utils';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
// import { ScrollArea } from '@/components/ui/scroll-area';

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
	containerClassName?: string;
	tableClassName?: string;
	headerClassName?: string;
	theadCellClassName?: string;
	rowClassName?: string;
	useCustomScrollbar?: boolean;
	scrollbarOffsetRight?: number;
	onRowHover?: (rowData: TData | null) => void;
	onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
	nativeScroll?: boolean;
	stickyHeader?: boolean;
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
	headerInlineAction,
	useAutoLayout = false,
	allowColumnOverflow = false,
	containerClassName,
	tableClassName,
	headerClassName,
	theadCellClassName,
	rowClassName,
	useCustomScrollbar = false,
	scrollbarOffsetRight = -4,
	onRowHover,
	onScroll,
	nativeScroll,
	stickyHeader = true,
}: CustomTableProps<TData, TValue>) {
	type ColumnDefWithSize = ColumnDef<TData, TValue> & { size?: number };
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

	const showInContainerHeader = isSelectable && useCustomScrollbar;
	const hasToolbarContent =
		searchable ||
		displayRowsPerPage ||
		Boolean(headerAction) ||
		Boolean(headerInlineAction);

	return (
		<div className="w-full">
			{!showInContainerHeader && hasToolbarContent && (
				<div
					className={cn(
						'relative z-[70] flex items-end justify-between pt-2 pb-1 gap-4 w-full max-w-full mx-auto',
						tableClassName
					)}
				>
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
					</div>
					{isSelectable && headerAction ? (
						<div className="flex flex-col items-end gap-0">
							<div className="text-[14px] font-secondary font-normal text-black">
								{table.getFilteredSelectedRowModel().rows.length} of{' '}
								{table.getFilteredRowModel().rows.length} rows selected
							</div>
							{headerAction}
						</div>
					) : null}
				</div>
			)}
			{useCustomScrollbar ? (
				<CustomScrollbar
					className={cn(
						'border-2 border-black w-full max-w-full mx-auto',
						containerClassName
					)}
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={scrollbarOffsetRight}
					onScroll={onScroll}
					nativeScroll={nativeScroll}
				>
					<div className="min-w-full">
						{showInContainerHeader && (
							<div className="sticky top-0 z-10 bg-[#EBF5FB] px-4 py-2 rounded-t-[8px]">
								<div className="relative h-[32px] flex items-center">
									{/* Left: Select all / Deselect All */}
									{headerAction ? (
										<div className="absolute left-0 top-0 bottom-0 flex items-center">
											{headerAction}
										</div>
									) : null}

									{/* Centered selected count */}
									<div className="w-full text-center text-[14px] font-secondary text-black">
										{table.getFilteredSelectedRowModel().rows.length} selected
									</div>

									{/* Right: Create Campaign (inline action) */}
									{headerInlineAction ? (
										<div className="absolute right-0 top-0 bottom-0 flex items-center gap-3">
											{headerInlineAction}
										</div>
									) : null}
								</div>
							</div>
						)}
						<Table
							className={cn(
								'relative',
								!tableClassName && 'min-w-full',
								!tableClassName && (allowColumnOverflow ? 'w-max' : 'w-full'),
								useAutoLayout ? 'table-auto' : 'table-fixed',
								tableClassName
							)}
							variant={variant}
						>
							<TableHeader
								variant={variant}
								sticky={stickyHeader && !showInContainerHeader}
								className={cn(headerClassName)}
							>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										className={cn(
											stickyHeader && !showInContainerHeader
												? 'sticky top-0 border-0'
												: 'border-0'
										)}
										key={headerGroup.id}
										variant={variant}
									>
										{headerGroup.headers.map((header, headerIndex) => {
											const totalColumns = headerGroup.headers.length;
											const fallbackWidth = `${100 / totalColumns}%`;
											const defSize = (header.column.columnDef as ColumnDefWithSize)
												?.size;
											const headerSize = header.column.getSize
												? header.column.getSize()
												: undefined;
											return (
												<TableHead
													key={header.id}
													variant={variant}
													style={
														useAutoLayout
															? undefined
															: {
																	width:
																		defSize && defSize > 0
																			? `${defSize}px`
																			: headerSize && headerSize > 0
																			? `${headerSize}px`
																			: fallbackWidth,
																	minWidth:
																		defSize && defSize > 0 ? `${defSize}px` : undefined,
																	maxWidth:
																		defSize && defSize > 0 ? `${defSize}px` : undefined,
															  }
													}
													className={cn(
														'whitespace-nowrap',
														theadCellClassName,
														isSelectable &&
															headerInlineAction &&
															headerIndex === headerGroup.headers.length - 1 &&
															'relative'
													)}
												>
													{header.isPlaceholder ? null : (
														<>
															{flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
															{isSelectable &&
															headerInlineAction &&
															headerIndex === headerGroup.headers.length - 1 &&
															!showInContainerHeader ? (
																<div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-auto">
																	{headerInlineAction}
																</div>
															) : null}
														</>
													)}
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
													'cursor-pointer',
												rowClassName
											)}
											data-campaign-id={
												(row.original as Record<string, unknown>)?.id || undefined
											}
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

														const newSelection: Record<string, boolean> = {};
														for (let i = start; i <= end; i++) {
															newSelection[rows[i].id] = true;
														}
														setRowSelection(newSelection);
													} else {
														row.toggleSelected();
														lastClickedRowIdRef.current = rowOriginalId;
													}
												} else if (handleRowClick) {
													handleRowClick(row.original);
												}
											}}
											onMouseEnter={() => onRowHover && onRowHover(row.original)}
											onMouseLeave={() => onRowHover && onRowHover(null)}
											key={row.id}
											data-state={row.getIsSelected() && 'selected'}
										>
											{row.getVisibleCells().map((cell) => {
												const totalColumns = row.getVisibleCells().length;
												const fallbackWidth = `${100 / totalColumns}%`;
												const defSize = (cell.column.columnDef as ColumnDefWithSize)
													?.size;
												const cellSize = cell.column.getSize
													? cell.column.getSize()
													: undefined;
												return (
													<TableCell
														key={cell.id}
														variant={variant}
														style={
															useAutoLayout
																? undefined
																: {
																		width:
																			defSize && defSize > 0
																				? `${defSize}px`
																				: cellSize && cellSize > 0
																				? `${cellSize}px`
																				: fallbackWidth,
																		minWidth:
																			defSize && defSize > 0 ? `${defSize}px` : undefined,
																		maxWidth:
																			defSize && defSize > 0 ? `${defSize}px` : undefined,
																  }
														}
														className="whitespace-nowrap"
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
				</CustomScrollbar>
			) : (
				<div
					className={cn(
						'border-2 border-black rounded-[8px] relative overflow-y-auto overflow-x-hidden overscroll-contain w-full max-w-full mx-auto',
						constrainHeight && 'h-[429px]',
						containerClassName
					)}
					tabIndex={0}
					style={{ WebkitOverflowScrolling: 'touch' }}
					onScroll={onScroll}
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
							'relative',
							!tableClassName && 'min-w-full',
							!tableClassName && (allowColumnOverflow ? 'w-max' : 'w-full'),
							useAutoLayout ? 'table-auto' : 'table-fixed',
							tableClassName
						)}
						variant={variant}
					>
						<TableHeader
							variant={variant}
							sticky={stickyHeader}
							className={cn(headerClassName)}
						>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow
									className={cn(stickyHeader ? 'sticky top-0 border-0' : 'border-0')}
									key={headerGroup.id}
									variant={variant}
								>
									{headerGroup.headers.map((header, headerIndex) => {
										const totalColumns = headerGroup.headers.length;
										const fallbackWidth = `${100 / totalColumns}%`;
										const defSize = (header.column.columnDef as ColumnDefWithSize)?.size;
										const headerSize = header.column.getSize
											? header.column.getSize()
											: undefined;
										return (
											<TableHead
												key={header.id}
												variant={variant}
												style={
													useAutoLayout
														? undefined
														: {
																width:
																	defSize && defSize > 0
																		? `${defSize}px`
																		: headerSize && headerSize > 0
																		? `${headerSize}px`
																		: fallbackWidth,
																minWidth:
																	defSize && defSize > 0 ? `${defSize}px` : undefined,
																maxWidth:
																	defSize && defSize > 0 ? `${defSize}px` : undefined,
														  }
												}
												className={cn(
													'whitespace-nowrap',
													theadCellClassName,
													isSelectable &&
														headerInlineAction &&
														headerIndex === headerGroup.headers.length - 1 &&
														'relative'
												)}
											>
												{header.isPlaceholder ? null : (
													<>
														{flexRender(
															header.column.columnDef.header,
															header.getContext()
														)}
														{isSelectable &&
														headerInlineAction &&
														headerIndex === headerGroup.headers.length - 1 ? (
															<div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-auto">
																{headerInlineAction}
															</div>
														) : null}
													</>
												)}
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
												'cursor-pointer',
											rowClassName
										)}
										data-campaign-id={
											(row.original as Record<string, unknown>)?.id || undefined
										}
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

													const newSelection: Record<string, boolean> = {};
													for (let i = start; i <= end; i++) {
														newSelection[rows[i].id] = true;
													}
													setRowSelection(newSelection);
												} else {
													row.toggleSelected();
													lastClickedRowIdRef.current = rowOriginalId;
												}
											} else if (handleRowClick) {
												handleRowClick(row.original);
											}
										}}
										onMouseEnter={() => onRowHover && onRowHover(row.original)}
										onMouseLeave={() => onRowHover && onRowHover(null)}
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}
									>
										{row.getVisibleCells().map((cell) => {
											const totalColumns = row.getVisibleCells().length;
											const fallbackWidth = `${100 / totalColumns}%`;
											const defSize = (cell.column.columnDef as ColumnDefWithSize)?.size;
											const cellSize = cell.column.getSize
												? cell.column.getSize()
												: undefined;
											return (
												<TableCell
													key={cell.id}
													variant={variant}
													style={
														useAutoLayout
															? undefined
															: {
																	width:
																		defSize && defSize > 0
																			? `${defSize}px`
																			: cellSize && cellSize > 0
																			? `${cellSize}px`
																			: fallbackWidth,
																	minWidth:
																		defSize && defSize > 0 ? `${defSize}px` : undefined,
																	maxWidth:
																		defSize && defSize > 0 ? `${defSize}px` : undefined,
															  }
													}
													className="whitespace-nowrap"
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
			)}
			{!hidePagination && (
				<div className="w-full max-w-full mx-auto">
					<CustomPagination<TData> currentPage={pagination.pageIndex} table={table} />
				</div>
			)}
		</div>
	);
}

export default CustomTable;
