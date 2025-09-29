import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Shield, Users, Check, X } from 'lucide-react';
import { Role, Permission, AdminUser } from '../../types/admin';
import { mockRoles, mockPermissions, mockAdminUsers } from '../../data/adminMockData';

export const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [selectedRole, setSelectedRole] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPermissionsByModule = () => {
    const modules: Record<string, Permission[]> = {};
    mockPermissions.forEach(permission => {
      if (!modules[permission.module]) {
        modules[permission.module] = [];
      }
      modules[permission.module].push(permission);
    });
    return modules;
  };

  const getUsersWithRole = (roleId: string) => {
    return mockAdminUsers.filter(user => user.roleId === roleId);
  };

  const hasPermission = (role: Role, permissionId: string) => {
    return role.permissions.includes(permissionId);
  };

  const handleEdit = (role: Role) => {
    console.log('Edit role:', role);
  };

  const handleDelete = (roleId: string) => {
    const usersWithRole = getUsersWithRole(roleId);
    if (usersWithRole.length > 0) {
      alert(`Não é possível excluir este perfil. ${usersWithRole.length} usuário(s) ainda utilizam este perfil.`);
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir este perfil?')) {
      setRoles(prev => prev.filter(r => r.id !== roleId));
    }
  };

  const moduleLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    clients: 'Clientes',
    vehicles: 'Veículos',
    devices: 'Dispositivos',
    drivers: 'Motoristas',
    reports: 'Relatórios',
    system: 'Sistema'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Perfis e Permissões</h2>
          <p className="text-gray-600">Controle de acesso baseado em funções (RBAC)</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          Novo Perfil
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar perfis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Perfis de Acesso</h3>
          {filteredRoles.map((role) => {
            const usersCount = getUsersWithRole(role.id).length;
            const isSelected = selectedRole === role.id;
            
            return (
              <div 
                key={role.id}
                className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 ${
                  isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:shadow-md'
                }`}
                onClick={() => setSelectedRole(isSelected ? undefined : role.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Shield className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{role.name}</h4>
                        {role.isSystemRole && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            Sistema
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{usersCount} usuário(s)</span>
                        </div>
                        <div>
                          {role.permissions.length} permissão(ões)
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(role);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    {!role.isSystemRole && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(role.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Permissions Detail */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedRole ? `Permissões - ${roles.find(r => r.id === selectedRole)?.name}` : 'Selecione um perfil'}
          </h3>
          
          {selectedRole ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                {Object.entries(getPermissionsByModule()).map(([module, permissions]) => (
                  <div key={module} className="border-b border-gray-100 last:border-b-0">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                      <h4 className="font-medium text-gray-900">
                        {moduleLabels[module] || module}
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {permissions.map((permission) => {
                        const role = roles.find(r => r.id === selectedRole);
                        const hasAccess = role ? hasPermission(role, permission.id) : false;
                        
                        return (
                          <div key={permission.id} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {permission.description}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.name} • {permission.action}
                              </div>
                            </div>
                            <div className="flex items-center">
                              {hasAccess ? (
                                <Check className="text-green-500" size={20} />
                              ) : (
                                <X className="text-red-500" size={20} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um perfil</h3>
              <p className="text-gray-600">Clique em um perfil para visualizar suas permissões.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};