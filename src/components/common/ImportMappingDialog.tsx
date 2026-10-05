import React from 'react';
import * as XLSX from 'xlsx';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  type ColumnMapping,
  type ImportField,
  type MappedImportRow,
  type ParsedImportRow,
  guessColumnMapping,
  mapRows,
  validateMappedRows,
} from '@/lib/import-mapping';

interface ImportMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: ImportField[];
  onImport: (rows: MappedImportRow[]) => Promise<{ successCount: number; failureCount: number }>;
}

const NONE_VALUE = '__none__';

const isCsvFile = (file: File) =>
  file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';

const readWorkbookRows = async (file: File): Promise<ParsedImportRow[]> => {
  const buffer = await file.arrayBuffer();

  const workbook = isCsvFile(file)
    ? XLSX.read(new TextDecoder('utf-8').decode(buffer), { type: 'string' })
    : XLSX.read(buffer, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<ParsedImportRow>(sheet, { defval: '' });
};

export function ImportMappingDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onImport,
}: ImportMappingDialogProps) {
  const [fileName, setFileName] = React.useState('');
  const [rows, setRows] = React.useState<ParsedImportRow[]>([]);
  const [columns, setColumns] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>({});
  const [isReading, setIsReading] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [result, setResult] = React.useState<{ successCount: number; failureCount: number } | null>(null);
  const [error, setError] = React.useState('');

  const mappedRows = React.useMemo(() => mapRows(rows, fields, mapping), [fields, mapping, rows]);
  const validation = React.useMemo(() => validateMappedRows(mappedRows, fields), [fields, mappedRows]);

  const reset = React.useCallback(() => {
    setFileName('');
    setRows([]);
    setColumns([]);
    setMapping({});
    setIsReading(false);
    setIsImporting(false);
    setResult(null);
    setError('');
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReading(true);
    setError('');
    setResult(null);

    try {
      const parsedRows = await readWorkbookRows(file);
      const detectedColumns = Array.from(
        parsedRows.reduce<Set<string>>((set, row) => {
          Object.keys(row).forEach((key) => set.add(key));
          return set;
        }, new Set<string>()),
      );
      setFileName(file.name);
      setRows(parsedRows);
      setColumns(detectedColumns);
      setMapping(guessColumnMapping(detectedColumns, fields));
      if (parsedRows.length === 0) {
        setError('ไม่พบข้อมูลในไฟล์ที่เลือก');
      }
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'อ่านไฟล์ไม่สำเร็จ');
    } finally {
      setIsReading(false);
      event.target.value = '';
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError('');
    setResult(null);

    try {
      const response = await onImport(validation.validRows);
      setResult(response);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import ไม่สำเร็จ');
    } finally {
      setIsImporting(false);
    }
  };

  const previewRows = mappedRows.slice(0, 5);
  const requiredMappedCount = fields.filter((field) => field.required && mapping[field.key]).length;
  const requiredCount = fields.filter((field) => field.required).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <Label htmlFor="import-file" className="mb-2 block text-sm font-medium">
              เลือกไฟล์ Excel หรือ CSV
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isReading || isImporting}
              />
              {isReading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
              {fileName && <Badge variant="outline">{fileName}</Badge>}
            </div>
          </div>

          {columns.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key} className="grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{field.label}</span>
                      {field.required && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">required</Badge>}
                    </div>
                    <div className="text-xs text-slate-500">{field.key}</div>
                  </div>
                  <Select
                    value={mapping[field.key] ?? NONE_VALUE}
                    onValueChange={(value) =>
                      setMapping((current) => ({
                        ...current,
                        [field.key]: value === NONE_VALUE ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกคอลัมน์" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>ไม่ใช้คอลัมน์นี้</SelectItem>
                      {columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{rows.length} rows</Badge>
                <Badge variant={requiredMappedCount === requiredCount ? 'default' : 'outline'}>
                  mapped required {requiredMappedCount}/{requiredCount}
                </Badge>
                <Badge variant={validation.issues.length ? 'destructive' : 'secondary'}>
                  {validation.issues.length} errors
                </Badge>
              </div>

              {validation.issues.length > 0 && (
                <div className="max-h-24 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {validation.issues.slice(0, 8).map((issue) => (
                    <div key={`${issue.rowNumber}-${issue.fieldKey}`}>
                      แถว {issue.rowNumber}: {issue.message}
                    </div>
                  ))}
                </div>
              )}

              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="max-h-48 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Row</TableHead>
                        {fields.slice(0, 8).map((field) => (
                          <TableHead key={field.key}>{field.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell>{row.rowNumber}</TableCell>
                          {fields.slice(0, 8).map((field) => (
                            <TableCell key={field.key} className="max-w-44 truncate">
                              {row.values[field.key] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Import สำเร็จ {result.successCount} รายการ, ไม่สำเร็จ {result.failureCount} รายการ
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            ปิด
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || validation.validRows.length === 0 || rows.length === 0}
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import {validation.validRows.length} รายการ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
