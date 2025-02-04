"use client";
import Image from 'next/image';
import { useEffect, useState } from "react";
import * as XLSX from "xlsx"
import {
  collection,
  getDocs,
  query,
  collectionGroup,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "../../lib/firebase-config";
import { FiPrinter } from "react-icons/fi";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  images1: string[];
}

interface DeliveryDetails {
  address: string;
  city: string;
  country: string;
  phone: string;
  province: string;
  street: string;
}

interface Order {
  orderId: string;
  userId: string;
  status: string;
  datetime:string;
  totalPrice: number;
  products: Product[];
  userEmail: string;
  deliveryDetails: DeliveryDetails;
  contactNumber: string;
  city: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Product[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryDetails | null>(null);
  const [filterOrderId, setFilterOrderId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
const [filterEndDate, setFilterEndDate] = useState("");

  // Fetch emails from the custom API
  async function fetchEmails(): Promise<{ [userId: string]: string }> {
    try {
      const customersQuery = collection(firestore, "customers");
      const querySnapshot = await getDocs(customersQuery);
  
      const emailMap: { [userId: string]: string } = {};
      querySnapshot.forEach((doc) => {
        const customerData = doc.data();
        const userId = doc.id;
        emailMap[userId] = customerData.email || "No Email";
      });
  
      return emailMap;
    } catch (error) {
      console.error("Error fetching customer emails:", error);
      return {};
    }
  }
  
  

  // Fetch orders and match emails with user IDs
  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);

        const emailMap = await fetchEmails();

        const ordersQuery = query(collectionGroup(firestore, "user_orders"));
        const querySnapshot = await getDocs(ordersQuery);

        const ordersData: Order[] = querySnapshot.docs.map((orderDoc) => {
          const orderData = orderDoc.data();
          const userId = orderDoc.ref.parent.parent?.id || "Unknown User";
          const datetime = orderData.datetime
          ? orderData.datetime instanceof Timestamp
            ? orderData.datetime.toDate().toLocaleDateString("en-CA") // Extract local date in YYYY-MM-DD format
            : new Date(orderData.datetime).toLocaleDateString("en-CA") // Handle string case if needed
          : "Unknown";
        
          return {
            orderId: orderDoc.id,
            userId,
            datetime,
            userEmail: emailMap[userId] || "No Email",
            status: orderData.status || "Unknown",
            totalPrice: orderData.totalPrice || 0,
            products: orderData.products || [],
            deliveryDetails: orderData.deliveryDetails || {},
            contactNumber: orderData.deliveryDetails?.phone || "N/A",
            city: orderData.deliveryDetails?.city || "N/A",
          } as Order;
        });

        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const isWithinDateRange = (orderDate: string) => {
    const orderTimestamp = new Date(orderDate).getTime();
    const startTimestamp = filterStartDate ? new Date(filterStartDate).getTime() : -Infinity;
    const endTimestamp = filterEndDate ? new Date(filterEndDate).getTime() : Infinity;
    return orderTimestamp >= startTimestamp && orderTimestamp <= endTimestamp;
  };
 
  const setSelectedproducts = async (productsWithQuantities: { id: string; quantity: number }[]) => {
    try {
      if (productsWithQuantities.length === 0) {
        console.error("No product IDs provided");
        return;
      }
  
      const productsRef = collection(firestore, "products");
      const productIds = productsWithQuantities.map((p) => p.id);
      const querySnapshot = await getDocs(query(productsRef, where("__name__", "in", productIds)));
  
      const products: Product[] = querySnapshot.docs.map((doc) => {
        const productData = doc.data() as Product;
        const quantity = productsWithQuantities.find((p) => p.id === doc.id)?.quantity || 0;
  
        return {
          id: doc.id,
          name: productData.name,
          price: productData.price,
          quantity, // Include quantity from `user_orders`
          images1: productData.images1,
        };
      });
  
      setSelectedItems(products);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };
  

    const handleShowItems = (order: Order) => {
      const productIdsWithQuantities = order.products.map((product) => ({
        id: product.id,
        quantity: product.quantity,
      }));
      setSelectedproducts(productIdsWithQuantities);
    };
    

  // Handle showing delivery details
  const handleShowDeliveryDetails = (deliveryDetails: DeliveryDetails) => {
    setSelectedDelivery(deliveryDetails);
  };

  const handleCloseModal = () => {
    setSelectedItems([]);
    setSelectedDelivery(null);
  };
  
  

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      // Confirmation alert
      const confirmUpdate = window.confirm(
        `Are you sure you want to update the status to "${newStatus}"?`
      );

      if (!confirmUpdate) {
        console.log("Status update cancelled by the user.");
        return;
      }

      // Adjust the path to locate the correct document in the "user_orders" collection
      const ordersCollectionRef = query(collectionGroup(firestore, "user_orders"));
      const querySnapshot = await getDocs(ordersCollectionRef);
      const orderDocRef = querySnapshot.docs.find((doc) => doc.id === orderId)?.ref;

      if (!orderDocRef) {
        console.error("Order document not found for orderId:", orderId);
        return;
      }

      // Update the document with the new status
      await updateDoc(orderDocRef, { status: newStatus });

      // Update the local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.orderId === orderId ? { ...order, status: newStatus } : order
        )
      );

