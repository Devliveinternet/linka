import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, Users as UsersIcon, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth, AuthUser } from '../../context/AuthContext';

const CHILD_VIEW_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'map', label: 'Mapa da Frota' },
  { id: 'vehicles', label: 'Veículos' },
  { id: 'alerts', label: 'Alertas' },
  { id: 'trips', label: 'Viagens' },
];

interface UserHierarchyManagerProps {
  currentUser: AuthUser;
  isAdmin: boolean;
}

type Feedback = { type: 'success' | 'error'; message: string } | null;

type MasterFormState = {
  name: string;
  email: string;
  password: string;
  maxChildUsers: number;
  childDeviceLimit: number;
  childAllowedViews: string[];
  childCanExportReports: boolean;
  childCanManageDrivers: boolean;
};

type ChildFormState = {
  name: string;
  email: string;
  password: string;
  parentId: string;
  allowedViews: string[];
  deviceLimit: number;
  canExportReports: boolean;
  canManageDrivers: boolean;
  canAcknowledgeAlerts: boolean;
};

function toPositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

export const UserHierarchyManager: React.FC<UserHierarchyManagerProps> = ({ currentUser, isAdmin }) => {
  const { apiFetch, refreshProfile } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [creatingMaster, setCreatingMaster] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);

  const masterInitialState = useMemo<MasterFormState>(() => ({
    name: '',
    email: '',
    password: '',
    maxChildUsers: 10,
    childDeviceLimit: 50,
    childAllowedViews: CHILD_VIEW_OPTIONS.map((option) => option.id),
    childCanExportReports: false,
    childCanManageDrivers: false,
  }), []);

  const [masterForm, setMasterForm] = useState<MasterFormState>(masterInitialState);
  const [childForm, setChildForm] = useState<ChildFormState>({
    name: '',
    email: '',
    password: '',
    parentId: isAdmin ? '' : currentUser.id,
    allowedViews: ['dashboard', 'map', 'alerts'],
    deviceLimit: 10,
    canExportReports: false,
    canManageDrivers: false,
    canAcknowledgeAlerts: true,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ users: AuthUser[] }>('/users');
      setUsers(data.users || []);
      setFeedback(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar usuários';
      setFeedback({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!isAdmin) {
      setChildForm((prev) => ({ ...prev, parentId: currentUser.id }));
    }
  }, [isAdmin, currentUser.id]);

  const masters = useMemo(() => {
    const list = users.filter((user) => user.role === 'master');
    if (isAdmin) return list;
    return list.filter((user) => user.id === currentUser.id);
  }, [users, isAdmin, currentUser.id]);

  const masterMap = useMemo(() => new Map(masters.map((master) => [master.id, master])), [masters]);

  useEffect(() => {
    if (isAdmin && !childForm.parentId && masters.length) {
      setChildForm((prev) => ({ ...prev, parentId: masters[0].id }));
    }
  }, [isAdmin, masters, childForm.parentId]);

  const childOwner = useMemo(() => {
    if (isAdmin) {
      return masterMap.get(childForm.parentId) || masters[0];
    }
    return masterMap.get(currentUser.id) || masters[0];
  }, [isAdmin, childForm.parentId, masterMap, masters, currentUser.id]);

  const childPolicies = childOwner?.restrictions?.masterPolicies;
  const allowedChildViews = childPolicies?.childAllowedViews ?? CHILD_VIEW_OPTIONS.map((option) => option.id);
  const childDeviceLimit = childPolicies?.childDeviceLimit ?? 50;
  const canGrantReports = childPolicies?.childCanExportReports ?? false;
  const canGrantDrivers = childPolicies?.childCanManageDrivers ?? false;
  const childLimit = childPolicies?.maxChildUsers ?? null;

  const childUsers = useMemo(() => {
    const list = users.filter((user) => user.role === 'child');
    if (isAdmin) return list;
    return list.filter((user) => user.parentId === currentUser.id);
  }, [users, isAdmin, currentUser.id]);

  const childUsersByMaster = useMemo(() => {
    const map = new Map<string, AuthUser[]>();
    for (const child of childUsers) {
      const key = child.parentId || 'unknown';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(child);
    }
    return map;
  }, [childUsers]);

  const remainingSlots = useMemo(() => {
    if (!childOwner || childLimit == null) return null;
    const used = childUsersByMaster.get(childOwner.id)?.length ?? 0;
    return childLimit - used;
  }, [childOwner, childLimit, childUsersByMaster]);

  const resetMasterForm = () => setMasterForm(masterInitialState);
  const resetChildForm = () => setChildForm({
    name: '',
    email: '',
    password: '',
    parentId: isAdmin ? (masters[0]?.id || '') : currentUser.id,
    allowedViews: allowedChildViews.includes('dashboard') ? ['dashboard'] : [allowedChildViews[0] ?? 'dashboard'],
    deviceLimit: Math.min(10, childDeviceLimit),
    canExportReports: false,
    canManageDrivers: false,
    canAcknowledgeAlerts: true,
  });

  const handleCreateMaster = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!masterForm.name.trim() || !masterForm.email.trim() || !masterForm.password.trim()) {
      setFeedback({ type: 'error', message: 'Preencha nome, e-mail e senha do usuário mestre.' });
      return;
    }
    setCreatingMaster(true);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: masterForm.name.trim(),
          email: masterForm.email.trim().toLowerCase(),
          password: masterForm.password,
          role: 'master',
          restrictions: {
            masterPolicies: {
              maxChildUsers: toPositiveInteger(masterForm.maxChildUsers, 10),
              childDeviceLimit: toPositiveInteger(masterForm.childDeviceLimit, 50),
              childAllowedViews: masterForm.childAllowedViews.filter((view) => CHILD_VIEW_OPTIONS.some((opt) => opt.id === view)),
              childCanExportReports: masterForm.childCanExportReports,
              childCanManageDrivers: masterForm.childCanManageDrivers,
            },
          },
        }),
      });
      setFeedback({ type: 'success', message: 'Usuário mestre criado com sucesso.' });
      resetMasterForm();
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível criar o usuário mestre';
      setFeedback({ type: 'error', message });
    } finally {
      setCreatingMaster(false);
    }
  };

  const handleCreateChild = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!childForm.name.trim() || !childForm.email.trim() || !childForm.password.trim()) {
      setFeedback({ type: 'error', message: 'Preencha nome, e-mail e senha do usuário filho.' });
      return;
    }
    if (isAdmin && !childForm.parentId) {
      setFeedback({ type: 'error', message: 'Selecione um usuário mestre responsável.' });
      return;
    }
    setCreatingChild(true);
    try {
      const allowedViews = childForm.allowedViews.filter((view) => allowedChildViews.includes(view));
      const payload = {
        name: childForm.name.trim(),
        email: childForm.email.trim().toLowerCase(),
        password: childForm.password,
        role: 'child',
        parentId: isAdmin ? childForm.parentId : currentUser.id,
        restrictions: {
          allowedViews: allowedViews.length ? allowedViews : [allowedChildViews[0]],
          deviceLimit: Math.min(toPositiveInteger(childForm.deviceLimit, 10), childDeviceLimit),
          canExportReports: canGrantReports ? childForm.canExportReports : false,
          canManageDrivers: canGrantDrivers ? childForm.canManageDrivers : false,
          canAcknowledgeAlerts: childForm.canAcknowledgeAlerts,
        },
      };
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setFeedback({ type: 'success', message: 'Usuário filho criado com sucesso.' });
      resetChildForm();
      await fetchUsers();
      if (!isAdmin) {
        await refreshProfile();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível criar o usuário filho';
      setFeedback({ type: 'error', message });
    } finally {
      setCreatingChild(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h2>
          <p className="text-gray-600">Controle hierárquico entre administrador, mestres e usuários filhos</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span>{isAdmin ? 'Administrador com acesso total' : 'Acesso mestre para criar usuários filhos'}</span>
        </div>
      </div>

      {feedback && (
        <div
          className={`border rounded-xl px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando usuários...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <section className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-blue-600" /> Usuários Mestre
                  </h3>
                  <p className="text-sm text-gray-500">Responsáveis por cadastrar e gerenciar usuários filhos</p>
                </div>
                <span className="text-sm text-gray-500">{masters.length} mestre(s) cadastrados</span>
              </div>

              <div className="space-y-4">
                {masters.map((master) => {
                  const policies = master.restrictions?.masterPolicies;
                  const children = childUsersByMaster.get(master.id) || [];
                  return (
                    <div key={master.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">{master.name}</h4>
                          <p className="text-sm text-gray-500">{master.email}</p>
                          <p className="text-xs text-gray-400 mt-1">ID: {master.id}</p>
                        </div>
                        {policies && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                            <p>
                              <strong>Limite de filhos:</strong> {policies.maxChildUsers}
                            </p>
                            <p>
                              <strong>Dispositivos por filho:</strong> até {policies.childDeviceLimit}
                            </p>
                            <p>
                              <strong>Funcionalidades:</strong>{' '}
                              {[
                                policies.childCanExportReports && 'relatórios',
                                policies.childCanManageDrivers && 'gestão de motoristas',
                              ]
                                .filter(Boolean)
                                .join(', ') || 'acesso básico'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Usuários filhos ({children.length})</p>
                        <div className="space-y-2">
                          {children.length === 0 ? (
                            <p className="text-sm text-gray-400">Nenhum usuário filho cadastrado.</p>
                          ) : (
                            children.map((child) => (
                              <div key={child.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                                <div>
                                  <p className="font-medium text-gray-800">{child.name}</p>
                                  <p className="text-xs text-gray-500">{child.email}</p>
                                </div>
                                <div className="text-xs text-gray-500 text-right">
                                  <p>Acessos: {(child.restrictions?.allowedViews || []).join(', ') || '---'}</p>
                                  <p>Limite dispositivos: {child.restrictions?.deviceLimit ?? '---'}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Regras de acesso para usuários filhos</h3>
                  <p className="text-sm text-gray-500">
                    Defina quais módulos e permissões cada usuário filho pode acessar. As restrições respeitam o limite definido pelo mestre responsável.
                  </p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleCreateChild}>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuário mestre responsável</label>
                    <select
                      value={childForm.parentId}
                      onChange={(event) => setChildForm((prev) => ({ ...prev, parentId: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um mestre</option>
                      {masters.map((master) => (
                        <option key={master.id} value={master.id}>
                          {master.name} ({master.email})
                        </option>
                      ))}
                    </select>
                    {remainingSlots != null && (
                      <p className="text-xs text-gray-500 mt-1">
                        {remainingSlots > 0
                          ? `${remainingSlots} vaga(s) disponível(is) para este mestre`
                          : 'Limite de usuários filhos atingido para este mestre'}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={childForm.name}
                      onChange={(event) => setChildForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={childForm.email}
                      onChange={(event) => setChildForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="usuario@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input
                    type="password"
                    value={childForm.password}
                    onChange={(event) => setChildForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Mínimo de 6 caracteres"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">Módulos permitidos</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CHILD_VIEW_OPTIONS.map((option) => {
                      const disabled = !allowedChildViews.includes(option.id);
                      const checked = childForm.allowedViews.includes(option.id) && !disabled;
                      return (
                        <label
                          key={option.id}
                          className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${
                            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={checked}
                            onChange={() => {
                              setChildForm((prev) => {
                                const alreadySelected = prev.allowedViews.includes(option.id);
                                if (alreadySelected) {
                                  return { ...prev, allowedViews: prev.allowedViews.filter((view) => view !== option.id) };
                                }
                                return { ...prev, allowedViews: [...prev.allowedViews, option.id] };
                              });
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Limite de dispositivos</label>
                    <input
                      type="number"
                      min={1}
                      max={childDeviceLimit}
                      value={childForm.deviceLimit}
                      onChange={(event) => setChildForm((prev) => ({ ...prev, deviceLimit: Number(event.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Máximo permitido: {childDeviceLimit} dispositivos</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Permissões extras</label>
                    <label className={`flex items-center gap-2 text-sm ${canGrantReports ? '' : 'opacity-50'}`}>
                      <input
                        type="checkbox"
                        disabled={!canGrantReports}
                        checked={canGrantReports && childForm.canExportReports}
                        onChange={(event) => setChildForm((prev) => ({ ...prev, canExportReports: event.target.checked }))}
                      />
                      Pode exportar relatórios
                    </label>
                    <label className={`flex items-center gap-2 text-sm ${canGrantDrivers ? '' : 'opacity-50'}`}>
                      <input
                        type="checkbox"
                        disabled={!canGrantDrivers}
                        checked={canGrantDrivers && childForm.canManageDrivers}
                        onChange={(event) => setChildForm((prev) => ({ ...prev, canManageDrivers: event.target.checked }))}
                      />
                      Pode gerenciar motoristas
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={childForm.canAcknowledgeAlerts}
                        onChange={(event) => setChildForm((prev) => ({ ...prev, canAcknowledgeAlerts: event.target.checked }))}
                      />
                      Pode reconhecer alertas
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingChild || (remainingSlots != null && remainingSlots <= 0)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    creatingChild || (remainingSlots != null && remainingSlots <= 0)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {creatingChild ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Criar usuário filho
                    </>
                  )}
                </button>
              </form>
            </section>
          </div>

          <div className="space-y-6">
            {isAdmin && (
              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo usuário mestre</h3>
                <form className="space-y-4" onSubmit={handleCreateMaster}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={masterForm.name}
                      onChange={(event) => setMasterForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={masterForm.email}
                      onChange={(event) => setMasterForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <input
                      type="password"
                      value={masterForm.password}
                      onChange={(event) => setMasterForm((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de usuários filhos</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={masterForm.maxChildUsers}
                        onChange={(event) => setMasterForm((prev) => ({ ...prev, maxChildUsers: Number(event.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Limite de dispositivos por filho</label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={masterForm.childDeviceLimit}
                        onChange={(event) => setMasterForm((prev) => ({ ...prev, childDeviceLimit: Number(event.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Módulos permitidos para usuários filhos</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CHILD_VIEW_OPTIONS.map((option) => (
                        <label key={option.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-blue-400">
                          <input
                            type="checkbox"
                            checked={masterForm.childAllowedViews.includes(option.id)}
                            onChange={() => {
                              setMasterForm((prev) => {
                                const already = prev.childAllowedViews.includes(option.id);
                                if (already) {
                                  return { ...prev, childAllowedViews: prev.childAllowedViews.filter((view) => view !== option.id) };
                                }
                                return { ...prev, childAllowedViews: [...prev.childAllowedViews, option.id] };
                              });
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Permissões adicionais</label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={masterForm.childCanExportReports}
                        onChange={(event) => setMasterForm((prev) => ({ ...prev, childCanExportReports: event.target.checked }))}
                      />
                      Permitir exportação de relatórios pelos filhos
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={masterForm.childCanManageDrivers}
                        onChange={(event) => setMasterForm((prev) => ({ ...prev, childCanManageDrivers: event.target.checked }))}
                      />
                      Permitir gestão de motoristas pelos filhos
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingMaster}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      creatingMaster ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {creatingMaster ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Criar usuário mestre
                      </>
                    )}
                  </button>
                </form>
              </section>
            )}

            <section className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Resumo da hierarquia</h3>
              <p className="text-sm text-gray-500 mb-4">
                Estrutura atual de usuários cadastrados no sistema.
              </p>
              <div className="space-y-3 text-sm">
                <p><strong>Administrador:</strong> acesso total (apenas 1)</p>
                <p><strong>Usuários mestre:</strong> {masters.length}</p>
                <p><strong>Usuários filhos visíveis:</strong> {childUsers.length}</p>
                {childOwner && (
                  <p>
                    <strong>Mestre selecionado:</strong> {childOwner.name} — limite restante de filhos:{' '}
                    {remainingSlots != null ? Math.max(remainingSlots, 0) : 'ilimitado'}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
