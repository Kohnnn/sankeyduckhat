import { Flow } from '../store/useDiagramStore';

/**
 * Represents a parsed row from pasted data
 */
export interface ParsedRow {
  source: string;
  target: string;
  value: number;
}

/**
 * Result of parsing pasted data
 */
export interface ParseResult {
  success: boolean;
  flows: Flow[];
  errors: string[];
}

/**
 * Detects the delimiter used in the pasted data
 * Prioritizes tab (TSV) over comma (CSV)
 */
export function detectDelimiter(data: string): string {
  const firstLine = data.split('\n')[0] || '';
  
  // Check for tab first (TSV format from Excel)
  if (firstLine.includes('\t')) {
    return '\t';
  }
  
  // Fall back to comma (CSV format)
  if (firstLine.includes(',')) {
    return ',';
  }
  
  // Default to tab if no delimiter found
  return '\t';
}

/**
 * Parses a single line of data into source, target, and value
 */
export function parseLine(
  line: string,
  delimiter: string,
  lineNumber: number
): { row: ParsedRow | null; error: string | null } {
  const trimmedLine = line.trim();
  
  // Skip empty lines
  if (!trimmedLine) {
    return { row: null, error: null };
  }
  
  const parts = trimmedLine.split(delimiter).map((part) => part.trim());
  
  // Need at least 3 parts: source, target, value
  if (parts.length < 3) {
    return {
      row: null,
      error: `Line ${lineNumber}: Expected at least 3 columns (source, target, value), got ${parts.length}`,
    };
  }
  
  const source = parts[0] ?? '';
  const target = parts[1] ?? '';
  const valueStr = parts[2] ?? '';
  
  // Validate source
  if (!source) {
    return {
      row: null,
      error: `Line ${lineNumber}: Source cannot be empty`,
    };
  }
  
  // Validate target
  if (!target) {
    return {
      row: null,
      error: `Line ${lineNumber}: Target cannot be empty`,
    };
  }
  
  // Parse and validate value
  const value = parseFloat(valueStr);
  if (isNaN(value)) {
    return {
      row: null,
      error: `Line ${lineNumber}: Value "${valueStr}" is not a valid number`,
    };
  }
  
  if (value <= 0) {
    return {
      row: null,
      error: `Line ${lineNumber}: Value must be greater than 0, got ${value}`,
    };
  }
  
  return {
    row: { source, target, value },
    error: null,
  };
}

/**
 * Parses pasted data (TSV or CSV format) into Flow objects
 * 
 * Expected format:
 * - Each line represents a flow
 * - Columns: source, target, value (tab or comma separated)
 * - First row can be a header (will be skipped if it looks like a header)
 * 
 * @param data - The raw pasted string data
 * @returns ParseResult with flows array and any errors
 */
export function parsePasteData(data: string): ParseResult {
  if (!data || !data.trim()) {
    return {
      success: false,
      flows: [],
      errors: ['No data provided'],
    };
  }
  
  const delimiter = detectDelimiter(data);
  const lines = data.split('\n');
  const flows: Flow[] = [];
  const errors: string[] = [];
  
  // Check if first line is a header
  // Only detect as header if the first column exactly matches a header word
  let startIndex = 0;
  if (lines.length > 0) {
    const firstLine = (lines[0] ?? '').trim();
    const parts = firstLine.split(delimiter).map((p) => p.trim().toLowerCase());
    const firstColumn = parts[0] ?? '';
    
    // Header patterns that indicate the first column is a header
    const headerFirstColumnPatterns = ['source', 'from', 'origin', 'start'];
    const isHeader = headerFirstColumnPatterns.includes(firstColumn);
    if (isHeader) {
      startIndex = 1;
    }
  }
  
  // Parse each line
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    
    const { row, error } = parseLine(line, delimiter, i + 1);
    
    if (error) {
      errors.push(error);
      continue;
    }
    
    if (row) {
      flows.push({
        id: crypto.randomUUID(),
        source: row.source,
        target: row.target,
        value: row.value,
      });
    }
  }
  
  return {
    success: flows.length > 0,
    flows,
    errors,
  };
}

export default parsePasteData;