      console.log("Status updated successfully.");
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };



  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      orders.filter(
        (order) =>
          (filterOrderId === "" || order.orderId.toLowerCase().includes(filterOrderId.toLowerCase()) || order.userEmail.includes(filterOrderId)) &&
          (filterStatus === "" || order.status === filterStatus) &&
          isWithinDateRange(order.datetime)
      )
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "orders_report.xlsx");
  };


  const handlePrintOrderSlip = (order: Order) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                margin: 20px; 
                padding: 20px; 
              }
              h1 { 
                text-align: center; 
                padding-bottom: 20px; 
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0; 
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 12px; 
                text-align: left; 
              }
              th { 
                background-color: #f4f4f4; 
              }
              p { 
                margin-bottom: 10px; 
                font-size: 16px;
              }
              /* Style for the print button */
              #printButton {
                display: block;
                margin-bottom: 20px;
                padding: 10px 20px;
                background-color: #4CAF50;
                color: white;
                border: none;
                font-size: 16px;
                cursor: pointer;
              }
              #printButton:hover {
                background-color: #45a049;
              }
              @media print {
                @page {
                  margin: 0;
                  size: auto;
                }
                body {
                  margin: 50px;
                  padding: 0;
                }
                header, footer, .no-print {
                  display: none !important;
                }
                /* Hide the print button when printing */
                #printButton {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <!-- Print button -->
            <button id="printButton" onclick="window.print();">Print Order Slip</button>
  
            <h1>Order Slip</h1>
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>User Email:</strong> ${order.userEmail}</p>
            <p><strong>Contact Number:</strong> ${order.contactNumber}</p>
            <p><strong>Delivery Address:</strong> ${order.deliveryDetails.street}, ${order.deliveryDetails.city}, ${order.deliveryDetails.province}, ${order.deliveryDetails.country}</p>
            <h2>Products</h2>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Price</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${order.products
                  .map(
                    (product) => `
                    <tr>
                      <td>${product.name}</td>
                      <td>Rs${product.price}</td>
                      <td>${product.quantity}</td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>
            <p><strong>Total Price:</strong> Rs${order.totalPrice}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
  printWindow.print();
      // Trigger the print action
      // printWindow.document.execCommand('print', false);
    }
  };

  
  return (
    <div className="h-[80vh]  text-black-200 p-8">
      <h1 className="text-3xl font-bold mb-8">All Users Orders</h1>
    
      <div className="mb-4 flex flex-wrap gap-4">

  <div className="flex-1 min-w-[200px]">
    <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">Order ID And User Email</label>
    <input
      type="text"
      id="orderId"
      value={filterOrderId}
      onChange={(e) => setFilterOrderId(e.target.value)}
      className="w-full border border-gray-300 p-2 rounded-md"
    />
  </div>

  <div className="flex-1 min-w-[200px]">
    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status:</label>
    <select
      id="status"
      value={filterStatus}
      onChange={(e) => setFilterStatus(e.target.value)}
      className="w-full border border-gray-300 p-2 rounded-md"
    >
      <option value="">All</option>
      <option value="Pending">Pending</option>
      <option value="Shipped">Shipped</option>
      <option value="Delivered">Delivered</option>
      <option value="Cancelled">Cancelled</option>
    </select>
  </div>

  <div className="flex-1 min-w-[200px]">
    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date:</label>
    <input
      type="date"
      id="startDate"
      value={filterStartDate}
      onChange={(e) => setFilterStartDate(e.target.value)}
      className="w-full border border-gray-300 p-2 rounded-md"
    />
  </div>

  <div className="flex-1 min-w-[200px]">
    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date:</label>
    <input
      type="date"
      id="endDate"
      value={filterEndDate}
      onChange={(e) => setFilterEndDate(e.target.value)}
      className="w-full border border-gray-300 p-2 rounded-md"
    />
  </div>


  <div className="flex-1 min-w-[200px]">
    <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">Export Data</label>
    <button
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
                  onClick={() => exportToExcel()}
                >
                  Convert to Excel Report
                </button>
  </div>
</div>


      {loading ? (
  <p className="text-center">Loading...</p>
) : orders.length === 0 ? (
  <p className="text-center">No orders found.</p>
) : (
  <div className="overflow-x-auto h-[60vh] overflow-y-auto">
    <table className="table-auto w-full border-collapse border border-white">
      <thead>
        <tr className="bg-white">
          <th className="border border-gray-700 px-4 py-2">Order ID</th>
          <th className="border border-gray-700 px-4 py-2">User Email</th>
          <th className="border border-gray-700 px-4 py-2">Contact</th>
          <th className="border border-gray-700 px-4 py-2">City</th>
          <th className="border border-gray-700 px-4 py-2">Date</th>
          <th className="border border-gray-700 px-4 py-2">Status</th>
          <th className="border border-gray-700 px-4 py-2">Total Price</th>
          <th className="border border-gray-700 px-4 py-2">Items Count</th>
          <th className="border border-gray-700 px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders
          .filter(
            (order) =>
              (filterOrderId === "" || order.orderId.toLowerCase().includes(filterOrderId.toLowerCase()) || order.userEmail.includes(filterOrderId)) &&
              (filterStatus === "" || order.status === filterStatus) &&
              isWithinDateRange(order.datetime) 
          )

          .map((order) => (
            <tr key={order.orderId} className="hover:bg-gray-100">
              <td className="border border-gray-700 px-4 py-2">{order.orderId}</td>
              <td className="border border-gray-700 px-4 py-2">{order.userEmail}</td>
              <td className="border border-gray-700 px-4 py-2">{order.contactNumber}</td>
              <td className="border border-gray-700 px-4 py-2">{order.city}</td>
              <td className="border border-gray-700 px-4 py-2">{order.datetime}</td>
              <td className="border border-gray-700 px-4 py-2">
                <select
                  className="bg-gray-500 text-white px-2 py-1 rounded"
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(order.orderId, e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </td>
              <td className="border border-gray-700 px-4 py-2">PKR:{order.totalPrice}</td>
              <td className="border border-gray-700 px-4 py-2">{order.products.length}</td>
              <td className="border border-gray-700 px-4 py-2 space-y-2">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  onClick={() => handleShowItems(order)}
                >
                  View Items
                </button>
                <button
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                  onClick={() => handleShowDeliveryDetails(order.deliveryDetails)}
                >
                  View Delivery
                </button>
                <button
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
                  onClick={() => handlePrintOrderSlip(order)}
                >
                  <FiPrinter size={20} style={{ marginRight: "5px" }} />
                </button>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
)}


      {/* Modal for displaying items */}
    
      {/* Modal for displaying product details */}
      {selectedItems.length > 0 && (
  <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
    <div className="bg-white p-12 rounded-lg max-w-4xl w-full relative">
      <h2 className="text-2xl font-bold mb-6 text-center text-black">Product Details</h2>
      <button
        className="text-black absolute top-4 right-4 text-2xl"
        onClick={handleCloseModal}
      >
        X
      </button>
      <div className="overflow-y-auto max-h-[400px]">
        <table className="table-auto w-full text-left text-black border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-6 py-4">Image</th>
              <th className="border border-gray-300 px-6 py-4">Product Name</th>
              <th className="border border-gray-300 px-6 py-4">Price</th>
              <th className="border border-gray-300 px-6 py-4">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((product) => (
              <tr key={product.id}>
                <td className="border border-gray-300 px-6 py-4">
                  {product.images1 && product.images1.length > 0 ? (
                    <Image
                      src={
                        product.images1[0].startsWith("data:image")
                          ? product.images1[0]
                          : `data:image/jpeg;base64,${product.images1[0]}`
                      }
                      alt="Product"
                      width={80} // Set the width
                      height={80} // Set the height
                      className="object-cover rounded"
                    />
                  ) : (
                    <span>No image</span>
                  )}
                </td>
                <td className="border border-gray-300 px-6 py-4">{product.name}</td>
                <td className="border border-gray-300 px-6 py-4">{product.price}</td>
                <td className="border border-gray-300 px-6 py-4">{product.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}






      {/* Modal for displaying delivery details */}
      {selectedDelivery && (
  <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
    <div className="bg-gray-900 p-8 rounded relative">
      <h2 className="text-2xl font-bold mb-4">Delivery Details</h2>
      <button
        className="text-white absolute top-4 right-4 text-lg"
        onClick={handleCloseModal}
      >
        X
      </button>
      <table className="table-auto w-full text-left text-white border-collapse border border-gray-700">
      
        <tbody>
        <tr>
            <td className="border border-gray-700 px-4 py-2"><b>Phone</b></td>
            <td className="border border-gray-700 px-4 py-2">{selectedDelivery.phone}</td>
          </tr>
          <tr>
            <td className="border border-gray-700 px-4 py-2"> <b>Address</b></td>
            <td className="border border-gray-700 px-4 py-2">{selectedDelivery.street}</td>
          </tr>
          <tr>
            <td className="border border-gray-700 px-4 py-2"><b>City</b></td>
            <td className="border border-gray-700 px-4 py-2">{selectedDelivery.city}</td>
          </tr>
          <tr>
            <td className="border border-gray-700 px-4 py-2"><b>Province</b></td>
            <td className="border border-gray-700 px-4 py-2">{selectedDelivery.province}</td>
          </tr>
          <tr>
            <td className="border border-gray-700 px-4 py-2"><b>Country</b></td>
            <td className="border border-gray-700 px-4 py-2">{selectedDelivery.country}</td>
          </tr>
       
        </tbody>
      </table>
    </div>
  </div>
)}

    </div>
  );
}


// "use client";
// import { useEffect, useState } from "react";
// import {
//   collection,
//   getDocs,
//   query,
//   collectionGroup,
//   doc,
//   getDoc,
// } from "firebase/firestore";
// import { firestore } from "../../lib/firebase-config";

// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   quantity: number;
// }

// interface DeliveryDetails {
//   address: string;
//   city: string;
//   country: string;
//   phone: string;
//   province: string;
//   street: string;
// }

// interface Order {
//   orderId: string;
//   userId: string;
//   status: string;
//   totalPrice: number;
//   products: Product[];
//   userEmail: string;
//   deliveryDetails: DeliveryDetails;
// }

// export default function Orders() {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedItems, setSelectedItems] = useState<Product[]>([]);
//   const [selectedDelivery, setSelectedDelivery] = useState<DeliveryDetails | null>(null);

//   // Fetch all orders and user details
//   useEffect(() => {
//     async function fetchOrders() {
//       try {
//         const ordersQuery = query(collectionGroup(firestore, "user_orders"));
//         const querySnapshot = await getDocs(ordersQuery);

//         const ordersData: Order[] = await Promise.all(
//           querySnapshot.docs.map(async (orderDoc) => {
//             const orderData = orderDoc.data();
//             const userId = orderDoc.ref.parent.parent?.id || "Unknown User";

//             // Fetch user email
//             const userDocRef = doc(firestore, "users", userId);
//             const userDocSnap = await getDoc(userDocRef);
//             const userEmail = userDocSnap.exists() ? userDocSnap.data()?.email || "No Email" : "No Email";

//             return {
//               orderId: orderDoc.id,
//               userId,
//               userEmail,
//               status: orderData.status || "Unknown",
//               totalPrice: orderData.totalPrice || 0,
//               products: orderData.products || [],
//               deliveryDetails: orderData.deliveryDetails || {},
//             } as Order;
//           })
//         );

//         setOrders(ordersData);
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching orders:", error);
//         setLoading(false);
//       }
//     }

//     fetchOrders();
//   }, []);

//   const handleShowItems = (products: Product[]) => {
//     setSelectedItems(products);
//   };

//   const handleShowDeliveryDetails = (deliveryDetails: DeliveryDetails) => {
//     setSelectedDelivery(deliveryDetails);
//   };

//   const handleCloseModal = () => {
//     setSelectedItems([]);
//     setSelectedDelivery(null);
//   };

//   return (
//     <div className="h-[80vh] bg-gray-900 text-gray-200 p-8">
//       <h1 className="text-3xl font-bold mb-8">All Users' Orders</h1>
//       {loading ? (
//         <p className="text-center">Loading...</p>
//       ) : orders.length === 0 ? (
//         <p className="text-center">No orders found.</p>
//       ) : (
//         <div className="overflow-x-auto h-[60vh] overflow-y-auto">
//           <table className="table-auto w-full border-collapse border border-gray-700">
//             <thead>
//               <tr className="bg-gray-800">
//                 <th className="border border-gray-700 px-4 py-2">Order ID</th>
//                 <th className="border border-gray-700 px-4 py-2">User ID</th>
//                 <th className="border border-gray-700 px-4 py-2">User Email</th>
//                 <th className="border border-gray-700 px-4 py-2">Status</th>
//                 <th className="border border-gray-700 px-4 py-2">Total Price</th>
//                 <th className="border border-gray-700 px-4 py-2">Items Count</th>
//                 <th className="border border-gray-700 px-4 py-2">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {orders.map((order) => (
//                 <tr key={order.orderId} className="hover:bg-gray-800">
//                   <td className="border border-gray-700 px-4 py-2">{order.orderId}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.userId}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.userEmail}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.status}</td>
//                   <td className="border border-gray-700 px-4 py-2">${order.totalPrice}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.products.length}</td>
//                   <td className="border border-gray-700 px-4 py-2 space-y-2">
//                     <button
//                       className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
//                       onClick={() => handleShowItems(order.products)}
//                     >
//                       Show Items
//                     </button>
//                     <button
//                       className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
//                       onClick={() => handleShowDeliveryDetails(order.deliveryDetails)}
//                     >
//                       Delivery Details
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal for Order Items */}
//       {selectedItems.length > 0 && (
//         <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
//           <div className="bg-gray-800 text-gray-200 rounded-lg shadow-lg p-6 w-[90%] md:w-[50%]">
//             <h2 className="text-xl font-bold mb-4">Order Items</h2>
//             <ul className="list-disc ml-6 space-y-2">
//               {selectedItems.map((item) => (
//                 <li key={item.id}>
//                   <strong>{item.name}</strong> - ${item.price} x {item.quantity}
//                 </li>
//               ))}
//             </ul>
//             <div className="mt-6 text-right">
//               <button
//                 className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
//                 onClick={handleCloseModal}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Modal for Delivery Details */}
//       {selectedDelivery && (
//         <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
//           <div className="bg-gray-800 text-gray-200 rounded-lg shadow-lg p-6 w-[90%] md:w-[50%]">
//             <h2 className="text-xl font-bold mb-4">Delivery Details</h2>
//             <p><strong>Address:</strong> {selectedDelivery.address}</p>
//             <p><strong>City:</strong> {selectedDelivery.city}</p>
//             <p><strong>Country:</strong> {selectedDelivery.country}</p>
//             <p><strong>Phone:</strong> {selectedDelivery.phone}</p>
//             <p><strong>Province:</strong> {selectedDelivery.province}</p>
//             <p><strong>Street:</strong> {selectedDelivery.street}</p>
//             <div className="mt-6 text-right">
//               <button
//                 className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
//                 onClick={handleCloseModal}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
// "use client";
// import { useEffect, useState } from "react";
// import { collectionGroup, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
// import { firestore } from "../../lib/firebase-config";
// // import { doc, getDoc, getDocs, collectionGroup } from "firebase/firestore";


// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   quantity: number;
// }

// interface Order {
//   orderId: string;
//   userId: string;
//   status: string;
//   totalPrice: number;
//   products: Product[];
//   deliveryDetails: Record<string, string>;
//   paymentMethod: string;
//   datetime: string;
//   userEmail: string;
// }

// export default function Orders() {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function fetchOrders() {
//       try {
//         const ordersQuery = collectionGroup(firestore, "user_orders");
//         const querySnapshot = await getDocs(ordersQuery);

//         const ordersData: Order[] = [];
//         for (const docSnap of querySnapshot.docs) {
//           const data = docSnap.data();
//           const userId = docSnap.ref.parent.parent?.id || "Unknown User";
//           const userEmail = await fetchUserEmail(userId);

//           ordersData.push({
//             orderId: docSnap.id,
//             userId,
//             userEmail,
//             status: data.status || "Unknown",
//             totalPrice: data.totalPrice || 0,
//             products: data.products || [],
//             deliveryDetails: data.deliveryDetails || {},
//             paymentMethod: data.paymentMethod || "Unknown",
//             datetime: data.datetime?.toDate().toLocaleString() || "Unknown",
//           });
//         }

//         setOrders(ordersData);
//       } catch (error) {
//         console.error("Error fetching orders:", error);
//       } finally {
//         setLoading(false);
//       }
//     }

//     async function fetchUserEmail(userId: string): Promise<string> {
//       try {
//         const userRef = doc(firestore, "users", userId); // Correct reference to a specific document
//         const userSnapshot = await getDoc(userRef); // Use getDoc for a single document
//         return userSnapshot.exists() ? (userSnapshot.data()?.email || "No Email") : "No Email";
//       } catch (error) {
//         console.error("Error fetching user email:", error);
//         return "No Email";
//       }
//     }
    

//     fetchOrders();
//   }, []);

//   const updateOrderStatus = async (orderId: string, userId: string, newStatus: string) => {
//     try {
//       const orderRef = doc(firestore, `orders/${userId}/user_orders/${orderId}`);
//       await updateDoc(orderRef, { status: newStatus });
//       alert(`Order ${orderId} status updated to ${newStatus}`);
//       setOrders((prevOrders) =>
//         prevOrders.map((order) =>
//           order.orderId === orderId ? { ...order, status: newStatus } : order
//         )
//       );
//     } catch (error) {
//       console.error("Error updating order status:", error);
//     }
//   };

//   return (
//     <div className="h-[80vh] bg-gray-900 text-gray-200 p-8">
//       <h1 className="text-3xl font-bold mb-4">All Orders</h1>

//       {loading ? (
//         <p className="text-center">Loading...</p>
//       ) : orders.length === 0 ? (
//         <p className="text-center">No orders found.</p>
//       ) : (
//         <div className="overflow-x-auto h-[60vh] overflow-y-auto">
//           <table className="table-auto w-full border-collapse border border-gray-700">
//             <thead>
//               <tr className="bg-gray-800">
//                 <th className="border border-gray-700 px-4 py-2">Order ID</th>
//                 <th className="border border-gray-700 px-4 py-2">User Email</th>
//                 <th className="border border-gray-700 px-4 py-2">Status</th>
//                 <th className="border border-gray-700 px-4 py-2">Total Price</th>
//                 <th className="border border-gray-700 px-4 py-2">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {orders.map((order) => (
//                 <tr key={order.orderId} className="hover:bg-gray-800">
//                   <td className="border border-gray-700 px-4 py-2">{order.orderId}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.userEmail}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.status}</td>
//                   <td className="border border-gray-700 px-4 py-2">${order.totalPrice}</td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     <button
//                       className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mr-2"
//                       onClick={() => updateOrderStatus(order.orderId, order.userId, "Completed")}
//                     >
//                       Mark as Completed
//                     </button>
//                     <button
//                       className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
//                       onClick={() => updateOrderStatus(order.orderId, order.userId, "Pending")}
//                     >
//                       Mark as Pending
//                     </button>
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
// import { collection, getDocs, query, collectionGroup, updateDoc, doc } from "firebase/firestore";
// import { firestore } from "../../lib/firebase-config";

// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   quantity: number;
//   available: boolean; // Track availability
// }

// interface Order {
//   orderId: string;
//   userId: string;
//   status: string;
//   totalPrice: number;
//   products: Product[];
//   userEmail: string;
//   userContact: string;
// }

// export default function Orders() {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//   const [selectedItems, setSelectedItems] = useState<Product[]>([]);

//   // Fetch all orders and user details
//   useEffect(() => {
//     async function fetchOrders() {
//       try {
//         const ordersQuery = query(collectionGroup(firestore, "user_orders"));
//         const querySnapshot = await getDocs(ordersQuery);

//         const ordersData: Order[] = await Promise.all(
//           querySnapshot.docs.map(async (doc) => {
//             const data = doc.data();
//             const userId = doc.ref.parent.parent?.id || "Unknown User";

//             // Fetch user details
//             const userRef = collection(firestore, "users");
//             const userSnapshot = await getDocs(userRef);
//             const userDetails = userSnapshot.docs.find((userDoc) => userDoc.id === userId)?.data() || {};

//             return {
//               orderId: doc.id,
//               userId,
//               userEmail: userDetails.email || "No Email",
//               userContact: userDetails.contact || "No Contact",
//               ...data,
//             } as Order;
//           })
//         );

//         setOrders(ordersData);
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching orders:", error);
//         setLoading(false);
//       }
//     }

//     fetchOrders();
//   }, []);

//   const handleShowDetails = (order: Order) => {
//     setSelectedOrder(order);
//   };

//   const handleCloseDetails = () => {
//     setSelectedOrder(null);
//     setSelectedItems([]);
//   };

//   const handleShowItems = (products: Product[]) => {
//     setSelectedItems(products);
//   };

//   const toggleAvailability = (product: Product) => {
//     product.available = !product.available;
//     setSelectedItems([...selectedItems]); // Update state
//   };

//   const finishOrder = async (order: Order) => {
//     try {
//       const orderRef = doc(firestore, `users/${order.userId}/user_orders/${order.orderId}`);
//       await updateDoc(orderRef, { status: "Finished" });
//       alert("Order marked as finished!");
//     } catch (error) {
//       console.error("Error updating order status:", error);
//     }
//   };

//   return (
//     <div className="h-[80vh] bg-gray-900 text-gray-200 p-8">
//       <h1 className="text-3xl font-bold mb-8">All Users' Orders</h1>
//       {loading ? (
//         <p className="text-center">Loading...</p>
//       ) : orders.length === 0 ? (
//         <p className="text-center">No orders found.</p>
//       ) : (
//         <div className="overflow-x-auto h-[60vh] overflow-y-auto">
//           <table className="table-auto w-full border-collapse border border-gray-700">
//             <thead>
//               <tr className="bg-gray-800">
//                 <th className="border border-gray-700 px-4 py-2">Order ID</th>
//                 <th className="border border-gray-700 px-4 py-2">User ID</th>
//                 <th className="border border-gray-700 px-4 py-2">User Email</th>
//                 <th className="border border-gray-700 px-4 py-2">Contact</th>
//                 <th className="border border-gray-700 px-4 py-2">Status</th>
//                 <th className="border border-gray-700 px-4 py-2">Total Price</th>
//                 <th className="border border-gray-700 px-4 py-2">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {orders.map((order) => (
//                 <tr key={order.orderId} className="hover:bg-gray-800">
//                   <td className="border border-gray-700 px-4 py-2">{order.orderId}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.userId}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.userEmail}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.userContact}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.status}</td>
//                   <td className="border border-gray-700 px-4 py-2">${order.totalPrice}</td>
//                   <td className="border border-gray-700 px-4 py-2 space-y-2">
//                     <button
//                       className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
//                       onClick={() => handleShowDetails(order)}
//                     >
//                       Show Details
//                     </button>
//                     <button
//                       className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
//                       onClick={() => handleShowItems(order.products)}
//                     >
//                       List of Order Items
//                     </button>
//                     <button
//                       className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
//                       onClick={() => finishOrder(order)}
//                     >
//                       Finish
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal for Order Details */}
//       {selectedOrder && (
//         <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
//           <div className="bg-gray-800 text-gray-200 rounded-lg shadow-lg p-6 w-[90%] md:w-[50%]">
//             <h2 className="text-xl font-bold mb-4">Order Details</h2>
//             <p><strong>Order ID:</strong> {selectedOrder.orderId}</p>
//             <p><strong>User ID:</strong> {selectedOrder.userId}</p>
//             <p><strong>User Email:</strong> {selectedOrder.userEmail}</p>
//             <p><strong>Contact:</strong> {selectedOrder.userContact}</p>
//             <p><strong>Status:</strong> {selectedOrder.status}</p>
//             <p><strong>Total Price:</strong> ${selectedOrder.totalPrice}</p>
//             <div className="mt-6 text-right">
//               <button
//                 className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
//                 onClick={handleCloseDetails}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Modal for Order Items */}
//       {selectedItems.length > 0 && (
//         <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
//           <div className="bg-gray-800 text-gray-200 rounded-lg shadow-lg p-6 w-[90%] md:w-[50%]">
//             <h2 className="text-xl font-bold mb-4">Order Items</h2>
//             <ul className="list-disc ml-6 space-y-2">
//               {selectedItems.map((item) => (
//                 <li key={item.id}>
//                   <strong>{item.name}</strong> - ${item.price} x {item.quantity}
//                   <button
//                     className={`ml-4 px-4 py-1 rounded ${
//                       item.available ? "bg-green-500" : "bg-red-500"
//                     } text-white`}
//                     onClick={() => toggleAvailability(item)}
//                   >
//                     {item.available ? "Available" : "Not Available"}
//                   </button>
//                 </li>
//               ))}
//             </ul>
//             <div className="mt-6 text-right">
//               <button
//                 className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
//                 onClick={handleCloseDetails}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// }
// "use client";
// import { useEffect, useState } from "react";
// import { collection, getDocs, query, collectionGroup } from "firebase/firestore";
// import { firestore } from "../../lib/firebase-config";

// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   quantity: number;
// }

// interface Order {
//   orderId: string;
//   userId: string;
//   status: string;
//   totalPrice: number;
//   products: Product[];
// }

// export default function Orders() {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); // State for selected order

//   // Fetch all users' orders
//   useEffect(() => {
//     async function fetchOrders() {
//       try {
//         const ordersQuery = query(collectionGroup(firestore, "user_orders")); // Fetch all user_orders subcollections
//         const querySnapshot = await getDocs(ordersQuery);

//         const ordersData: Order[] = querySnapshot.docs.map((doc) => {
//           const data = doc.data();
//           return {
//             orderId: doc.id,
//             userId: doc.ref.parent.parent?.id || "Unknown User", // Get user UID
//             ...data,
//           } as Order;
//         });

//         setOrders(ordersData);
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching orders:", error);
//         setLoading(false);
//       }
//     }

//     fetchOrders();
//   }, []);

//   const handleShowDetails = (order: Order) => {
//     setSelectedOrder(order); // Set the selected order
//   };

//   const handleCloseDetails = () => {
//     setSelectedOrder(null); // Clear the selected order
//   };

//   return (
//     <div className="h-[80vh] bg-gray-900 text-gray-200 p-8">
//       <h1 className="text-3xl font-bold mb-8">All Users' Orders</h1>
//       {loading ? (
//         <p className="text-center">Loading...</p>
//       ) : orders.length === 0 ? (
//         <p className="text-center">No orders found.</p>
//       ) : (
//         <div className="overflow-x-auto h-[60vh] overflow-y-auto">
//           <table className="table-auto w-full border-collapse border border-gray-700">
//             <thead>
//               <tr className="bg-gray-800">
//                 <th className="border border-gray-700 px-4 py-2">Order ID</th>
//                 <th className="border border-gray-700 px-4 py-2">User ID</th>
//                 <th className="border border-gray-700 px-4 py-2">Status</th>
//                 <th className="border border-gray-700 px-4 py-2">Total Price</th>
//                 <th className="border border-gray-700 px-4 py-2">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {orders.map((order) => (
//                 <tr key={order.orderId} className="hover:bg-gray-800">
//                   <td className="border border-gray-700 px-4 py-2">{order.orderId}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.userId}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.status}</td>
//                   <td className="border border-gray-700 px-4 py-2">{order.totalPrice}</td>
//                   <td className="border border-gray-700 px-4 py-2">
//                     <button
//                       className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
//                       onClick={() => handleShowDetails(order)}
//                     >
//                       Show Details
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal for Order Details */}
//       {selectedOrder && (
//         <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
//           <div className="bg-gray-800 text-gray-200 rounded-lg shadow-lg p-6 w-[90%] md:w-[50%]">
//             <h2 className="text-xl font-bold mb-4">Order Details</h2>
//             <p>
//               <strong>Order ID:</strong> {selectedOrder.orderId}
//             </p>
//             <p>
//               <strong>User ID:</strong> {selectedOrder.userId}
//             </p>
//             <p>
//               <strong>Status:</strong> {selectedOrder.status}
//             </p>
//             <p>
//               <strong>Total Price:</strong> ${selectedOrder.totalPrice}
//             </p>
//             <div className="mt-4">
//               <h3 className="font-bold">Products:</h3>
//               <ul className="list-disc ml-6">
//                 {selectedOrder.products.map((product, index) => (
//                   <li key={index}>
//                     <strong>{product.name}</strong> - ${product.price} x{" "}
//                     {product.quantity}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//             <div className="mt-6 text-right">
//               <button
//                 className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
//                 onClick={handleCloseDetails}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
