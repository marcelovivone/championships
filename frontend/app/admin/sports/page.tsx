'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { sportsApi } from '@/lib/api/entities';
import { Sport, CreateSportDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function SportsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  // Sync pageInput with page state
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['sports', page, limit, sortBy, sortOrder],
    queryFn: () => sportsApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const sports = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateSportDto>({
    defaultValues: {
      name: '',
      reducedName: '',
      type: '',
      divisionType: '',
      minMatchDivisionNumber: 0,
      maxMatchDivisionNumber: 0,
      divisionTime: 0,
      scoreType: '',
      hasOvertime: false,
      hasPenalties: false,
      flgDefault: false,
      imageUrl: '',
    }
  });

  const createMutation = useMutation({
    mutationFn: sportsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSportDto> }) =>
      sportsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sportsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSport(null);
    reset({
      name: '',
      reducedName: '',
      type: '',
      divisionType: '',
      minMatchDivisionNumber: 0,
      maxMatchDivisionNumber: 0,
      divisionTime: 0,
      scoreType: '',
      hasOvertime: false,
      hasPenalties: false,
      flgDefault: false,
      imageUrl: '',
    });
  };

  const handleAdd = () => {
    setEditingSport(null);
    reset({
      name: '',
      reducedName: '',
      type: '',
      divisionType: '',
      minMatchDivisionNumber: 0,
      maxMatchDivisionNumber: 0,
      divisionTime: 0,
      scoreType: '',
      hasOvertime: false,
      hasPenalties: false,
      flgDefault: false,
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (sport: Sport) => {
    setEditingSport(sport);
    reset(sport); // Load all sport data into the form
    setIsModalOpen(true);
  };

  const handleDelete = (sport: Sport) => {
    if (window.confirm(`Are you sure you want to delete ${sport.name}?`)) {
      deleteMutation.mutate(sport.id);
    }
  };

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const onSubmit = async (data: CreateSportDto) => {
    // Validate Match Division rules - all three fields must be > 0
    const minDiv = Number(data.minMatchDivisionNumber) || 0;
    const maxDiv = Number(data.maxMatchDivisionNumber) || 0;
    const divTime = Number(data.divisionTime) || 0;

    // Rule 1: All fields must be greater than 0
    if (minDiv === 0 || maxDiv === 0 || divTime === 0) {
      alert('Match Min Division, Match Max Division, and Division Time must all be greater than 0');
      return;
    }

    // Rule 2: Min must be <= Max
    if (minDiv > maxDiv) {
      alert('Match Min Division cannot be greater than Match Max Division');
      return;
    }

    // If user is trying to set flgDefault to true, check if another sport is already default
    if (data.flgDefault) {
      const currentDefaultSport = sports.find(sport => 
        sport.flgDefault && sport.id !== editingSport?.id
      );
      
      if (currentDefaultSport) {
        const userConfirmed = window.confirm(
          `The "${currentDefaultSport.name}" is the current default sport. Do you want to change it to "${data.name}"?`
        );
        
        if (!userConfirmed) {
          // User said No, save with flgDefault = false
          data.flgDefault = false;
        }
      }
    }

    if (editingSport) {
      // Merge with existing sport data but exclude id and createdAt
      const { id, createdAt, ...sportData } = editingSport;
      const updateData = { ...sportData, ...data };
      updateMutation.mutate({ 
        id: editingSport.id, 
        data: updateData
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' as keyof Sport, sortKey: 'name', sortable: true, width: '180px' },
    { header: 'Code', accessor: 'reducedName' as keyof Sport, sortKey: 'reducedName', sortable: true, width: '100px' },
    { header: 'Type', accessor: (row: Sport) => row.type.charAt(0).toUpperCase() + row.type.slice(1), sortKey: 'type', sortable: true, width: '120px' },
    { header: 'Division Type', accessor: (row: Sport) => row.divisionType.charAt(0).toUpperCase() + row.divisionType.slice(1), sortKey: 'divisionType', sortable: true, width: '130px' },
    { header: 'Match Min Division', accessor: 'minMatchDivisionNumber' as keyof Sport, sortKey: 'minMatchDivisionNumber', sortable: true, className: 'text-right', width: '150px' },
    { header: 'Match Max Division', accessor: 'maxMatchDivisionNumber' as keyof Sport, sortKey: 'maxMatchDivisionNumber', sortable: true, className: 'text-right', width: '150px' },
    { header: 'Division Time (min)', accessor: 'divisionTime' as keyof Sport, sortKey: 'divisionTime', sortable: true, className: 'text-right', width: '150px' },
    { header: 'Score Type', accessor: (row: Sport) => row.scoreType.charAt(0).toUpperCase() + row.scoreType.slice(1), sortKey: 'scoreType', sortable: true, width: '120px' },
    { header: 'Overtime', accessor: (row: Sport) => row.hasOvertime ? 'Yes' : 'No', sortKey: 'hasOvertime', sortable: true, width: '100px' },
    { header: 'Penalties', accessor: (row: Sport) => row.hasPenalties ? 'Yes' : 'No', sortKey: 'hasPenalties', sortable: true, width: '100px' },
    { 
      header: 'Default', 
      accessor: (row: Sport) => row.flgDefault ? (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Yes
        </span>
      ) : (
        <span className="text-gray-400">No</span>
      ),
      sortKey: 'flgDefault', 
      sortable: true, 
      width: '100px' 
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sports</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Sport
        </button>
      </div>

      <DataTable
        columns={columns}
        data={sports}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No sports found. Click 'Add Sport' to create one."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-medium">{total}</span> results
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => {
                  const pageNum = parseInt(pageInput);
                  if (pageNum >= 1 && pageNum <= totalPages) {
                    setPage(pageNum);
                  } else {
                    setPageInput(page.toString());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const pageNum = parseInt(pageInput);
                    if (pageNum >= 1 && pageNum <= totalPages) {
                      setPage(pageNum);
                    } else {
                      setPageInput(page.toString());
                    }
                  }
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
              />
              <span className="text-sm text-gray-700">of {totalPages}</span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSport ? 'Edit Sport' : 'Add Sport'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Football"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code *
              </label>
              <input
                type="text"
                {...register('reducedName', { required: 'Code is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., FB"
              />
              {errors.reducedName && (
                <p className="mt-1 text-sm text-red-600">{errors.reducedName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                {...register('type', { required: 'Type is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                <option value="collective">Collective</option>
                <option value="individual">Individual</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division Type *
              </label>
              <select
                {...register('divisionType', { required: 'Division type is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select division type</option>
                <option value="period">Period</option>
                <option value="quarter">Quarter</option>
                <option value="set">Set</option>
                <option value="time">Time</option>
              </select>
              {errors.divisionType && (
                <p className="mt-1 text-sm text-red-600">{errors.divisionType.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Match Min Division *
              </label>
              <input
                type="number"
                {...register('minMatchDivisionNumber', { 
                  required: 'Match min division is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="e.g., 2"
              />
              {errors.minMatchDivisionNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.minMatchDivisionNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Match Max Division *
              </label>
              <input
                type="number"
                {...register('maxMatchDivisionNumber', { 
                  required: 'Match max division is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="e.g., 2"
              />
              {errors.maxMatchDivisionNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.maxMatchDivisionNumber.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division Time (minutes) *
              </label>
              <input
                type="number"
                {...register('divisionTime', { 
                  required: 'Division time is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="e.g., 45"
              />
              {errors.divisionTime && (
                <p className="mt-1 text-sm text-red-600">{errors.divisionTime.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score Type *
              </label>
              <select
                {...register('scoreType', { required: 'Score type is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select score type</option>
                <option value="goals">Goals</option>
                <option value="points">Points</option>
              </select>
              {errors.scoreType && (
                <p className="mt-1 text-sm text-red-600">{errors.scoreType.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('hasOvertime')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Has Overtime
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('hasPenalties')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Has Penalties
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('flgDefault')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Default Sport
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL *
            </label>
            <input
              type="text"
              {...register('imageUrl', { 
                required: 'Image URL is required',
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Please enter a valid URL (must start with http:// or https://)'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/sport.png"
            />
            {errors.imageUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingSport
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
