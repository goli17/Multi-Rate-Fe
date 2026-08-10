import * as XLSX from 'xlsx';
import type { DiscountType, LineInput } from '../types';

/** Exact header row used in the downloadable template. */
export const LINE_ITEM_TEMPLATE_HEADERS = [
  'description',
  'quantity',
  'unitPrice',
  'discountType',
  'discountPercent',
  'discountFixed',
  'taxPercent',
] as const;

export type LineItemTemplateHeader = (typeof LINE_ITEM_TEMPLATE_HEADERS)[number];

export const LINE_ITEM_TEMPLATE_SAMPLES: Record<
  LineItemTemplateHeader,
  string | number
>[] = [
  {
    description: 'Widget A',
    quantity: 2,
    unitPrice: 100,
    discountType: 'percent',
    discountPercent: 10,
    discountFixed: '',
    taxPercent: 5,
  },
  {
    description: 'Widget B',
    quantity: 1,
    unitPrice: 50,
    discountType: 'none',
    discountPercent: '',
    discountFixed: '',
    taxPercent: 5,
  },
  {
    description: 'Service fee',
    quantity: 1,
    unitPrice: 200,
    discountType: 'fixed',
    discountPercent: '',
    discountFixed: 20,
    taxPercent: 0,
  },
];

export const LINE_ITEM_COLUMN_HELP: {
  key: LineItemTemplateHeader;
  required: boolean;
  notes: string;
}[] = [
  {
    key: 'description',
    required: true,
    notes: 'Line label (e.g. Widget A)',
  },
  {
    key: 'quantity',
    required: true,
    notes: 'Integer ≥ 1',
  },
  {
    key: 'unitPrice',
    required: true,
    notes: 'Unit price > 0 (document currency)',
  },
  {
    key: 'discountType',
    required: false,
    notes: 'none | percent | fixed (default none)',
  },
  {
    key: 'discountPercent',
    required: false,
    notes: 'Required when discountType is percent (0–100)',
  },
  {
    key: 'discountFixed',
    required: false,
    notes: 'Required when discountType is fixed (> 0)',
  },
  {
    key: 'taxPercent',
    required: false,
    notes: '0–100 (default 0)',
  },
];

const HEADER_ALIASES: Record<string, LineItemTemplateHeader> = {
  description: 'description',
  desc: 'description',
  item: 'description',
  quantity: 'quantity',
  qty: 'quantity',
  unitprice: 'unitPrice',
  unit_price: 'unitPrice',
  unit: 'unitPrice',
  price: 'unitPrice',
  discounttype: 'discountType',
  discount_type: 'discountType',
  discount: 'discountType',
  discountpercent: 'discountPercent',
  discount_percent: 'discountPercent',
  discountpct: 'discountPercent',
  discountfixed: 'discountFixed',
  discount_fixed: 'discountFixed',
  discountamount: 'discountFixed',
  taxpercent: 'taxPercent',
  tax_percent: 'taxPercent',
  tax: 'taxPercent',
};

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function cellNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isBlankRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => cellText(v) === '');
}

export type ParsedLineImport = {
  lines: LineInput[];
  errors: string[];
};

export function downloadLineItemsTemplate(filename = 'line-items-template.xlsx') {
  const sheet = XLSX.utils.json_to_sheet(LINE_ITEM_TEMPLATE_SAMPLES, {
    header: [...LINE_ITEM_TEMPLATE_HEADERS],
  });
  sheet['!cols'] = [
    { wch: 18 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Line items');
  XLSX.writeFile(book, filename);
}

export async function parseLineItemsExcel(file: File): Promise<ParsedLineImport> {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array' });
  const sheetName = book.SheetNames[0];
  if (!sheetName) {
    return { lines: [], errors: ['The Excel file has no sheets.'] };
  }
  const sheet = book.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });

  if (!rows.length) {
    return { lines: [], errors: ['No data rows found. Keep the header row and add line items below it.'] };
  }

  const sampleKeys = Object.keys(rows[0] ?? {});
  const mappedKeys = new Map<LineItemTemplateHeader, string>();
  for (const key of sampleKeys) {
    const alias = HEADER_ALIASES[normalizeHeader(key)];
    if (alias && !mappedKeys.has(alias)) {
      mappedKeys.set(alias, key);
    }
  }

  for (const required of ['description', 'quantity', 'unitPrice'] as const) {
    if (!mappedKeys.has(required)) {
      return {
        lines: [],
        errors: [
          `Missing required column "${required}". Use the template headers: ${LINE_ITEM_TEMPLATE_HEADERS.join(', ')}.`,
        ],
      };
    }
  }

  const lines: LineInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    if (isBlankRow(row)) return;
    const excelRow = index + 2; // header is row 1
    const get = (header: LineItemTemplateHeader) => {
      const key = mappedKeys.get(header);
      return key ? row[key] : '';
    };

    const description = cellText(get('description'));
    const quantity = cellNumber(get('quantity'));
    const unitPrice = cellNumber(get('unitPrice'));
    let discountType = cellText(get('discountType')).toLowerCase() || 'none';
    if (discountType === '' || discountType === '-') discountType = 'none';
    const discountPercent = cellNumber(get('discountPercent'));
    const discountFixed = cellNumber(get('discountFixed'));
    const taxPercentRaw = cellNumber(get('taxPercent'));

    if (!description) {
      errors.push(`Row ${excelRow}: description is required`);
      return;
    }
    if (quantity === null || !Number.isInteger(quantity) || quantity < 1) {
      errors.push(`Row ${excelRow}: quantity must be an integer ≥ 1`);
      return;
    }
    if (unitPrice === null || unitPrice <= 0) {
      errors.push(`Row ${excelRow}: unitPrice must be greater than 0`);
      return;
    }
    if (!['none', 'percent', 'fixed'].includes(discountType)) {
      errors.push(
        `Row ${excelRow}: discountType must be none, percent, or fixed`,
      );
      return;
    }

    const taxPercent = taxPercentRaw ?? 0;
    if (taxPercent < 0 || taxPercent > 100) {
      errors.push(`Row ${excelRow}: taxPercent must be between 0 and 100`);
      return;
    }

    const line: LineInput = {
      description,
      quantity,
      unitPrice,
      discountType: discountType as DiscountType,
      taxPercent,
    };

    if (discountType === 'percent') {
      if (discountPercent === null || discountPercent <= 0 || discountPercent > 100) {
        errors.push(
          `Row ${excelRow}: discountPercent is required (0.01–100) when discountType is percent`,
        );
        return;
      }
      line.discountPercent = discountPercent;
    } else if (discountType === 'fixed') {
      if (discountFixed === null || discountFixed <= 0) {
        errors.push(
          `Row ${excelRow}: discountFixed is required (> 0) when discountType is fixed`,
        );
        return;
      }
      line.discountFixed = discountFixed;
    }

    lines.push(line);
  });

  if (!lines.length && !errors.length) {
    errors.push('No valid line items found in the file.');
  }

  return { lines, errors };
}
