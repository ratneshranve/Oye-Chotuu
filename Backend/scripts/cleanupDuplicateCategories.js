import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://oyechotuu:oyechotuu1@cluster0.ywfizk5.mongodb.net/oyechotuu';
const RESTAURANT_ID = '6a3a4af2c0e66a94884ad339'; // Celebration Food court

async function run() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGODB_URI, { family: 4 });
        console.log('Connected to DB');

        const db = mongoose.connection.db;

        // 1. Get all categories for this restaurant
        const categories = await db.collection('food_categories')
            .find({ restaurantId: new mongoose.Types.ObjectId(RESTAURANT_ID) })
            .toArray();

        // 2. Group by normalized name
        const categoriesByName = {};
        for (const cat of categories) {
            const name = (cat.name || '').trim().toLowerCase();
            if (!categoriesByName[name]) {
                categoriesByName[name] = [];
            }
            categoriesByName[name].push(cat);
        }

        // 3. Find duplicates and merge
        let deletedCount = 0;
        let updatedItemsCount = 0;

        for (const [name, cats] of Object.entries(categoriesByName)) {
            if (cats.length > 1) {
                console.log(`\nFound duplicate category: "${name}" (${cats.length} duplicates)`);
                
                // Sort by creation time (keep the oldest one)
                cats.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
                
                const keptCategory = cats[0];
                const duplicateCategories = cats.slice(1);
                
                const duplicateIds = duplicateCategories.map(c => c._id);
                
                console.log(`  Keeping category ID: ${keptCategory._id}`);
                console.log(`  Duplicate IDs to remove: ${duplicateIds.join(', ')}`);

                // Update food_items pointing to duplicate categories
                const updateResult = await db.collection('food_items').updateMany(
                    { 
                        restaurantId: new mongoose.Types.ObjectId(RESTAURANT_ID),
                        categoryId: { $in: duplicateIds }
                    },
                    { 
                        $set: { 
                            categoryId: keptCategory._id,
                            categoryName: keptCategory.name
                        } 
                    }
                );
                console.log(`  Updated ${updateResult.modifiedCount} food items to point to the kept category.`);
                updatedItemsCount += updateResult.modifiedCount;

                // Delete the duplicate categories
                const deleteResult = await db.collection('food_categories').deleteMany(
                    { _id: { $in: duplicateIds } }
                );
                console.log(`  Deleted ${deleteResult.deletedCount} duplicate categories.`);
                deletedCount += deleteResult.deletedCount;
            }
        }

        console.log(`\nCleanup Complete!`);
        console.log(`Total duplicated categories removed: ${deletedCount}`);
        console.log(`Total food items re-linked: ${updatedItemsCount}`);

        process.exit(0);
    } catch (e) {
        console.error('Error during cleanup:', e);
        process.exit(1);
    }
}

run();
