import React, { useEffect, useState } from 'react';
import {
  Save,
  Key,
  Map,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  Globe,
  Database,
  Mail,
  Bell,
  MapPin
} from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_SCRIPT_ID } from '../../utils/googleMaps';
import { mapProviders } from '../../data/mockData';
import type { MapProvider } from '../../types';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('maps');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedProvider, setSavedProvider] = useState<MapProvider['id']>('openstreetmap');
  const [providerSelection, setProviderSelection] = useState<MapProvider['id']>('openstreetmap');

  const tabs = [
    { id: 'maps', label: 'Mapas', icon: Map },
    { id: 'system', label: 'Sistema', icon: SettingsIcon },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'integrations', label: 'Integrações', icon: Globe },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedProvider = (localStorage.getItem('mapProvider') as MapProvider['id']) ?? 'openstreetmap';
    const resolved = storedProvider === 'google' || storedProvider === 'openstreetmap' ? storedProvider : 'openstreetmap';
    setSavedProvider(resolved);
    setProviderSelection(resolved);

    const storedKey = localStorage.getItem('googleMapsApiKey') ?? '';
    setGoogleMapsApiKey(storedKey);
    setTempApiKey(storedKey);
  }, []);

  useEffect(() => {
    if (providerSelection === 'google') {
      setTempApiKey(googleMapsApiKey);
    }
  }, [providerSelection, googleMapsApiKey]);

  const testGoogleMapsAPI = async (testApiKey: string) => {
    if (!testApiKey.trim()) {
      setApiTestResult({ success: false, message: 'Chave da API é obrigatória' });
      return false;
    }

    setIsTestingApi(true);
    setApiTestResult(null);

    if (typeof window === 'undefined') {
      setApiTestResult({ success: false, message: 'Este teste só pode ser executado no navegador.' });
      setIsTestingApi(false);
      return false;
    }

    const previousGoogle = (window as any).google;
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    existingScript?.remove();

    try {
      const loader = new Loader({
        apiKey: testApiKey,
        version: 'weekly',
        libraries: [...GOOGLE_MAPS_LIBRARIES],
        id: GOOGLE_MAPS_SCRIPT_ID
      });

      await loader.load();
      setApiTestResult({ success: true, message: 'Chave da API válida e funcionando!' });
      return true;
    } catch (err: any) {
      console.error('Google Maps API Error:', err);
      
      let errorMessage = 'Erro desconhecido ao testar a API';
      
      if (err.message?.includes('InvalidKeyMapError')) {
        errorMessage = 'Chave da API inválida. Verifique se a chave está correta e tem as permissões necessárias.';
      } else if (err.message?.includes('RefererNotAllowedMapError')) {
        errorMessage = 'Domínio não autorizado. Configure o domínio atual nas restrições da API.';
      } else if (err.message?.includes('RequestDeniedMapError')) {
        errorMessage = 'Solicitação negada. Verifique se a API Maps JavaScript está habilitada.';
      } else if (err.message?.includes('BillingNotEnabledMapError')) {
        errorMessage = 'Faturamento não habilitado. É necessário ativar o faturamento no Google Cloud Console para usar o Google Maps.';
      } else if (err.message?.includes('ApiNotActivatedMapError')) {
        errorMessage = 'API não ativada. Habilite a API Maps JavaScript no Google Cloud Console.';
      } else {
        errorMessage = `Erro ao carregar Google Maps: ${err.message}`;
      }
      
      setApiTestResult({ success: false, message: errorMessage });
      return false;
    } finally {
      const testScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
      testScript?.remove();
      if (existingScript) {
        document.head.appendChild(existingScript);
      }
      if (typeof previousGoogle !== 'undefined') {
        (window as any).google = previousGoogle;
      } else {
        delete (window as any).google;
      }
      setIsTestingApi(false);
    }
  };

  const handleSaveMapSettings = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mapProvider', providerSelection);
      setSavedProvider(providerSelection);
    }

    if (providerSelection === 'google') {
      const isValid = await testGoogleMapsAPI(tempApiKey);
      if (isValid) {
        setGoogleMapsApiKey(tempApiKey);
        if (typeof window !== 'undefined') {
          localStorage.setItem('googleMapsApiKey', tempApiKey);
        }
      }
    } else {
      setApiTestResult({
        success: true,
        message: 'Provedor OpenStreetMap salvo. Não é necessário informar chave de API.'
      });
    }
  };

  const handleTestApi = () => {
    testGoogleMapsAPI(tempApiKey);
  };

  const renderMapsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Provedor de mapas</h3>
        <p className="text-sm text-gray-600">Escolha entre Google Maps ou OpenStreetMap para exibir os mapas da plataforma</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mapProviders.map((provider) => {
          const isDisabled = provider.id === 'mapbox';
          const isSelected = providerSelection === provider.id;
          const statusLabel = provider.id === 'mapbox' ? 'Em breve' : provider.id === 'openstreetmap' ? 'Gratuito' : 'Requer chave';

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => {
                if (!isDisabled) {
                  setProviderSelection(provider.id);
                  if (provider.id !== 'google') {
                    setApiTestResult(null);
                  }
                }
              }}
              disabled={isDisabled}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-200'
              } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-gray-900">{provider.name}</h4>
                    {savedProvider === provider.id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Selecionado</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{provider.description}</p>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{statusLabel}</p>
                </div>
                <MapPin className={`w-8 h-8 ${isSelected ? 'text-blue-600' : 'text-gray-300'}`} />
              </div>
              {provider.features && (
                <ul className="mt-3 text-xs text-gray-500 space-y-1 list-disc list-inside">
                  {provider.features.slice(0, 3).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              )}
              {isDisabled && (
                <p className="mt-3 text-xs text-amber-600">Integração com {provider.name} disponível em breve.</p>
              )}
            </button>
          );
        })}
      </div>

      {providerSelection === 'google' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Key className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Chave da API do Google Maps</h4>
              <p className="text-sm text-blue-700 mb-4">
                Informe uma chave válida com faturamento habilitado para utilizar todos os recursos avançados do Google Maps.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chave da API</label>
                  <input
                    type="text"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSyC..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {apiTestResult && (
                  <div className={`border rounded-lg p-3 ${
                    apiTestResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {apiTestResult.success ? (
                        <CheckCircle className="text-green-600" size={16} />
                      ) : (
                        <AlertCircle className="text-red-600" size={16} />
                      )}
                      <p className={`text-sm ${
                        apiTestResult.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {apiTestResult.message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleTestApi}
                    disabled={isTestingApi || !tempApiKey.trim()}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTestingApi ? 'Testando...' : 'Testar API'}
                  </button>
                  <button
                    onClick={handleSaveMapSettings}
                    disabled={isTestingApi || !tempApiKey.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Salvar configuração
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle size={20} className="mt-0.5" />
          <div>
            <h4 className="font-medium">OpenStreetMap selecionado</h4>
            <p className="text-sm">
              Não é necessário configurar chave de API. Os mapas utilizam dados colaborativos gratuitos enquanto a integração com o Google não é habilitada.
            </p>
            <button
              onClick={handleSaveMapSettings}
              className="mt-3 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Salvar provedor
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Como configurar a API do Google Maps:</h4>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>
            Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a>
          </li>
          <li>Crie um projeto ou selecione um existente</li>
          <li>
            Vá em "APIs e Serviços" → "Biblioteca" e habilite:
            <ul className="ml-4 mt-1 space-y-1 list-disc list-inside">
              <li>Maps JavaScript API</li>
              <li>Geocoding API (opcional)</li>
              <li>Places API (opcional)</li>
            </ul>
          </li>
          <li>Vá em "Credenciais" e crie uma chave de API</li>
          <li>Configure as restrições de domínio se necessário</li>
          <li>
            <strong className="text-red-600">IMPORTANTE:</strong> Habilite o faturamento no projeto (obrigatório mesmo para uso gratuito)
          </li>
        </ol>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
            <div>
              <p className="text-sm text-yellow-800">
                Para evitar interrupções, monitore os limites de uso da API. O Google oferece crédito mensal gratuito que cobre a maioria dos ambientes de teste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  const renderSystemTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurações do Sistema</h3>
        <p className="text-sm text-gray-600">Configurações gerais da plataforma</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Plataforma
          </label>
          <input
            type="text"
            defaultValue="LINKA"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurações de Notificações</h3>
        <p className="text-sm text-gray-600">Configure as notificações do sistema</p>
      </div>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Integrações</h3>
        <p className="text-sm text-gray-600">Configure integrações com serviços externos</p>
      </div>
    </div>
  );

  const TabContent = () => {
    switch (activeTab) {
      case 'maps':
        return renderMapsTab();
      case 'system':
        return renderSystemTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'integrations':
        return renderIntegrationsTab();
      default:
        return renderMapsTab();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações da Plataforma</h2>
        <p className="text-gray-600">Configurações gerais e integrações do sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <TabContent />
          
          <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Save size={16} />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};