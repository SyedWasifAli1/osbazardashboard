"use client";

import React, { useEffect, useState } from "react";
import { firestore } from "../../lib/firebase-config"; // Adjust to your config
import Image from 'next/image';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

// Define the type for images state
interface Image {
  id: string;
  url: string;
}

const HeroSectionSlider = () => {
  // Use the Image type for the images state
  const [images, setImages] = useState<Image[]>([]);  // Updated state type
  const [newImage, setNewImage] = useState<File | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch images from Firestore
  const fetchImages = async () => {
    const snapshot = await getDocs(collection(firestore, "sliderImages"));
    const imageUrls = snapshot.docs.map((doc) => ({
      id: doc.id,
      url: doc.data().url,
    }));
    setImages(imageUrls); // Set the images in the state
  };

  // Handle adding a new image
  const handleAddImage = async () => {
    if (!newImage) return alert("Please select an image.");
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Image = reader.result as string;
      try {
        await addDoc(collection(firestore, "sliderImages"), {
          url: base64Image,
        });
        alert("Image added successfully!");
        setNewImage(null);
        fetchImages(); // Reload the images after adding
      } catch (error) {
        console.error("Error adding image:", error);
      }
    };

    reader.readAsDataURL(newImage); // Convert the image to base64
  };

  // Handle deleting an image
  const handleDeleteImage = async (id: string) => {
    try {
      await deleteDoc(doc(firestore, "sliderImages", id)); // Delete image from Firestore
      alert("Image deleted successfully!");
      fetchImages(); // Reload images after deletion
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  // Auto-slide functionality
  useEffect(() => {
    fetchImages(); // Fetch images when component mounts

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length); // Auto slide every 3 seconds
    }, 3000);

    return () => clearInterval(timer); // Cleanup on component unmount
  }, [images]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Hero Section Slider</h1>

      {/* Image Slider */}
      <div className="relative w-full h-64 overflow-hidden rounded-lg">
        {images.length > 0 ? (
     <Image
     src={images[currentIndex]?.url || '/placeholder.png'} // Fallback to a placeholder if URL is missing
     alt={`Slide ${currentIndex}`}
     fill // Automatically sets width and height to fill the parent container
     className="object-cover"
   />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-200">
            <p>No images available.</p>
          </div>
        )}
      </div>

      {/* Add Image */}
      <div className="mt-6">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewImage(e.target.files?.[0] || null)}
          className="mb-4"
        />
        <button
          onClick={handleAddImage}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Image
        </button>
      </div>

      {/* List of Images with Delete */}
      <ul className="mt-6 space-y-4">
        {images.map((image, index) => (
          <li key={image.id} className="flex items-center space-x-4">
         <Image
  src={image.url || '/placeholder.png'} // Fallback to a placeholder if the URL is missing
  alt={`Image ${index}`}
  width={80} // equivalent to w-20 (20 * 4px)
  height={80} // equivalent to h-20
  className="object-cover rounded"
/>
            <button
              onClick={() => handleDeleteImage(image.id)}  // Pass the image id for deletion
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HeroSectionSlider;
