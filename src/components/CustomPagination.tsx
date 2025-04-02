import { FC, ReactNode } from 'react';
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
	let paginationArray: number[] = [];
	const generatePaginationItems = (): ReactNode[] => {
		if (numPages > 9) {
			if (currentPage >= 4 && currentPage < numPages - 3) {
				paginationArray = [
					1,
					-1,
					currentPage - 1,
					currentPage,
					currentPage + 1,
					currentPage + 2,
					currentPage + 3,
					-1,
					numPages,
				];
			} else if (currentPage > numPages - 4) {
				paginationArray = [
					1,
					-1,
					numPages - 6,
					numPages - 5,
					numPages - 4,
					numPages - 3,
					numPages - 2,
					numPages - 1,
					numPages,
				];
			} else {
				paginationArray = [1, 2, 3, 4, 5, 6, 7, -1, numPages];
			}
		} else {
			paginationArray = Array.from({ length: numPages }, (_, i) => i + 1);
		}

		const items = paginationArray.map((page: number, index) => {
			if (page === -1) {
				return (
					<PaginationItem key={index}>
						<PaginationEllipsis />
					</PaginationItem>
				);
			} else {
				return (
					<PaginationItem
						className={twMerge(
							page === currentPage + 1 && 'bg-muted text-foreground pointer-events-none',
							'rounded-md'
						)}
						key={index}
						onClick={() => table.setPageIndex(page - 1)}
					>
						<PaginationLink>{page}</PaginationLink>
					</PaginationItem>
				);
			}
		}); // Remove the extra semicolon and curly brace here

		return items;
	};

	return (
		<Pagination className="my-4">
			<PaginationContent>
				<PaginationItem onClick={() => table.previousPage()}>
					<PaginationPrevious />
				</PaginationItem>
				{generatePaginationItems()}

				<PaginationItem onClick={() => table.nextPage()}>
					<PaginationNext />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
};

export default CustomPagination;
