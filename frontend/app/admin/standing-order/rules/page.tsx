'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, RefreshCw } from 'lucide-react';
import { standingOrderRulesApi, sportsApi, leaguesApi } from '@/lib/api/entities';
import { StandingOrderRule, CreateStandingOrderRuleDto, UpdateStandingOrderRuleDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

const CRITERIA_OPTIONS = [
  // Overall
  'POINTS', 'WINS', 'WIN_PCT', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'GOALS_AGAINST',
  'AWAY_GOALS_FOR', 'GAMES_PLAYED', 'REGULATION_WINS', 'REGULATION_OT_WINS',
  'OT_WINS', 'PENALTY_WINS', 'SET_RATIO', 'POINT_RATIO', 'NET_POINTS',
  // H2H
  'H2H_POINTS', 'H2H_WINS', 'H2H_WIN_PCT', 'H2H_GOAL_DIFFERENCE',
  'H2H_GOALS_FOR', 'H2H_AWAY_GOALS', 'H2H_POINT_DIFFERENCE',
  // Fallback
  'CLUB_NAME', 'CLUB_ID',
];

export default function StandingOrderRulesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<StandingOrderRule | null>(null);
  const [filterSportId, setFilterSportId] = useState<string>('');
  const [filterLeagueId, setFilterLeagueId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateStandingOrderRuleDto | UpdateStandingOrderRuleDto>();

  const { data: sports } = useQuery({ queryKey: ['sports'], queryFn: () => sportsApi.getAll({ page: 1, limit: 200 }) });
  const sportsList = sports?.data || [];

  const { data: leagues } = useQuery({
    queryKey: ['leagues', filterSportId],
    queryFn: () => (filterSportId ? leaguesApi.getBySport(Number(filterSportId)) : Promise.resolve([])),
    enabled: !!filterSportId,
  });

  const { data: allLeaguesResp } = useQuery({ queryKey: ['leagues', 'all'], queryFn: () => leaguesApi.getAll({ page: 1, limit: 1000 }) });
  const allLeagues = allLeaguesResp?.data || [];

  // Modal-dependent lists
  const watchedSport = watch('sportId');
  const { data: modalLeagues } = useQuery({
    queryKey: ['leagues', 'modal', watchedSport],
    queryFn: () => (watchedSport ? leaguesApi.getBySport(Number(watchedSport)) : Promise.resolve([])),
    enabled: !!watchedSport,
  });

  useEffect(() => { setPageInput(String(page)); }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['standing-order-rules', filterSportId, filterLeagueId, page, limit, sortBy, sortOrder],
    queryFn: () => standingOrderRulesApi.getFiltered({
      sportId: filterSportId ? Number(filterSportId) : undefined,
      leagueId: filterLeagueId === 'sport-default' ? 'sport-default' : (filterLeagueId || undefined),
      page, limit, sortBy, sortOrder,
    }),
  });

  const list = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const createMutation = useMutation({
    mutationFn: standingOrderRulesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['standing-order-rules'] }); handleCloseModal(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateStandingOrderRuleDto }) => standingOrderRulesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['standing-order-rules'] }); handleCloseModal(); },
  });
  const deleteMutation = useMutation({
    mutationFn: standingOrderRulesApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['standing-order-rules'] }); },
  });
  const resequenceMutation = useMutation({
    mutationFn: standingOrderRulesApi.resequence,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['standing-order-rules'] }); },
  });

  useEffect(() => { setFilterLeagueId(''); }, [filterSportId]);

  const handleOpenAdd = () => {
    setEditing(null);
    // Suggest next sort_order
    const maxSortOrder = list.reduce((max: number, r: any) => Math.max(max, r.sortOrder || 0), 0);
    reset({
      sportId: filterSportId ? Number(filterSportId) : undefined,
      leagueId: undefined,
      startYear: null,
      endYear: null,
      sortOrder: maxSortOrder + 100,
      criterion: 'POINTS',
      direction: 'DESC',
    } as any);
    setIsModalOpen(true);
  };

  const handleEdit = (row: StandingOrderRule) => {
    setEditing(row);
    reset({
      sportId: row.sportId,
      leagueId: row.leagueId || undefined,
      startYear: row.startYear,
      endYear: row.endYear,
      sortOrder: row.sortOrder,
      criterion: row.criterion,
      direction: row.direction || 'DESC',
    } as any);
    setIsModalOpen(true);
  };

  const handleDelete = (row: StandingOrderRule) => {
    if (confirm('Delete this standing order rule?')) deleteMutation.mutate(row.id);
  };

  const handleResequence = () => {
    if (!filterSportId) return;
    resequenceMutation.mutate({
      sportId: Number(filterSportId),
      leagueId: filterLeagueId && filterLeagueId !== 'sport-default' ? Number(filterLeagueId) : null,
      startYear: null,
    });
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditing(null); reset({}); };

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const onSubmit = (formData: any) => {
    const payload: CreateStandingOrderRuleDto = {
      sportId: Number(formData.sportId),
      leagueId: formData.leagueId ? Number(formData.leagueId) : null,
      startYear: formData.startYear ? Number(formData.startYear) : null,
      endYear: formData.endYear ? Number(formData.endYear) : null,
      sortOrder: Number(formData.sortOrder),
      criterion: formData.criterion,
      direction: formData.direction || 'DESC',
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload as UpdateStandingOrderRuleDto });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    {
      header: 'Sport',
      accessor: (r: any) => sportsList.find((s: any) => s.id === r.sportId)?.name || r.sportId,
      sortable: true, sortKey: 'sportId', width: '120px',
    },
    {
      header: 'League',
      accessor: (r: any) => {
        if (!r.leagueId) return '— Sport Default —';
        const league = allLeagues.find((l: any) => l.id === r.leagueId);
        return league?.originalName || r.leagueId;
      },
      sortable: true, sortKey: 'leagueId', width: '180px',
    },
    { header: 'Start Year', accessor: (r: any) => r.startYear ?? '—', sortable: true, sortKey: 'startYear', width: '100px' },
    { header: 'End Year', accessor: (r: any) => r.endYear ?? 'Present', sortable: true, sortKey: 'endYear', width: '100px' },
    { header: 'Order', accessor: 'sortOrder' as any, sortable: true, sortKey: 'sortOrder', width: '80px' },
    { header: 'Criterion', accessor: 'criterion' as any, sortable: true, sortKey: 'criterion', width: '180px' },
    { header: 'Direction', accessor: 'direction' as any, sortable: true, sortKey: 'direction', width: '90px' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Standing Order Rules</h1>
        <div className="flex gap-2">
          {filterSportId && (
            <button onClick={handleResequence} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" title="Re-sequence sort order to 100, 200, 300...">
              <RefreshCw size={20} /> Re-sequence
            </button>
          )}
          <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} /> Add Rule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sport</label>
            <select value={filterSportId} onChange={(e) => setFilterSportId(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option value="">All Sports</option>
              {sportsList.map((s: any) => (<option key={s.id} value={String(s.id)}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">League</label>
            <select value={filterLeagueId} onChange={(e) => setFilterLeagueId(e.target.value)} disabled={!filterSportId} className="w-full px-3 py-2 border rounded">
              <option value="">All</option>
              <option value="sport-default">Sport Defaults Only</option>
              {leagues && leagues.map((l: any) => (<option key={l.id} value={String(l.id)}>{l.originalName || l.name}</option>))}
            </select>
          </div>
          <div className="flex items-end">
            {(filterSportId || filterLeagueId) && (
              <button onClick={() => { setFilterSportId(''); setFilterLeagueId(''); }} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">Clear filters</button>
            )}
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={list} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} emptyMessage="No standing order rules found" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg">
          <div className="flex items-center gap-4">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 border rounded">First</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded">Prev</button>
            <span>Page</span>
            <input type="text" value={pageInput} onChange={(e) => setPageInput(e.target.value)} onBlur={() => { const v = Number(pageInput) || 1; setPage(Math.min(Math.max(1, v), totalPages)); }} className="w-12 px-2 py-1 border rounded text-center" />
            <span>of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded">Next</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 border rounded">Last</button>
          </div>
          <div className="text-sm text-gray-600">Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}</div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editing ? 'Edit Standing Order Rule' : 'Add Standing Order Rule'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sport *</label>
            <select {...register('sportId', { required: 'Sport is required' })} className="w-full px-3 py-2 border rounded">
              <option value="">Select sport</option>
              {sportsList.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            {errors.sportId && <p className="text-red-600 text-sm">{errors.sportId.message as any}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">League (empty = sport-level default)</label>
            <select {...register('leagueId')} disabled={!watch('sportId')} className="w-full px-3 py-2 border rounded">
              <option value="">— Sport Default —</option>
              {(() => {
                const sportIdVal = Number(watch('sportId'));
                const source = (modalLeagues && modalLeagues.length) ? modalLeagues : allLeagues.filter((l: any) => l.sportId === sportIdVal);
                return source.map((l: any) => (<option key={l.id} value={l.id}>{l.originalName || l.name}</option>));
              })()}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Year</label>
              <input type="number" {...register('startYear')} placeholder="e.g. 2000" className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Year</label>
              <input type="number" {...register('endYear')} placeholder="Empty = present" className="w-full px-3 py-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Sort Order *</label>
            <input type="number" {...register('sortOrder', { required: 'Sort order is required', min: { value: 1, message: 'Minimum is 1' } })} className="w-full px-3 py-2 border rounded" />
            {errors.sortOrder && <p className="text-red-600 text-sm">{errors.sortOrder.message as any}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Criterion *</label>
            <select {...register('criterion', { required: 'Criterion is required' })} className="w-full px-3 py-2 border rounded">
              <option value="">Select criterion</option>
              {CRITERIA_OPTIONS.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
            {errors.criterion && <p className="text-red-600 text-sm">{errors.criterion.message as any}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Direction *</label>
            <select {...register('direction')} className="w-full px-3 py-2 border rounded">
              <option value="DESC">DESC (highest first)</option>
              <option value="ASC">ASC (lowest first)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-700 border rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
