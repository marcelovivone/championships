'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { clubStadiumsApi, clubsApi, stadiumsApi } from '@/lib/api/entities';
import { ClubStadium, CreateClubStadiumDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function ClubStadiumsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClubStadium, setEditingClubStadium] = useState<ClubStadium | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const queryClient = useQueryClient();

  // Sync pageInput with page state
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['club-stadiums', page, limit, sortBy, sortOrder],
    queryFn: () => clubStadiumsApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const clubStadiums = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.getAll({ page: 1, limit: 100 }),
  });

  const clubs = clubsData?.data || [];

  const { data: stadiumsData } = useQuery({
    queryKey: ['stadiums'],
    queryFn: () => stadiumsApi.getAll({ page: 1, limit: 100 }),
  });

  const stadiums = stadiumsData?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateClubStadiumDto>();

  const createMutation = useMutation({
    mutationFn: clubStadiumsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-stadiums'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateClubStadiumDto> }) =>
      clubStadiumsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-stadiums'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clubStadiumsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-stadiums'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClubStadium(null);
    reset({});
  };

  const handleAdd = () => {
    setEditingClubStadium(null);
    reset({});
    setIsModalOpen(true);
  };

  const handleEdit = (clubStadium: ClubStadium) => {
    setEditingClubStadium(clubStadium);
    reset({
      clubId: clubStadium.clubId,
      stadiumId: clubStadium.stadiumId,
      startDate: clubStadium.startDate.split('T')[0],
      endDate: clubStadium.endDate ? clubStadium.endDate.split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (clubStadium: ClubStadium) => {
    const club = clubs.find((c) => c.id === clubStadium.clubId);
    const stadium = stadiums.find((s) => s.id === clubStadium.stadiumId);
    if (window.confirm(`Are you sure you want to remove the stadium ${stadium?.name} from the club ${club?.shortName}?`)) {
      deleteMutation.mutate(clubStadium.id);
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

  const onSubmit = (data: CreateClubStadiumDto) => {
    const payload = {
      ...data,
      clubId: Number(data.clubId),
      stadiumId: Number(data.stadiumId),
      endDate: data.endDate || undefined,
    };
    if (editingClubStadium) {
      updateMutation.mutate({ id: editingClubStadium.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    {
      header: 'Club',
      accessor: (cs: ClubStadium) => cs.club?.shortName || '-',
      sortKey: 'clubId',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Stadium',
      accessor: (cs: ClubStadium) => cs.stadium?.name || '-',
      sortKey: 'stadiumId',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Start Date',
      accessor: (cs: ClubStadium) => new Date(cs.startDate).toLocaleDateString(),
      sortKey: 'startDate',
      sortable: true,
      width: '130px',
    },
    {
      header: 'End Date',
      accessor: (cs: ClubStadium) => cs.endDate ? new Date(cs.endDate).toLocaleDateString() : 'Active',
      className: 'text-center',
      sortKey: 'endDate',
      sortable: true,
      width: '130px',
    },
    {
      header: 'Status',
      accessor: (cs: ClubStadium) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          cs.endDate ? 'bg-gray-200 text-gray-700' : 'bg-green-200 text-green-800'
        }`}>
          {cs.endDate ? 'Inactive' : 'Active'}
        </span>
      ),
      className: 'text-center',
      width: '100px',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Club Stadiums</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Club Stadium
        </button>
      </div>

      <DataTable
        columns={columns}
        data={clubStadiums}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No club-stadium relationships found. Click 'Add Club Stadium' to create one."
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
        title={editingClubStadium ? 'Edit Club Stadium' : 'Add Club Stadium'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Club *
            </label>
            <select
              {...register('clubId', { required: 'Club is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a club</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.shortName}
                </option>
              ))}
            </select>
            {errors.clubId && (
              <p className="mt-1 text-sm text-red-600">{errors.clubId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stadium *
            </label>
            <select
              {...register('stadiumId', { required: 'Stadium is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a stadium</option>
              {stadiums.map((stadium) => (
                <option key={stadium.id} value={stadium.id}>
                  {stadium.name}
                </option>
              ))}
            </select>
            {errors.stadiumId && (
              <p className="mt-1 text-sm text-red-600">{errors.stadiumId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              min="1800-01-01"
              max="2200-12-31"
              {...register('startDate', { required: 'Start date is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">You can type the date directly: YYYY-MM-DD (e.g., 1902-07-21)</p>
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              min="1800-01-01"
              max="2200-12-31"
              {...register('endDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty if active. Type date: YYYY-MM-DD (e.g., 2025-12-31)
            </p>
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
                : editingClubStadium
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
