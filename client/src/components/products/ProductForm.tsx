import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { uploadFile } from '../../services/api';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  githubUrl: z.string().url('Must be a valid URL'),
  category: z.enum(['plugin', 'block']),
  status: z.enum(['active', 'inactive']),
  icon: z.string().optional(),
  banner: z.string().optional(),
  wpOrgSlug: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProductForm({
  initialData,
  onSubmit,
}: {
  initialData?: any;
  onSubmit: (data: FormValues) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      githubUrl: '',
      category: 'plugin',
      status: 'active',
      icon: '',
      banner: '',
      wpOrgSlug: '',
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
                <Input placeholder="e.g. Test Plugin" {...field} />
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
              <FormLabel>GitHub URL</FormLabel>
              <FormControl>
                <Input placeholder="https://github.com/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="plugin">Plugin</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e: any) => {
                      if (e.target.files && e.target.files[0]) {
                        const url = await uploadFile(e.target.files[0]);
                        field.onChange(url);
                      }
                    }}
                  />
                </FormControl>
                {field.value && <p className="text-xs text-muted-foreground mt-1">Uploaded: {field.value}</p>}
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
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e: any) => {
                      if (e.target.files && e.target.files[0]) {
                        const url = await uploadFile(e.target.files[0]);
                        field.onChange(url);
                      }
                    }}
                  />
                </FormControl>
                {field.value && <p className="text-xs text-muted-foreground mt-1">Uploaded: {field.value}</p>}
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
