import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Vehicle } from '../../types';
import { DriverFormValues } from '../../context/DriverContext';

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DriverFormValues) => Promise<void> | void;
  vehicles: Vehicle[];
  initialValues?: Partial<DriverFormValues> & { name?: string; license?: string };
  title?: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
}

const defaultValues: DriverFormValues = {
  name: '',
  license: '',
  phone: '',
  email: '',
  status: 'active',
  score: 80,
  vehicleId: undefined,
};

export const DriverFormModal: React.FC<DriverFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  vehicles,
  initialValues,
  title = 'Novo Motorista',
  confirmLabel = 'Salvar Motorista',
  isSubmitting = false,
}) => {
  const [values, setValues] = useState<DriverFormValues>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setValues(prev => ({
        ...defaultValues,
        ...initialValues,
        status: initialValues?.status ?? defaultValues.status,
        score: typeof initialValues?.score === 'number' ? initialValues.score : defaultValues.score,
      }));
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const availableVehicles = useMemo(() => {
    return vehicles.map(vehicle => ({
      id: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      vehicleType: vehicle.vehicleType,
    }));
  }, [vehicles]);

  if (!isOpen) {
    return null;
  }

  const handleChange = <K extends keyof DriverFormValues>(field: K, value: DriverFormValues[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) {
      nextErrors.name = 'Informe o nome do motorista';
    }
    if (!values.license.trim()) {
      nextErrors.license = 'Informe a CNH do motorista';
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = 'Informe um email válido';
    }
    const scoreNumber = Number(values.score);
    if (Number.isNaN(scoreNumber) || scoreNumber < 0 || scoreNumber > 100) {
      nextErrors.score = 'O score deve estar entre 0 e 100';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    await onSubmit({
      ...values,
      name: values.name.trim(),
      license: values.license.trim(),
      phone: values.phone?.trim(),
      email: values.email?.trim(),
      score: Number(values.score),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="driver-name">
                Nome
              </label>
              <input
                id="driver-name"
                type="text"
                value={values.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nome completo"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="driver-license">
                CNH
              </label>
              <input
                id="driver-license"
                type="text"
                value={values.license}
                onChange={(event) => handleChange('license', event.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.license ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Número da CNH"
              />
              {errors.license && <p className="text-sm text-red-600 mt-1">{errors.license}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="driver-phone">
                Telefone
              </label>
              <input
                id="driver-phone"
                type="text"
                value={values.phone ?? ''}
                onChange={(event) => handleChange('phone', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="driver-email">
                Email
              </label>
              <input
                id="driver-email"
                type="email"
                value={values.email ?? ''}
                onChange={(event) => handleChange('email', event.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="email@exemplo.com"
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="driver-status">
                Status
              </label>
              <select
                id="driver-status"
                value={values.status}
                onChange={(event) => handleChange('status', event.target.value as DriverFormValues['status'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="driver-score">
                Score
              </label>
              <input
                id="driver-score"
                type="number"
                min={0}
                max={100}
                value={values.score ?? 0}
                onChange={(event) => handleChange('score', Number(event.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.score ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.score && <p className="text-sm text-red-600 mt-1">{errors.score}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="driver-vehicle">
                Veículo Vinculado
              </label>
              <select
                id="driver-vehicle"
                value={values.vehicleId ?? ''}
                onChange={(event) => handleChange('vehicleId', event.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sem veículo</option>
                {availableVehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} {vehicle.model ? `- ${vehicle.model}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="animate-spin" size={18} />}
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

