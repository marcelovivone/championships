'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { stadiumsApi, citiesApi, sportsApi } from '@/lib/api/entities';
import { Stadium, CreateStadiumDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function StadiumsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStadium, setEditingStadium] = useState<Stadium | null>(null);
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
    queryKey: ['stadiums', page, limit, sortBy, sortOrder],
    queryFn: () => stadiumsApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const stadiums = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => citiesApi.getAll({ page: 1, limit: 100 }),
  });

  const cities = citiesData?.data || [];

  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll({ page: 1, limit: 100 }),
  });

  const sports = sportsData?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateStadiumDto>();

  const createMutation = useMutation({
    mutationFn: stadiumsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stadiums'] });
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Create stadium error:', error);
      console.error('Error response:', (error as any).response?.data);
      alert(`Failed to create stadium: ${JSON.stringify((error as any).response?.data || error.message)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateStadiumDto> }) =>
      stadiumsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stadiums'] });
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Update stadium error:', error);
      alert(`Failed to update stadium: ${error.message || 'Unknown error'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: stadiumsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stadiums'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStadium(null);
    reset({});
  };

  const handleAdd = () => {
    setEditingStadium(null);
    reset({});
    setIsModalOpen(true);
  };

  const handleEdit = (stadium: Stadium) => {
    setEditingStadium(stadium);
    reset({
      name: stadium.name,
      cityId: stadium.cityId,
      capacity: stadium.capacity || undefined,
      type: stadium.type || 'stadium',
      sportId: stadium.sportId,
      yearConstructed: stadium.yearConstructed || undefined,
      imageUrl: stadium.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (stadium: Stadium) => {
    if (window.confirm(`Are you sure you want to delete ${stadium.name}?`)) {
      deleteMutation.mutate(stadium.id);
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

  const onSubmit = (data: CreateStadiumDto) => {
    // Ensure cityId is valid
    if (!data.cityId) {
      return;
    }
    
    if (editingStadium) {
      // For updates, use partial update with proper handling of optional fields
      const updatePayload: Partial<CreateStadiumDto> = {
        name: data.name,
        cityId: Number(data.cityId),
        sportId: Number(data.sportId),
        type: data.type,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        yearConstructed: data.yearConstructed ? Number(data.yearConstructed) : undefined,
        imageUrl: data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl : undefined,
      };
      
      // Only add sportId to payload if it's provided
      if (data.sportId) {
        updatePayload.sportId = Number(data.sportId);
      }

      updateMutation.mutate({ id: editingStadium.id, data: updatePayload });
    } else {
      // For creation, handle optional fields properly
      const createPayload: CreateStadiumDto = {
        name: data.name,
        cityId: Number(data.cityId),
        sportId: Number(data.sportId),
        type: data.type,
      };
      
      // Only add optional fields if they have valid values
      if (data.capacity) createPayload.capacity = Number(data.capacity);
      if (data.yearConstructed) createPayload.yearConstructed = Number(data.yearConstructed);
      if (data.imageUrl && data.imageUrl.trim() !== '') createPayload.imageUrl = data.imageUrl;
      if (data.sportId) createPayload.sportId = Number(data.sportId);
      
      createMutation.mutate(createPayload);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' as keyof Stadium, sortKey: 'name', sortable: true, width: '250px' },
    {
      header: 'City',
      accessor: (stadium: Stadium) => stadium.city?.name || '-',
      sortKey: 'cityId',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Sport',
      accessor: (stadium: Stadium) => stadium.sport?.name || '-',
      sortKey: 'sportId',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Type',
      accessor: (stadium: Stadium) => {
        return stadium.type === 'stadium' ? 'Stadium' : 'Gymnasium';
      },
      sortKey: 'type',
      sortable: true,
      width: '150px',
    },
    {
      header: 'Capacity',
      accessor: (stadium: Stadium) => stadium.capacity?.toLocaleString() || '-',
      className: 'text-right',
      sortKey: 'capacity',
      sortable: true,
      width: '120px',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stadiums/Gymnasiums</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Stadium
        </button>
      </div>

      <DataTable
        columns={columns}
        data={stadiums}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No stadiums found. Click 'Add Stadium' to create one."
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
        title={editingStadium ? 'Edit Stadium' : 'Add Stadium'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Maracanã"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <select
              {...register('cityId', { required: 'City is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            {errors.cityId && (
              <p className="mt-1 text-sm text-red-600">{errors.cityId.message}</p>
            )}
          </div>

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
              Capacity
            </label>
            <input
              type="number"
              {...register('capacity')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 78838"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              {...register('type', { required: 'Type is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="stadium">Stadium</option>
              <option value="gymnasium">Gymnasium</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year Constructed
            </label>
            <input
              type="number"
              {...register('yearConstructed')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1950"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="text"
              {...register('imageUrl')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/stadium.jpg"
            />
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
                : editingStadium
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}