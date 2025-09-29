export interface VehicleIconConfig {
  path?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWeight?: number;
  scale?: number;
  anchor?: { x: number; y: number };
  url?: string; // For custom photo icons
  size?: { width: number; height: number };
  scaledSize?: { width: number; height: number };
}

export const getVehicleIconPath = (vehicleType: string): string => {
  switch (vehicleType) {
    case 'car':
      return 'M12 2C13.1 2 14 2.9 14 4V6H18C19.1 6 20 6.9 20 8V16C20 17.1 19.1 18 18 18H17C17 19.7 15.7 21 14 21S11 19.7 11 20H9C9 19.7 7.7 21 6 21S3 19.7 3 18H2C0.9 18 0 17.1 0 16V8C0 6.9 0.9 6 2 6H6V4C6 2.9 6.9 2 8 2H12ZM6 14C7.1 14 8 14.9 8 16S7.1 18 6 18 4 17.1 4 16 4.9 14 6 14ZM14 14C15.1 14 16 14.9 16 16S15.1 18 14 18 12 17.1 12 16 12.9 14 14 14Z';
    
    case 'truck':
      return 'M2 4C2 2.9 2.9 2 4 2H14C15.1 2 16 2.9 16 4V6H18C19.7 6 21 7.3 21 9V15C21 16.1 20.1 17 19 17H18C18 18.7 16.7 20 15 20S12 18.7 12 17H8C8 18.7 6.7 20 5 20S2 18.7 2 17H1C0.4 17 0 16.6 0 16V4ZM5 13C6.1 13 7 13.9 7 15S6.1 17 5 17 3 16.1 3 15 3.9 13 5 13ZM15 13C16.1 13 17 13.9 17 15S16.1 17 15 17 13 16.1 13 15 13.9 13 15 13ZM16 8V11H19V9C19 8.4 18.6 8 18 8H16Z';
    
    case 'motorcycle':
      return 'M5 12C3.3 12 2 13.3 2 15S3.3 18 5 18 8 16.7 8 15 6.7 12 5 12ZM19 12C17.3 12 16 13.3 16 15S17.3 18 19 18 22 16.7 22 15 20.7 12 19 12ZM12 4C12.6 4 13 4.4 13 5V7H15L17 9H19V11H17L15 9H13V11L11 13H9L11 11V9H9L7 11H5V9H7L9 7H11V5C11 4.4 11.4 4 12 4Z';
    
    case 'machine':
      return 'M3 3H21C21.6 3 22 3.4 22 4V16C22 16.6 21.6 17 21 17H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V17H3C2.4 17 2 16.6 2 16V4C2 3.4 2.4 3 3 3ZM7 17V19H17V17H7ZM4 5V15H20V5H4ZM6 7H18V13H6V7Z';
    
    default:
      return 'M12 2C13.1 2 14 2.9 14 4V6H18C19.1 6 20 6.9 20 8V16C20 17.1 19.1 18 18 18H17C17 19.7 15.7 21 14 21S11 19.7 11 20H9C9 19.7 7.7 21 6 21S3 19.7 3 18H2C0.9 18 0 17.1 0 16V8C0 6.9 0.9 6 2 6H6V4C6 2.9 6.9 2 8 2H12Z';
  }
};

export const createVehicleIcon = (
  vehicleType: string,
  status: 'online' | 'offline' | 'inactive',
  isMoving: boolean = false,
  isSelected: boolean = false,
  customPhoto?: string
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
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
    scale: isSelected ? 1.5 : 1.2,
    anchor: { x: 12, y: 12 }
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