'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Shield } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { permissionsApi, menuItemsApi } from '@/lib/api/entities';
import { User, CreateUserDto, UpdateUserDto } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsModal, setPermissionsModal] = useState<User | null>(null);
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
    queryKey: ['users', page, limit, sortBy, sortOrder],
    queryFn: () => authApi.getAllUsers({ page, limit, sortBy, sortOrder }),
  });

  const users = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: menuItemsData } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => menuItemsApi.getAll({ page: 1, limit: 1000 }),
  });

  const menuItems = menuItemsData?.data || [];

  const { data: userPermissions = [] } = useQuery({
    queryKey: ['userPermissions', permissionsModal?.id],
    queryFn: () => permissionsApi.getUserPermissions(permissionsModal!.id),
    enabled: !!permissionsModal,
  });

  const { data: allowedMenuItems = [] } = useQuery({
    queryKey: ['allowedMenuItems', permissionsModal?.id],
    queryFn: () => permissionsApi.getUserAllowedMenuItems(permissionsModal!.id),
    enabled: !!permissionsModal,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserDto | UpdateUserDto>();

  const createMutation = useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) =>
      authApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: authApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const togglePermissionMutation = useMutation({
    mutationFn: async ({ userId, menuItemId, currentlyEnabled }: { userId: number; menuItemId: number; currentlyEnabled: boolean }) => {
      const existing = userPermissions.find(up => up.menuItemId === menuItemId);
      if (existing) {
        return permissionsApi.updateUserPermission(existing.id, { isEnabled: !currentlyEnabled });
      } else {
        return permissionsApi.createUserPermission({ userId, menuItemId, isEnabled: !currentlyEnabled });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      queryClient.invalidateQueries({ queryKey: ['allowedMenuItems'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset({});
  };

  const handleAdd = () => {
    setEditingUser(null);
    reset({});
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    reset({
      username: user.username,
      email: user.email,
      profile: user.profile,
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.username}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleManagePermissions = (user: User) => {
    setPermissionsModal(user);
  };

  const onSubmit = (data: any) => {
    if (editingUser) {
      const updateData: UpdateUserDto = {
        username: data.username,
        email: data.email,
        profile: data.profile,
        isActive: data.isActive,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createMutation.mutate(data as CreateUserDto);
    }
  };

  const isMenuItemEnabled = (menuItemId: number) => {
    return allowedMenuItems.some(mi => mi.id === menuItemId);
  };

  const columns = [
    { header: 'Username', accessor: 'username' as keyof User, sortKey: 'username', sortable: true, width: '180px' },
    { header: 'Email', accessor: 'email' as keyof User, sortKey: 'email', sortable: true, width: '250px' },
    {
      header: 'Profile',
      accessor: (user: User) => (
        <span className={`px-2 py-1 text-xs rounded ${
          user.profile === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {user.profile.charAt(0).toUpperCase() + user.profile.slice(1)}
        </span>
      ),
      sortKey: 'profile',
      sortable: true,
      width: '120px',
    },
    {
      header: 'Status',
      accessor: (user: User) => (
        <span className={`px-2 py-1 text-xs rounded ${
          user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
      sortKey: 'isActive',
      sortable: true,
      width: '110px',
    },
  ];

  const finalUserMenuItems = menuItems.filter(mi => mi.category === 'final_user');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Users</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        emptyMessage="No users found. Click 'Add User' to create one."
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

      {/* Custom action button for permissions */}
      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {users.filter(u => u.profile === 'final_user').map((user) => (
            <button
              key={user.id}
              onClick={() => handleManagePermissions(user)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
            >
              <Shield size={16} />
              {user.username} Permissions
            </button>
          ))}
        </div>
      </div>

      {/* User Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Edit User' : 'Add User'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              {...register('username', { required: 'Username is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {editingUser ? '' : '*'}
            </label>
            <input
              type="password"
              {...register('password', { required: !editingUser ? 'Password is required' : false })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={editingUser ? 'Leave blank to keep current' : ''}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile *
            </label>
            <select
              {...register('profile', { required: 'Profile is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a profile</option>
              <option value="admin">Admin</option>
              <option value="final_user">Final User</option>
            </select>
            {errors.profile && (
              <p className="mt-1 text-sm text-red-600">{errors.profile.message}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              defaultChecked={editingUser?.isActive ?? true}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
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
                : editingUser
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={!!permissionsModal}
        onClose={() => setPermissionsModal(null)}
        title={`Manage Permissions - ${permissionsModal?.username}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Control which menu items this user can access. Green checkmarks indicate allowed items.
          </p>

          <div className="space-y-2">
            {finalUserMenuItems.map((menuItem) => {
              const isEnabled = isMenuItemEnabled(menuItem.id);
              return (
                <div
                  key={menuItem.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div>
                    <p className="font-medium">{menuItem.name}</p>
                    <p className="text-xs text-gray-500">{menuItem.code}</p>
                  </div>
                  <button
                    onClick={() =>
                      togglePermissionMutation.mutate({
                        userId: permissionsModal!.id,
                        menuItemId: menuItem.id,
                        currentlyEnabled: isEnabled,
                      })
                    }
                    disabled={togglePermissionMutation.isPending}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isEnabled
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
