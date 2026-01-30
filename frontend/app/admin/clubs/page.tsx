'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { clubsApi, citiesApi, countriesApi } from '@/lib/api/entities';
import { Club, CreateClubDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function ClubsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Sync pageInput with page state
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['clubs', page, limit, sortBy, sortOrder],
    queryFn: () => clubsApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const clubs = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => citiesApi.getAll({ page: 1, limit: 100 }),
  });

  const cities = citiesData?.data || [];

  const { data: countriesData } = useQuery({
    queryKey: ['countries'],
    queryFn: () => countriesApi.getAll({ page: 1, limit: 100 }),
  });

  const countries = countriesData?.data || [];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateClubDto>();

  const selectedCountryId = watch('countryId');
  const filteredCities = selectedCountryId 
    ? cities.filter(city => city.countryId === Number(selectedCountryId))
    : [];

  const createMutation = useMutation({
    mutationFn: clubsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      handleCloseModal();
      setMutationError(null); // Clear any previous errors
    },
    onError: (error: any) => {
      // Extract error message from API response
      const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred while creating the club';
      setMutationError(errorMessage);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateClubDto> }) =>
      clubsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      handleCloseModal();
      setMutationError(null); // Clear any previous errors
    },
    onError: (error: any) => {
      // Extract error message from API response
      const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred while updating the club';
      setMutationError(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clubsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClub(null);
    reset({});
  };

  const handleAdd = () => {
    setEditingClub(null);
    reset({});
    setIsModalOpen(true);
  };

  const handleEdit = (club: Club) => {
    setEditingClub(club);
    reset({
      name: club.name,
      shortName: club.shortName || '',
      foundationYear: club.foundationYear ?? undefined,
      cityId: club.cityId ? String(club.cityId) : undefined,
      countryId: club.countryId ? String(club.countryId) : undefined,
      imageUrl: club.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (club: Club) => {
    if (window.confirm(`Are you sure you want to delete ${club.name}?`)) {
      deleteMutation.mutate(club.id);
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

  const onSubmit = (data: CreateClubDto) => {
    const payload = {
      ...data,
      cityId: data.cityId ? Number(data.cityId) : null,
      countryId: Number(data.countryId),
      foundationYear: data.foundationYear ? Number(data.foundationYear) : null,
    };
    if (editingClub) {
      updateMutation.mutate({ id: editingClub.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' as keyof Club, sortKey: 'name', sortable: true, width: '200px' },
    { header: 'Short Name', accessor: 'shortName' as keyof Club, sortKey: 'shortName', sortable: true, width: '120px' },
    { 
      header: 'Foundation', 
      accessor: 'foundationYear' as keyof Club,
      className: 'text-center',
      sortKey: 'foundationYear',
      sortable: true,
      width: '140px',
    },
    {
      header: 'City',
      accessor: (club: Club) => club.city?.name || '-',
      sortKey: 'cityId',
      sortable: true,
      width: '150px',
    },
    {
      header: 'Country',
      accessor: (club: Club) => club.country?.name || '-',
      sortKey: 'countryId',
      sortable: true,
      width: '150px',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clubs</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Club
        </button>
      </div>

      <DataTable
        columns={columns}
        data={clubs}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No clubs found. Click 'Add Club' to create one."
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
        title={editingClub ? 'Edit Club' : 'Add Club'}
        size="sm"
      >
        {mutationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{mutationError}</p>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Fluminense"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name
            </label>
            <input
              type="text"
              {...register('shortName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., FLU"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foundation Year
            </label>
            <input
              type="number"
              {...register('foundationYear', {
                valueAsNumber: true,
                min: {
                  value: 1800,
                  message: 'Foundation year must be 1800 or later'
                },
                max: {
                  value: new Date().getFullYear(),
                  message: 'Foundation year cannot be in the future'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1902"
            />
            {errors.foundationYear && (
              <p className="mt-1 text-sm text-red-600">{errors.foundationYear.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <select
              {...register('countryId', { required: 'Country is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.countryId && (
              <p className="mt-1 text-sm text-red-600">{errors.countryId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <select
              {...register('cityId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedCountryId}
            >
              <option value="">
                {selectedCountryId ? 'Select a city (optional)' : 'Select a country first'}
              </option>
              {filteredCities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shield/Image URL
            </label>
            <input
              type="text"
              {...register('imageUrl')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/shield.png"
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
                : editingClub
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
