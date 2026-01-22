"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Search, MessageSquare, CreditCard, Package, LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const steps: Step[] = [
  {
    icon: Search,
    title: "Find What You Need",
    description: "Browse thousands of items from your neighbors - tools, electronics, sports gear, and more.",
    color: "bg-blue-500"
  },
  {
    icon: MessageSquare,
    title: "Connect with Owner",
    description: "Send a rental request and chat directly with the item owner to arrange details.",
    color: "bg-purple-500"
  },
  {
    icon: CreditCard,
    title: "Pay Securely",
    description: "Book with confidence using our secure payment system with deposit protection.",
    color: "bg-green-500"
  },
  {
    icon: Package,
    title: "Pick Up & Return",
    description: "Collect your item, use it, and return it when done. Leave a review!",
    color: "bg-orange-500"
  }
];

export default function HowItWorks() {
  return (
    <div className="py-12 sm:py-16">
      <div className="text-center mb-10 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">How It Works</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Rent anything in 4 simple steps. No commitments, no hassle.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          return (
            <motion.div
              key={index}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="relative"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 h-full">
                {/* Step Number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 ${step.color} rounded-xl flex items-center justify-center mb-4`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
              </div>

              {/* Connector Line (hidden on mobile and last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-slate-300" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
