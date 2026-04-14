'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaguesApi, sportsApi } from '@/lib/api/entities';
import { apiClient } from '@/lib/api/client';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

const POINT_SYSTEMS = [
  { id: 'FOOTBALL_3_1_0', label: 'Football 3-1-0', desc: 'Win=3, Draw=1, Loss=0' },
  { id: 'HOCKEY_2_0_OTL', label: 'Hockey 2-0 + OTL', desc: 'Win=2, OTL=1, Loss=0 (NHL/KHL)' },
  { id: 'HOCKEY_3_2_1_0', label: 'Hockey 3-2-1-0', desc: 'RegW=3, OTW=2, OTL=1, Loss=0 (SHL/DEL)' },
  { id: 'BASKETBALL_W_L', label: 'Basketball W-L', desc: 'Win=1, Loss=0 (win pct based)' },
  { id: 'VOLLEYBALL_3_2_1_0', label: 'Volleyball 3-2-1-0', desc: '3-0/3-1 win=3, 3-2 win=2, 2-3 loss=1' },
  { id: 'HANDBALL_2_1_0', label: 'Handball 2-1-0', desc: 'Win=2, Draw=1, Loss=0' },
];

export default function PointSystemsPage() {
  const [editing, setEditing] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState('');
  const queryClient = useQueryClient();

  const { data: sports } = useQuery({ queryKey: ['sports'], queryFn: () => sportsApi.getAll({ page: 1, limit: 200 }) });
  const sportsList = sports?.data || [];

  const { data: allLeaguesResp, isLoading } = useQuery({
    queryKey: ['leagues', 'all-point-systems'],
    queryFn: () => leaguesApi.getAll({ page: 1, limit: 1000 }),
  });
  const allLeagues = allLeaguesResp?.data || [];

  const updateMutation = useMutation({
    mutationFn: async ({ id, pointSystem }: { id: number; pointSystem: string }) => {
      const response = await apiClient.put(`/v1/leagues/${id}`, { pointSystem });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      setIsModalOpen(false);
      setEditing(null);
    },
  });

  const handleEdit = (row: any) => {
    setEditing(row);
    setSelectedSystem(row.pointSystem || 'FOOTBALL_3_1_0');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editing && selectedSystem) {
      updateMutation.mutate({ id: editing.id, pointSystem: selectedSystem });
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
      accessor: (r: any) => r.originalName,
      sortable: true, sortKey: 'originalName',
    },
    {
      header: 'Point System',
      accessor: (r: any) => {
        const ps = POINT_SYSTEMS.find(p => p.id === r.pointSystem);
        return ps ? ps.label : (r.pointSystem || 'FOOTBALL_3_1_0');
      },
      sortable: true, sortKey: 'pointSystem', width: '200px',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Point Systems</h1>
      </div>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Available Point Systems</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {POINT_SYSTEMS.map(ps => (
            <div key={ps.id} className="p-3 border rounded-lg">
              <div className="font-medium">{ps.label}</div>
              <div className="text-sm text-gray-500">{ps.id}</div>
              <div className="text-sm text-gray-600 mt-1">{ps.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={allLeagues}
        onEdit={handleEdit}
        isLoading={isLoading}
        emptyMessage="No leagues found"
      />

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditing(null); }} title="Update Point System" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League: <strong>{editing?.originalName}</strong>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Point System</label>
            <select value={selectedSystem} onChange={(e) => setSelectedSystem(e.target.value)} className="w-full px-3 py-2 border rounded">
              {POINT_SYSTEMS.map(ps => (
                <option key={ps.id} value={ps.id}>{ps.label} — {ps.desc}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); setEditing(null); }} className="px-4 py-2 text-gray-700 border rounded">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
