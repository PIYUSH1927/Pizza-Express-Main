const express = require('express');
const ejs = require('ejs');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');

// MongoDB connection
// MongoDB connection
mongoose.connect("mongodb+srv://piyushpadia12:jh01cp1927@cluster0.68ptnoc.mongodb.net/pdata?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // Adjust timeout as needed
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// MongoDB schema
const Product = mongoose.model('Product', {
    name: String,
    description: String,
    price: Number,
    sale_price: Number,
    quantity: Number,
    image: String,
    
    type: String,
    category: String
});


const orderSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    city: String,
    address: String,
    cost: Number,
    status: String,
    date: Date,
    products: [{
        id: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        image: String,
        quantity: Number
    }]
});

const Order = mongoose.model('Order', orderSchema);
// Express middleware
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
}));

// Function to check if product is in cart
function isProductInCart(cart, id) {
    return cart.some(item => item.id === id);
}

// Function to calculate total
function calculateTotal(cart, req) {
    let total = cart.reduce((acc, item) => {
        return acc + (item.sale_price ? item.sale_price * item.quantity : item.price * item.quantity);
    }, 0);
    req.session.total = total;
    return total;
}

// Routes
app.get('/', async function(req, res) {
    try {
        const products = await Product.find();
        res.render('pages/index', { result: products });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/add_to_cart', function(req, res) {
    const { id, name, price, sale_price, quantity, image } = req.body;
    const product = { id, name, price, sale_price, quantity, image };

    if (req.session.cart) {
        const cart = req.session.cart;
        if (!isProductInCart(cart, id)) {
            cart.push(product);
        }
    } else {
        req.session.cart = [product];
    }
    calculateTotal(req.session.cart, req);
    res.redirect('/cart');
});

app.get('/cart', function(req, res) {
    const { cart, total } = req.session;
    res.render('pages/cart', { cart, total });
});

app.post('/remove_product', function(req, res) {
    const { id } = req.body;
    req.session.cart = req.session.cart.filter(item => item.id !== id);
    calculateTotal(req.session.cart, req);
    res.redirect('/cart');
});

app.post('/edit_product_quantity', function(req, res) {
    const { id, increase_product_quantity, decrease_product_quantity } = req.body;
    const cart = req.session.cart;
    const product = cart.find(item => item.id === id);

    if (increase_product_quantity && product.quantity > 0) {
        product.quantity++;
    } else if (decrease_product_quantity && product.quantity > 1) {
        product.quantity--;
    }

    calculateTotal(cart, req);
    res.redirect('/cart');
});

app.get('/checkout', function(req, res) {
    const { total } = req.session;
    res.render('pages/checkout', { total });
});

app.post('/place_order', async function(req, res) {
    try {
        // Extracting data from the request body
        const { name, email, phone, city, address } = req.body;
        const { cart } = req.session;

        // Calculating the total cost of the order
        const totalCost = calculateTotal(cart, req);

        // Creating an array to hold product details for the order
        const productsArray = cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity
        }));

        // Creating a new order instance
        const order = new Order({
            name,
            email,
            phone,
            city,
            address,
            cost: totalCost,
            status: "not paid",
            date: new Date(),
            products: productsArray
        });

        // Saving the order to the database
        await order.save();

        // Clearing the cart and redirecting to the payment page
        req.session.cart = [];
        res.redirect('/payment');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


app.get('/payment', function(req, res) {
    const { total } = req.session;
    res.render('pages/payment', { total });
});

app.get('/about', function(req, res) {
    res.render('pages/about');
});

app.get('/single_products', function(req, res) {
    res.render('pages/single_products');
});

app.get('/products', async function(req, res) {
    try {
        const products = await Product.find();
        res.render('pages/products', { result: products });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/single_product', async function(req, res) {
    try {
        const id = req.query.id;
        const product = await Product.findById(id);
        res.render('pages/single_product', { result: product });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Starting server
const port = process.env.PORT || 8080;
app.listen(port, function() {
    console.log("Server has started successfully");
});
