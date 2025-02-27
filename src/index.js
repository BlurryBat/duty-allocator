import React from "react";
import ReactDOM from "react-dom/client"; // ✅ Import createRoot
import App from "./App";
import {BrowserRouter} from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <BrowserRouter basename="/duty-allocator">
        <App />
    </BrowserRouter>
);
