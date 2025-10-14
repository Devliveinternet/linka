export interface VehicleIconConfig {
  path?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  scale?: number;
  anchor?: { x: number; y: number };
  rotation?: number;
  url?: string; // For custom photo icons
  size?: { width: number; height: number };
  scaledSize?: { width: number; height: number };
}

export const getVehicleIconPath = (vehicleType: string): string => {
  switch (vehicleType) {
    case 'car':
      return 'M12 2L21 11H16V22H8V11H3L12 2Z';

    case 'truck':
      return 'M12 2L22 12H18V22H6V12H2L12 2Z';

    case 'motorcycle':
      return 'M12 2L20 12H16V22H8V12H4L12 2Z';

    case 'machine':
      return 'M12 2L23 14H18V22H6V14H1L12 2Z';

    default:
      return 'M12 2L21 12H16V22H8V12H3L12 2Z';
  }
};

export const createVehicleIcon = (
  vehicleType: string,
  status: 'online' | 'offline' | 'inactive',
  isMoving: boolean = false,
  isSelected: boolean = false,
  customPhoto?: string,
  heading: number = 0
): VehicleIconConfig => {
  // If custom photo is provided, use it as the icon
  if (customPhoto) {
    const size = isSelected ? 48 : 36;
    return {
      url: customPhoto,
      size: { width: size, height: size },
      scaledSize: { width: size, height: size },
      anchor: { x: size / 2, y: size / 2 }
    };
  }

  // Default SVG icon logic
  let fillColor = '#6B7280'; // gray for offline

  if (status === 'online') {
    if (isMoving) {
      fillColor = '#10B981'; // green for moving
    } else {
      fillColor = '#3B82F6'; // blue for stopped
    }
  }

  return {
    path: getVehicleIconPath(vehicleType),
    fillColor,
    fillOpacity: 1,
    strokeColor: isSelected ? '#1D4ED8' : '#FFFFFF',
    strokeOpacity: isSelected ? 0.9 : 0.8,
    strokeWeight: 2,
    scale: isSelected ? 1.8 : 1.4,
    anchor: { x: 12, y: 18 },
    rotation: heading
  };
};

export const getVehicleTypeFromDevice = (deviceId: string, vehicles: any[]): string => {
  const vehicle = vehicles.find(v => v.deviceId === deviceId);
  return vehicle?.vehicleType || 'car';
};

export const getVehiclePhotoFromDevice = (deviceId: string, vehicles: any[]): string | undefined => {
  const vehicle = vehicles.find(v => v.deviceId === deviceId);
  return vehicle?.photo;
};

// Utility function to handle file upload and convert to base64
export const handleImageUpload = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Arquivo deve ser uma imagem'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      reject(new Error('Imagem deve ter menos de 5MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Erro ao ler arquivo'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
};

// Utility function to validate image URL
export const validateImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};