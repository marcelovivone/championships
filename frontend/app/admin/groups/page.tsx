'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { groupsApi, sportsApi, leaguesApi, seasonsApi } from '@/lib/api/entities';
import { Group, CreateGroupDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

const GroupsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sync pageInput with page state
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['groups', page, limit, sortBy, sortOrder],
    queryFn: () => groupsApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const groups = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll({ page: 1, limit: 100 }),
  });

  const sports = sportsData?.data || [];

  const { data: leaguesData } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => leaguesApi.getAll({ page: 1, limit: 1000 }),
  });

  const leagues = leaguesData?.data || [];

  const { data: seasonsData } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonsApi.getAll({ page: 1, limit: 1000 }),
  });

  const seasons = seasonsData?.data || [];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateGroupDto>();

  // Watch values for filtering
  const selectedSportId = watch('sportId');
  const selectedLeagueId = watch('leagueId');

  // Filter leagues based on selected sport
  const filteredLeagues = selectedSportId 
    ? leagues.filter(league => league.sportId === Number(selectedSportId))
    : [];

  // Filter seasons based on selected league
  const filteredSeasons = selectedLeagueId
    ? seasons.filter(season => season.leagueId === Number(selectedLeagueId))
        .sort((a, b) => b.startYear - a.startYear)
    : [];

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateGroupDto> }) =>
      groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: groupsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const onSubmit = async (data: CreateGroupDto) => {
    const payload: CreateGroupDto = {
      name: data.name,
      sportId: Number(data.sportId),
      leagueId: Number(data.leagueId),
      seasonId: Number(data.seasonId),
    };

    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
    reset({
      name: '',
      sportId: 0,
      leagueId: 0,
      seasonId: 0,
    });
  };

  const handleAdd = () => {
    reset({
      name: '',
      sportId: 0,
      leagueId: 0,
      seasonId: 0,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    reset({
      name: group.name,
      sportId: group.sportId,
      leagueId: group.leagueId,
      seasonId: group.seasonId,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (group: Group) => {
    if (window.confirm(`Are you sure you want to delete group "${group.name}"?`)) {
      deleteMutation.mutate(group.id);
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name' as keyof Group,
      sortKey: 'name',
      sortable: true,
      width: '250px',
    },
    {
      header: 'Sport',
      accessor: (group: Group) => {
        const sport = sports.find(s => s.id === group.sportId);
        return sport?.name || '-';
      },
      sortKey: 'sportName',
      sortable: true,
      width: '200px',
    },
    {
      header: 'League',
      accessor: (group: Group) => {
        const league = leagues.find(l => l.id === group.leagueId);
        return league?.originalName || '-';
      },
      sortKey: 'leagueName',
      sortable: true,
      width: '300px',
    },
    {
      header: 'Season',
      accessor: (group: Group) => {
        const season = seasons.find(s => s.id === group.seasonId);
        return season ? `${season.startYear}/${season.endYear}` : '-';
      },
      sortKey: 'seasonInfo',
      sortable: true,
      width: '200px',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Groups</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Group
        </button>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No groups found. Click 'Add Group' to create one."
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

      {/* Group Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingGroup ? 'Edit Group' : 'Add Group'}
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
                  {league.originalName}
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
              onChange={(e) => {
                setValue('seasonId', Number(e.target.value) as any);
              }}
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
              Group Name *
            </label>
            <input
              type="text"
              placeholder="Group name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('name', { required: 'Group name is required' })}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingGroup ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GroupsPage;