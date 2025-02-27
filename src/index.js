// index.js
import dotenv from 'dotenv';
import app from './app.js';
import { testConnection } from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await testConnection();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server due to database connection error:', error);
        process.exit(1);
    }
}

startServer();