import mongoose from 'mongoose';
import { FoodOrder } from './src/modules/food/orders/models/order.model.js';

async function run() {
  await mongoose.connect('mongodb+srv://ranveratnesh_db_user:JB6JwMAFa3R5EUY6@oye.8ipf5ge.mongodb.net/oye');
  const order = await FoodOrder.findOne({ orderId: 'QC05791465' }).lean();
  console.log(JSON.stringify(order, null, 2));
  process.exit(0);
}
run();
