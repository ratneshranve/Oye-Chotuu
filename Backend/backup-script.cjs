const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const url = 'mongodb+srv://oyechotuu:oyechotuu1@cluster0.ywfizk5.mongodb.net/oyechotuu';
const backupDir = path.join(__dirname, '..', 'database_backup');

async function backup() {
    console.log('Connecting to database...');
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db('oyechotuu');
        
        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupDir)){
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const collections = await db.listCollections().toArray();
        console.log(`Found ${collections.length} collections. Starting backup...`);
        
        for (let colInfo of collections) {
            const colName = colInfo.name;
            console.log(`Backing up collection: ${colName}`);
            const collection = db.collection(colName);
            const data = await collection.find({}).toArray();
            
            const filePath = path.join(backupDir, `${colName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Saved ${data.length} records to ${filePath}`);
        }
        console.log('Backup completed successfully!');
    } catch (err) {
        console.error('An error occurred during backup:', err);
    } finally {
        await client.close();
    }
}

backup();
