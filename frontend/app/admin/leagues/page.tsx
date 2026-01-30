'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { leaguesApi, sportsApi, countriesApi, citiesApi } from '@/lib/api/entities';
import { League, CreateLeagueDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function LeaguesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('originalName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  // Sync pageInput with page state
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['leagues', page, limit, sortBy, sortOrder],
    queryFn: () => leaguesApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const leagues = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll({ page: 1, limit: 100 }),
  });

  const sports = sportsData?.data || [];

  const { data: countriesData } = useQuery({
    queryKey: ['countries'],
    queryFn: () => countriesApi.getAll({ page: 1, limit: 100 }),
  });

  const countries = countriesData?.data || [];

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => citiesApi.getAll({ page: 1, limit: 100 }),
  });

  const cities = citiesData?.data || [];

  const { register, handleSubmit, reset, watch, setValue, clearErrors, formState: { errors } } = useForm<CreateLeagueDto>({
    defaultValues: {
      originalName: '',
      secondaryName: '',
      sportId: 0,
      countryId: 0,
      cityId: 0,
      flgDefault: false,
      typeOfSchedule: 'Round',
      numberOfRoundsMatches: 0,
      minDivisionsNumber: 0,
      maxDivisionsNumber: 0,
      divisionsTime: 0,
      hasOvertimeOverride: undefined,
      hasPenaltiesOverride: undefined,
      hasAscends: false,
      ascendsQuantity: 0,
      hasDescends: false,
      descendsQuantity: 0,
      hasSubLeagues: false,
      numberOfSubLeagues: 0,
      flgRoundAutomatic: true,
      imageUrl: '',
    }
  });

  // Watch form values for validation and filtering
  const watchCountryId = watch('countryId');
  const watchHasAscends = watch('hasAscends');
  const watchHasDescends = watch('hasDescends');
  const watchHasSubLeagues = watch('hasSubLeagues');
  const watchMinDivisions = watch('minDivisionsNumber');
  const watchMaxDivisions = watch('maxDivisionsNumber');
  const watchTypeOfSchedule = watch('typeOfSchedule');

  // Auto-update flgRoundAutomatic based on typeOfSchedule
  useEffect(() => {
    if (watchTypeOfSchedule === 'Date') {
      setValue('flgRoundAutomatic', false);
    } else if (watchTypeOfSchedule === 'Round') {
      setValue('flgRoundAutomatic', true);
    }
  }, [watchTypeOfSchedule, setValue]);

  // Filter cities by selected country
  const filteredCities = watchCountryId && watchCountryId !== 0
    ? cities.filter(city => city.countryId === Number(watchCountryId))
    : cities;

  // Reset cityId when country changes
  useEffect(() => {
    if (watchCountryId) {
      const currentCityId = watch('cityId');
      if (currentCityId) {
        const cityExists = filteredCities.some(city => city.id === currentCityId);
        if (!cityExists) {
          setValue('cityId', 0);
        }
      }
    }
  }, [watchCountryId, filteredCities, setValue, watch]);

  const createMutation = useMutation({
    mutationFn: leaguesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateLeagueDto> }) =>
      leaguesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: leaguesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLeague(null);
    reset({
      originalName: '',
      secondaryName: '',
      sportId: 0,
      countryId: 0,
      cityId: 0,
      flgDefault: false,
      typeOfSchedule: 'Round',
      numberOfRoundsMatches: 0,
      minDivisionsNumber: 0,
      maxDivisionsNumber: 0,
      divisionsTime: 0,
      hasOvertimeOverride: undefined,
      hasPenaltiesOverride: undefined,
      hasAscends: false,
      ascendsQuantity: 0,
      hasDescends: false,
      descendsQuantity: 0,
      hasSubLeagues: false,
      numberOfSubLeagues: 0,
      flgRoundAutomatic: true,
      imageUrl: '',
    });
  };

  const handleAdd = () => {
    setEditingLeague(null);
    reset({
      originalName: '',
      secondaryName: '',
      sportId: 0,
      countryId: 0,
      cityId: 0,
      flgDefault: false,
      typeOfSchedule: 'Round',
      numberOfRoundsMatches: 0,
      minDivisionsNumber: 0,
      maxDivisionsNumber: 0,
      divisionsTime: 0,
      hasOvertimeOverride: undefined,
      hasPenaltiesOverride: undefined,
      hasAscends: false,
      ascendsQuantity: 0,
      hasDescends: false,
      descendsQuantity: 0,
      hasSubLeagues: false,
      numberOfSubLeagues: 0,
      flgRoundAutomatic: true,
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (league: League) => {
    setEditingLeague(league);
    reset({
      originalName: league.originalName,
      secondaryName: league.secondaryName || '',
      sportId: league.sportId,
      countryId: league.countryId || 0,
      cityId: league.cityId || 0,
      flgDefault: league.flgDefault,
      typeOfSchedule: league.typeOfSchedule || 'Round',
      numberOfRoundsMatches: league.numberOfRoundsMatches || 0,
      minDivisionsNumber: league.minDivisionsNumber,
      maxDivisionsNumber: league.maxDivisionsNumber,
      divisionsTime: league.divisionsTime || 0,
      hasOvertimeOverride: league.hasOvertimeOverride,
      hasPenaltiesOverride: league.hasPenaltiesOverride,
      hasAscends: league.hasAscends,
      ascendsQuantity: league.ascendsQuantity || 0,
      hasDescends: league.hasDescends,
      descendsQuantity: league.descendsQuantity || 0,
      hasSubLeagues: league.hasSubLeagues,
      numberOfSubLeagues: league.numberOfSubLeagues || 0,
      flgRoundAutomatic: league.flgRoundAutomatic ?? true,
      imageUrl: league.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (league: League) => {
    if (window.confirm(`Are you sure you want to delete ${league.originalName}?`)) {
      deleteMutation.mutate(league.id);
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

  const onSubmit = async (data: CreateLeagueDto) => {
    // Validation: Number of Rounds/Matches is always required and must be > 0
    if (!data.numberOfRoundsMatches || data.numberOfRoundsMatches === 0) {
      const fieldLabel = data.typeOfSchedule === 'Round' ? 'Number of Rounds' : 'Number of Matches';
      alert(`${fieldLabel} is required and must be greater than 0`);
      return;
    }

    // Validation: Has checkboxes require corresponding values (in form order: Sub-leagues, Promotion, Relegation)
    if (data.hasSubLeagues && (!data.numberOfSubLeagues || data.numberOfSubLeagues === 0)) {
      alert('Number of Sub-Leagues is required when Has Sub-Leagues is checked');
      return;
    }
    if (!data.hasSubLeagues && data.numberOfSubLeagues && data.numberOfSubLeagues > 0) {
      alert('Number of Sub-Leagues must be 0 when Has Sub-Leagues is unchecked');
      return;
    }

    if (data.hasAscends && (!data.ascendsQuantity || data.ascendsQuantity === 0)) {
      alert('Promotion Quantity is required when Has Promotion is checked');
      return;
    }
    if (!data.hasAscends && data.ascendsQuantity && data.ascendsQuantity > 0) {
      alert('Promotion Quantity must be 0 when Has Promotion is unchecked');
      return;
    }

    if (data.hasDescends && (!data.descendsQuantity || data.descendsQuantity === 0)) {
      alert('Relegation Quantity is required when Has Relegation is checked');
      return;
    }
    if (!data.hasDescends && data.descendsQuantity && data.descendsQuantity > 0) {
      alert('Relegation Quantity must be 0 when Has Relegation is unchecked');
      return;
    }

    // Validation: Match Division rules
    const minDiv = Number(data.minDivisionsNumber) || 0;
    const maxDiv = Number(data.maxDivisionsNumber) || 0;
    const divTime = Number(data.divisionsTime) || 0;

    // Both min and max must be 0 or both > 0
    if ((minDiv === 0 && maxDiv > 0) || (minDiv > 0 && maxDiv === 0)) {
      alert('Min Match Division and Max Match Division must both be 0 or both greater than 0');
      return;
    }

    // Min must be <= Max
    if (minDiv > maxDiv) {
      alert('Min Match Division must be less than or equal to Max Match Division');
      return;
    }

    // If divisions > 0, division time must be > 0
    if (minDiv > 0 && maxDiv > 0 && divTime === 0) {
      alert('Division Time is required when Min and Max Match Division are greater than 0');
      return;
    }

    // If divisions are 0, division time must be 0
    if (minDiv === 0 && maxDiv === 0 && divTime > 0) {
      alert('Division Time must be 0 when Min and Max Match Division are 0');
      return;
    }

    // If user is trying to set flgDefault to true, check if another league of the same sport is already default
    if (data.flgDefault) {
      const currentDefaultLeague = leagues.find(league => 
        league.flgDefault && 
        league.sportId === Number(data.sportId) &&
        league.id !== editingLeague?.id
      );
      
      if (currentDefaultLeague) {
        const sportName = sports.find(s => s.id === Number(data.sportId))?.name || 'this sport';
        const userConfirmed = window.confirm(
          `The "${currentDefaultLeague.originalName}" is the current default league of the sport "${sportName}". Do you want to change it?`
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
      countryId: data.countryId && data.countryId !== 0 ? Number(data.countryId) : undefined,
      cityId: data.cityId && data.cityId !== 0 ? Number(data.cityId) : undefined,
      typeOfSchedule: data.typeOfSchedule,
      numberOfRoundsMatches: Number(data.numberOfRoundsMatches),
      minDivisionsNumber: minDiv,
      maxDivisionsNumber: maxDiv,
      divisionsTime: divTime > 0 ? divTime : undefined,
      hasOvertimeOverride: data.hasOvertimeOverride || undefined,
      hasPenaltiesOverride: data.hasPenaltiesOverride || undefined,
      hasAscends: data.hasAscends,
      ascendsQuantity: data.hasAscends && data.ascendsQuantity ? Number(data.ascendsQuantity) : 0,
      hasDescends: data.hasDescends,
      descendsQuantity: data.hasDescends && data.descendsQuantity ? Number(data.descendsQuantity) : 0,
      hasSubLeagues: data.hasSubLeagues,
      numberOfSubLeagues: data.hasSubLeagues && data.numberOfSubLeagues ? Number(data.numberOfSubLeagues) : 0,
      flgRoundAutomatic: data.flgRoundAutomatic ?? true,
      imageUrl: data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl : undefined,
    };
    if (editingLeague) {
      updateMutation.mutate({ id: editingLeague.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'originalName' as keyof League, sortKey: 'originalName', sortable: true, width: '180px' },
    { header: 'Secondary', accessor: 'secondaryName' as keyof League, sortKey: 'secondaryName', sortable: true, width: '110px' },
    {
      header: 'Sport',
      accessor: (league: League) => league.sport?.name || '-',
      sortKey: 'sportId',
      sortable: true,
      width: '100px',
    },
    {
      header: 'Country',
      accessor: (league: League) => league.country?.name || '-',
      sortKey: 'countryId',
      sortable: true,
      width: '110px',
    },
    {
      header: 'Default',
      accessor: (league: League) => league.flgDefault ? (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Yes
        </span>
      ) : (
        <span className="text-gray-400">No</span>
      ),
      sortKey: 'flgDefault',
      sortable: true,
      width: '80px',
    },
    {
      header: 'Auto Round',
      accessor: (league: League) => league.flgRoundAutomatic ? (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Yes
        </span>
      ) : (
        <span className="text-gray-400">No</span>
      ),
      sortKey: 'flgRoundAutomatic',
      sortable: true,
      width: '80px',
    },
    {
      header: 'Schedule',
      accessor: (league: League) => league.typeOfSchedule || 'Round',
      sortKey: 'typeOfSchedule',
      sortable: true,
      width: '70px',
    },
    {
      header: 'Rounds/Matches',
      accessor: (league: League) => league.numberOfRoundsMatches || 0,
      sortKey: 'numberOfRoundsMatches',
      sortable: true,
      width: '57px',
    },
    {
      header: 'Sub-Leagues',
      accessor: (league: League) => league.hasSubLeagues ? `Yes (${league.numberOfSubLeagues || 0})` : 'No',
      sortKey: 'hasSubLeagues',
      sortable: true,
      width: '95px',
    },
    {
      header: 'Promotion',
      accessor: (league: League) => league.hasAscends ? `Yes (${league.ascendsQuantity || 0})` : 'No',
      sortKey: 'hasAscends',
      sortable: true,
      width: '77px',
    },
    {
      header: 'Relegation',
      accessor: (league: League) => league.hasDescends ? `Yes (${league.descendsQuantity || 0})` : 'No',
      sortKey: 'hasDescends',
      sortable: true,
      width: 'auto',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leagues</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add League
        </button>
      </div>

      <DataTable
        columns={columns}
        data={leagues}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No leagues found. Click 'Add League' to create one."
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
        title={editingLeague ? 'Edit League' : 'Add League'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Line 1: Original Name and Secondary Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Name *
              </label>
              <input
                type="text"
                {...register('originalName', { required: 'Original name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., English Premier League"
              />
              {errors.originalName && (
                <p className="mt-1 text-sm text-red-600">{errors.originalName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Name
              </label>
              <input
                type="text"
                {...register('secondaryName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Premier League"
              />
            </div>
          </div>

          {/* Line 2: Sport, Country, City */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sport *
              </label>
              <select
                {...register('sportId', { required: 'Sport is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select sport</option>
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
                Country
              </label>
              <select
                {...register('countryId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <select
                {...register('cityId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select city</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line 3: Type of Schedule, Rounds, Has Sub-Leagues, Number of Sub-Leagues */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type of Schedule *
              </label>
              <select
                {...register('typeOfSchedule', { required: 'Type of schedule is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Round">Round</option>
                <option value="Date">Date</option>
              </select>
              {errors.typeOfSchedule && (
                <p className="mt-1 text-sm text-red-600">{errors.typeOfSchedule.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {watchTypeOfSchedule === 'Round' ? 'Number of Rounds' : 'Number of Matches'} *
              </label>
              <input
                type="number"
                {...register('numberOfRoundsMatches', { 
                  required: 'This field is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder={watchTypeOfSchedule === 'Round' ? '38' : '82'}
              />
              {errors.numberOfRoundsMatches && (
                <p className="mt-1 text-sm text-red-600">{errors.numberOfRoundsMatches.message}</p>
              )}
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                {...register('hasSubLeagues')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Has Sub-Leagues
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Sub-Leagues
              </label>
              <input
                type="number"
                min="0"
                {...register('numberOfSubLeagues', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="e.g., 2"
              />
            </div>
          </div>

          {/* Line 4: Has Promotion, Promotion Quantity, Has Relegation, Relegation Quantity */}
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                {...register('hasAscends')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Has Promotion
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promotion Quantity
              </label>
              <input
                type="number"
                min="0"
                {...register('ascendsQuantity', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="e.g., 3"
              />
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                {...register('hasDescends')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Has Relegation
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relegation Quantity
              </label>
              <input
                type="number"
                min="0"
                {...register('descendsQuantity', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="e.g., 3"
              />
            </div>
          </div>

          {/* Line 5: Min Match Division, Max Match Division, Division Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Match Division
              </label>
              <input
                type="number"
                min="0"
                {...register('minDivisionsNumber', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be at least 0' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="0"
              />
              {errors.minDivisionsNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.minDivisionsNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Match Division
              </label>
              <input
                type="number"
                min="0"
                {...register('maxDivisionsNumber', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be at least 0' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="0"
              />
              {errors.maxDivisionsNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.maxDivisionsNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division Time
              </label>
              <input
                type="number"
                min="0"
                {...register('divisionsTime', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="Optional override"
              />
            </div>
          </div>

          {/* Line 6: Has Overtime, Has Penalties, Auto Update Round, Default League */}
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                {...register('hasOvertimeOverride')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Has Overtime
              </label>
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                {...register('hasPenaltiesOverride')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Has Penalties
              </label>
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                {...register('flgRoundAutomatic')}
                disabled={watchTypeOfSchedule === 'Date'}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Auto Update Round
              </label>
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                {...register('flgDefault')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Default League
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="text"
              {...register('imageUrl')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/league-logo.png"
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
                : editingLeague
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
