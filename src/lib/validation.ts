
/**
 * Validates and sanitizes input for clinical optometry fields.
 */

export type OptometryFieldType = 'sph' | 'cyl' | 'axis' | 'add' | 'iop' | 'schirmer' | 'notes' | 'va' | 'generic_number';

export const sanitizeOptometryInput = (value: string, type: OptometryFieldType): string => {
  switch (type) {
    case 'sph':
    case 'cyl':
      // Allow only numbers, one decimal point, and leading +/-
      let sanitized = value.replace(/[^0-9.+-]/g, '');
      
      // Ensure only one decimal point
      const dots = sanitized.split('.');
      if (dots.length > 2) {
        sanitized = dots[0] + '.' + dots.slice(1).join('');
      }
      
      // Ensure only one +/- at the start
      if (sanitized.length > 0) {
        const firstChar = sanitized[0];
        const rest = sanitized.slice(1).replace(/[+-]/g, '');
        sanitized = firstChar + rest;
      }
      
      return sanitized.substring(0, 7);

    case 'axis':
      // Integer 0-180
      let axisVal = value.replace(/[^0-9]/g, '').substring(0, 3);
      if (axisVal && parseInt(axisVal, 10) > 180) {
        return '180';
      }
      return axisVal;

    case 'add':
      // Positive number, one decimal point, optional leading +
      let addSanitized = value.replace(/[^0-9.+]/g, '');
      const addDots = addSanitized.split('.');
      if (addDots.length > 2) {
        addSanitized = addDots[0] + '.' + addDots.slice(1).join('');
      }
      if (addSanitized.length > 0) {
        const first = addSanitized[0];
        const r = addSanitized.slice(1).replace(/[+]/g, '');
        addSanitized = (first === '+' ? '+' : '') + (first === '+' ? r : first + r);
      }
      return addSanitized.substring(0, 6);

    case 'iop':
    case 'schirmer':
    case 'generic_number':
      // Allow alphanumeric and basic clinical symbols (+, -, /, .)
      return value.replace(/[^0-9a-zA-Z.+-/ ]/g, '').substring(0, 20);

    case 'notes':
      return value.substring(0, 2000);

    case 'va':
      return value.substring(0, 20);

    default:
      return value;
  }
};

export const getFieldTypeFromName = (name: string): OptometryFieldType => {
  const n = name.toLowerCase();
  if (n.includes('sph') || n.includes('sphere')) return 'sph';
  if (n.includes('cyl') || n.includes('cylinder')) return 'cyl';
  if (n.includes('axis')) return 'axis';
  if (n.includes('add')) return 'add';
  if (n.includes('iop') || n.includes('tonometry') || n.includes('nct') || n.includes('gat')) return 'iop';
  if (n.includes('schirmer')) return 'schirmer';
  if (n.includes('notes') || n.includes('remark') || n.includes('opinion')) return 'notes';
  return 'va';
};
