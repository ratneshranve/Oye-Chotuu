import mongoose from 'mongoose';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

import { FoodItem } from '../src/modules/food/admin/models/food.model.js';
import { FoodCategory } from '../src/modules/food/admin/models/category.model.js';

const MONGODB_URI = 'mongodb+srv://oyechotuu:oyechotuu1@cluster0.ywfizk5.mongodb.net/oyechotuu';

// Configuration
// 1. PLACE YOUR EXCEL FILE IN THE SCRIPTS FOLDER AND UPDATE THE NAME BELOW
const EXCEL_FILE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'menu.xlsx'); 
// 2. PASTE THE EXACT RESTAURANT ID HERE
const RESTAURANT_ID = '6a3a4af2c0e66a94884ad339'; 

async function run() {
    console.log('Connecting to database...');
    // We will connect via Mongoose. Ensure your environment variables are loaded if connectDB relies on them.
    // E.g., import dotenv from 'dotenv'; dotenv.config(); 
    try {
        await mongoose.connect(MONGODB_URI, { family: 4 });
        console.log('Connected to Database successfully!');

        if (!mongoose.Types.ObjectId.isValid(RESTAURANT_ID)) {
            console.error('Invalid RESTAURANT_ID provided.');
            process.exit(1);
        }

        console.log(`Reading Excel file from ${EXCEL_FILE_PATH}...`);
        const workbook = xlsx.readFile(EXCEL_FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = xlsx.utils.sheet_to_json(sheet);
        console.log(`Found ${rawData.length} rows in the excel sheet.`);

        let insertedCount = 0;
        const categoryCache = {}; // Cache to prevent duplicates

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Expected columns from user: category, itemname, description, price
            const categoryName = String(row.category || row.Category || '').trim();
            const itemName = String(row.itemname || row.ItemName || row['Item Name'] || row['item name'] || '').trim();
            const description = String(row.description || row.Description || '').trim();
            const price = parseFloat(row.price || row.Price || 0);

            if (!itemName || !categoryName) {
                console.log(`Row ${i + 1}: Skipping because itemName or category is missing.`);
                continue;
            }

            const lowerCat = categoryName.toLowerCase();

            // 1. Check or Create Category
            let category;
            if (categoryCache[lowerCat]) {
                category = categoryCache[lowerCat];
            } else {
                category = await FoodCategory.findOne({
                    name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
                    $or: [
                        { restaurantId: RESTAURANT_ID },
                        { restaurantId: { $exists: false } },
                        { restaurantId: null }
                    ]
                });

                if (!category) {
                    console.log(`Row ${i + 1}: Category "${categoryName}" not found. Creating new category...`);
                    category = await FoodCategory.create({
                        name: categoryName,
                        restaurantId: RESTAURANT_ID,
                        createdByRestaurantId: RESTAURANT_ID,
                        approvalStatus: 'approved',
                        isApproved: true,
                        isActive: true,
                        foodTypeScope: 'Both'
                    });
                }
                categoryCache[lowerCat] = category;
            }

            // 2. Check if Item already exists to avoid duplicates
            let foodItem = await FoodItem.findOne({
                restaurantId: RESTAURANT_ID,
                name: { $regex: new RegExp(`^${itemName}$`, 'i') }
            });

            if (!foodItem) {
                console.log(`Row ${i + 1}: Creating Item "${itemName}"...`);
                await FoodItem.create({
                    restaurantId: RESTAURANT_ID,
                    categoryId: category._id,
                    categoryName: category.name,
                    name: itemName,
                    description: description,
                    price: price,
                    foodType: 'Non-Veg', // Default as per schema
                    isAvailable: true,
                    approvalStatus: 'approved',
                });
                insertedCount++;
            } else {
                console.log(`Row ${i + 1}: Item "${itemName}" already exists. Skipping.`);
            }
        }

        console.log(`\nMigration completed successfully! Inserted ${insertedCount} new items.`);
        process.exit(0);
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
}

run();
