const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      ,
    ],
    credentials: true,
    optionSuccessStatus: 200,
  }
  app.use(cors(corsOptions))
  app.use(express.json())


  
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.as3doaz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const categoryCollection = client.db('Inventory').collection('Category')


    app.get('/category', async (req, res) => {      
        const { search = '', sort = 'recent' } = req.query;
      
      const query = search ? { name: { $regex: search, $options: 'i' } } : {};
      const sortOption = sort === 'recent' ? { start_date: -1 } : { start_date: 1 };

      const result = await categoryCollection.find(query).sort(sortOption).toArray();
      res.send(result);
      })

      app.post('/category',async(req,res)=>{
        const { name, image_url,start_date } = req.body;
        const result = await categoryCollection.insertOne({ name, image_url,start_date });
        res.send(result)
      })

      app.delete('/category/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await categoryCollection.deleteOne(query);
        res.send(result);
      })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



  app.get('/', (req, res) => {
    res.send('running')
  })
  
  app.listen(port, () => {
    console.log(`server is running in port ${port}`);
  })