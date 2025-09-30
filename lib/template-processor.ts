/**
 * Template processing utilities for handling placeholder replacement
 * and document generation from templates
 */

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'email' | 'tel';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ProcessedTemplate {
  content: string;
  metadata: {
    processedAt: Date;
    placeholdersReplaced: number;
    originalPlaceholders: string[];
  };
}

/**
 * Replace placeholders in template content with form data
 */
export function replacePlaceholders(
  content: string,
  formData: Record<string, any>
): ProcessedTemplate {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const originalPlaceholders: string[] = [];
  let placeholdersReplaced = 0;

  // Find all placeholders first
  let match;
  while ((match = placeholderRegex.exec(content)) !== null) {
    originalPlaceholders.push(match[1]);
  }

  // Reset regex
  placeholderRegex.lastIndex = 0;

  // Replace placeholders with form data
  const processedContent = content.replace(placeholderRegex, (match, key) => {
    if (formData.hasOwnProperty(key)) {
      placeholdersReplaced++;
      const value = formData[key];
      
      // Format different types of data
      if (value instanceof Date) {
        return value.toLocaleDateString();
      } else if (typeof value === 'number') {
        return value.toLocaleString();
      } else if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      } else {
        return String(value || '');
      }
    }
    
    // Return original placeholder if no data found
    return match;
  });

  return {
    content: processedContent,
    metadata: {
      processedAt: new Date(),
      placeholdersReplaced,
      originalPlaceholders: Array.from(new Set(originalPlaceholders)), // Remove duplicates
    },
  };
}

/**
 * Generate a simple text document from template data
 */
export function generateTextDocument(
  templateName: string,
  templateDescription: string,
  formData: Record<string, any>,
  templateFields: TemplateField[]
): string {
  let content = `# ${templateName}\n\n`;
  
  if (templateDescription) {
    content += `${templateDescription}\n\n`;
  }
  
  content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
  content += '---\n\n';

  // Add form data to content
  for (const field of templateFields) {
    const value = formData[field.name];
    if (value !== undefined && value !== null && value !== '') {
      content += `**${field.label}:** `;
      
      // Format based on field type
      switch (field.type) {
        case 'date':
          content += new Date(value).toLocaleDateString();
          break;
        case 'number':
          content += Number(value).toLocaleString();
          break;
        case 'textarea':
          content += `\n${value}\n`;
          break;
        default:
          content += String(value);
      }
      
      content += '\n\n';
    }
  }

  return content;
}

/**
 * Validate form data against template fields
 */
export function validateFormData(
  formData: Record<string, any>,
  templateFields: TemplateField[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of templateFields) {
    const value = formData[field.name];

    // Check required fields
    if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
      errors.push(`Field '${field.label}' is required`);
      continue;
    }

    // Skip validation if field is empty and not required
    if (!value && !field.required) {
      continue;
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          errors.push(`Field '${field.label}' must be a valid email address`);
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(`Field '${field.label}' must be a valid number`);
        } else {
          if (field.validation?.min !== undefined && numValue < field.validation.min) {
            errors.push(`Field '${field.label}' must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && numValue > field.validation.max) {
            errors.push(`Field '${field.label}' must be at most ${field.validation.max}`);
          }
        }
        break;

      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          errors.push(`Field '${field.label}' must be a valid date`);
        }
        break;

      case 'text':
      case 'textarea':
        const strValue = String(value);
        if (field.validation?.min !== undefined && strValue.length < field.validation.min) {
          errors.push(`Field '${field.label}' must be at least ${field.validation.min} characters`);
        }
        if (field.validation?.max !== undefined && strValue.length > field.validation.max) {
          errors.push(`Field '${field.label}' must be at most ${field.validation.max} characters`);
        }
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(strValue)) {
            errors.push(`Field '${field.label}' format is invalid`);
          }
        }
        break;

      case 'select':
        if (field.options && !field.options.includes(String(value))) {
          errors.push(`Field '${field.label}' must be one of: ${field.options.join(', ')}`);
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract placeholders from template content
 */
export function extractPlaceholders(content: string): string[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    placeholders.push(match[1]);
  }

  return Array.from(new Set(placeholders)); // Remove duplicates
}

/**
 * Generate template fields from placeholders
 */
export function generateTemplateFields(placeholders: string[]): TemplateField[] {
  return placeholders.map(placeholder => ({
    name: placeholder,
    label: placeholder.charAt(0).toUpperCase() + placeholder.slice(1).replace(/([A-Z])/g, ' $1'),
    type: inferFieldType(placeholder),
    required: true,
  }));
}

/**
 * Infer field type from placeholder name
 */
function inferFieldType(placeholder: string): TemplateField['type'] {
  const lowerPlaceholder = placeholder.toLowerCase();
  
  if (lowerPlaceholder.includes('email')) return 'email';
  if (lowerPlaceholder.includes('phone') || lowerPlaceholder.includes('tel')) return 'tel';
  if (lowerPlaceholder.includes('date') || lowerPlaceholder.includes('time')) return 'date';
  if (lowerPlaceholder.includes('amount') || lowerPlaceholder.includes('price') || lowerPlaceholder.includes('number')) return 'number';
  if (lowerPlaceholder.includes('description') || lowerPlaceholder.includes('comment') || lowerPlaceholder.includes('note')) return 'textarea';
  
  return 'text';
}