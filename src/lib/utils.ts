import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from 'date-fns';
import type { ParsedPreset } from './types';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(
  bytes: number,
  decimals = 2
) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}


export function formatDate(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function parsePresetString(presetString: string): ParsedPreset | null {
  try {
    const tableMatch = presetString.match(/^\[TABLE\((.*?)\):\s*([\s\S]*?)\]$/);
    if (!tableMatch) return null;

    const optionsStr = tableMatch[1];
    let jsonStr = tableMatch[2].trim();

    const options = optionsStr.replace(/\)$/, '').split(')(');
    let exportAs = '.txt';
    let writeAs = '';

    options.forEach(opt => {
        const [key, ...valueParts] = opt.split(':');
        const value = valueParts.join(':');
        if (key === 'EXPORT-AS') {
            exportAs = value;
        } else if (key === 'WRITE-AS') {
            writeAs = value;
        }
    });

    // Handle old preset strings that might not be a valid JSON array.
    if (!jsonStr.startsWith('[') || !jsonStr.endsWith(']')) {
      jsonStr = `[${jsonStr}]`;
    }

    const columns = JSON.parse(jsonStr);

    return { columns, exportAs, writeAs };
  } catch (error) {
    console.error("Failed to parse preset string:", error);
    return null;
  }
}
