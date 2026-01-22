"use client";

import React from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah M.",
    location: "London",
    rating: 5,
    text: "Saved so much money renting a pressure washer for the weekend instead of buying one. The owner was super helpful!",
    item: "Pressure Washer",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
  },
  {
    name: "James T.",
    location: "Manchester",
    rating: 5,
    text: "I rent out my camera equipment when I'm not using it. Great extra income and the platform handles everything securely.",
    item: "Camera Owner",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
  },
  {
    name: "Emma L.",
    location: "Birmingham",
    rating: 5,
    text: "Rented a beautiful dress for a wedding. Perfect condition, fraction of the retail price. Will definitely use again!",
    item: "Designer Dress",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
  }
];

export default function Testerminal() {
  return (
    <div className="py-12 sm:py-16 w-full bg-white">
      {/* Section Header */}
      <div className="text-center mb-10 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
          What Our Users Say
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Join thousands of happy renters and owners in your community
        </p>
      </div>

      {/* Testimonial Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 relative hover:shadow-xl transition-shadow"
          >
            {/* Large Quote Icon - Top Right */}
            <Quote className="absolute top-4 right-4 w-10 h-10 text-slate-200" />

            {/* Rating Stars */}
            <div className="flex gap-0.5 mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star 
                  key={i} 
                  className="w-5 h-5 text-yellow-400 fill-yellow-400" 
                />
              ))}
            </div>

            {/* Quote Text */}
            <p className="text-slate-700 mb-6 leading-relaxed text-base">
              "{testimonial.text}"
            </p>

            {/* User Information */}
            <div className="flex items-center gap-3">
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-slate-900">{testimonial.name}</p>
                <p className="text-sm text-slate-500">
                  {testimonial.location} • {testimonial.item}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

