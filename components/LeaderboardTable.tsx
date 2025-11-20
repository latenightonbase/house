'use client'

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/table';
import { useRouter } from 'next/navigation';
import { RiLoader5Fill } from 'react-icons/ri';

interface LeaderboardColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface LeaderboardTableProps {
  title: string;
  columns: LeaderboardColumn[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function LeaderboardTable({
  title,
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available'
}: LeaderboardTableProps) {
  const router = useRouter();

  const handleRowClick = (row: any) => {
    if (row.userId) {
      router.push(`/user/${row.userId}`);
    } else if (row._id) {
      router.push(`/user/${row._id}`);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="text-xl lg:text-2xl font-bold mb-4 gradient-text">{title}</h2>
        <div className="bg-white/10 rounded-lg border border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <RiLoader5Fill className='text-primary animate-spin text-xl' />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4 gradient-text">{title}</h2>
      <div className="bg-white/5 rounded-lg border border-primary/30 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-primary/30 hover:bg-transparent">
                <TableHead className="w-16 font-bold">#</TableHead>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length + 1} className="text-center py-8 text-caption">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow
                    key={row._id || index}
                    className="border-b border-primary/10 cursor-pointer hover:bg-white/5"
                    onClick={() => handleRowClick(row)}
                  >
                    <TableCell className="font-medium">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-500/20 text-orange-500' :
                        'bg-white/10'
                      }`}>
                        {index + 1}
                      </div>
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render ? (
                          column.render(row[column.key], row)
                        ) : (
                          <span>{row[column.key] || 'N/A'}</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
