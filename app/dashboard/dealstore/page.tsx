// /* eslint-disable @typescript-eslint/no-unused-vars */
// "use client";

// import React, { useEffect, useState, useCallback } from "react";
// import { firestore } from "../../lib/firebase-config"; // Adjust to your config
// import Image from "next/image";
// import {
//   collection,
//   getDocs,
//   addDoc,
//   updateDoc,
//   doc,
//   getDoc,
// } from "firebase/firestore";

// // Define types
// interface Category {
//   id: string;
//   name: string;
// }

// interface Deal {
//   id: string;
//   url: string;
//   name: string;
//   category: string;
//   details: string;
//   location: string;
//   policy: string;
//   isTrending: boolean;
// }

// interface Product {
//   id: string;
//   sku: string;
//   name: string;
//   price: number;
//   stock: number;
//   category: string;
//   sub_category: string;
//   images1?: string[];
// }

// const HeroSectionSlider = () => {
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [selectedCategory, setSelectedCategory] = useState<string>("");
//   const [deals, setDeals] = useState<Deal[]>([]);
//   const [products, setProducts] = useState<Product[]>([]); // Products state
//   const [selectedDeals, setSelectedDeals] = useState<Deal[]>([]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

//   // Fetch categories
//   const fetchCategories = async () => {
//     const snapshot = await getDocs(collection(firestore, "dealstorecategory"));
//     const fetchedCategories = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       name: doc.data().name,
//     }));
//     setCategories(fetchedCategories);
//   };

//   // Fetch deals
//   const fetchDeals = async () => {
//     const snapshot = await getDocs(collection(firestore, "dealstore"));
//     const fetchedDeals = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     })) as Deal[];
//     setDeals(fetchedDeals);
//     setSelectedDeals(
//       fetchedDeals.filter((deal) => deal.category === selectedCategory)
//     );
//   };

//   // Fetch products
//   const fetchProducts = useCallback(async () => {
//     const snapshot = await getDocs(collection(firestore, "products"));
//     const fetchedProducts = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//       images1: doc.data().images1 || [],
//     })) as Product[];
//     setProducts(fetchedProducts);
//   }, []);

//   // Handle adding a product to a deal
//   const handleAddProductToDeal = async (productId: string) => {
//     if (!selectedDeal) return;
  
//     try {
//       const dealRef = doc(firestore, "dealstore", selectedDeal.id);
  
//       // Fetch the current deal document
//       const dealSnapshot = await getDoc(dealRef);
//       if (dealSnapshot.exists()) {
//         const dealData = dealSnapshot.data();
  
//         // Get existing productIds or initialize with an empty array
//         const currentProductIds = dealData.productIds || [];
  
//         // Add the new productId to the array (avoid duplicates)
//         const updatedProductIds = Array.from(new Set([...currentProductIds, productId]));
  
//         // Update Firestore document
//         await updateDoc(dealRef, { productIds: updatedProductIds });
  
//         alert("Product added to deal successfully!");
//         fetchDeals(); // Refresh deals
//         closeModal();
//       } else {
//         console.error("Deal document does not exist.");
//       }
//     } catch (error) {
//       console.error("Error adding product to deal:", error);
//     }
//   };
  
  

//   // Open the product selection modal
//   const openModal = (deal: Deal) => {
//     setSelectedDeal(deal);
//     setModalOpen(true);
//   };

//   // Close the modal
//   const closeModal = () => {
//     setModalOpen(false);
//     setSelectedDeal(null);
//   };

//   // Fetch data on mount
//   useEffect(() => {
//     fetchCategories();
//     fetchDeals();
//     fetchProducts();
//   }, [fetchProducts]);

//   // Update selected deals when category changes
//   useEffect(() => {
//     setSelectedDeals(deals.filter((deal) => deal.category === selectedCategory));
//   }, [selectedCategory, deals]);

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-2xl font-bold mb-6">Deal Store</h1>

