"use client";

import { useState, useEffect } from "react";
import { firestore,auth } from "../../lib/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { FiEdit, FiTrash } from "react-icons/fi";

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
}

const Categories = () => {
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filterName, setFilterName] = useState("");
  const [Loading, setLoading] = useState(true);// Fetch categories from Firestore
  const router = useRouter();
  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, "category"));
      const fetchedCategories = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategoryError("Failed to fetch categories.");
    }
  };

 

 

useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // If no user is logged in, redirect to sign-in page
        router.push("/");
      } else {
        fetchCategories();
        setLoading(false);
        // You can also check for admin role here if needed
        // if (user.email !== "admin@example.com") {
        //   router.push("/not-authorized");
        // }
      }
    });

    // Clean up subscription when the component is unmounted
    return () => unsubscribe();
  }, [router]);

  if (Loading) {
    return <div>Loading...</div>;
  }

  

  // Fetch subcategories for a category
  const fetchSubCategories = async (categoryId: string) => {
    try {
      const subCategorySnapshot = await getDocs(
        collection(firestore, `category/${categoryId}/sub_categories`)
      );
      const fetchedSubCategories = subCategorySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setSubCategories(fetchedSubCategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setCategoryError("Failed to fetch subcategories.");
    }
  };

  // Add a new category
  const addCategory = async () => {
    if (!categoryName.trim()) {
      setCategoryError("Category name cannot be empty.");
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const categoryRef = doc(firestore, "category", editingCategory.id);
        await updateDoc(categoryRef, { name: categoryName });
        setEditingCategory(null);
      } else {
        // Add a new category
        await addDoc(collection(firestore, "category"), {
          name: categoryName,
        });
      }

      setCategoryName("");
      setCategoryError("");
      fetchCategories();
    } catch (error) {
      console.error("Error adding/updating category:", error);
      setCategoryError("Failed to add or update category.");
    }
  };

  // Add a new subcategory
  const addSubCategory = async () => {
    if (!currentCategory || !subCategoryName.trim()) {
      setCategoryError("Subcategory name cannot be empty.");
      return;
    }

    try {
      await addDoc(
        collection(firestore, `category/${currentCategory.id}/sub_categories`),
        {
          name: subCategoryName,
        }
      );
      setSubCategoryName("");
      fetchSubCategories(currentCategory.id);
    } catch (error) {
      console.error("Error adding subcategory:", error);
      setCategoryError("Failed to add subcategory.");
    }
  };

  // Delete a category
  const deleteCategory = async (categoryId: string) => {
    try {
      const categoryRef = doc(firestore, "category", categoryId);
      await deleteDoc(categoryRef);
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Delete a subcategory
  const deleteSubCategory = async (subCategoryId: string) => {
    try {
      if (!currentCategory) return;

      const subCategoryRef = doc(
        firestore,
        `category/${currentCategory.id}/sub_categories`,
        subCategoryId
      );

      await deleteDoc(subCategoryRef);
      fetchSubCategories(currentCategory.id);
    } catch (error) {
      console.error("Error deleting subcategory:", error);
    }
  };

  // Open modal and fetch subcategories on row double-click
  const handleRowDoubleClick = (category: Category) => {
    setCurrentCategory(category);
    fetchSubCategories(category.id);
    setIsSubModalOpen(true);
  };

  // Edit category name
  const handleEditCategory = (category: Category) => {
    setCategoryName(category.name);
    setEditingCategory(category);
  };
  const exportToExcel = () => {
    const fileName = prompt("Enter file name:", "category.xlsx"); // User se filename maangna
  
    if (!fileName) {
      alert("File name is required!"); // Agar user cancel kare ya empty naam de to alert show karo
      return;
    }
  
    const ws = XLSX.utils.json_to_sheet(
      categories.filter(
        (category) =>
          filterName === "" || category.name.toLowerCase().includes(filterName.toLowerCase())
      )
    );
  
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Category");
  
    XLSX.writeFile(wb, `${fileName}.xlsx`); // User ke diye gaye naam se file save karna
  };
  
  return (
    // <div className="p-6 bg-gray-900 text-gray-200 h-[80vh] ">
    <div className="p-0 text-black h-[80vh] ">
     
<div className="mb-4 flex flex-wrap gap-4">
  <div className="flex-1 min-w-[200px]">
    <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">Category Name </label>
    <input
      type="text"
      placeholder="Search by Category Name"
      id="orderId"
      value={filterName}
      onChange={(e) => setFilterName(e.target.value)}
      className="w-full border border-gray-300 p-2 rounded-md"
    />
  </div>
  <div className="flex-1 min-w-[200px]">
    <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">Export Data</label>
    <button
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                  onClick={() => exportToExcel()}
                >
                  Convert to Excel Report
                </button> 
  </div>
  <div className="flex-1 min-w-[200px]">
  <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">
    Add New Category
  </label>
  <input
  type="text"
  value={categoryName}
  onChange={(e) => setCategoryName(e.target.value)}
  placeholder={categoryError ? categoryError : "Add New Category Name"}
  className={`border border-gray-300 bg-gray-200 text-black rounded px-4 py-2 mr-2 w-1/2 focus:outline-none focus:ring focus:ring-gray-400 ${categoryError ? "input-error" : ""}`}
/>


  <button
    onClick={addCategory}
    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
  >
    {editingCategory ? "Update Category" : "Add Category"}
  </button>
</div>



</div>



      {/* Add/Edit Category Form */}

      {/* Category Table */}
      <div className="overflow-x-auto h-[75vh] overflow-y-auto">
      <table className="w-full overflow-y-auto border-collapse text-left">
  <thead>
    <tr className="bg-green-600 text-white">
      <th className="border border-gray-700 px-4 py-2" style={{ width: '70%' }}>Category Name</th> {/* Set first column width */}
      <th className="border border-gray-700 px-4 py-2 " style={{ width: '30%' }}>Actions</th> {/* Set last column width */}
    </tr>
  </thead>
  <tbody>
    {categories .filter(
                    (categories) =>
                      (filterName === "" || categories.name.toLowerCase().includes(filterName.toLowerCase()))
                  ).map((category) => (
      <tr
        key={category.id}
        className="even:bg-gray-200 odd:bg-gray-300 cursor-pointer"
        onDoubleClick={() => handleRowDoubleClick(category)}
      >
        <td className="border border-gray-700 px-4 py-2">{category.name}</td>
        <td className="border border-gray-700 px-4 py-2 ">
          <div className="flex items-center  space-x-2">
            <button
              onClick={() => handleEditCategory(category)}
              className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center justify-center"
            >
              <FiEdit className="text-white" size={20} />
            </button>
            <button
              onClick={() => deleteCategory(category.id)}
              className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center justify-center"
            >
              <FiTrash className="text-white" size={20} />
            </button>
            <button
              onDoubleClick={() => handleRowDoubleClick(category)}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm flex items-center justify-center"
            >
              Add Sub Categories
            </button>
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>

      </div>

      {/* Subcategory Modal */}
      {isSubModalOpen && currentCategory && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-2/3">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Subcategories for {currentCategory.name}
            </h2>
            <div className="mb-4">
              <input
                type="text"
                value={subCategoryName}
                onChange={(e) => setSubCategoryName(e.target.value)}
                placeholder="Subcategory Name"
                className="border border-gray-300 bg-gray-200 text-black rounded px-4 py-2 mr-2 w-1/2 focus:outline-none focus:ring focus:ring-gray-500"
              />
              <button
                onClick={addSubCategory}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add Subcategory
              </button>
            </div>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="border border-gray-700 px-4 py-2">Subcategory Name</th>
                  <th className="border border-gray-700 px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subCategories.map((subCategory) => (
                  <tr
                    key={subCategory.id}
                    className="even:bg-gray-200 odd:bg-gray-300"
                  >
                    <td className="border border-gray-700 px-4 py-2">{subCategory.name}</td>
                    <td className="border border-gray-700 px-4 py-2">
                      <button
                        onClick={() => deleteSubCategory(subCategory.id)}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded"
                      >
                        <FiTrash className="text-white" size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
