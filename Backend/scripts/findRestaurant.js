import mongoose from 'mongoose';

async function run() {
    try {
        await mongoose.connect('mongodb+srv://oyechotuu:oyechotuu1@cluster0.ywfizk5.mongodb.net/oyechotuu', {
            family: 4
        });
        console.log('Connected to DB');
        
        const db = mongoose.connection.db;
        const restaurants = await db.collection('food_restaurants').find({ 
            $or: [
                { restaurantName: { $regex: /Celebration Food court/i } },
                { restaurantNameNormalized: { $regex: /celebration/i } }
            ]
        }).toArray();

        console.log('Found restaurants:', restaurants.map(r => ({ _id: r._id, name: r.restaurantName })));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
