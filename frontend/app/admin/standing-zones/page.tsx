'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { standingZonesApi, sportsApi, leaguesApi, seasonsApi } from '@/lib/api/entities';
import { StandingZone, CreateStandingZoneDto, UpdateStandingZoneDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function StandingZonesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<StandingZone | null>(null);
  const [filterSportId, setFilterSportId] = useState<string>('');
  const [filterLeagueId, setFilterLeagueId] = useState<string>('');
  const [filterSeasonId, setFilterSeasonId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  // Default to season (startYear desc) so table opens season -> sport -> league
  const [sortBy, setSortBy] = useState('seasonStart');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateStandingZoneDto | UpdateStandingZoneDto>();

  const { data: sports } = useQuery({ queryKey: ['sports'], queryFn: () => sportsApi.getAll({ page: 1, limit: 200 }) });
  const sportsList = sports?.data || [];
  const { data: leagues } = useQuery({ queryKey: ['leagues', filterSportId], queryFn: () => (filterSportId ? leaguesApi.getBySport(Number(filterSportId)) : Promise.resolve([])), enabled: !!filterSportId });

  const { data: seasons } = useQuery({ queryKey: ['seasons', filterLeagueId], queryFn: () => (filterLeagueId ? seasonsApi.getByLeague(Number(filterLeagueId)) : Promise.resolve([])), enabled: !!filterLeagueId });

  // Load full lists for display purposes (names instead of ids)
  const { data: allLeaguesResp } = useQuery({ queryKey: ['leagues', 'all'], queryFn: () => leaguesApi.getAll({ page: 1, limit: 1000 }) });
  const allLeagues = allLeaguesResp?.data || [];
  const { data: allSeasonsResp } = useQuery({ queryKey: ['seasons', 'all'], queryFn: () => seasonsApi.getAll({ page: 1, limit: 1000 }) });
  const allSeasons = allSeasonsResp?.data || [];

  // Modal-dependent lists: use form watch values so modal selects update when user changes sport/league inside modal
  const watchedSport = watch('sportId');
  const watchedLeague = watch('leagueId');
  const { data: modalLeagues } = useQuery({ queryKey: ['leagues', 'modal', watchedSport], queryFn: () => (watchedSport ? leaguesApi.getBySport(Number(watchedSport)) : Promise.resolve([])), enabled: !!watchedSport });
  const { data: modalSeasons } = useQuery({ queryKey: ['seasons', 'modal', watchedLeague], queryFn: () => (watchedLeague ? seasonsApi.getByLeague(Number(watchedLeague)) : Promise.resolve([])), enabled: !!watchedLeague });

  // Sync page input when page changes
  useEffect(() => { setPageInput(String(page)); }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['standing-zones', filterSportId, filterLeagueId, filterSeasonId, page, limit, sortBy, sortOrder],
    queryFn: () => standingZonesApi.getFiltered({ sportId: filterSportId ? Number(filterSportId) : undefined, leagueId: filterLeagueId ? Number(filterLeagueId) : undefined, seasonId: filterSeasonId ? Number(filterSeasonId) : undefined, page, limit, sortBy, sortOrder }),
  });

  const list = data?.data || [];
  // Ensure client-side ordering by season start year (desc) then sport then league
  const displayList = (() => {
    if (!list || !list.length) return [];
    if (sortBy === 'seasonStart') {
      const seasonsMap: Record<number, any> = {};
      allSeasons.forEach((s: any) => { seasonsMap[s.id] = s; });
      const sportsMap: Record<number, any> = {};
      sportsList.forEach((s: any) => { sportsMap[s.id] = s; });
      const leaguesMap: Record<number, any> = {};
      allLeagues.forEach((l: any) => { leaguesMap[l.id] = l; });
      return [...list].sort((a: any, b: any) => {
        const aSeason = a.seasonId ? (seasonsMap[a.seasonId]?.startYear || 0) : -Infinity;
        const bSeason = b.seasonId ? (seasonsMap[b.seasonId]?.startYear || 0) : -Infinity;
        if (aSeason !== bSeason) return bSeason - aSeason; // desc
        const aSport = (sportsMap[a.sportId]?.name || '').toLowerCase();
        const bSport = (sportsMap[b.sportId]?.name || '').toLowerCase();
        if (aSport !== bSport) return aSport.localeCompare(bSport);
        const aLeague = (leaguesMap[a.leagueId]?.originalName || leaguesMap[a.leagueId]?.name || '').toLowerCase();
        const bLeague = (leaguesMap[b.leagueId]?.originalName || leaguesMap[b.leagueId]?.name || '').toLowerCase();
        return aLeague.localeCompare(bLeague);
      });
    }
    return list;
  })();
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const createMutation = useMutation({ mutationFn: standingZonesApi.create, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['standing-zones'] }); handleCloseModal(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: UpdateStandingZoneDto }) => standingZonesApi.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['standing-zones'] }); handleCloseModal(); } });
  const deleteMutation = useMutation({ mutationFn: standingZonesApi.delete, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['standing-zones'] }); } });

  useEffect(() => {
    // Reset league/season when sport changes
    setFilterLeagueId('');
    setFilterSeasonId('');
  }, [filterSportId]);

  const handleOpenAdd = () => {
    setEditing(null);
    // Use empty string for seasonId in the form (represents 'No season')
    reset({ typeOfStanding: 'All', colorHex: '#FFFFFF', start_year: null, end_year: null, flg_priority: false, seasonId: '' } as any);
    setIsModalOpen(true);
  };

  const handleEdit = (row: StandingZone) => {
    setEditing(row);
    // If the zone has no season, set seasonId to empty string so the select shows "No season"
    const seasonVal = row.seasonId === null || typeof row.seasonId === 'undefined' ? '' : String(row.seasonId);
    reset({ sportId: row.sportId, leagueId: row.leagueId, seasonId: seasonVal, startPosition: row.startPosition, endPosition: row.endPosition, name: row.name, typeOfStanding: row.typeOfStanding || 'All', colorHex: row.colorHex || '#FFFFFF', start_year: (row as any).start_year ?? null, end_year: (row as any).end_year ?? null, flg_priority: (row as any).flg_priority ?? false } as any);
    setIsModalOpen(true);
  };
  const handleDelete = (row: StandingZone) => { if (confirm('Delete this standing zone?')) deleteMutation.mutate(row.id); };

  const handleCloseModal = () => { setIsModalOpen(false); setEditing(null); reset({}); };

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      // default descending for season, ascending for others
      setSortOrder(columnKey === 'seasonStart' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const onSubmit = (formData: any) => {
    // Determine seasonId payload:
    // - For create: send undefined when "No season" selected
    // - For update: send null when "No season" selected to clear the DB column
    let seasonPayload: number | null | undefined = undefined;
    if (editing) {
      seasonPayload = formData.seasonId === '' ? null : (formData.seasonId ? Number(formData.seasonId) : undefined);
    } else {
      seasonPayload = formData.seasonId ? Number(formData.seasonId) : undefined;
    }

    const payload: CreateStandingZoneDto = {
      sportId: Number(formData.sportId),
      leagueId: Number(formData.leagueId),
      seasonId: seasonPayload as any,
      startPosition: Number(formData.startPosition),
      endPosition: Number(formData.endPosition),
      name: String(formData.name),
      typeOfStanding: formData.typeOfStanding || 'All',
      colorHex: formData.colorHex || '#FFFFFF',
      start_year: formData.start_year ? Number(formData.start_year) : null,
      end_year: formData.end_year ? Number(formData.end_year) : null,
      flg_priority: !!formData.flg_priority,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload as UpdateStandingZoneDto });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' as any, sortable: true, sortKey: 'name' },
    { header: 'Type', accessor: (r: any) => r.typeOfStanding || 'All', sortable: true, sortKey: 'typeOfStanding', width: '120px' },
    { header: 'Sport', accessor: (r: any) => (sportsList.find((s: any) => s.id === r.sportId)?.name) || r.sportId, sortable: true, sortKey: 'sportName', width: '120px' },
    { header: 'League', accessor: (r: any) => ((allLeagues.find((l: any) => l.id === r.leagueId)?.originalName) || (allLeagues.find((l: any) => l.id === r.leagueId)?.originalName) || r.leagueId), sortable: true, sortKey: 'leagueName', width: '120px' },
    { header: 'Season', accessor: (r: any) => (allSeasons.find((s: any) => s.id === r.seasonId) ? `${allSeasons.find((s: any) => s.id === r.seasonId)!.startYear}/${allSeasons.find((s: any) => s.id === r.seasonId)!.endYear}` : (r.seasonId ? String(r.seasonId) : '-')), sortable: true, sortKey: 'seasonStart', width: '120px' },
    { header: 'Range', accessor: (r: any) => `${r.startPosition} - ${r.endPosition}`, sortable: true, sortKey: 'startPosition' },
    { header: 'Start Year', accessor: (r: any) => (r.start_year ?? r.startYear ?? '-'), sortable: true, sortKey: 'start_year', width: '110px' },
    { header: 'End Year', accessor: (r: any) => (r.end_year ?? r.endYear ?? '-'), sortable: true, sortKey: 'end_year', width: '110px' },
    { header: 'Priority', accessor: (r: any) => (r.flg_priority ? 'Yes' : 'No'), sortable: true, sortKey: 'flg_priority', width: '100px' },
    { header: 'Color', accessor: (r: any) => (<div className="flex items-center gap-2"><span style={{ width: 18, height: 18, background: r.colorHex || '#FFFFFF', display: 'inline-block', borderRadius: 4, border: '1px solid #e5e7eb' }}></span><span>{r.colorHex || ''}</span></div>), sortable: true, sortKey: 'colorHex', width: '140px' },
  ];

  // Watch for start/end to validate in UI
  const startVal = watch('startPosition');
  const endVal = watch('endPosition');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Standing Zones</h1>
        <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Add Zone
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sport</label>
            <select value={filterSportId} onChange={(e) => { setFilterSportId(e.target.value); }} className="w-full px-3 py-2 border rounded">
              <option value="">All Sports</option>
              {sportsList.map((s: any) => (<option key={s.id} value={String(s.id)}>{s.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">League</label>
            <select value={filterLeagueId} onChange={(e) => { setFilterLeagueId(e.target.value); setFilterSeasonId(''); }} disabled={!filterSportId} className="w-full px-3 py-2 border rounded">
              <option value="">All Leagues</option>
              {leagues && leagues.map((l: any) => (<option key={l.id} value={String(l.id)}>{l.originalName || l.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Season</label>
            <select value={filterSeasonId} onChange={(e) => { setFilterSeasonId(e.target.value); }} disabled={!filterLeagueId} className="w-full px-3 py-2 border rounded">
              <option value="">All Seasons</option>
              {seasons && seasons.slice().sort((a: any, b: any) => (b.startYear - a.startYear)).map((s: any) => (<option key={s.id} value={String(s.id)}>{s.startYear}/{s.endYear}</option>))}
            </select>
          </div>

          <div className="flex items-end justify-end">
            {(filterSportId || filterLeagueId || filterSeasonId) && (
              <button onClick={() => { setFilterSportId(''); setFilterLeagueId(''); setFilterSeasonId(''); }} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">Clear filters</button>
            )}
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={displayList} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} emptyMessage="No zones found" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />

      {/* Pagination Controls */}
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

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editing ? 'Edit Standing Zone' : 'Add Standing Zone'} size="md">
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
            <label className="block text-sm font-medium text-gray-700">League *</label>
            <select {...register('leagueId', { required: 'League is required' })} disabled={!watch('sportId')} className="w-full px-3 py-2 border rounded">
              <option value="">Select league</option>
              {(() => {
                const sportIdVal = Number(watch('sportId'));
                const source = (modalLeagues && modalLeagues.length) ? modalLeagues : allLeagues.filter((ll: any) => ll.sportId === sportIdVal);
                return source.map((l: any) => (<option key={l.id} value={l.id}>{l.originalName || l.name}</option>));
              })()}
            </select>
            {errors.leagueId && <p className="text-red-600 text-sm">{errors.leagueId.message as any}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Season (optional)</label>
            <select {...register('seasonId')} disabled={!watch('leagueId')} className="w-full px-3 py-2 border rounded">
              <option value="">No season</option>
              {(() => {
                const leagueIdVal = Number(watch('leagueId'));
                const source = (modalSeasons && modalSeasons.length) ? modalSeasons : allSeasons.filter((ss: any) => ss.leagueId === leagueIdVal);
                const sorted = source.slice().sort((a: any, b: any) => (b.startYear - a.startYear));
                return sorted.map((s: any) => (<option key={s.id} value={s.id}>{s.startYear}/{s.endYear}</option>));
              })()}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input type="text" {...register('name', { required: 'Name required' })} className="w-full px-3 py-2 border rounded" />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message as any}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type of Standing *</label>
            <select {...register('typeOfStanding')} className="w-full px-3 py-2 border rounded">
              <option value="All">All</option>
              <option value="Combined">Combined</option>
              <option value="Group">Group</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Position *</label>
              <input type="number" {...register('startPosition', { required: 'Start position required', min: { value: 1, message: 'Minimum is 1' } })} className="w-full px-3 py-2 border rounded" />
              {errors.startPosition && <p className="text-red-600 text-sm">{errors.startPosition.message as any}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Position *</label>
              <input type="number" {...register('endPosition', { required: 'End position required', min: { value: 1, message: 'Minimum is 1' }, validate: (v) => { const s = Number(startVal); if (!v) return 'Required'; if (s && Number(v) < s) return 'End must be >= Start'; return true; } })} className="w-full px-3 py-2 border rounded" />
              {errors.endPosition && <p className="text-red-600 text-sm">{errors.endPosition.message as any}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Year (optional)</label>
              <input type="number" {...register('start_year')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Year (optional)</label>
              <input type="number" {...register('end_year')} className="w-full px-3 py-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" {...register('flg_priority')} className="form-checkbox" />
              <span className="text-sm">Priority (when overlapping, preferred)</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <div className="flex items-center gap-2">
              <input type="color" {...register('colorHex')} className="w-12 h-10 p-0 border rounded" />
              <input type="text" {...register('colorHex')} placeholder="#FFFFFF" className="w-full px-3 py-2 border rounded" />
            </div>
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
