const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5176',
    ],
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.as3doaz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const categoryCollection = client.db('Inventory').collection('Category');
        const productCollection = client.db('Inventory').collection('Products');

        // Category routes
        app.get('/category', async (req, res) => {
            const { search = '', sort = 'recent' } = req.query;
            const query = search ? { name: { $regex: search, $options: 'i' } } : {};
            const sortOption = sort === 'recent' ? { start_date: -1 } : { start_date: 1 };
            const result = await categoryCollection.find(query).sort(sortOption).toArray();
            res.send(result);
        });

        app.post('/category', async (req, res) => {
            const { name, image_url, start_date } = req.body;
            const result = await categoryCollection.insertOne({ name, image_url, start_date });
            res.send(result);
        });

        app.delete('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await categoryCollection.deleteOne(query);
            res.send(result);
        });

        // Product routes
        app.get('/product', async (req, res) => {
          const { search = '', sort = 'recent', category = '' } = req.query; // Updated to accept category
          const query = {
              product_name: { $regex: search, $options: 'i' },
              ...(category && { category }) // Apply category filter if provided
          };
          const sortOption = sort === 'recent' ? { timestamp: -1 } : { timestamp: 1 };
          const result = await productCollection.find(query).sort(sortOption).toArray();
          res.send(result);
      });

        app.post('/product', async (req, res) => {
            const { product_name, image, quantity, supplier_name, purchase_price, sales_price, category } = req.body;
            const timestamp = new Date();
            const result = await productCollection.insertOne({ product_name, image, quantity, supplier_name, purchase_price, sales_price, category, timestamp });
            res.send(result);
        });

        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('running');
});

app.listen(port, () => {
    console.log(`server is running in port ${port}`);
});
