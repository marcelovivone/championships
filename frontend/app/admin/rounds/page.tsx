'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { roundsApi, seasonsApi, leaguesApi, sportsApi } from '@/lib/api/entities';
import { Round, CreateRoundDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function RoundsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('roundNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  // Sync pageInput with page state
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['rounds', page, limit, sortBy, sortOrder],
    queryFn: () => roundsApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const rounds = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll({ page: 1, limit: 100 }),
  });

  const sports = sportsData?.data || [];

  const { data: leaguesData } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => leaguesApi.getAll({ page: 1, limit: 100 }),
  });

  const leagues = leaguesData?.data || [];

  const { data: seasonsData } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonsApi.getAll({ page: 1, limit: 500 }),
  });

  const seasons = seasonsData?.data || [];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateRoundDto>({
    defaultValues: {
      flgCurrent: false,
    }
  });

  // Watch values for filtering
  const selectedSportId = watch('sportId');
  const selectedLeagueId = watch('leagueId');

  // Filter leagues based on selected sport
  const filteredLeagues = selectedSportId 
    ? leagues.filter(league => league.sportId === Number(selectedSportId))
    : [];

  // Filter seasons based on selected league
  const filteredSeasons = selectedLeagueId
    ? seasons
        .filter(season => season.leagueId === Number(selectedLeagueId))
        .sort((a, b) => b.startYear - a.startYear)
    : [];

  const createMutation = useMutation({
    mutationFn: async (data: CreateRoundDto) => {
      const response = await roundsApi.create(data);
      // Check if backend returned an error in success response
      if (response && typeof response === 'object' && 'success' in response && !response.success) {
        throw new Error(response.message || 'Failed to create round');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to create round';
      alert(errorMessage);
    },
    retry: false,
    throwOnError: false,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateRoundDto> }) => {
      const response = await roundsApi.update(id, data);
      // Check if backend returned an error in success response
      if (response && typeof response === 'object' && 'success' in response && !response.success) {
        throw new Error(response.message || 'Failed to update round');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to update round';
      alert(errorMessage);
    },
    retry: false,
    throwOnError: false,
  });

  const deleteMutation = useMutation({
    mutationFn: roundsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRound(null);
    reset({
      flgCurrent: false,
    });
  };

  const handleAdd = () => {
    setEditingRound(null);
    reset({
      flgCurrent: false,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (round: Round) => {
    setEditingRound(round);
    // Get the sport ID from the league
    const league = leagues.find(l => l.id === round.leagueId);
    reset({
      sportId: league?.sportId,
      leagueId: round.leagueId,
      seasonId: round.seasonId,
      roundNumber: round.roundNumber,
      startDate: round.startDate ? new Date(round.startDate).toISOString().split('T')[0] : undefined,
      endDate: round.endDate ? new Date(round.endDate).toISOString().split('T')[0] : undefined,
      flgCurrent: round.flgCurrent || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (round: Round) => {
    if (window.confirm(`Are you sure you want to delete Round ${round.roundNumber}?`)) {
      deleteMutation.mutate(round.id);
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

  const onSubmit = (data: CreateRoundDto) => {
    const payload: any = {
      seasonId: Number(data.seasonId),
      leagueId: Number(data.leagueId),
      roundNumber: Number(data.roundNumber),
      flgCurrent: data.flgCurrent || false,
    };
    
    // Handle date conversion - convert YYYY-MM-DD string to ISO string with time
    if (data.startDate) {
      const dateObj = new Date(data.startDate + 'T00:00:00');
      payload.startDate = dateObj.toISOString();
    }
    if (data.endDate) {
      const dateObj = new Date(data.endDate + 'T23:59:59');
      payload.endDate = dateObj.toISOString();
    }
    
    if (editingRound) {
      updateMutation.mutate({ id: editingRound.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { header: 'Round #', accessor: 'roundNumber' as keyof Round, sortKey: 'roundNumber', sortable: true, width: '100px' },
    {
      header: 'Sport',
      accessor: (round: Round) => round.league?.sport?.name || '-',
      sortKey: 'sportName',
      sortable: true,
      width: '150px',
    },
    {
      header: 'League',
      accessor: (round: Round) => round.league?.originalName || '-',
      sortKey: 'leagueName',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Season',
      accessor: (round: Round) => round.season ? `${round.season.startYear}/${round.season.endYear}` : '-',
      sortKey: 'seasonInfo',
      sortable: true,
      width: '150px',
    },
    {
      header: 'Start Date',
      accessor: (round: Round) => round.startDate ? new Date(round.startDate).toLocaleDateString() : '-',
      sortKey: 'startDate',
      sortable: true,
      width: '150px',
    },
    {
      header: 'End Date',
      accessor: (round: Round) => round.endDate ? new Date(round.endDate).toLocaleDateString() : '-',
      sortKey: 'endDate',
      sortable: true,
      width: '150px',
    },
    {
      header: 'Current',
      accessor: (round: Round) => round.flgCurrent ? 'Yes' : 'No',
      sortKey: 'flgCurrent',
      sortable: true,
      width: '100px',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rounds</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Round
        </button>
      </div>

      <DataTable
        columns={columns}
        data={rounds}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No rounds found. Click 'Add Round' to create one."
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

      {/* Round Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRound ? 'Edit Round' : 'Add Round'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sport *
            </label>
            <select
              {...register('sportId', { required: 'Sport is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => {
                setValue('sportId', Number(e.target.value) as any);
                setValue('leagueId', 0 as any);
                setValue('seasonId', 0 as any);
              }}
            >
              <option value="">Select a sport</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
            {errors.sportId && (
              <p className="mt-1 text-sm text-red-600">{errors.sportId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League *
            </label>
            <select
              {...register('leagueId', { required: 'League is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedSportId || filteredLeagues.length === 0}
              onChange={(e) => {
                setValue('leagueId', Number(e.target.value) as any);
                setValue('seasonId', 0 as any);
              }}
            >
              <option value="">Select a league</option>
              {filteredLeagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.secondaryName || league.originalName}
                </option>
              ))}
            </select>
            {errors.leagueId && (
              <p className="mt-1 text-sm text-red-600">{errors.leagueId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Season *
            </label>
            <select
              {...register('seasonId', { required: 'Season is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedLeagueId || filteredSeasons.length === 0}
            >
              <option value="">Select a season</option>
              {filteredSeasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.startYear}/{season.endYear}
                </option>
              ))}
            </select>
            {errors.seasonId && (
              <p className="mt-1 text-sm text-red-600">{errors.seasonId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Round Number *
            </label>
            <input
              type="number"
              {...register('roundNumber', { 
                required: 'Round number is required',
                min: { value: 1, message: 'Round number must be at least 1' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.roundNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.roundNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              {...register('endDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('flgCurrent')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Current Round (only one per season)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {editingRound ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
