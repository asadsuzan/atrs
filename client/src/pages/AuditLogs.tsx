import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../services/auditLogs';
import { getProducts } from '../services/products';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, History, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import PageTransition from '../components/layout/PageTransition';

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryParams: any = { page, limit: 15 };
  if (entityType !== 'all') queryParams.entityType = entityType;
  if (action !== 'all') queryParams.action = action;
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (startDate) queryParams.startDate = startDate;
  if (endDate) queryParams.endDate = endDate;

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['auditLogs', queryParams],
    queryFn: () => getAuditLogs(queryParams),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  const logs = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const products = productsData?.data || [];

  const getProductName = (entityId: string) => {
    const prod = products.find((p: any) => p._id === entityId);
    return prod ? prod.name : null;
  };

  const clearFilters = () => {
    setEntityType('all');
    setAction('all');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="w-8 h-8 text-primary" />
            Audit Logs
          </h2>
          <p className="text-muted-foreground mt-1">Review system activities and data changes.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-[160px]">
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="PRODUCT">Product</SelectItem>
              <SelectItem value="ACTIVITY">Activity</SelectItem>
              <SelectItem value="VERSION">Version</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px]">
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
          <DatePicker
            value={startDate}
            onChange={(v) => { setStartDate(v); setPage(1); }}
            placeholder="Start date"
            max={endDate || undefined}
            clearable
            className="w-[160px]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
          <DatePicker
            value={endDate}
            onChange={(v) => { setEndDate(v); setPage(1); }}
            placeholder="End date"
            min={startDate || undefined}
            clearable
            className="w-[160px]"
          />
        </div>
        {(search || entityType !== 'all' || action !== 'all' || startDate || endDate) && (
          <Button variant="ghost" onClick={clearFilters} className="px-3">
            <X className="w-4 h-4 mr-2" /> Clear
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity Name</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Loading logs...</TableCell></TableRow>
            ) : isError ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-destructive">Failed to load audit logs. Please try again.</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No audit logs found matching criteria.</TableCell></TableRow>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log._id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] uppercase ${log.action === 'CREATE' ? 'text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20' : log.action === 'DELETE' ? 'text-red-500 border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20' : 'text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/20'}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {log.entityType.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {log.entityName}
                    {log.entityType === 'ACTIVITY' && getProductName(log.details?.match(/productId: ([a-f0-9]+)/)?.[1]) && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({getProductName(log.details?.match(/productId: ([a-f0-9]+)/)?.[1])})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
