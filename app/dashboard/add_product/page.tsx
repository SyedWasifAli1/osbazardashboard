  "use client";

  import React, { useState, useEffect } from "react";
  import { firestore } from "../../lib/firebase-config"; // Adjust the path
  import { collection, getDocs, addDoc, query } from "firebase/firestore";
  import Image from 'next/image';
  interface Category {
    id: string;
    name: string;
  }

  interface SubCategory {
    id: string;
    name: string;
  }

  const AddProductPage = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

    const [sku, setSku] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [weight, setWeight] = useState("");
    const [description, setDescription] = useState("");
    const [stock, setStock] = useState("");
    const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
    const [imagesBase64, setImagesBase64] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      const fetchCategories = async () => {
        const snapshot = await getDocs(collection(firestore, "category"));
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setCategories(categoriesData);
      };
      fetchCategories();
    }, []);

    const fetchSubCategories = async (categoryId: string) => {
      const subCategoriesQuery = query(
        collection(firestore, "category", categoryId, "sub_categories")
      );
      const snapshot = await getDocs(subCategoriesQuery);
      const subCategoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setSubCategories(subCategoriesData);
    };

    // const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    //   const file = e.target.files?.[0];
    //   if (file) {
    //     const reader = new FileReader();
    //     reader.onload = () => {
    //       if (reader.result) {
    //         // Remove the data:image/...;base64, prefix
    //         const base64String = (reader.result as string).split(",")[1];
    //         setThumbnailBase64(base64String);
    //       }
    //     };
    //     reader.readAsDataURL(file);
    //   }
    // };
    
    const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const base64Images = await Promise.all(
          Array.from(files).map(
            (file) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  if (reader.result) {
                    // Remove the data:image/...;base64, prefix
                    const base64String = (reader.result as string).split(",")[1];
                    resolve(base64String);
                  }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
              })
          )
        );
        setImagesBase64(base64Images);
      }
    };
    
  const handleAddProduct = async () => {
      if (
        !sku ||
        !name ||
        !price ||
        !weight ||
        !description ||
        imagesBase64.length === 0 ||
        !selectedCategory ||
        !selectedSubCategory
      ) {
        alert("Please fill all fields and upload necessary files.");
        return;
      }
    
      setIsLoading(true);
      try {
        const productData = {
          sku,
          name: name.toLowerCase(),
          price: parseFloat(price),
          weight: parseFloat(weight),
          description,
          thumbnail: thumbnailBase64,
          images1: imagesBase64,
          category: selectedCategory,
          sub_category: selectedSubCategory,
          stock: parseInt(stock, 10),
          create_date: new Date(),
        };
    
        // Add product to Firestore
        await addDoc(collection(firestore, "products"), productData);
    
        // Send notification to all users
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=YOUR_SERVER_KEY`, // Replace with your FCM Server Key
          },
          body: JSON.stringify({
            notification: {
              title: "New Product Added",
              body: `Check out our new product: ${name}!`,
              click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
            to: "/topics/all", // Sends to all users subscribed to "all" topic
          }),
        });
    
        if (response.ok) {
          console.log("Notification sent successfully");
        } else {
          console.error("Failed to send notification");
        }
    
        alert("Product added successfully!");
        setSku("");
        setName("");
        setPrice("");
        setWeight("");
        setDescription("");
        setThumbnailBase64(null);
        setImagesBase64([]);
        setStock("");
        setSelectedCategory(null);
        setSelectedSubCategory(null);
      } catch (error) {
        console.error("Error adding product:", error);
        alert("Failed to add product.");
      } finally {
        setIsLoading(false);
      }
    };
    

    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Add Product</h1>
        <div className="grid grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="col-span-3 p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-3 p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="col-span-3 p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="col-span-3 p-2 border rounded"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="col-span-6 p-2 border rounded"
          />
          <select
            value={selectedCategory || ""}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              fetchSubCategories(e.target.value);
            }}
            className="col-span-3 p-2 border rounded"
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={selectedSubCategory || ""}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="col-span-3 p-2 border rounded"
          >
            <option value="">Select Sub-Category</option>
            {subCategories.map((subCategory) => (
              <option key={subCategory.id} value={subCategory.id}>
                {subCategory.name}
              </option>
            ))}
          </select>
          {/* <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="col-span-3 p-2 border rounded"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            className="col-span-3"
          />
          {thumbnailBase64 && (
            <img
              src={thumbnailBase64}
              alt="Thumbnail Preview"
              className="col-span-2 w-24 h-24 object-cover rounded"
            />
          )} */}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesChange}
            className="col-span-6"
          />
          <div className="col-span-6 flex space-x-2">
            {imagesBase64.map((image, index) => (
          <Image
          key={index}
          src={`data:image/png;base64,${image}`}
          alt={`Preview ${index}`}
          width={96} // equivalent to w-24
          height={96} // equivalent to h-24
          className="object-cover rounded"
        />
            ))}
          </div>
          <button
            onClick={handleAddProduct}
            disabled={isLoading}
            className="col-span-6 bg-blue-500 text-white p-2 rounded"
          >
            {isLoading ? "Adding..." : "Add Product"}
          </button>
        </div>
      </div>
    );
  };

  export default AddProductPage;



// "use client";
// "use client";

// import React, { useState } from "react";
// import { firestore } from "../../lib/firebase-config"; // Adjust this path based on your setup
// import { collection, addDoc } from "firebase/firestore";

// const AddProductPage = () => {
//   const [productName, setProductName] = useState("");
//   const [productDescription, setProductDescription] = useState("");
//   const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
//   const [imagesBase64, setImagesBase64] = useState<string[]>([]);

//   const handleFileToBase64 = (file: File): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = () => {
//         if (reader.result) resolve(reader.result.toString());
//         else reject("File reading failed");
//       };
//       reader.onerror = () => reject("File reading error");
//       reader.readAsDataURL(file);
//     });
//   };

//   const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       try {
//         const base64 = await handleFileToBase64(file);
//         setThumbnailBase64(base64);
//       } catch (error) {
//         console.error("Error converting thumbnail to Base64:", error);
//       }
//     }
//   };

//   const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files;
//     if (files) {
//       try {
//         const base64Images = await Promise.all(
//           Array.from(files).map((file) => handleFileToBase64(file))
//         );
//         setImagesBase64(base64Images);
//       } catch (error) {
//         console.error("Error converting images to Base64:", error);
//       }
//     }
//   };

//   const handleAddProduct = async () => {
//     if (!productName || !productDescription || !thumbnailBase64 || imagesBase64.length === 0) {
//       alert("Please fill in all fields and upload the necessary files.");
//       return;
//     }

//     try {
//       const productData = {
//         name: productName,
//         description: productDescription,
//         thumbnail: thumbnailBase64,
//         images: imagesBase64,
//       };

//       await addDoc(collection(firestore, "products"), productData);

//       alert("Product added successfully!");
//       setProductName("");
//       setProductDescription("");
//       setThumbnailBase64(null);
//       setImagesBase64([]);
//     } catch (error) {
//       console.error("Error adding product to Firestore:", error);
//       alert("Failed to add product.");
//     }
//   };

//   return (
//     <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
//       <h1>Add Product</h1>
//       <div>
//         <label>
//           Product Name:
//           <input
//             type="text"
//             value={productName}
//             onChange={(e) => setProductName(e.target.value)}
//             style={{ display: "block", margin: "10px 0", width: "100%", padding: "8px" }}
//           />
//         </label>
//       </div>
//       <div>
//         <label>
//           Product Description:
//           <textarea
//             value={productDescription}
//             onChange={(e) => setProductDescription(e.target.value)}
//             style={{ display: "block", margin: "10px 0", width: "100%", padding: "8px" }}
//           />
//         </label>
//       </div>
//       <div>
//         <label>
//           Product Thumbnail:
//           <input
//             type="file"
//             accept="image/*"
//             onChange={handleThumbnailChange}
//             style={{ display: "block", margin: "10px 0" }}
//           />
//         </label>
//       </div>
//       <div>
//         <label>
//           Product Images:
//           <input
//             type="file"
//             accept="image/*"
//             multiple
//             onChange={handleImagesChange}
//             style={{ display: "block", margin: "10px 0" }}
//           />
//         </label>
//       </div>
//       <button
//         onClick={handleAddProduct}
//         style={{
//           padding: "10px 20px",
//           backgroundColor: "#007bff",
//           color: "#fff",
//           border: "none",
//           borderRadius: "5px",
//           cursor: "pointer",
//         }}
//       >
//         Add Product
//       </button>
//     </div>
//   );
// };

// export default AddProductPage;

// app/dashboard/products/page.tsx
// import React, { useState } from "react";

// const AddProduct = () => {
//   const [thumbnailBase64, setThumbnailBase64] = useState<string>("");
//   const [imagesBase64, setImagesBase64] = useState<string[]>([]);
//   const [productName, setProductName] = useState<string>("");
//   const [productDescription, setProductDescription] = useState<string>("");

//   // Function to convert a file to Base64
//   const convertToBase64 = (file: File): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => {
//         if (reader.result) {
//           resolve((reader.result as string).split(",")[1]);
//         } else {
//           reject("FileReader result is null.");
//         }
//       };
//       reader.onerror = (error) => reject(error);
//     });
//   };

//   // Handle thumbnail file upload
//   const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       try {
//         const base64 = await convertToBase64(file);
//         setThumbnailBase64(base64);
//       } catch (error) {
//         console.error("Error converting file to Base64:", error);
//       }
//     }
//   };

//   // Handle multiple image file uploads
//   const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = Array.from(e.target.files || []) as File[];
//     try {
//       const base64Images = await Promise.all(files.map((file) => convertToBase64(file)));
//       setImagesBase64(base64Images);
//     } catch (error) {
//       console.error("Error converting files to Base64:", error);
//     }
//   };

//   // Handle product submission
//   const handleAddProduct = () => {
//     if (!productName || !productDescription || !thumbnailBase64 || imagesBase64.length === 0) {
//       alert("Please fill in all fields and upload the necessary files.");
//       return;
//     }

//     // Simulate product submission logic
//     const productData = {
//       name: productName,
//       description: productDescription,
//       thumbnail: thumbnailBase64,
//       images: imagesBase64,
//     };

//     console.log("Product submitted:", productData);

//     // Reset form
//     setProductName("");
//     setProductDescription("");
//     setThumbnailBase64("");
//     setImagesBase64([]);
//     alert("Product added successfully!");
//   };

//   return (
//     <div>
//       <h1>Add Product</h1>
//       <form onSubmit={(e) => e.preventDefault()}>
//         <label>
//           Product Name:
//           <input
//             type="text"
//             value={productName}
//             onChange={(e) => setProductName(e.target.value)}
//             placeholder="Enter product name"
//           />
//         </label>
//         <br />
//         <label>
//           Product Description:
//           <textarea
//             value={productDescription}
//             onChange={(e) => setProductDescription(e.target.value)}
//             placeholder="Enter product description"
//           />
//         </label>
//         <br />
//         <label>
//           Upload Thumbnail:
//           <input
//             type="file"
//             onChange={handleThumbnailUpload}
//             accept="image/*"
//           />
//         </label>
//         {thumbnailBase64 && (
//           <div>
//             <p>Thumbnail Preview:</p>
//             <img
//               src={`data:image/png;base64,${thumbnailBase64}`}
//               alt="Thumbnail Preview"
//               style={{ maxWidth: "200px", marginTop: "10px" }}
//             />
//           </div>
//         )}
//         <br />
//         <label>
//           Upload Images:
//           <input
//             type="file"
//             multiple
//             onChange={handleImagesUpload}
//             accept="image/*"
//           />
//         </label>
//         {imagesBase64.length > 0 && (
//           <div>
//             <p>Images Preview:</p>
//             <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
//               {imagesBase64.map((base64, index) => (
//                 <img
//                   key={index}
//                   src={`data:image/png;base64,${base64}`}
//                   alt={`Preview ${index + 1}`}
//                   style={{ maxWidth: "100px", marginTop: "10px" }}
//                 />
//               ))}
//             </div>
//           </div>
//         )}
//         <br />
//         <button type="button" onClick={handleAddProduct}>
//           Add Product
//         </button>
//       </form>
//     </div>
//   );
// };

// export default AddProduct;

// import { useEffect, useState } from "react";
// import { collection, getDocs, addDoc } from "firebase/firestore";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { firestore } from "../../lib/firebase-config";

// const storage = getStorage();

// interface Product {
//   id: string;
//   sku: string;
//   name: string;
//   price: number;
//   stock: number;
//   category: string;
//   sub_category: string;
//   imageUrl: string; // Updated to store a single image URL
// }

// export default function Products() {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // State for the Add Product form
//   const [newProduct, setNewProduct] = useState<Omit<Product, "id">>({
//     sku: "",
//     name: "",
//     price: 0,
//     stock: 0,
//     category: "",
//     sub_category: "",
//     imageUrl: "",
//   });

//   const [adding, setAdding] = useState(false);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [previewImage, setPreviewImage] = useState<string | null>(null);

//   // Fetch products from Firestore
//   useEffect(() => {
//     async function fetchProducts() {
//       try {
//         const querySnapshot = await getDocs(collection(firestore, "products"));
//         const productsData: Product[] = querySnapshot.docs.map((doc) => {
//           const data = doc.data() as Omit<Product, "id">;
//           return {
//             id: doc.id,
//             ...data,
//           };
//         });
//         setProducts(productsData);
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching products:", error);
//         setError("Failed to fetch products. Please try again later.");
//         setLoading(false);
//       }
//     }

//     fetchProducts();
//   }, []);

//   // Handle file selection and preview
//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0] || null;
//     setSelectedFile(file);

//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         setPreviewImage(event.target?.result as string);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       setPreviewImage(null);
//     }
//   };

//   // Add a new product to Firestore with an image upload
//   const handleAddProduct = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!selectedFile) {
//       alert("Please select an image file to upload.");
//       return;
//     }
  
//     setAdding(true);
  
//     try {
//       // Convert the image to Base64 or binary
//       const reader = new FileReader();
//       reader.onload = async () => {
//         const byteData = reader.result as ArrayBuffer; // Byte array
//         const base64String = btoa(
//           new Uint8Array(byteData)
//             .reduce((data, byte) => data + String.fromCharCode(byte), "")
//         );
  
//         // Save product with image as bytes
//         const productData = { ...newProduct, imageBytes: base64String };
//         const docRef = await addDoc(collection(firestore, "products"), productData);
  
//         // Update UI
//         setProducts((prev) => [
//           ...prev,
//           { id: docRef.id, ...productData },
//         ]);
//         setNewProduct({
//           sku: "",
//           name: "",
//           price: 0,
//           stock: 0,
//           category: "",
//           sub_category: "",
//           imageUrl: "",
//         });
//         setSelectedFile(null);
//         setPreviewImage(null);
//       };
  
//       reader.readAsArrayBuffer(selectedFile);
//     } catch (error) {
//       console.error("Error adding product:", error);
//     } finally {
//       setAdding(false);
//     }
//   };
  

//   return (
//     <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
//       <h1 className="text-3xl font-bold mb-8">Products</h1>

//       {/* Add Product Form */}
//       <div className="mb-8">
//         <h2 className="text-xl font-bold mb-4">Add New Product</h2>
//         <form
//           onSubmit={handleAddProduct}
//           className="grid grid-cols-1 md:grid-cols-2 gap-4"
//         >
//           <input
//             type="text"
//             placeholder="SKU"
//             value={newProduct.sku}
//             onChange={(e) =>
//               setNewProduct({ ...newProduct, sku: e.target.value })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="text"
//             placeholder="Name"
//             value={newProduct.name}
//             onChange={(e) =>
//               setNewProduct({ ...newProduct, name: e.target.value })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="number"
//             placeholder="Price"
//             value={newProduct.price}
//             onChange={(e) =>
//               setNewProduct({
//                 ...newProduct,
//                 price: parseFloat(e.target.value),
//               })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="number"
//             placeholder="Stock"
//             value={newProduct.stock}
//             onChange={(e) =>
//               setNewProduct({
//                 ...newProduct,
//                 stock: parseInt(e.target.value, 10),
//               })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="text"
//             placeholder="Category"
//             value={newProduct.category}
//             onChange={(e) =>
//               setNewProduct({ ...newProduct, category: e.target.value })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="text"
//             placeholder="Sub-Category"
//             value={newProduct.sub_category}
//             onChange={(e) =>
//               setNewProduct({ ...newProduct, sub_category: e.target.value })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="file"
//             accept="image/*"
//             onChange={handleFileChange}
//             className="p-2 bg-gray-800 text-gray-200"
//           />
//           {previewImage && (
//             <div className="col-span-1 md:col-span-2">
//               <p className="text-sm text-gray-400">Image Preview:</p>
//               <img
//                 src={previewImage}
//                 alt="Preview"
//                 className="max-w-full h-auto mt-2 border border-gray-700"
//               />
//             </div>
//           )}
//           <button
//             type="submit"
//             className="col-span-1 md:col-span-2 p-2 bg-green-600 text-gray-200 rounded hover:bg-green-700"
//             disabled={adding}
//           >
//             {adding ? "Adding..." : "Add Product"}
//           </button>
//         </form>
//       </div>

//       {/* Product List */}
//       {loading ? (
//         <p className="text-center">Loading...</p>
//       ) : error ? (
//         <p className="text-center text-red-500">{error}</p>
//       ) : products.length === 0 ? (
//         <p className="text-center">No products found.</p>
//       ) : (
//         <div className="overflow-x-auto h-[60vh] overflow-y-auto">
//           <table className="table-auto w-full border-collapse border border-gray-700">
//             <thead>
//               <tr className="bg-gray-800">
//                 <th className="border border-gray-700 px-4 py-2">SKU</th>
//                 <th className="border border-gray-700 px-4 py-2">Name</th>
//                 <th className="border border-gray-700 px-4 py-2">Price</th>
//                 <th className="border border-gray-700 px-4 py-2">Stock</th>
//                 <th className="border border-gray-700 px-4 py-2">Category</th>
//                 <th className="border border-gray-700 px-4 py-2">Sub-Category</th>
//                 <th className="border border-gray-700 px-4 py-2">Image</th>
//               </tr>
//             </thead>
//             <tbody>
//               {products.map((product) => (
//                 <tr key={product.id} className="hover:bg-gray-800">
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.sku}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.name}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.price}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.stock}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.category}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.sub_category}
//                   </td>
                  
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.imageUrl ? (
//                       <img
//                         src={product.imageUrl}
//                         alt={product.name}
//                         className="w-16 h-16 object-cover"
//                       />
//                     ) : (
//                       "No Image"
//                     )}
//                   </td>
                  
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }
// "use client";

// import { useEffect, useState } from "react";
// import { collection, getDocs, addDoc } from "firebase/firestore";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { firestore } from "../../lib/firebase-config";

// const storage = getStorage();

// interface Product {
//   id: string;
//   sku: string;
//   name: string;
//   price: number;
//   stock: number;
//   category: string;
//   sub_category: string;
//   imageUrl: string; // Updated to store a single image URL
// }

// export default function Products() {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // State for the Add Product form
//   const [newProduct, setNewProduct] = useState<Omit<Product, "id">>({
//     sku: "",
//     name: "",
//     price: 0,
//     stock: 0,
//     category: "",
//     sub_category: "",
//     imageUrl: "",
//   });

//   const [adding, setAdding] = useState(false);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [previewImage, setPreviewImage] = useState<string | null>(null);

//   // Fetch products from Firestore
//   useEffect(() => {
//     async function fetchProducts() {
//       try {
//         const querySnapshot = await getDocs(collection(firestore, "products"));
//         const productsData: Product[] = querySnapshot.docs.map((doc) => {
//           const data = doc.data() as Omit<Product, "id">;
//           return {
//             id: doc.id,
//             ...data,
//           };
//         });
//         setProducts(productsData);
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching products:", error);
//         setError("Failed to fetch products. Please try again later.");
//         setLoading(false);
//       }
//     }

//     fetchProducts();
//   }, []);

//   // Handle file selection and preview
//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0] || null;
//     setSelectedFile(file);

//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         setPreviewImage(event.target?.result as string);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       setPreviewImage(null);
//     }
//   };

//   // Add a new product to Firestore with an image upload
//   const handleAddProduct = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!selectedFile) {
//       alert("Please select an image file to upload.");
//       return;
//     }

//     setAdding(true);

//     try {
//       // Upload file to Firebase Storage
//       const storageRef = ref(storage, `product-images/${selectedFile.name}`);
//       await uploadBytes(storageRef, selectedFile);

//       // Get download URL for the uploaded image
//       const imageUrl = await getDownloadURL(storageRef);

//       // Save product to Firestore
//       const productData = { ...newProduct, imageUrl };
//       const docRef = await addDoc(collection(firestore, "products"), productData);

//       // Update UI
//       setProducts((prev) => [
//         ...prev,
//         { id: docRef.id, ...productData },
//       ]);
//       setNewProduct({
//         sku: "",
//         name: "",
//         price: 0,
//         stock: 0,
//         category: "",
//         sub_category: "",
//         imageUrl: "",
//       });
//       setSelectedFile(null);
//       setPreviewImage(null);
//     } catch (error) {
//       console.error("Error adding product:", error);
//     } finally {
//       setAdding(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
//       <h1 className="text-3xl font-bold mb-8">Products</h1>

//       {/* Add Product Form */}
//       <div className="mb-8">
//         <h2 className="text-xl font-bold mb-4">Add New Product</h2>
//         <form
//           onSubmit={handleAddProduct}
//           className="grid grid-cols-1 md:grid-cols-2 gap-4"
//         >
//           <input
//             type="text"
//             placeholder="SKU"
//             value={newProduct.sku}
//             onChange={(e) =>
//               setNewProduct({ ...newProduct, sku: e.target.value })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="text"
//             placeholder="Name"
//             value={newProduct.name}
//             onChange={(e) =>
//               setNewProduct({ ...newProduct, name: e.target.value })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="number"
//             placeholder="Price"
//             value={newProduct.price}
//             onChange={(e) =>
//               setNewProduct({
//                 ...newProduct,
//                 price: parseFloat(e.target.value),
//               })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="number"
//             placeholder="Stock"
//             value={newProduct.stock}
//             onChange={(e) =>
//               setNewProduct({
//                 ...newProduct,
//                 stock: parseInt(e.target.value, 10),
//               })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="text"
//             placeholder="Category"
//             value={newProduct.category}
//             onChange={(e) =>
//               setNewProduct({ ...newProduct, category: e.target.value })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="text"
//             placeholder="Sub-Category"
//             value={newProduct.sub_category}
//             onChange={(e) =>
//               setNewProduct({ ...newProduct, sub_category: e.target.value })
//             }
//             className="p-2 rounded bg-gray-800 text-gray-200"
//             required
//           />
//           <input
//             type="file"
//             accept="image/*"
//             onChange={handleFileChange}
//             className="p-2 bg-gray-800 text-gray-200"
//           />
//           {previewImage && (
//             <div className="col-span-1 md:col-span-2">
//               <p className="text-sm text-gray-400">Image Preview:</p>
//               <img
//                 src={previewImage}
//                 alt="Preview"
//                 className="max-w-full h-auto mt-2 border border-gray-700"
//               />
//             </div>
//           )}
//           <button
//             type="submit"
//             className="col-span-1 md:col-span-2 p-2 bg-green-600 text-gray-200 rounded hover:bg-green-700"
//             disabled={adding}
//           >
//             {adding ? "Adding..." : "Add Product"}
//           </button>
//         </form>
//       </div>

//       {/* Product List */}
//       {loading ? (
//         <p className="text-center">Loading...</p>
//       ) : error ? (
//         <p className="text-center text-red-500">{error}</p>
//       ) : products.length === 0 ? (
//         <p className="text-center">No products found.</p>
//       ) : (
//         <div className="overflow-x-auto h-[60vh] overflow-y-auto">
//           <table className="table-auto w-full border-collapse border border-gray-700">
//             <thead>
//               <tr className="bg-gray-800">
//                 <th className="border border-gray-700 px-4 py-2">SKU</th>
//                 <th className="border border-gray-700 px-4 py-2">Name</th>
//                 <th className="border border-gray-700 px-4 py-2">Price</th>
//                 <th className="border border-gray-700 px-4 py-2">Stock</th>
//                 <th className="border border-gray-700 px-4 py-2">Category</th>
//                 <th className="border border-gray-700 px-4 py-2">Sub-Category</th>
//                 <th className="border border-gray-700 px-4 py-2">Image</th>
//               </tr>
//             </thead>
//             <tbody>
//               {products.map((product) => (
//                 <tr key={product.id} className="hover:bg-gray-800">
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.sku}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.name}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.price}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.stock}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.category}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.sub_category}
//                   </td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     {product.imageUrl ? (
//                       <img
//                         src={product.imageUrl}
//                         alt={product.name}
//                         className="w-16 h-16 object-cover"
//                       />
//                     ) : (
//                       "No Image"
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }
// "use client";

// import { useState } from "react";
// import { collection, addDoc } from "firebase/firestore";
// import { firestore } from "../../lib/firebase-config";

// export default function AddProduct() {
//   const [product, setProduct] = useState({
//     sku: "",
//     name: "",
//     price: "",
//     stock: "",
//     category: "",
//     sub_category: "",
//   });
//   const [images, setImages] = useState<FileList | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setProduct((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files) {
//       setImages(e.target.files);
//     }
//   };

//   const readImagesAsBytes = async (): Promise<string[]> => {
//     if (!images) return [];

//     const imagePromises = Array.from(images).map((file) => {
//       return new Promise<string>((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => {
//           if (reader.result) {
//             resolve(reader.result.toString()); // base64 string
//           }
//         };
//         reader.onerror = () => reject(reader.error);
//         reader.readAsDataURL(file); // Read file as base64 data URL
//       });
//     });

//     return Promise.all(imagePromises);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");
//     setSuccess("");

//     try {
//       const imageBytes = await readImagesAsBytes();

//       const productData = {
//         ...product,
//         price: parseFloat(product.price), // Convert price to number
//         stock: parseInt(product.stock), // Convert stock to number
//         images: imageBytes, // Store base64 strings
//       };

//       await addDoc(collection(firestore, "products"), productData);
//       setSuccess("Product added successfully!");
//       setProduct({
//         sku: "",
//         name: "",
//         price: "",
//         stock: "",
//         category: "",
//         sub_category: "",
//       });
//       setImages(null);
//     } catch (error) {
//       console.error("Error adding product:", error);
//       setError("Failed to add product.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="h-[80vh] bg-gray-900 text-gray-200 p-8">
//       <h1 className="text-3xl font-bold mb-8">Add Product</h1>
//       {error && <p className="text-red-500">{error}</p>}
//       {success && <p className="text-green-500">{success}</p>}

//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div>
//           <label htmlFor="sku" className="block text-sm font-medium mb-1">
//             SKU
//           </label>
//           <input
//             type="text"
//             id="sku"
//             name="sku"
//             value={product.sku}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="name" className="block text-sm font-medium mb-1">
//             Name
//           </label>
//           <input
//             type="text"
//             id="name"
//             name="name"
//             value={product.name}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="price" className="block text-sm font-medium mb-1">
//             Price
//           </label>
//           <input
//             type="number"
//             id="price"
//             name="price"
//             value={product.price}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="stock" className="block text-sm font-medium mb-1">
//             Stock
//           </label>
//           <input
//             type="number"
//             id="stock"
//             name="stock"
//             value={product.stock}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="category" className="block text-sm font-medium mb-1">
//             Category
//           </label>
//           <input
//             type="text"
//             id="category"
//             name="category"
//             value={product.category}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="sub_category" className="block text-sm font-medium mb-1">
//             Sub-Category
//           </label>
//           <input
//             type="text"
//             id="sub_category"
//             name="sub_category"
//             value={product.sub_category}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="images" className="block text-sm font-medium mb-1">
//             Product Images
//           </label>
//           <input
//             type="file"
//             id="images"
//             multiple
//             accept="image/*"
//             onChange={handleImageChange}
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
//         >
//           {loading ? "Adding..." : "Add Product"}
//         </button>
//       </form>
//     </div>
//   );
// }
// "use client";

// import { useState } from "react";
// import { collection, addDoc } from "firebase/firestore";
// import { firestore } from "../../lib/firebase-config";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { storage } from "../../lib/firebase-config"; // Ensure you have Firebase Storage setup
// import { v4 as uuidv4 } from "uuid";

// export default function AddProduct() {
//   const [product, setProduct] = useState({
//     sku: "",
//     name: "",
//     price: "",
//     stock: "",
//     category: "",
//     sub_category: "",
//   });
//   const [images, setImages] = useState<FileList | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setProduct((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files) {
//       setImages(e.target.files);
//     }
//   };

//   const uploadImages = async (): Promise<string[]> => {
//     if (!images) return [];

//     const imageUrls: string[] = [];
//     for (const file of Array.from(images)) {
//       const storageRef = ref(storage, `products/${uuidv4()}-${file.name}`);
//       await uploadBytes(storageRef, file);
//       const url = await getDownloadURL(storageRef);
//       imageUrls.push(url);
//     }
//     return imageUrls;
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");
//     setSuccess("");

//     try {
//       const imageUrls = await uploadImages();

//       const productData = {
//         ...product,
//         price: parseFloat(product.price), // Convert price to number
//         stock: parseInt(product.stock), // Convert stock to number
//         images1: imageUrls,
//       };

//       await addDoc(collection(firestore, "products"), productData);
//       setSuccess("Product added successfully!");
//       setProduct({
//         sku: "",
//         name: "",
//         price: "",
//         stock: "",
//         category: "",
//         sub_category: "",
//       });
//       setImages(null);
//     } catch (error) {
//       console.error("Error adding product:", error);
//       setError("Failed to add product.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="h-[80vh] bg-gray-900 text-gray-200 p-8">
//       <h1 className="text-3xl font-bold mb-8">Add Product</h1>
//       {error && <p className="text-red-500">{error}</p>}
//       {success && <p className="text-green-500">{success}</p>}

//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div>
//           <label htmlFor="sku" className="block text-sm font-medium mb-1">
//             SKU
//           </label>
//           <input
//             type="text"
//             id="sku"
//             name="sku"
//             value={product.sku}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="name" className="block text-sm font-medium mb-1">
//             Name
//           </label>
//           <input
//             type="text"
//             id="name"
//             name="name"
//             value={product.name}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="price" className="block text-sm font-medium mb-1">
//             Price
//           </label>
//           <input
//             type="number"
//             id="price"
//             name="price"
//             value={product.price}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="stock" className="block text-sm font-medium mb-1">
//             Stock
//           </label>
//           <input
//             type="number"
//             id="stock"
//             name="stock"
//             value={product.stock}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="category" className="block text-sm font-medium mb-1">
//             Category
//           </label>
//           <input
//             type="text"
//             id="category"
//             name="category"
//             value={product.category}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="sub_category" className="block text-sm font-medium mb-1">
//             Sub-Category
//           </label>
//           <input
//             type="text"
//             id="sub_category"
//             name="sub_category"
//             value={product.sub_category}
//             onChange={handleChange}
//             required
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <div>
//           <label htmlFor="images" className="block text-sm font-medium mb-1">
//             Product Images
//           </label>
//           <input
//             type="file"
//             id="images"
//             multiple
//             accept="image/*"
//             onChange={handleImageChange}
//             className="w-full p-2 bg-gray-800 text-gray-200 border border-gray-700 rounded"
//           />
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
//         >
//           {loading ? "Adding..." : "Add Product"}
//         </button>
//       </form>
//     </div>
//   );
// }
