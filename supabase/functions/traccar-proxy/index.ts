import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const TRACCAR_BASE_URL = 'http://linka.ddns.net:8082/api'

interface TraccarCredentials {
  email: string
  password: string
}

interface TraccarSession {
  sessionId: string
  expiresAt: number
}

// Cache de sessão simples (em produção, usar Redis ou similar)
let sessionCache: TraccarSession | null = null

async function authenticateWithTraccar(credentials: TraccarCredentials): Promise<string> {
  try {
    const response = await fetch(`${TRACCAR_BASE_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}`
    })

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`)
    }

    // Extrair JSESSIONID do cookie
    const setCookieHeader = response.headers.get('set-cookie')
    if (!setCookieHeader) {
      throw new Error('No session cookie received')
    }

    const sessionMatch = setCookieHeader.match(/JSESSIONID=([^;]+)/)
    if (!sessionMatch) {
      throw new Error('Session ID not found in cookie')
    }

    const sessionId = sessionMatch[1]
    
    // Cache da sessão por 1 hora
    sessionCache = {
      sessionId,
      expiresAt: Date.now() + (60 * 60 * 1000)
    }

    return sessionId
  } catch (error) {
    console.error('Traccar authentication error:', error)
    throw error
  }
}

async function getValidSession(): Promise<string> {
  // Verificar se temos uma sessão válida em cache
  if (sessionCache && sessionCache.expiresAt > Date.now()) {
    return sessionCache.sessionId
  }

  // Credenciais padrão (em produção, usar variáveis de ambiente)
  const credentials: TraccarCredentials = {
    email: 'admin@linka.com', // Você pode me passar as credenciais corretas
    password: 'admin123' // Você pode me passar as credenciais corretas
  }

  return await authenticateWithTraccar(credentials)
}

async function makeTraccarRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const sessionId = await getValidSession()
  
  const response = await fetch(`${TRACCAR_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Cookie': `JSESSIONID=${sessionId}`,
      'Content-Type': 'application/json'
    }
  })

  // Se a sessão expirou, limpar cache e tentar novamente
  if (response.status === 401) {
    sessionCache = null
    const newSessionId = await getValidSession()
    
    return await fetch(`${TRACCAR_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': `JSESSIONID=${newSessionId}`,
        'Content-Type': 'application/json'
      }
    })
  }

  return response
}

// Transformar dados do Traccar para o formato do nosso sistema
function transformTraccarDevice(traccarDevice: any, position?: any): any {
  return {
    id: traccarDevice.id.toString(),
    tenantId: 't_001', // Fixo por enquanto
    imei: traccarDevice.uniqueId,
    iccid: traccarDevice.phone || '',
    model: traccarDevice.model || 'Unknown',
    protocol: traccarDevice.protocol || 'Unknown',
    status: traccarDevice.disabled ? 'inactive' : (position ? 'online' : 'offline'),
    lastUpdate: traccarDevice.lastUpdate || new Date().toISOString(),
    position: position ? transformTraccarPosition(position) : undefined
  }
}

function transformTraccarPosition(traccarPosition: any): any {
  return {
    id: traccarPosition.id.toString(),
    deviceId: traccarPosition.deviceId.toString(),
    timestamp: traccarPosition.deviceTime || traccarPosition.serverTime,
    lat: traccarPosition.latitude,
    lon: traccarPosition.longitude,
    speed: Math.round(traccarPosition.speed * 1.852), // Converter de nós para km/h
    heading: traccarPosition.course || 0,
    ignition: traccarPosition.attributes?.ignition || false,
    odometer: (traccarPosition.attributes?.totalDistance || 0) / 1000, // Converter para km
    fuel: traccarPosition.attributes?.fuel || undefined,
    altitude: traccarPosition.altitude || undefined,
    satellites: traccarPosition.attributes?.sat || undefined,
    hdop: traccarPosition.attributes?.hdop || undefined
  }
}

function transformTraccarEvent(traccarEvent: any): any {
  const severityMap: { [key: string]: string } = {
    'deviceOnline': 'low',
    'deviceOffline': 'medium',
    'deviceOverspeed': 'high',
    'geofenceEnter': 'medium',
    'geofenceExit': 'medium',
    'alarm': 'critical'
  }

  return {
    id: traccarEvent.id.toString(),
    tenantId: 't_001',
    type: traccarEvent.type,
    severity: severityMap[traccarEvent.type] || 'medium',
    timestamp: traccarEvent.eventTime || traccarEvent.serverTime,
    deviceId: traccarEvent.deviceId.toString(),
    message: `${traccarEvent.type}: ${traccarEvent.attributes?.message || 'Event occurred'}`,
    location: traccarEvent.positionId ? {
      lat: traccarEvent.latitude,
      lon: traccarEvent.longitude
    } : undefined,
    acknowledged: false,
    context: traccarEvent.attributes || {}
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/traccar-proxy', '')

    switch (path) {
      case '/devices':
        const devicesResponse = await makeTraccarRequest('/devices')
        if (!devicesResponse.ok) {
          throw new Error(`Failed to fetch devices: ${devicesResponse.status}`)
        }
        
        const devices = await devicesResponse.json()
        
        // Buscar posições mais recentes para cada dispositivo
        const positionsResponse = await makeTraccarRequest('/positions')
        const positions = positionsResponse.ok ? await positionsResponse.json() : []
        
        // Criar um mapa de posições por deviceId
        const positionMap = new Map()
        positions.forEach((pos: any) => {
          if (!positionMap.has(pos.deviceId) || 
              new Date(pos.deviceTime) > new Date(positionMap.get(pos.deviceId).deviceTime)) {
            positionMap.set(pos.deviceId, pos)
          }
        })
        
        const transformedDevices = devices.map((device: any) => 
          transformTraccarDevice(device, positionMap.get(device.id))
        )

        return new Response(JSON.stringify(transformedDevices), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case '/positions':
        const posResponse = await makeTraccarRequest('/positions')
        if (!posResponse.ok) {
          throw new Error(`Failed to fetch positions: ${posResponse.status}`)
        }
        
        const positionsData = await posResponse.json()
        const transformedPositions = positionsData.map(transformTraccarPosition)

        return new Response(JSON.stringify(transformedPositions), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case '/events':
        // Buscar eventos recentes (últimas 24 horas)
        const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const to = new Date().toISOString()
        
        const eventsResponse = await makeTraccarRequest(`/reports/events?from=${from}&to=${to}`)
        if (!eventsResponse.ok) {
          throw new Error(`Failed to fetch events: ${eventsResponse.status}`)
        }
        
        const events = await eventsResponse.json()
        const transformedEvents = events.map(transformTraccarEvent)

        return new Response(JSON.stringify(transformedEvents), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case '/geofences':
        const geofencesResponse = await makeTraccarRequest('/geofences')
        if (!geofencesResponse.ok) {
          throw new Error(`Failed to fetch geofences: ${geofencesResponse.status}`)
        }
        
        const geofences = await geofencesResponse.json()
        
        // Transformar geofences do Traccar para nosso formato
        const transformedGeofences = geofences.map((geofence: any) => ({
          id: geofence.id.toString(),
          tenantId: 't_001',
          name: geofence.name,
          type: geofence.area.includes('CIRCLE') ? 'circle' : 'polygon',
          coordinates: [], // Seria necessário parsear a área WKT
          radius: geofence.area.includes('CIRCLE') ? 1000 : undefined, // Valor padrão
          rules: [],
          isActive: true,
          createdAt: new Date().toISOString()
        }))

        return new Response(JSON.stringify(transformedGeofences), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case '/trips':
        // Buscar relatório de viagens (últimas 24 horas)
        const tripFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const tripTo = new Date().toISOString()
        
        const tripsResponse = await makeTraccarRequest(`/reports/trips?from=${tripFrom}&to=${tripTo}`)
        if (!tripsResponse.ok) {
          throw new Error(`Failed to fetch trips: ${tripsResponse.status}`)
        }
        
        const trips = await tripsResponse.json()
        
        const transformedTrips = trips.map((trip: any) => ({
          id: `${trip.deviceId}_${trip.startTime}`,
          deviceId: trip.deviceId.toString(),
          startTime: trip.startTime,
          endTime: trip.endTime,
          startLocation: {
            lat: trip.startLat,
            lon: trip.startLon,
            address: trip.startAddress || 'Unknown'
          },
          endLocation: trip.endTime ? {
            lat: trip.endLat,
            lon: trip.endLon,
            address: trip.endAddress || 'Unknown'
          } : undefined,
          distance: (trip.distance || 0) / 1000, // Converter para km
          duration: Math.round((trip.duration || 0) / 60000), // Converter para minutos
          maxSpeed: Math.round((trip.maxSpeed || 0) * 1.852), // Converter para km/h
          avgSpeed: Math.round((trip.averageSpeed || 0) * 1.852), // Converter para km/h
          score: Math.floor(Math.random() * 40) + 60, // Score simulado por enquanto
          status: trip.endTime ? 'completed' : 'active'
        }))

        return new Response(JSON.stringify(transformedTrips), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      default:
        return new Response('Not Found', { 
          status: 404, 
          headers: corsHeaders 
        })
    }
  } catch (error) {
    console.error('Traccar proxy error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})