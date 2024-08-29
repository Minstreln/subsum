const mongoose =  require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

process.on('uncaughtException 🚨', (err) => {
    console.log(err.name, err.message);
    process.exit(1);
})

const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

mongoose.connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    poolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
}).then(() => console.log('Db connection successful 🚀'));

const app = require('./app');

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log(`app running on port ${port} 🏃`);
});

process.on('unhandledRejection 🚩', (err) => {
    console.log(err.name, err,message);
    server.close(() => {
        process.exit(1);
    });
});
