/**
 * Validates IMEI using Luhn algorithm (checksum validation)
 * @param imei - The IMEI number to validate
 * @returns boolean indicating if IMEI is valid
 */
export function validateIMEI(imei: string): boolean {
  // Remove any non-digit characters
  const cleanImei = imei.replace(/\D/g, '');
  
  // IMEI must be exactly 15 digits
  if (cleanImei.length !== 15) {
    return false;
  }
  
  // Apply Luhn algorithm
  let sum = 0;
  let alternate = false;
  
  // Process digits from right to left (excluding check digit)
  for (let i = cleanImei.length - 2; i >= 0; i--) {
    let digit = parseInt(cleanImei.charAt(i));
    
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit = (digit % 10) + 1;
      }
    }
    
    sum += digit;
    alternate = !alternate;
  }
  
  // Calculate check digit
  const checkDigit = (10 - (sum % 10)) % 10;
  const lastDigit = parseInt(cleanImei.charAt(14));
  
  return checkDigit === lastDigit;
}

/**
 * Formats IMEI for display
 * @param imei - The IMEI number to format
 * @returns formatted IMEI string
 */
export function formatIMEI(imei: string): string {
  const cleanImei = imei.replace(/\D/g, '');
  if (cleanImei.length === 15) {
    return cleanImei.replace(/(\d{2})(\d{6})(\d{6})(\d{1})/, '$1-$2-$3-$4');
  }
  return imei;
}

/**
 * Checks if IMEI already exists in the system
 * @param imei - The IMEI to check
 * @param existingEquipments - Array of existing equipment
 * @param excludeId - Equipment ID to exclude from check (for editing)
 * @returns boolean indicating if IMEI is duplicate
 */
export function isDuplicateIMEI(
  imei: string, 
  existingEquipments: { imei: string; id: string }[], 
  excludeId?: string
): boolean {
  const cleanImei = imei.replace(/\D/g, '');
  return existingEquipments.some(eq => 
    eq.imei === cleanImei && eq.id !== excludeId
  );
}