"use client"

import { Button } from "@/components/ui/button"

export default function Navbar() {
  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-5 px-6">

        <div className="text-xl font-bold">
          Realty Genie
        </div>

        <div className="flex gap-8 text-sm text-muted-foreground">
          <a href="#">Product</a>
          <a href="#">Docs</a>
          <a href="#">Pricing</a>
          <a href="#">Community</a>
        </div>

        <Button >Get Started</Button>

      </div>
    </nav>
  )
}