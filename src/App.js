import React, { useEffect, useState, useCallback } from "react";

// API Keys
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

    // ✅ Wrap API fetch in useCallback to prevent re-creation on each render
    const fetchWooCommerceData = useCallback(async () => {
        try {
            const categoriesResponse = await fetch(
                `${API_URL}/products/categories?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
            );
            const categoriesData = await categoriesResponse.json();
            setCategories(categoriesData);

            // Fetch all products across multiple pages
            const allProducts = await fetchAllProducts();
            setProducts(allProducts);
        } catch (error) {
            console.error("❌ Error fetching WooCommerce data:", error);
        }
    }, []); // Empty array ensures it runs only once

    // ✅ Corrected useEffect: Now calls API correctly
    useEffect(() => {
        fetchWooCommerceData();
    }, [fetchWooCommerceData]);

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

    const getFilteredProducts = () => {
        if (selectedCategory === null) return products;
        return products.filter(product =>
            product.categories.some(category => Number(category.id) === Number(selectedCategory))
        );
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get("success");
        const failure = urlParams.get("failure");

        if (success) {
            setPaymentStatus("success");
            setCart([]);
            setCartTotal(0);
        } else if (failure) {
            setPaymentStatus("failed");
        }

        window.history.replaceState(null, "", window.location.pathname);
    }, []);

    const openZettlePayment = () => {
        if (cartTotal === 0) {
            alert("Cart is empty! Add items before checkout.");
            return;
        }

        const formattedAmount = cartTotal * 100;
        const successURL = encodeURIComponent(window.location.origin + "?success=true");
        const failureURL = encodeURIComponent(window.location.origin + "?failure=true");
        const zettleURL = `iZettle://payment?amount=${formattedAmount}&currency=GBP&successURL=${successURL}&failureURL=${failureURL}`;

        window.location.href = zettleURL;
    };

    const addToCart = (product) => {
        setCart([...cart, product]);
        setCartTotal(cartTotal + parseFloat(product.price));
    };

    return (
        <div>
            <h1>WooZettle POS</h1>

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

            <h2>Categories</h2>
            <div>
                {categories.length > 0 ? (
                    categories.map((category) => (
                        <button key={category.id} onClick={() => setSelectedCategory(category.id)}>
                            {category.name}
                        </button>
                    ))
                ) : (
                    <p>Loading categories...</p>
                )}
                <button onClick={() => setSelectedCategory(null)}><strong>Show All</strong></button>
            </div>

            <h2>Products</h2>
            <p>Found {getFilteredProducts().length} products</p>
            <div>
                {getFilteredProducts().length > 0 ? (
                    getFilteredProducts().map((product) => (
                        <div key={product.id}>
                            <img 
                                src={product.images?.length > 0 ? product.images[0].src : "https://via.placeholder.com/150"} 
                                alt={product.name} 
                                width="150" 
                                onError={(e) => e.target.src = "https://via.placeholder.com/150"}
                            />
                            <p>{product.name}</p>
                            <p>${product.price}</p>
                            <button onClick={() => addToCart(product)}>Add to Cart</button>
                        </div>
                    ))
                ) : (
                    <p>No products found for this category.</p>
                )}
            </div>

            <h2>Cart Total: £{cartTotal.toFixed(2)}</h2>
            <button onClick={openZettlePayment} className="checkout-button">
                Pay with Zettle
            </button>
        </div>
    );
};

export default App;








