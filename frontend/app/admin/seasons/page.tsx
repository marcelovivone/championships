'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { seasonsApi, leaguesApi, sportsApi } from '@/lib/api/entities';
import { Season, CreateSeasonDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function SeasonsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('startYear');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const queryClient = useQueryClient();

  // Sync pageInput with page state
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['seasons', page, limit, sortBy, sortOrder],
    queryFn: () => seasonsApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const seasons = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: leaguesData } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => leaguesApi.getAll({ page: 1, limit: 100 }),
  });

  const leagues = leaguesData?.data || [];

  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll({ page: 1, limit: 100 }),
  });

  const sports = sportsData?.data || [];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateSeasonDto>();

  // Watch sportId to filter leagues
  const selectedSportId = watch('sportId');

  // Filter leagues based on selected sport
  const filteredLeagues = selectedSportId 
    ? leagues.filter(league => league.sportId === Number(selectedSportId))
    : [];

  const createMutation = useMutation({
    mutationFn: seasonsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSeasonDto> }) =>
      seasonsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: seasonsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSeason(null);
    reset({});
  };

  const handleAdd = () => {
    setEditingSeason(null);
    reset({
      status: 'planned',
      flgDefault: false,
      numberOfGroups: 0,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (season: Season) => {
    setEditingSeason(season);
    reset({
      sportId: season.sportId,
      leagueId: season.leagueId,
      startYear: season.startYear,
      endYear: season.endYear,
      status: season.status,
      flgDefault: season.flgDefault,
      numberOfGroups: season.numberOfGroups,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (season: Season) => {
    const seasonName = `${season.startYear}/${season.endYear}`;
    if (window.confirm(`Are you sure you want to delete season ${seasonName}?`)) {
      deleteMutation.mutate(season.id);
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

  const onSubmit = (data: CreateSeasonDto) => {
    // If user is trying to set flgDefault to true, check if another season of the same league is already default
    if (data.flgDefault) {
      const currentDefaultSeason = seasons.find(season => 
        season.flgDefault && 
        season.leagueId === Number(data.leagueId) &&
        season.id !== editingSeason?.id
      );
      
      if (currentDefaultSeason) {
        const leagueName = leagues.find(l => l.id === Number(data.leagueId))?.secondaryName || 
                          leagues.find(l => l.id === Number(data.leagueId))?.originalName || 
                          'this league';
        const seasonName = `${currentDefaultSeason.startYear}/${currentDefaultSeason.endYear}`;
        const userConfirmed = window.confirm(
          `The "${seasonName}" is the current season default of the league "${leagueName}". Do you want to change it?`
        );
        
        if (!userConfirmed) {
          // User said No, save with flgDefault = false
          data.flgDefault = false;
        }
      }
    }

    const payload = {
      ...data,
      sportId: Number(data.sportId),
      leagueId: Number(data.leagueId),
      numberOfGroups: data.numberOfGroups ? Number(data.numberOfGroups) : 0,
    };
    
    if (editingSeason) {
      updateMutation.mutate({ id: editingSeason.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    {
      header: 'Sport',
      accessor: (season: Season) => season.sport?.name || '-',
      sortKey: 'sportName',
      sortable: true,
      width: '180px',
    },
    { 
      header: 'Season', 
      accessor: (season: Season) => `${season.startYear}/${season.endYear}`,
      sortKey: 'startYear', 
      sortable: true, 
      width: '120px' 
    },
    {
      header: 'League',
      accessor: (season: Season) => season.league?.secondaryName || season.league?.originalName || '-',
      sortKey: 'leagueName',
      sortable: true,
      width: '280px',
    },
    {
      header: 'Status',
      accessor: (season: Season) => {
        const statusColors = {
          planned: 'bg-gray-100 text-gray-800',
          active: 'bg-green-100 text-green-800',
          finished: 'bg-blue-100 text-blue-800',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[season.status]}`}>
            {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
          </span>
        );
      },
      sortKey: 'status',
      sortable: true,
      width: '120px',
    },
    {
      header: 'Default',
      accessor: (season: Season) => (
        season.flgDefault ? (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Yes
          </span>
        ) : (
          <span className="text-gray-400">No</span>
        )
      ),
      sortKey: 'flgDefault',
      sortable: true,
      width: '125px',
    },
    {
      header: 'Groups',
      accessor: 'numberOfGroups' as keyof Season,
      sortKey: 'numberOfGroups',
      sortable: true,
      width: '120px',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Seasons</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Season
        </button>
      </div>

      <DataTable
        columns={columns}
        data={seasons}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No seasons found. Click 'Add Season' to create one."
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

      {/* Season Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSeason ? 'Edit Season' : 'Add Season'}
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
              disabled={!selectedSportId}
            >
              <option value="">{selectedSportId ? 'Select a league' : 'Select a sport first'}</option>
              {filteredLeagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.secondaryName || league.originalName}
                </option>
              ))}
            </select>
            {errors.leagueId && (
              <p className="mt-1 text-sm text-red-600">{errors.leagueId.message}</p>
            )}
            {selectedSportId && filteredLeagues.length === 0 && (
              <p className="mt-1 text-sm text-amber-600">No leagues available for this sport</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Year *
              </label>
              <input
                type="number"
                {...register('startYear', { 
                  required: 'Start year is required',
                  min: { value: 1900, message: 'Year must be at least 1900' },
                  max: { value: 2100, message: 'Year must be at most 2100' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2024"
              />
              {errors.startYear && (
                <p className="mt-1 text-sm text-red-600">{errors.startYear.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Year *
              </label>
              <input
                type="number"
                {...register('endYear', { 
                  required: 'End year is required',
                  min: { value: 1900, message: 'Year must be at least 1900' },
                  max: { value: 2100, message: 'Year must be at most 2100' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2025"
              />
              {errors.endYear && (
                <p className="mt-1 text-sm text-red-600">{errors.endYear.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              {...register('status', { required: 'Status is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="finished">Finished</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('flgDefault')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Set as default season for this league
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Groups
            </label>
            <input
              type="number"
              {...register('numberOfGroups', { 
                min: { value: 0, message: 'Must be 0 or greater' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            {errors.numberOfGroups && (
              <p className="mt-1 text-sm text-red-600">{errors.numberOfGroups.message}</p>
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
                : editingSeason
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
