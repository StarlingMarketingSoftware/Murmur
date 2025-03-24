import { FC } from 'react';
import {
	PaginationContent,
	PaginationItem,
	PaginationPrevious,
	PaginationLink,
	PaginationEllipsis,
	PaginationNext,
	Pagination,
} from './ui/pagination';
import { Table } from '@tanstack/react-table';
import { twMerge } from 'tailwind-merge';

interface CustomPaginationProps<TData> {
	table: Table<TData>;
	currentPage: number;
}

const CustomPagination = <TData,>({ table }: CustomPaginationProps<TData>) => {
	const numPages = table.getPageCount();
	const currentPage = table.getState().pagination.pageIndex;

	console.log(Array.from({ length: numPages }, (_, i) => i + 1));
	return (
		<Pagination className="my-4">
			<PaginationContent>
				<PaginationItem onClick={() => table.previousPage()}>
					<PaginationPrevious href="#" />
				</PaginationItem>
				{Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
					<PaginationItem
						className={twMerge(
							page === currentPage + 1 &&
								'bg-background text-foreground pointer-events-none',
							'rounded-md'
						)}
						key={page}
						onClick={() => table.setPageIndex(page - 1)}
					>
						<PaginationLink href="#">{page}</PaginationLink>
					</PaginationItem>
				))}

				{/* <PaginationItem>
					<PaginationEllipsis />
				</PaginationItem> */}

				<PaginationItem onClick={() => table.nextPage()}>
					<PaginationNext href="#" />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
};

export default CustomPagination;
