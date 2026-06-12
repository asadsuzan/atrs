import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../services/products';
import { getVersions } from '../../services/versions';
import { MediaUploader } from '@/components/ui/MediaUploader';
import { DatePicker } from '@/components/ui/DatePicker';

const formSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  type: z.enum(['feature', 'improvement', 'bug-fix']),
  title: z.string().min(1, 'Title is required'),
  shortDescription: z.string().min(1, 'Short description is required'),
  tier: z.enum(['free', 'pro']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  referenceUrl: z.string().nullable().optional(),
  versionId: z.string().nullable().optional(),
  mediaType: z.enum(['image', 'gif', 'video']).nullable().optional().or(z.literal('')),
  mediaUrl: z.string().nullable().optional(),
  mediaUrls: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  activityDate: z.string().min(1, 'Date is required'),
  items: z.array(z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().nullable().optional(),
    mediaType: z.enum(['image', 'gif', 'video']).nullable().optional().or(z.literal('')),
    mediaUrl: z.string().nullable().optional(),
    mediaUrls: z.array(z.string()).optional()
  }))
});

type FormValues = z.infer<typeof formSchema>;

export function ActivityForm({
  initialData,
  onSubmit,
}: {
  initialData?: any;
  onSubmit: (data: FormValues) => void;
}) {
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => getProducts() });
  const products = productsData?.data || [];

  const processedInitialData = initialData ? {
    ...initialData,
    versionId: typeof initialData.versionId === 'object' ? initialData.versionId?._id : (initialData.versionId || ''),
    mediaUrls: initialData.mediaUrls && initialData.mediaUrls.length > 0 ? initialData.mediaUrls : (initialData.mediaUrl ? [initialData.mediaUrl] : []),
    items: (initialData.items || []).map((item: any) => ({
      ...item,
      mediaUrls: item.mediaUrls && item.mediaUrls.length > 0 ? item.mediaUrls : (item.mediaUrl ? [item.mediaUrl] : [])
    }))
  } : undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: processedInitialData || {
      productId: '',
      type: 'feature',
      title: '',
      shortDescription: '',
      tier: 'free',
      priority: 'medium',
      referenceUrl: '',
      versionId: '',
      mediaType: '',
      mediaUrls: [],
      tags: [],
      activityDate: new Date().toISOString().split('T')[0],
      items: [],
    },
  });

  // Reset form whenever initialData changes (e.g. opening edit dialog for a different activity)
  useEffect(() => {
    if (initialData) {
      form.reset(processedInitialData);
    }
  }, [initialData?._id]);

  const selectedProductId = form.watch('productId');
  const { data: versionsData } = useQuery({ 
    queryKey: ['versions', selectedProductId], 
    queryFn: () => getVersions(selectedProductId),
    enabled: !!selectedProductId
  });
  const versions = versionsData || [];

  const { fields, append, remove } = useFieldArray({
    name: "items",
    control: form.control,
  });

  return (
    <Form {...(form as any)}>
      <form onSubmit={form.handleSubmit((data) => {
        data.mediaUrl = ''; // Clear legacy field
        data.items = data.items.map(item => ({ ...item, mediaUrl: '' })); // Clear legacy field
        onSubmit(data);
      })} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <FormField
          control={form.control as any}
          name="productId"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products?.map((p: any) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="type"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                    <SelectItem value="bug-fix">Bug Fix</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="priority"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'medium'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="activityDate"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Pick activity date"
                    clearable={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch('type') === 'feature' && (
            <FormField
              control={form.control as any}
              name="tier"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Tier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'free'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control as any}
          name="title"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Added new dashboard" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="referenceUrl"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Reference URL (e.g. PR link)</FormLabel>
                <FormControl>
                  <Input placeholder="https://github.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="versionId"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Version (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined} disabled={!selectedProductId || versions.length === 0}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedProductId ? "Select product first" : versions.length === 0 ? "No versions found" : "Select version"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {versions.map((v: any) => (
                      <SelectItem key={v._id} value={v._id}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control as any}
          name="shortDescription"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief summary of the activity..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="tags"
          render={({ field }: any) => {
            const currentTags = field.value || [];
            const toggleTag = (tag: string) => {
              if (currentTags.includes(tag)) {
                field.onChange(currentTags.filter((t: string) => t !== tag));
              } else {
                field.onChange([...currentTags, tag]);
              }
            };
            return (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Badge
                      variant={currentTags.includes('released') ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleTag('released')}
                    >
                      Released
                    </Badge>
                    <Badge
                      variant={currentTags.includes('unreleased') ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleTag('unreleased')}
                    >
                      Unreleased
                    </Badge>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="space-y-2 border p-4 rounded-md">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium leading-none">Items</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ title: '', description: '' })}>
              <Plus className="w-3 h-3 mr-1" /> Add Item
            </Button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start mt-2 border-b pb-4 mb-4 border-dashed last:border-0 last:pb-0 last:mb-0">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Input placeholder="Item Title" {...form.register(`items.${index}.title` as const)} />
                  <Textarea placeholder="Item Description" {...form.register(`items.${index}.description` as const)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control as any}
                    name={`items.${index}.mediaType`}
                    render={({ field: itemMediaField }: any) => (
                      <FormItem>
                        <FormLabel>Item Media Type</FormLabel>
                        <Select onValueChange={itemMediaField.onChange} defaultValue={itemMediaField.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="gif">GIF</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name={`items.${index}.mediaUrls`}
                    render={({ field: itemMediaUrlField }: any) => (
                      <FormItem>
                        <FormLabel>Item Media Upload</FormLabel>
                        <FormControl>
                          <MediaUploader
                            multiple
                            value={itemMediaUrlField.value}
                            onChange={itemMediaUrlField.onChange}
                            accept="image/*,video/*"
                            label="Upload item media"
                            onUploadComplete={(_urls, files) => {
                              const fileList = Array.isArray(files) ? files : [files];
                              if (fileList.length > 0) {
                                const fileType = fileList[0].type;
                                if (fileType.startsWith('video/')) {
                                  form.setValue(`items.${index}.mediaType`, 'video');
                                } else if (fileType === 'image/gif') {
                                  form.setValue(`items.${index}.mediaType`, 'gif');
                                } else if (fileType.startsWith('image/')) {
                                  form.setValue(`items.${index}.mediaType`, 'image');
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
          <FormField
            control={form.control as any}
            name="mediaType"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Media Type (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="gif">GIF</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="mediaUrls"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Media Upload</FormLabel>
                <FormControl>
                  <MediaUploader
                    multiple
                    value={field.value}
                    onChange={field.onChange}
                    accept="image/*,video/*"
                    label="Upload activity media"
                    onUploadComplete={(_urls, files) => {
                      const fileList = Array.isArray(files) ? files : [files];
                      if (fileList.length > 0) {
                        const fileType = fileList[0].type;
                        if (fileType.startsWith('video/')) {
                          form.setValue('mediaType', 'video');
                        } else if (fileType === 'image/gif') {
                          form.setValue('mediaType', 'gif');
                        } else if (fileType.startsWith('image/')) {
                          form.setValue('mediaType', 'image');
                        }
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          {initialData ? 'Update Activity' : 'Create Activity'}
        </Button>
      </form>
    </Form>
  );
}
