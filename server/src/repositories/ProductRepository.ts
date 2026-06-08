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
      .sort({ createdAt: -1 })
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
    return await Product.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<IProduct | null> {
    return await Product.findByIdAndDelete(id);
  }
}
