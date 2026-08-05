import { Product, IProduct } from '../models/Product';

export class ProductRepository {
  async create(data: Partial<IProduct>): Promise<IProduct> {
    const product = new Product(data);
    return await product.save();
  }

  async findAll(filter: any, options: any = {}): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const data = await Product.find(filter)
      // _id breaks ties so paging is stable: a bulk WP.org import creates many
      // products within the same millisecond, and tied rows are not ordered
      // consistently across the per-page queries.
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Product.countDocuments(filter);
    
    return {
      data,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: string): Promise<IProduct | null> {
    return await Product.findById(id);
  }

  async update(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
    return await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<IProduct | null> {
    return await Product.findByIdAndDelete(id);
  }
}
