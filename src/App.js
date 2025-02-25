import React, { useEffect, useState, useCallback } from "react";

// 🔐 API Keys (set in Vercel or .env file)
const API_URL = process.env.REACT_APP_WC_API_URL;
const CONSUMER_KEY = process.env.REACT_APP_WC_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.REACT_APP_WC_CONSUMER_SECRET;

const App = () => {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [cart, setCart] = useState([]);
    const [cartTotal, setCartTotal] = useState(0);
    const [paymentStatus, setPaymentStatus] = useState(null);

    // ✅ Fetch WooCommerce Data
    const fetchWooCommerceData = useCallback(async () => {
        try {
            const categoriesResponse = await fetch(
                `${API_URL}/products/categories?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
            );
            const categoriesData = await categoriesResponse.json();
            setCategories(categoriesData);

            const allProducts = await fetchAllProducts();
            setProducts(allProducts);
        } catch (error) {
            console.error("❌ Error fetching WooCommerce data:", error);
        }
    }, []);

    // ✅ Fetch All WooCommerce Products
    const fetchAllProducts = async (page = 1, collectedProducts = []) => {
        try {
            const response = await fetch(
                `${API_URL}/products?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}&per_page=100&page=${page}`
            );
            const data = await response.json();

            if (data.length === 0) return collectedProducts;
            return fetchAllProducts(page + 1, [...collectedProducts, ...data]);
        } catch (error) {
            console.error("❌ Error fetching paginated products:", error);
            return collectedProducts;
        }
    };

    useEffect(() => {
        fetchWooCommerceData();
    }, [fetchWooCommerceData]);

    // ✅ Filter Products by Category
    const getFilteredProducts = () => {
        if (selectedCategory === null) return products;
        return products.filter(product =>
            product.categories.some(category => Number(category.id) === Number(selectedCategory))
        );
    };

    // ✅ Handle Payment Status from Zettle
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get("success");
        const failure = urlParams.get("failure");

        if (success) {
            console.log("✅ Payment Successful");
            setPaymentStatus("success");
            setCart([]);
            setCartTotal(0);
            syncPaymentToWooCommerce();
        } else if (failure) {
            console.log("❌ Payment Failed");
            setPaymentStatus("failed");
        }

        window.history.replaceState(null, "", window.location.pathname);
    }, []);

    // ✅ Open Zettle App for Payment (Mobile Fix)
    const openZettlePayment = () => {
        if (cartTotal === 0) {
            alert("Cart is empty! Add items before checkout.");
            return;
        }

        const formattedAmount = cartTotal * 100;
        const successURL = encodeURIComponent(window.location.origin + "?success=true");
        const failureURL = encodeURIComponent(window.location.origin + "?failure=true");
        const zettleURL = `iZettle://payment?amount=${formattedAmount}&currency=GBP&successURL=${successURL}&failureURL=${failureURL}`;

        alert(`Opening Zettle with URL:\n${zettleURL}`);

        // Open in a new tab (fix for mobile deep linking issues)
        window.open(zettleURL, "_blank");
    };

    // ✅ Sync Successful Payment with WooCommerce
    const syncPaymentToWooCommerce = async () => {
        try {
            const orderData = {
                payment_method: "zettle",
                payment_method_title: "Paid via Zettle",
                set_paid: true,
                line_items: cart.map(item => ({
                    product_id: item.id,
                    quantity: 1
                }))
            };

            const response = await fetch(
                `${API_URL}/orders?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderData)
                }
            );

            const data = await response.json();
            console.log("🛒 Order Synced to WooCommerce:", data);
        } catch (error) {
            console.error("❌ Error syncing payment:", error);
        }
    };

    // ✅ Add to Cart
    const addToCart = (product) => {
        setCart([...cart, product]);
        setCartTotal(cartTotal + parseFloat(product.price));
    };

    return (
        <div>
            <h1>WooZettle POS</h1>

            {/* ✅ Payment Status */}
            {paymentStatus === "success" && (
                <div className="payment-success">
                    <h2>✅ Payment Successful</h2>
                    <p>Transaction completed. Thank you!</p>
                    <button onClick={() => setPaymentStatus(null)}>Back to POS</button>
                </div>
            )}
            {paymentStatus === "failed" && (
                <div className="payment-failed">
                    <h2>❌ Payment Failed</h2>
                    <p>Something went wrong. Please try again.</p>
                    <button onClick={() => setPaymentStatus(null)}>Back to POS</button>
                </div>
            )}

            {/* ✅ Categories */}
            <h2>Categories</h2>
            <div>
                {categories.map((category) => (
                    <button key={category.id} onClick={() => setSelectedCategory(category.id)}>
                        {category.name}
                    </button>
                ))}
                <button onClick={() => setSelectedCategory(null)}><strong>Show All</strong></button>
            </div>

            {/* ✅ Products */}
            <h2>Products</h2>
            <p>Found {getFilteredProducts().length} products</p>
            <div>
                {getFilteredProducts().map((product) => (
                    <div key={product.id}>
                        <img 
                            src={product.images?.[0]?.src || "https://via.placeholder.com/150"} 
                            alt={product.name} 
                            width="150" 
                        />
                        <p>{product.name}</p>
                        <p>${product.price}</p>
                        <button onClick={() => addToCart(product)}>Add to Cart</button>
                    </div>
                ))}
            </div>

            {/* ✅ Checkout */}
            <h2>Cart Total: £{cartTotal.toFixed(2)}</h2>
            <button onClick={openZettlePayment} className="checkout-button">
                Pay with Zettle
            </button>
        </div>
    );
};

export default App;