//       {/* Category Selector */}
//       <div className="mb-4">
//         <label className="block mb-2">Select Category:</label>
//         <select
//           value={selectedCategory}
//           onChange={(e) => setSelectedCategory(e.target.value)}
//           className="border border-gray-300 bg-gray-200 text-black rounded px-4 py-2 w-full"
//         >
//           {categories.map((category) => (
//             <option key={category.id} value={category.id}>
//               {category.name}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Deals Table */}
//       <div className="mt-6">
//         <table className="w-full table-auto border-collapse border border-gray-300">
//           <thead>
//             <tr>
//               <th className="border border-gray-300 px-4 py-2">Image</th>
//               <th className="border border-gray-300 px-4 py-2">Name</th>
//               <th className="border border-gray-300 px-4 py-2">Category</th>
//               <th className="border border-gray-300 px-4 py-2">Details</th>
//               <th className="border border-gray-300 px-4 py-2">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {selectedDeals.map((deal) => (
//               <tr key={deal.id}>
//                 <td className="border border-gray-300 px-4 py-2">
//                   <Image
//                     src={deal.url}
//                     alt={deal.name}
//                     width={100}
//                     height={100}
//                     className="object-cover"
//                   />
//                 </td>
//                 <td className="border border-gray-300 px-4 py-2">{deal.name}</td>
//                 <td className="border border-gray-300 px-4 py-2">
//                   {
//                     categories.find((category) => category.id === deal.category)
//                       ?.name
//                   }
//                 </td>
//                 <td className="border border-gray-300 px-4 py-2">
//                   {deal.details}
//                 </td>
//                 <td className="border border-gray-300 px-4 py-2">
//                   <button
//                     onClick={() => openModal(deal)}
//                     className="bg-blue-500 text-white px-4 py-2 rounded"
//                   >
//                     Add Product
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Product Modal */}
//       {modalOpen && selectedDeal && (
//         <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-6 rounded shadow-lg w-96">
//             <h2 className="text-xl font-semibold mb-4">
//               Select Product for `${selectedDeal.name}`
//             </h2>
//             <ul className="overflow-y-scroll max-h-80">
//               {products.map((product) => (
//                 <li
//                   key={product.id}
//                   className="flex items-center justify-between mb-2"
//                 >
//                   <span>{product.name}</span>
//                   <button
//                     onClick={() => handleAddProductToDeal(product.id)}
//                     className="bg-green-500 text-white px-3 py-1 rounded"
//                   >
//                     Add
//                   </button>
//                 </li>
//               ))}
//             </ul>
//             <button
//               onClick={closeModal}
//               className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default HeroSectionSlider;








// /* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { firestore } from "../../lib/firebase-config";
import Image from "next/image";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

interface Deal {
  id: string;
  url: string;
  name: string;
  category: string;
  details: string;
}

const DealsPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeals, setSelectedDeals] = useState<Deal[]>([]);

  // Fetch categories
  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(firestore, "dealstorecategory"));
    const fetchedCategories = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));
    setCategories(fetchedCategories);
  };

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    const snapshot = await getDocs(collection(firestore, "dealstore"));
    const fetchedDeals = snapshot.docs.map((doc) => ({
      id: doc.id,
      url: doc.data().url,
      name: doc.data().name,
      category: doc.data().category,
      details: doc.data().details,
    }));
    setDeals(fetchedDeals);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchDeals();
  }, [fetchDeals]);

  // Filter deals by selected category
  useEffect(() => {
    if (selectedCategory) {
      setSelectedDeals(deals.filter((deal) => deal.category === selectedCategory));
    } else {
      setSelectedDeals(deals);
    }
  }, [selectedCategory, deals]);

  // Delete deal
  const handleDeleteDeal = async (id: string) => {
    try {
      await deleteDoc(doc(firestore, "dealstore", id));
      alert("Deal deleted successfully!");
      fetchDeals();
    } catch (error) {
      console.error("Error deleting deal:", error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Deals</h1>

      <div className="mb-4">
        <Link href="/dashboard/dealstore/deal" className="bg-blue-500 text-white px-4 py-2 rounded">
          Add New Deal
        </Link>
      </div>
      <div className="mb-4">
        <Link href="/dashboard/dealstore/category" className="bg-blue-500 text-white px-4 py-2 rounded">
          Add New Deal Category
        </Link>
      </div>
      {/* Add Deal Link */}

      {/* Category Selector */}
      <div className="mb-4">
        <label className="block mb-2">Filter by Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-300 bg-gray-200 text-black rounded px-4 py-2 w-full"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Deals Table */}
      <div>
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2">Image</th>
              <th className="border border-gray-300 px-4 py-2">Name</th>
              <th className="border border-gray-300 px-4 py-2">Category</th>
              <th className="border border-gray-300 px-4 py-2">Details</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {selectedDeals.map((deal) => (
              <tr key={deal.id}>
                <td className="border border-gray-300 px-4 py-2">
                  <Image src={deal.url} alt={deal.name} width={100} height={100} />
                </td>
                <td className="border border-gray-300 px-4 py-2">{deal.name}</td>
                <td className="border border-gray-300 px-4 py-2">{deal.category}</td>
                <td className="border border-gray-300 px-4 py-2">{deal.details}</td>
                <td className="border border-gray-300 px-4 py-2">
                  <button
                    onClick={() => handleDeleteDeal(deal.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DealsPage;





// /* eslint-disable @typescript-eslint/no-unused-vars */
// "use client";

// import React, { useEffect, useState } from "react";
// import { firestore } from "../../lib/firebase-config"; // Adjust to your config
// import Image from "next/image";
// import {
//   collection,
//   getDocs,
//   addDoc,
//   deleteDoc,
//   updateDoc,
//   doc,
// } from "firebase/firestore";

// // Define types for category, deals, and products
// interface Category {
//   id: string;
//   name: string;
// }

// interface Deal {
//   id: string;
//   url: string;
//   name: string;
//   category: string;
//   products?: { name: string; image: string }[]; // Array to hold product objects with name and image
// }

// interface Product {
//   name: string;
//   image: string;
// }

// const HeroSectionSlider = () => {
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [selectedCategory, setSelectedCategory] = useState<string>("");
//   const [deals, setDeals] = useState<Deal[]>([]);
//   const [selectedDeals, setSelectedDeals] = useState<Deal[]>([]);
//   const [newDealName, setNewDealName] = useState("");
//   const [newImage, setNewImage] = useState<File | null>(null);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [newProductName, setNewProductName] = useState(""); // New state for product name
//   const [newProductImage, setNewProductImage] = useState<File | null>(null); // State for product image
//   const [modalOpen, setModalOpen] = useState(false); // State to control modal visibility
//   const [selectedDealForProduct, setSelectedDealForProduct] = useState<Deal | null>(null); // Deal to add products to

//   // Fetch categories from Firestore
//   const fetchCategories = async () => {
//     const snapshot = await getDocs(collection(firestore, "dealstorecategory"));
//     const fetchedCategories = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       name: doc.data().name,
//     }));
//     setCategories(fetchedCategories);
//     setSelectedCategory(fetchedCategories[0]?.id || ""); // Default to the first category
//   };

//   // Fetch deals from Firestore
//   const fetchDeals = async () => {
//     const snapshot = await getDocs(collection(firestore, "dealstore"));
//     const fetchedDeals = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       url: doc.data().url,
//       name: doc.data().name,
//       category: doc.data().category,
//       products: doc.data().products || [], // Fetch existing products
//     }));
//     setDeals(fetchedDeals);
//     setSelectedDeals(fetchedDeals.filter((deal) => deal.category === selectedCategory));
//   };

//   // Fetch data on mount
//   useEffect(() => {
//     fetchCategories();
//     fetchDeals();
//   }, []);

//   // Update selected deals when category changes
//   useEffect(() => {
//     setSelectedDeals(deals.filter((deal) => deal.category === selectedCategory));
//     setCurrentIndex(0); // Reset slider index
//   }, [selectedCategory, deals]);

//   // Handle adding a new deal
//   const handleAddDeal = async () => {
//     if (!newImage || !newDealName || !selectedCategory) {
//       return alert("Please fill out all fields and select an image.");
//     }

//     const reader = new FileReader();
//     reader.onload = async () => {
//       const base64Image = reader.result as string;
//       try {
//         await addDoc(collection(firestore, "dealstore"), {
//           url: base64Image,
//           name: newDealName,
//           category: selectedCategory,
//           products: [], // Start with an empty product list
//         });
//         alert("Deal added successfully!");
//         setNewImage(null);
//         setNewDealName("");
//         fetchDeals(); // Reload deals after adding
//       } catch (error) {
//         console.error("Error adding deal:", error);
//       }
//     };

//     reader.readAsDataURL(newImage); // Convert the image to base64
//   };

//   // Handle deleting a deal
//   const handleDeleteDeal = async (id: string) => {
//     try {
//       await deleteDoc(doc(firestore, "dealstore", id));
//       alert("Deal deleted successfully!");
//       fetchDeals(); // Reload deals after deletion
//     } catch (error) {
//       console.error("Error deleting deal:", error);
//     }
//   };

//   // Open the modal and select the deal
//   const openModal = (deal: Deal) => {
//     setSelectedDealForProduct(deal);
//     setModalOpen(true);
//   };

//   // Close the modal
//   const closeModal = () => {
//     setModalOpen(false);
//     setSelectedDealForProduct(null);
//     setNewProductName("");
//     setNewProductImage(null);
//   };

//   // Add product to selected deal
//   const handleAddProductToDeal = async () => {
//     if (!newProductName || !newProductImage) return alert("Please enter a product name and upload an image.");

//     const reader = new FileReader();
//     reader.onload = async () => {
//       const base64Image = reader.result as string;

//       const updatedDeal = {
//         ...selectedDealForProduct,
//         products: [
//           ...(selectedDealForProduct?.products || []),
//           { name: newProductName, image: base64Image },
//         ],
//       };

//       // Update the selected deal in Firestore
//       const dealRef = doc(firestore, "dealstore", selectedDealForProduct!.id);
//       await updateDoc(dealRef, {
//         products: updatedDeal.products,
//       });

//       // Update the local state
//       setSelectedDeals((prevDeals) =>
//         prevDeals.map((deal) =>
//           deal.id === updatedDeal.id ? updatedDeal : deal
//         )
//       );
      
//       closeModal(); // Close the modal after adding the product
//     };

//     reader.readAsDataURL(newProductImage); // Convert the image to base64
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-2xl font-bold mb-6">Deal Store</h1>

//       {/* Category Selector */}
//       <div className="mb-4">
//         <label className="block mb-2">Select Category:</label>
//         <select
//           value={selectedCategory}
//           onChange={(e) => setSelectedCategory(e.target.value)}
//           className="border border-gray-300 bg-gray-200 text-black rounded px-4 py-2 w-full"
//         >
//           {categories.map((category) => (
//             <option key={category.id} value={category.id}>
//               {category.name}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Image Slider */}
//       <div className="relative w-full h-64 overflow-hidden rounded-lg">
//         {selectedDeals.length > 0 ? (
//           <Image
//             src={selectedDeals[currentIndex]?.url || "/placeholder.png"} // Fallback to a placeholder
//             alt={`Slide ${currentIndex}`}
//             fill
//             className="object-cover"
//           />
//         ) : (
//           <div className="flex items-center justify-center w-full h-full bg-gray-200">
//             <p>No deals available for the selected category.</p>
//           </div>
//         )}
//       </div>

//       {/* Add Deal */}
//       <div className="mt-6">
//         <input
//           type="file"
//           accept="image/*"
//           onChange={(e) => setNewImage(e.target.files?.[0] || null)}
//           className="mb-4"
//         />
//         <input
//           type="text"
//           value={newDealName}
//           onChange={(e) => setNewDealName(e.target.value)}
//           placeholder="Deal Name"
//           className="border border-gray-300 bg-gray-200 text-black rounded px-4 py-2 w-full mb-4"
//         />
//         <button
//           onClick={handleAddDeal}
//           className="bg-blue-500 text-white px-4 py-2 rounded"
//         >
//           Add Deal
//         </button>
//       </div>

//       {/* List of Deals */}
//       <ul className="mt-6 space-y-4">
//         {selectedDeals.map((deal) => (
//           <li key={deal.id} className="flex flex-col items-center space-y-4">
//             <div className="flex items-center space-x-4">
//               <Image
//                 src={deal.url || "/placeholder.png"}
//                 alt={`Deal ${deal.name}`}
//                 width={80}
//                 height={80}
//                 className="object-cover rounded"
//               />
//               <p>{deal.name}</p>
//               <button
//                 onClick={() => openModal(deal)} // Open modal on deal click
//                 className="bg-green-500 text-white px-4 py-2 rounded"
//               >
//                 Add Product
//               </button>
//               <button
//                 onClick={() => handleDeleteDeal(deal.id)}
//                 className="bg-red-500 text-white px-4 py-2 rounded"
//               >
//                 Delete
//               </button>
//             </div>

//             {/* List of Products */}
//             <div className="mt-4">
//               {deal.products?.map((product, index) => (
//                 <div key={index} className="flex items-center space-x-4">
//                   <Image
//                     src={product.image || "/placeholder.png"}
//                     alt={product.name}
//                     width={50}
//                     height={50}
//                     className="object-cover rounded"
//                   />
//                   <span>{product.name}</span>
//                 </div>
//               ))}
//             </div>
//           </li>
//         ))}
//       </ul>

//       {/* Modal for adding product */}
//       {modalOpen && selectedDealForProduct && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
//           <div className="bg-white p-6 rounded-lg w-96">
//             <h2 className="text-xl font-semibold mb-4">
//               Add Product to {selectedDealForProduct.name}
//             </h2>
//             <input
//               type="text"
//               value={newProductName}
//               onChange={(e) => setNewProductName(e.target.value)}
//               placeholder="Product Name"
//               className="border border-gray-300 bg-gray-200 text-black rounded px-4 py-2 w-full mb-4"
//             />
//             <input
//               type="file"
//               accept="image/*"
//               onChange={(e) => setNewProductImage(e.target.files?.[0] || null)}
//               className="mb-4"
//             />
//             <div className="flex justify-between">
//               <button
//                 onClick={closeModal}
//                 className="bg-gray-500 text-white px-4 py-2 rounded"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleAddProductToDeal}
//                 className="bg-blue-500 text-white px-4 py-2 rounded"
//               >
//                 Add Product
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default HeroSectionSlider;
