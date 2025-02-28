import { Sequelize } from 'sequelize';
import dotenv from 'dotenv'

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection to Supabase has been established successfully.');
        return true;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
};

export default sequelize;