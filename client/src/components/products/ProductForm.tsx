import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { MediaUploader } from '@/components/ui/MediaUploader';

/**
 * - `wp`: manual WordPress/CMS product — Plugin/Block/Theme category, WP.org
 *   slug shown, repo URL required.
 * - `standalone`: non-WP app — category fixed to "standalone", no WP.org slug,
 *   repo/website URL optional.
 * - `full`: everything (used when editing an existing product of any kind).
 */
export type ProductFormVariant = 'wp' | 'standalone' | 'full';

const buildSchema = (variant: ProductFormVariant) =>
  z.object({
    name: z.string().min(1, 'Name is required'),
    githubUrl:
      variant === 'standalone'
        ? z.string().url('Must be a valid URL').optional().or(z.literal(''))
        : z.string().url('Must be a valid URL'),
    description: z.string().optional(),
    category: z.enum(['plugin', 'block', 'theme', 'standalone']),
    status: z.enum(['active', 'inactive']),
    icon: z.string().optional(),
    banner: z.string().optional(),
    wpOrgSlug: z.string().optional(),
    repoPath: z.string().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

const CATEGORY_OPTIONS: Record<ProductFormVariant, { value: FormValues['category']; label: string }[]> = {
  wp: [
    { value: 'plugin', label: 'Plugin' },
    { value: 'block', label: 'Block' },
    { value: 'theme', label: 'Theme' },
  ],
  standalone: [{ value: 'standalone', label: 'Standalone App' }],
  full: [
    { value: 'plugin', label: 'Plugin' },
    { value: 'block', label: 'Block' },
    { value: 'theme', label: 'Theme' },
    { value: 'standalone', label: 'Standalone App' },
  ],
};

export function ProductForm({
  initialData,
  onSubmit,
  variant = 'full',
}: {
  initialData?: any;
  onSubmit: (data: FormValues) => void;
  variant?: ProductFormVariant;
}) {
  const isStandalone = variant === 'standalone';
  const schema = useMemo(() => buildSchema(variant), [variant]);

  const defaultCategory: FormValues['category'] =
    variant === 'standalone' ? 'standalone' : variant === 'wp' ? 'plugin' : 'plugin';

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      name: '',
      githubUrl: '',
      description: '',
      category: defaultCategory,
      status: 'active',
      icon: '',
      banner: '',
      wpOrgSlug: '',
      repoPath: '',
    },
  });

  return (
    <Form {...(form as any)}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control as any}
          name="name"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder={isStandalone ? 'e.g. My Desktop App' : 'e.g. Test Plugin'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="description"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief description of the product..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="githubUrl"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>{isStandalone ? 'GitHub / Website URL (optional)' : 'GitHub URL'}</FormLabel>
              <FormControl>
                <Input placeholder="https://github.com/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* WP.org slug is meaningless for standalone apps. */}
        {!isStandalone && (
          <FormField
            control={form.control as any}
            name="wpOrgSlug"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>WP.org Slug (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. test-plugin" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control as any}
          name="repoPath"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Local repo path (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. C:\\Users\\you\\projects\\my-plugin" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Absolute path on the server machine. When the Code Activity Tracker is enabled, file
                changes here are auto-summarized into draft changelog entries.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Standalone has a fixed category, so the select is hidden. */}
          {!isStandalone && (
            <FormField
              control={form.control as any}
              name="category"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS[variant].map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control as any}
            name="status"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="icon"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Icon Upload (optional)</FormLabel>
                <FormControl>
                  <MediaUploader
                    value={field.value}
                    onChange={field.onChange}
                    accept="image/*"
                    label="Upload product icon"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="banner"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Banner Upload (optional)</FormLabel>
                <FormControl>
                  <MediaUploader
                    value={field.value}
                    onChange={field.onChange}
                    accept="image/*"
                    label="Upload product banner"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          {initialData ? 'Update Product' : 'Create Product'}
        </Button>
      </form>
    </Form>
  );
}
