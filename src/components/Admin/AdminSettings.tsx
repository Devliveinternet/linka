import React, { useState } from 'react';
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
  Bell
} from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('maps');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('AIzaSyDpQqXey9TOX1qbuScxWuvW9Hg057DQaas');
  const [tempApiKey, setTempApiKey] = useState('AIzaSyDpQqXey9TOX1qbuScxWuvW9Hg057DQaas');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const tabs = [
    { id: 'maps', label: 'Mapas', icon: Map },
    { id: 'system', label: 'Sistema', icon: SettingsIcon },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'integrations', label: 'Integrações', icon: Globe },
  ];

  const testGoogleMapsAPI = async (testApiKey: string) => {
    if (!testApiKey.trim()) {
      setApiTestResult({ success: false, message: 'Chave da API é obrigatória' });
      return false;
    }

    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      const loader = new Loader({
        apiKey: testApiKey,
        version: 'weekly',
        libraries: ['maps', 'marker']
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
      setIsTestingApi(false);
    }
  };

  const handleSaveApiKey = async () => {
    const isValid = await testGoogleMapsAPI(tempApiKey);
    if (isValid) {
      setGoogleMapsApiKey(tempApiKey);
      localStorage.setItem('googleMapsApiKey', tempApiKey);
    }
  };

  const handleTestApi = () => {
    testGoogleMapsAPI(tempApiKey);
  };

  const renderMapsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuração do Google Maps</h3>
        <p className="text-sm text-gray-600">Configure a chave da API para habilitar mapas interativos</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Key className="text-blue-600 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Chave da API do Google Maps</h4>
            <p className="text-sm text-blue-700 mb-4">
              Para usar mapas interativos, você precisa configurar uma chave da API do Google Maps com faturamento habilitado.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave da API
                </label>
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
                  onClick={handleSaveApiKey}
                  disabled={isTestingApi || !tempApiKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar Configuração
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
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
            <strong className="text-red-600">IMPORTANTE:</strong> Habilite o faturamento no projeto 
            (obrigatório mesmo para uso gratuito)
          </li>
        </ol>
        
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
            <div>
              <p className="text-sm font-medium text-yellow-800">Faturamento Obrigatório</p>
              <p className="text-sm text-yellow-700 mt-1">
                O Google Maps requer que o faturamento esteja habilitado no projeto, mesmo para uso dentro 
                da cota gratuita. Sem isso, você receberá erros de "BillingNotEnabledMapError".
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Configuration */}
      {googleMapsApiKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-600" size={16} />
            <h4 className="font-medium text-green-900">Configuração Ativa</h4>
          </div>
          <p className="text-sm text-green-700">
            Google Maps está configurado e funcionando. A chave da API está salva e sendo usada nos mapas da plataforma.
          </p>
        </div>
      )}
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