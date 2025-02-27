import dotenv from 'dotenv';
import app from './app.js';
import { testConnection } from './config/database.js';
import logger from './utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await testConnection();
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server due to database connection error:', error);
        process.exit(1);
    }
}

startServer();