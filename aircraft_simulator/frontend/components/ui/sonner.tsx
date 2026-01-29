"use client";

import { Toaster as Sonner } from "sonner";

export const Toaster = () => {
    return (
        <Sonner
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-stealth-charcoal group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-white/60",
                    actionButton: "group-[.toast]:bg-white group-[.toast]:text-black",
                    cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white",
                },
            }}
        />
    );
};
