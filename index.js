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
        const supplierCollection = client.db('Inventory').collection('Supplier');
        const purchaseCollection = client.db('Inventory').collection('Purchase');

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
            const { search = '', sort = 'recent', category = '' } = req.query;
            const query = {
                product_name: { $regex: search, $options: 'i' },
                ...(category && { category })
            }
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

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query);
            res.send(result);
        })

        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateProduct = req.body;
            const product = {
                $set: {
                    product_name: updateProduct.product_name,
                    image: updateProduct.image,
                    quantity: updateProduct.quantity,
                    supplier_name: updateProduct.supplier_name,
                    purchase_price: updateProduct.purchase_price,
                    sales_price: updateProduct.sales_price,
                    category: updateProduct.category,
                },
            };
            const result = await productCollection.updateOne(filter, product, options);
            res.send(result);
        });


        app.delete("/foods/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodsCollection.deleteOne(query)
            res.send(result)
        })

        // supplier

        app.get('/supplier', async (req, res) => {
            const { search = '', sort = 'recent' } = req.query;
            const query = search ? { supplier_name: { $regex: search, $options: 'i' } } : {};
            const sortOption = sort === 'recent' ? { time_added: -1 } : { time_added: 1 };
            const result = await supplierCollection.find(query).sort(sortOption).toArray();
            res.send(result);
        });

        app.post('/supplier', async (req, res) => {
            const { supplier_name, phone, email, date } = req.body;
            const time_added = new Date();
            const result = await supplierCollection.insertOne({ supplier_name, phone, email, time_added });
            res.send(result);
        });

        app.get('/supplier/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await supplierCollection.findOne(query);
            res.send(result);
        })

        app.put('/supplier/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateSupplier = req.body;
            const supplier = {
                $set: {
                    supplier_name: updateSupplier.supplier_name,
                    phone: updateSupplier.
                    phone,
                    email: updateSupplier.email,
                    
                },
            };
            const result = await supplierCollection.updateOne(filter, supplier, options);
            res.send(result);
        });



        app.delete('/supplier/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await supplierCollection.deleteOne(query);
            res.send(result);
        });



        // purchase
        app.get('/purchase', async (req, res) => {
            const { search = '', sort = 'recent' } = req.query;
            const query = search ? { supplier_name: { $regex: search, $options: 'i' } } : {};
            const sortOption = sort === 'recent' ? { timestamp: -1 } : { timestamp: 1 };
            const result = await purchaseCollection.find(query).sort(sortOption).toArray();
            res.send(result);
        });


        app.post('/purchase', async (req, res) => {
            const { supplier_name, product_name, category, image, quantity, purchase_price, sales_price } = req.body;
            const timestamp = new Date();
        
            try {
                // Check if the product already exists
                const product = await productCollection.findOne({ product_name, category });
        
                if (product) {
                    // Update the product quantity if it exists
                    await productCollection.updateOne(
                        { product_name, category },
                        { 
                            $inc: { quantity: quantity },
                            $set: { image, purchase_price, sales_price, supplier_name, timestamp }
                        }
                    );
                } else {
                    // Insert the product if it does not exist
                    await productCollection.insertOne({
                        product_name,
                        category,
                        image,
                        quantity,
                        purchase_price,
                        sales_price,
                        supplier_name,
                        timestamp
                    });
                }
        
                // Insert purchase record
                const purchaseResult = await purchaseCollection.insertOne({
                    supplier_name,
                    product_name,
                    category,
                    image,
                    quantity,
                    purchase_price,
                    sales_price,
                    timestamp
                });
        
                res.send(purchaseResult);
            } catch (error) {
                console.error("Error processing purchase:", error);
                res.status(500).send({ error: "Failed to add purchase" });
            }
        });
        

       

        app.get('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await purchaseCollection.findOne(query);
            res.send(result);
        })


        app.delete('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await purchaseCollection.deleteOne(query);
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
