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
        const salesCollection = client.db('Inventory').collection('Sales');
        const userCollection = client.db('Inventory').collection('Users');

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
            };
            const sortOption = sort === 'recent' ? { timestamp: -1 } : { timestamp: 1 };
            const result = await productCollection.find(query).sort(sortOption).toArray();
            res.send(result);
        });

        app.post('/product', async (req, res) => {
            const { product_name, image, quantity, supplier_name, purchase_price, sales_price, category } = req.body;
            const timestamp = new Date();
            const total_price = quantity * purchase_price

            // Ensure quantity, purchase_price, and sales_price are integers
            // const quantityInt = parseInt(quantity, 10);
            // const purchasePriceInt = parseInt(purchase_price, 10);
            // const salesPriceInt = parseInt(sales_price, 10);
            // const totalPriceInt = parseInt(total_price, 10);

            // const result = await productCollection.insertOne({
            //     product_name,
            //     image,
            //     quantity: quantityInt,
            //     supplier_name,
            //     purchase_price: purchasePriceInt,
            //     sales_price: salesPriceInt,
            //     total_price: totalPriceInt,
            //     category,
            //     timestamp
            // });
            // res.send(result);
            try {
                // Ensure quantity, purchase_price, and sales_price are integers
                const quantityInt = parseInt(quantity, 10);
                const purchasePriceInt = parseInt(purchase_price, 10);
                const salesPriceInt = parseInt(sales_price, 10);
                const totalPriceInt = parseInt(total_price, 10);
        
                // Check if the product exists in productCollection
                const product = await productCollection.findOne({ product_name, category });
        
                if (product) {
                    // If the product exists, increment its quantity
                    await productCollection.updateOne(
                        { product_name, category },
                        { $inc: { quantity: quantityInt } } // Increment the quantity
                    );
                } else {
                    // If the product does not exist, insert it
                    await productCollection.insertOne({
                        product_name,
                        category,
                        image,
                        quantity: quantityInt,
                        purchase_price: purchasePriceInt,
                        sales_price: salesPriceInt,
                        total_price: totalPriceInt,
                        supplier_name,
                        timestamp
                    });
                }
        
                // Check if the purchase record already exists
                const purchase = await purchaseCollection.findOne({ product_name, supplier_name, category });
        
                if (purchase) {
                    // If the purchase exists, increment its quantity
                    await purchaseCollection.updateOne(
                        { product_name, supplier_name, category },
                        { $inc: { quantity: quantityInt }, $set: { total_price: totalPriceInt, timestamp } } // Increment quantity and update total price
                    );
                } else {
                    // If the purchase does not exist, insert it
                    const purchaseResult = await purchaseCollection.insertOne({
                        supplier_name,
                        product_name,
                        category,
                        image,
                        quantity: quantityInt,
                        purchase_price: purchasePriceInt,
                        sales_price: salesPriceInt,
                        total_price: totalPriceInt,
                        timestamp
                    });
                    res.send(purchaseResult);
                    return; // Early return to avoid sending response twice
                }
        
                res.send({ message: "Purchase updated successfully" });
            } catch (error) {
                console.error("Error processing purchase:", error);
                res.status(500).send({ error: "Failed to add purchase" });
            }
        });

        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });

        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateProduct = req.body;

            // Ensure quantity, purchase_price, and sales_price are integers
            const quantityInt = parseInt(updateProduct.quantity, 10);
            const purchasePriceInt = parseInt(updateProduct.purchase_price, 10);
            const salesPriceInt = parseInt(updateProduct.sales_price, 10);
            const totalPriceInt = parseInt(updateProduct.total_price, 10);

            const product = {
                $set: {
                    product_name: updateProduct.product_name,
                    image: updateProduct.image,
                    quantity: quantityInt,
                    supplier_name: updateProduct.supplier_name,
                    purchase_price: purchasePriceInt,
                    sales_price: salesPriceInt,
                    total_price: totalPriceInt,
                    category: updateProduct.category,
                },
            };
            const result = await productCollection.updateOne(filter, product, options);
            res.send(result);
        });

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

        // app.post('/purchase', async (req, res) => {
        //     const { supplier_name, product_name, category, image, quantity, purchase_price, sales_price } = req.body;
        //     const timestamp = new Date();
        //     const total_price = quantity * purchase_price
        //     try {
        //         // Ensure quantity, purchase_price, and sales_price are integers
        //         const quantityInt = parseInt(quantity, 10);
        //         const purchasePriceInt = parseInt(purchase_price, 10);
        //         const salesPriceInt = parseInt(sales_price, 10);
        //         const totalPriceInt = parseInt(total_price, 10)

        //         // Check if the product already exists
        //         const product = await productCollection.findOne({ product_name, category });


        //         if (product) {
        //             // Update the product quantity if it exists
        //             await productCollection.updateOne(
        //                 { product_name, category },
        //                 {
        //                     $inc: { quantity: quantityInt },
        //                     $set: { image, purchase_price: purchasePriceInt, sales_price: salesPriceInt, total_price: totalPriceInt, supplier_name, timestamp }
        //                 }
        //             );
        //         } else {
        //             // Insert the product if it does not exist
        //             await productCollection.insertOne({
        //                 product_name,
        //                 category,
        //                 image,
        //                 quantity: quantityInt,
        //                 purchase_price: purchasePriceInt,
        //                 sales_price: salesPriceInt,
        //                 total_price: totalPriceInt,
        //                 supplier_name,
        //                 timestamp
        //             });
        //         }

        //         // Insert purchase record
        //         const purchaseResult = await purchaseCollection.insertOne({
        //             supplier_name,
        //             product_name,
        //             category,
        //             image,
        //             quantity: quantityInt,
        //             purchase_price: purchasePriceInt,
        //             sales_price: salesPriceInt,
        //             total_price: totalPriceInt,
        //             timestamp
        //         });

        //         res.send(purchaseResult);
        //     } catch (error) {
        //         console.error("Error processing purchase:", error);
        //         res.status(500).send({ error: "Failed to add purchase" });
        //     }
        // });

        app.post('/purchase', async (req, res) => {
            const { supplier_name, product_name, category, image, quantity, purchase_price, sales_price } = req.body;
            const timestamp = new Date();
            const total_price = quantity * purchase_price;
        
            try {
                // Ensure quantity, purchase_price, and sales_price are integers
                const quantityInt = parseInt(quantity, 10);
                const purchasePriceInt = parseInt(purchase_price, 10);
                const salesPriceInt = parseInt(sales_price, 10);
                const totalPriceInt = parseInt(total_price, 10);
        
                // Check if the product exists in productCollection
                const product = await productCollection.findOne({ product_name, category });
        
                if (product) {
                    // If the product exists, increment its quantity
                    await productCollection.updateOne(
                        { product_name, category },
                        { $inc: { quantity: quantityInt } } // Increment the quantity
                    );
                } else {
                    // If the product does not exist, insert it
                    await productCollection.insertOne({
                        product_name,
                        category,
                        image,
                        quantity: quantityInt,
                        purchase_price: purchasePriceInt,
                        sales_price: salesPriceInt,
                        total_price: totalPriceInt,
                        supplier_name,
                        timestamp
                    });
                }
        
                // Check if the purchase record already exists
                const purchase = await purchaseCollection.findOne({ product_name, supplier_name, category });
        
                if (purchase) {
                    // If the purchase exists, increment its quantity
                    await purchaseCollection.updateOne(
                        { product_name, supplier_name, category },
                        { $inc: { quantity: quantityInt }, $set: { total_price: totalPriceInt, timestamp } } // Increment quantity and update total price
                    );
                } else {
                    // If the purchase does not exist, insert it
                    const purchaseResult = await purchaseCollection.insertOne({
                        supplier_name,
                        product_name,
                        category,
                        image,
                        quantity: quantityInt,
                        purchase_price: purchasePriceInt,
                        sales_price: salesPriceInt,
                        total_price: totalPriceInt,
                        timestamp
                    });
                    res.send(purchaseResult);
                    return; // Early return to avoid sending response twice
                }
        
                res.send({ message: "Purchase updated successfully" });
            } catch (error) {
                console.error("Error processing purchase:", error);
                res.status(500).send({ error: "Failed to add purchase" });
            }
        });
        

        app.get('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await purchaseCollection.findOne(query);
            res.send(result);
        });

        app.put('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatePurchase = req.body;

            // Ensure quantity, purchase_price, and sales_price are integers
            const quantityInt = parseInt(updatePurchase.quantity, 10);
            const purchasePriceInt = parseInt(updatePurchase.purchase_price, 10);
            const salesPriceInt = parseInt(updatePurchase.sales_price, 10);
            const totalPriceInt = parseInt(updatePurchase.total_price, 10);

            const purchase = {
                $set: {
                    product_name: updatePurchase.product_name,
                    image: updatePurchase.image,
                    quantity: quantityInt,
                    supplier_name: updatePurchase.supplier_name,
                    purchase_price: purchasePriceInt,
                    sales_price: salesPriceInt,
                    total_price: totalPriceInt,
                    category: updatePurchase.category,
                },
            };
            const result = await purchaseCollection.updateOne(filter, purchase, options);
            res.send(result);
        });

        app.delete('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await purchaseCollection.deleteOne(query);
            res.send(result);
        });


        // Sales
        app.get('/sales', async (req, res) => {
            const { search = '', sort = 'recent' } = req.query;
            const query = search ? { customer_name: { $regex: search, $options: 'i' } } : {};
            const sortOption = sort === 'recent' ? { timestamp: -1 } : { timestamp: 1 };
            const result = await salesCollection.find(query).sort(sortOption).toArray();
            res.send(result);
        });

        app.get('/sales/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await salesCollection.findOne(query);
            res.send(result);
        });

        app.post('/sales', async (req, res) => {
            const { customer_name, category, product_name, price, quantity } = req.body;

            // Ensure price and quantity are integers
            const quantityInt = parseInt(quantity, 10);
            const priceInt = parseInt(price, 10);
            const total_price = quantityInt * priceInt; // Calculate total price

            // Create a timestamp for when the sale is added
            const timestamp = new Date();

            // Insert the new sales record into the sales collection
            const result = await salesCollection.insertOne({
                customer_name,
                category,
                product_name,
                price: priceInt,
                quantity: quantityInt,
                total_price, // Use the calculated total price
                timestamp // Automatically add a timestamp
            });

            // Return the result of the insert operation
            res.send(result);
        });

        app.put('/sales/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateSales = req.body;

            // Ensure quantity and price are integers
            const quantityInt = parseInt(updateSales.quantity, 10);
            const priceInt = parseInt(updateSales.price, 10);
            const total_price = quantityInt * priceInt; // Recalculate total price

            const sales = {
                $set: {
                    customer_name: updateSales.customer_name,
                    customer_phone: updateSales.customer_phone,
                    product_name: updateSales.product_name,
                    category: updateSales.category,
                    quantity: quantityInt,
                    price: priceInt,
                    total_price, // Use the recalculated total price
                },
            };
            const result = await salesCollection.updateOne(filter, sales, options);
            res.send(result);
        });



        app.delete('/sales/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await salesCollection.deleteOne(query);
            res.send(result);
        });

        // user
        app.get('/users', async (req, res) => {      
            const result = await userCollection.find().toArray()
            res.send(result)
          })
            

        app.get('/dashboard-stats', async (req, res) => {
            try {
                const totalCategories = await categoryCollection.countDocuments();
                const totalProducts = await productCollection.countDocuments();
                const totalSuppliers = await supplierCollection.countDocuments();
                const totalPurchases = await purchaseCollection.countDocuments();
                const totalSales = await salesCollection.countDocuments();

                // Aggregate all sales data
                const salesData = await salesCollection.aggregate([
                    {
                        $group: { _id: "$timestamp", total: { $sum: "$total_price" } } // Grouping by timestamp
                    }
                ]).toArray();

                // Aggregate all purchase data
                const purchaseData = await purchaseCollection.aggregate([
                    {
                        $group: { _id: "$timestamp", total: { $sum: "$total_price" } } // Grouping by timestamp
                    }
                ]).toArray();

                // Calculate total revenue and amounts
                const totalRevenue = salesData.reduce((acc, curr) => acc + curr.total, 0);
                const totalPurchasesAmount = purchaseData.reduce((acc, curr) => acc + curr.total, 0);
                const totalSalesAmount = salesData.reduce((acc, curr) => acc + curr.total, 0);

                res.send({
                    totalCategories,
                    totalProducts,
                    totalSuppliers,
                    totalPurchases,
                    totalSales,
                    totalRevenue,
                    totalPurchasesAmount,
                    totalSalesAmount,
                    salesData: salesData.map(item => ({ date: item._id, total: item.total })),
                    purchaseData: purchaseData.map(item => ({ date: item._id, total: item.total })),
                });
            } catch (error) {
                res.status(500).send({ error: 'Failed to fetch dashboard stats' });
            }
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
